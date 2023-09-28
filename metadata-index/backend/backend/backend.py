"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

import json
import aws_cdk as cdk
from aws_cdk import (
    aws_kms as kms,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_s3_notifications as s3n,
    aws_s3 as s3,
    aws_sns as sns,
    aws_ec2 as ec2,
    Stack,
    aws_secretsmanager as secretsmanager,
    aws_logs as logs
)
from aws_cdk import SecretValue
from constructs import Construct
from .function import PythonLambda
from .network import Vpc
from .security_groups import SecurityGroups
from .lambda_roles import LambdaRoles
from .custom import CustomLambdaResource
from .database import AuroraServerlessDB
from .glue import GlueDatabase



class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str,  config: dict, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        stack_name = self.stack_name.lower()
        #Read lambdas relted configs and create the lambda role
        lambda_config = config.LAMBDA_CONFIG

        # Get the VPC ID from stack if specified, otherwise creates a new one.
        if (config.VPC["USE_VPC"] == True):
            if (config.VPC["EXISTING_VPC_ID"] != ""):
                vpc = ec2.Vpc.from_lookup(self, "VPC", vpc_id=config.VPC["EXISTING_VPC_ID"])
            else:
                vpc_cidr = config.VPC["NEW_VPC_CIDR"]
                vpc_construct = Vpc(self, "Network", vpc_cidr)
                vpc = vpc_construct.getVpc()
        else:
            vpc=None
        # Create Security groups
        sec_groups = SecurityGroups(self, "Security Groups", vpc=vpc)

        lambda_config = config.LAMBDA_CONFIG
        ahi_datastore_arn = config.AHI_DATASTORE_ARN 
        

        sns_key = kms.Key(self, "sns-topic",enable_key_rotation=True)
        sns_topic = sns.Topic(self, "ahi-to-index-topic", display_name=stack_name+"ahi-to-index-topic" , master_key=sns_key )
        ahi_output_bucket = s3.Bucket.from_bucket_attributes(self, "ImportedBucket",bucket_arn=config.AHI_IMPORT_OUPUT_BUCKET_ARN)
        ahi_output_bucket.add_event_notification(s3.EventType.OBJECT_CREATED, s3n.SnsDestination(sns_topic) , s3.NotificationKeyFilter(suffix='job-output-manifest.json'))
        sns_key.grant_encrypt_decrypt(iam.ServicePrincipal("s3.amazonaws.com"))
        sns_key.grant_encrypt_decrypt(iam.ServicePrincipal("lambda.amazonaws.com"))

        if config.RDBMS_CONFIG["enabled"] == True:
            #Create the database
            aurora_security_group = sec_groups.getAuroraSecGroup()
            db_min_acu_capacity = config.RDBMS_CONFIG["min_acu_capacity"]
            db_max_acu_capacity = config.RDBMS_CONFIG["max_acu_capacity"]
            db_name = config.RDBMS_CONFIG["db_name"]
            db = AuroraServerlessDB(self,"ahi-to-rdbms-Aurora-DB", vpc=vpc, db_name=db_name, aurora_security_group=aurora_security_group ,  min_acu_capacity=db_min_acu_capacity , max_acu_capacity=db_max_acu_capacity )
            db_secret_arn = db.getDbCluster().secret.secret_arn

            db_user_secret = secretsmanager.Secret(self, "Secret",  secret_object_value={    
                                                                                            "username": SecretValue.unsafe_plain_text("ahi_parser"),
                                                                                            "host": SecretValue.unsafe_plain_text(db.getDbCluster().cluster_endpoint.hostname ) ,
                                                                                            "dbname": SecretValue.unsafe_plain_text(db_name),
                                                                                        },
                                                                    secret_name=stack_name+"-ahi-db-user-secret")

            
            
            
            #MySql DBInit Lambda creation.
            db_init_role = LambdaRoles(self, 'ahi-to-rdbms-db-init-lambdarole', db_secret_arn=db_secret_arn , )
            fn_db_init = PythonLambda(self, "ahi-to-rdbms-db-Init", lambda_config["DbInit"], db_init_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_db_init.getFn().add_environment(key="DB_SECRET", value=db_secret_arn)

            #Deploy the database schema
            iep_schema = CustomLambdaResource(self, "db-schema", fn_db_init.getFn())
            iep_schema.node.add_dependency(db.getDbCluster())
            
            rdbms_lambda_role = LambdaRoles(self, 'ahi-to-rdbms-lambdarole', db_secret_arn=db_user_secret.secret_arn , datastore_arn=ahi_datastore_arn, database_resource_id=db.getDbCluster().cluster_resource_identifier )  
            fn_ahi_to_rdbms = PythonLambda(self, "ahi-to-rdbms", lambda_config["AHItoRDBMS"], rdbms_lambda_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahi_to_rdbms.getFn().add_environment(key="DB_SECRET", value=db_user_secret.secret_arn )
            fn_ahi_to_rdbms.getFn().add_environment(key="POPULATE_INSTANCE_LEVEL", value=str(config.RDBMS_CONFIG["populate_instance_level"])) 
            fn_ahi_to_rdbms.getFn().add_environment(key="POPULATE_FRAME_LEVEL", value=str(config.RDBMS_CONFIG["populate_frame_level"])) 
            fn_ahi_to_rdbms.getFn().add_environment(key="AHLI_ENDPOINT", value="") #T08/27/2023 - jpleger : This is a workaround for the medical-imaging service descriptor, not nice... Will fix soon.
            ahi_output_bucket.grant_read(fn_ahi_to_rdbms.getFn())
            
            

            fn_ahi_to_rdbms.getFn().add_permission("ahi-to-rdbms-sllow-sns", principal=iam.ServicePrincipal("sns.amazonaws.com"), action="lambda:InvokeFunction")
            sns.Subscription(self, "ahi-to-rdbms-sns-subscription",topic=sns_topic,endpoint=fn_ahi_to_rdbms.getFn().function_arn ,protocol=sns.SubscriptionProtocol.LAMBDA)

        if config.OPENSEARCH_CONFIG["enabled"] == True:
            opensearch_lambda_role  = LambdaRoles(self, 'ahi-to-rdbms-init-lambdarole', db_secret_arn=db_secret_arn , datastore_arn=ahi_datastore_arn )
            fn_ahi_to_opensearch = PythonLambda(self, "ahi-to-opensearch", lambda_config["AHItoOpenSearch"], opensearch_lambda_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahi_to_opensearch.getFn().add_environment(key="DOMAIN_ENDPOINT", value="")
            ahi_output_bucket.grant_read(fn_ahi_to_datalake.getFn())
            
            fn_ahi_to_opensearch.getFn().add_permission("ahi-to-opensearch-allow-sns", principal=iam.ServicePrincipal("sns.amazonaws.com"), action="lambda:InvokeFunction")
            sns.Subscription(self, "ahi-to-opensearch-sns-subscription",topic=sns_topic,endpoint=fn_ahi_to_opensearch.getFn().function_arn,protocol=sns.SubscriptionProtocol.LAMBDA)

        if config.DATALAKE_CONFIG["enabled"] == True:
            if config.DATALAKE_CONFIG["destination_bucket_name"] == "":
                bucket_name=None
            else:
                bucket_name=config.DESTINATION_BUCKET_NAME
            datalake_lambda_role  = LambdaRoles(self, 'ahi-to-datalake-lambdarole', datastore_arn=ahi_datastore_arn)
            access_log_lambda_role = iam.Role(self, "Role",assumed_by=iam.ServicePrincipal("logging.s3.amazonaws.com"),description="Grants S3 service to put access logs.")
            access_log_bucket = s3.Bucket(self, "ahi-to-datalake-access_log-bucket", bucket_name=None, block_public_access=s3.BlockPublicAccess.BLOCK_ALL, removal_policy=cdk.RemovalPolicy.RETAIN , enforce_ssl=True , encryption=s3.BucketEncryption.S3_MANAGED)
            access_log_bucket.grant_put(access_log_lambda_role)
            destination_bucket = s3.Bucket(self, "ahi-to-datalake-destination-bucket", bucket_name=bucket_name, block_public_access=s3.BlockPublicAccess.BLOCK_ALL, removal_policy=cdk.RemovalPolicy.RETAIN , enforce_ssl=True , encryption=s3.BucketEncryption.S3_MANAGED , server_access_logs_prefix="access-logs/" , server_access_logs_bucket=access_log_bucket )
            fn_ahi_to_datalake = PythonLambda(self, "ahi-to-datalake", lambda_config["AHItoDatalake"], datalake_lambda_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahi_to_datalake.getFn().add_environment(key="DESTINATION_BUCKET", value=destination_bucket.bucket_name) 
            fn_ahi_to_datalake.getFn().add_environment(key="POPULATE_INSTANCE_LEVEL", value=str(config.DATALAKE_CONFIG["populate_instance_level"])) 
            fn_ahi_to_datalake.getFn().add_environment(key="AHLI_ENDPOINT", value="") #08/27/2023 - jpleger : This is a workaround for the medical-imaging service descriptor, not nice... Will fix soon.
            destination_bucket.grant_read_write(fn_ahi_to_datalake.getFn())
            ahi_output_bucket.grant_read(fn_ahi_to_datalake.getFn())
            if config.DATALAKE_CONFIG["deploy_glue_default_config"] == True:
                GlueDatabase(self, "ahi-datalake-db" , datalake_bucket=destination_bucket , stack_name=stack_name)


            
            fn_ahi_to_datalake.getFn().add_permission("ahi-to-datalake-allows-sns", principal=iam.ServicePrincipal("sns.amazonaws.com"), action="lambda:InvokeFunction")
            sns.Subscription(self, "ahi-to-datalke-sns-subscription",topic=sns_topic,endpoint=fn_ahi_to_datalake.getFn().function_arn ,protocol=sns.SubscriptionProtocol.LAMBDA)



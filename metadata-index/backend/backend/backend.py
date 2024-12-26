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
    aws_lambda_event_sources as lambda_event_source,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    aws_sns as sns,
    aws_ec2 as ec2,
    Stack,
    aws_secretsmanager as secretsmanager,
    aws_logs as logs,
    CfnOutput,
    Duration,
)
from aws_cdk import SecretValue
from constructs import Construct
from .function import PythonLambda
from .network import Vpc
from .security_groups import SecurityGroups
from .queues import SQSQueues
from .rule import Rule
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
        
        # Set up EventBridge rule -> SQS queue -> Lambda function
        sqs_key = kms.Key(self, "sqs-queue", enable_key_rotation=True)
        sqs_key.grant_encrypt_decrypt(iam.ServicePrincipal("events.amazonaws.com"))
        sqs_key.grant_encrypt_decrypt(iam.ServicePrincipal("lambda.amazonaws.com"))
        
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
            db_init_role = LambdaRoles(self, 'ahi-to-rdbms-db-init-lambda-role', db_secret_arn=db_secret_arn , )
            fn_db_init = PythonLambda(self, "ahi-to-rdbms-db-init", lambda_config["DbInit"], db_init_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_db_init.getFn().add_environment(key="DB_SECRET", value=db_secret_arn)

            #Deploy the database schema
            iep_schema = CustomLambdaResource(self, "db-schema", fn_db_init.getFn())
            iep_schema.node.add_dependency(db.getDbCluster())
            
            rdbms_lambda_role = LambdaRoles(self, 'ahi-to-rdbms-lambda-role', db_secret_arn=db_user_secret.secret_arn , datastore_arn=ahi_datastore_arn, database_resource_id=db.getDbCluster().cluster_resource_identifier )  
            fn_ahi_to_rdbms = PythonLambda(self, "ahi-to-rdbms", lambda_config["AHItoRDBMS"], rdbms_lambda_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahi_to_rdbms.getFn().add_environment(key="DB_SECRET", value=db_user_secret.secret_arn )
            fn_ahi_to_rdbms.getFn().add_environment(key="POPULATE_INSTANCE_LEVEL", value=str(config.RDBMS_CONFIG["populate_instance_level"])) 
            fn_ahi_to_rdbms.getFn().add_environment(key="POPULATE_FRAME_LEVEL", value=str(config.RDBMS_CONFIG["populate_frame_level"])) 
            fn_ahi_to_rdbms.getFn().add_environment(key="AHLI_ENDPOINT", value="") #08/27/2023 - jpleger : This is a workaround for the medical-imaging service descriptor, not nice... Will fix soon.
            
            sqs_queues = SQSQueues(self, "ahi-to-rdbms-queue", stack_name+"-ahi-to-rdbms-queue", sqs_key)
            rule = Rule(self, "ahi-to-rdbms-rule", stack_name+"-ahi-to-rdbms-rule", sqs_queues.getQueue(), sqs_queues.getDeadLetterQueue())
            sqs_event_source = lambda_event_source.SqsEventSource(sqs_queues.getQueue() , batch_size=40 , enabled=True , max_batching_window=Duration.seconds(2) , max_concurrency=100 , report_batch_item_failures=True )
            fn_ahi_to_rdbms.getFn().add_event_source(sqs_event_source)

        if config.OPENSEARCH_CONFIG["enabled"] == True:
            opensearch_lambda_role  = LambdaRoles(self, 'ahi-to-opensearch-lambda-role', db_secret_arn=db_secret_arn , datastore_arn=ahi_datastore_arn )
            fn_ahi_to_opensearch = PythonLambda(self, "ahi-to-opensearch", lambda_config["AHItoOpenSearch"], opensearch_lambda_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahi_to_opensearch.getFn().add_environment(key="DOMAIN_ENDPOINT", value="")
            
            sqs_queues = SQSQueues(self, "ahi-to-opensearch-queue", stack_name+"-ahi-to-opensearch-queue", sqs_key)
            rule = Rule(self, "ahi-to-opensearch-rule", stack_name+"-ahi-to-opensearch-rule", sqs_queues.getQueue(), sqs_queues.getDeadLetterQueue())
            sqs_event_source = lambda_event_source.SqsEventSource(sqs_queues.getQueue() , batch_size=40 , enabled=True , max_batching_window=Duration.seconds(2) , max_concurrency=100 , report_batch_item_failures=True )
            fn_ahi_to_opensearch.getFn().add_event_source(sqs_event_source)

        if config.DATALAKE_CONFIG["enabled"] == True:
            if config.DATALAKE_CONFIG["destination_bucket_name"] == "":
                bucket_name=None
            else:
                bucket_name=config.DESTINATION_BUCKET_NAME
            datalake_lambda_role  = LambdaRoles(self, 'ahi-to-datalake-lambda-role', datastore_arn=ahi_datastore_arn)
            access_log_lambda_role = iam.Role(self, "Role",assumed_by=iam.ServicePrincipal("logging.s3.amazonaws.com"),description="Grants S3 service to put access logs.")
            access_log_bucket = s3.Bucket(self, "ahi-to-datalake-access_log-bucket", bucket_name=None, block_public_access=s3.BlockPublicAccess.BLOCK_ALL, removal_policy=cdk.RemovalPolicy.RETAIN , enforce_ssl=True , encryption=s3.BucketEncryption.S3_MANAGED)
            access_log_bucket.grant_put(access_log_lambda_role)
            destination_bucket = s3.Bucket(self, "ahi-to-datalake-destination-bucket", bucket_name=bucket_name, block_public_access=s3.BlockPublicAccess.BLOCK_ALL, removal_policy=cdk.RemovalPolicy.RETAIN , enforce_ssl=True , encryption=s3.BucketEncryption.S3_MANAGED , server_access_logs_prefix="access-logs/" , server_access_logs_bucket=access_log_bucket )
            fn_ahi_to_datalake = PythonLambda(self, "ahi-to-datalake", lambda_config["AHItoDatalake"], datalake_lambda_role.getLambdaRole(), vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahi_to_datalake.getFn().add_environment(key="DESTINATION_BUCKET", value=destination_bucket.bucket_name) 
            fn_ahi_to_datalake.getFn().add_environment(key="POPULATE_INSTANCE_LEVEL", value=str(config.DATALAKE_CONFIG["populate_instance_level"])) 
            fn_ahi_to_datalake.getFn().add_environment(key="AHLI_ENDPOINT", value="") #08/27/2023 - jpleger : This is a workaround for the medical-imaging service descriptor, not nice... Will fix soon.
            destination_bucket.grant_read_write(fn_ahi_to_datalake.getFn())
            if config.DATALAKE_CONFIG["deploy_glue_default_config"] == True:
                GlueDatabase(self, "ahi-datalake-db" , datalake_bucket=destination_bucket , stack_name=stack_name)
            
            sqs_queues = SQSQueues(self, "ahi-to-datalake-queue", stack_name+"-ahi-to-datalake-queue", sqs_key)
            rule = Rule(self, "ahi-to-datalake-rule", stack_name+"-ahi-to-datalake-rule", sqs_queues.getQueue(), sqs_queues.getDeadLetterQueue())
            sqs_event_source = lambda_event_source.SqsEventSource(sqs_queues.getQueue() , batch_size=40 , enabled=True , max_batching_window=Duration.seconds(2) , max_concurrency=100 , report_batch_item_failures=True )
            fn_ahi_to_datalake.getFn().add_event_source(sqs_event_source)
            
        # generate CloudFormation stack output
        if (config.VPC["USE_VPC"] == True):
            CfnOutput(self, "ahi-vpc-id", export_name=f"{stack_name}-ahi-vpc-id", value=vpc.vpc_id)
        CfnOutput(self, "ahi-datastore-arn", export_name=f"{stack_name}-ahi-datastore-arn", value=ahi_datastore_arn)
        if config.RDBMS_CONFIG["enabled"] == True:
            CfnOutput(self, "rdbms-cluster-id", export_name=f"{stack_name}-rdbms-database-arn", value=db.getDbCluster().cluster_resource_identifier)
            CfnOutput(self, "rdbms-database-secret-arn", export_name=f"{stack_name}-rdbms-database-secret-arn", value=db_secret_arn)
            CfnOutput(self, "rdbms-database-name", export_name=f"{stack_name}-rdbms-database-name", value=db_name)
            CfnOutput(self, "rdbms-database-security-group", export_name=f"{stack_name}-rdbms-database-security-group", value=aurora_security_group.security_group_id)  
        if config.DATALAKE_CONFIG["enabled"] == True:
            CfnOutput(self, "datalake-destination-bucket", export_name=f"{stack_name}-datalake-destination-bucket", value=destination_bucket.bucket_name)
            
"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Backend stack for the IEP CDK application.
"""

from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_lambda_event_sources as event_source,
    aws_s3_notifications as s3n,
    Duration,
    aws_events as events,
    aws_events_targets as targets,
)
from constructs import Construct
from .network import Vpc
from .security_groups import SecurityGroups
from .database import AuroraServerlessDB
from .function import PythonLambda
from .roles import Roles
from .queues import SQSQueues
from .s3 import S3Bucket
from .custom import CustomLambdaResource
from .greengrass_component import GreenGrassComponent
from .datastore import Datastore
from .ahli_import_role import AhliImportRole

class IepBackend(Stack):

    def __init__(self, scope: Construct, construct_id: str, config: dict, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        ## Get configs and environment variables
        stack_name = Stack.of(self).stack_name.lower()
        vpc_cidr = config.VPC_CIDR
        db_name = config.DB_CONFIG["db_name"]
        db_engine_pause = config.DB_CONFIG["db_engine_pause"]
        db_min_acu_capacity = config.DB_CONFIG["min_acu_capacity"]
        db_max_acu_capacity = config.DB_CONFIG["max_acu_capacity"]
        lambda_config = config.LAMBDA_CONFIG
        ahli_config = config.AHLI_CONFIG
        s3_config = config.S3_CONFIG
        
        region = self.region
        account = self.account

        #VPC and subnets creation.
        vpc = Vpc(self, "Network", vpc_cidr)
        sec_groups = SecurityGroups(self, "Security Groups", vpc=vpc.getVpc())

        #SQS queues creation.
        sqs_queues = SQSQueues(self,"IEP-SQS")
    
        #Aurora Serverless creation.
        self.AuroraDB = AuroraServerlessDB(self,"IEP-Aurora-DB", vpc=vpc.getVpc(), db_name=db_name, aurora_security_group=sec_groups.getAuroraSecGroup() , pause_timeout=db_engine_pause , min_acu_capacity=db_min_acu_capacity , max_acu_capacity=db_max_acu_capacity )
        self.db_secret_arn = self.AuroraDB.getDbCluster().secret.secret_arn

        #MySql DBInit Lambda creation.
        role  = Roles(self, 'LambdaRole', db_secret_arn=self.db_secret_arn , aws_account=account)
        fn_db_init = PythonLambda(self, "IEP-DB-Init", lambda_config["DbInit"], role.getRole(), vpc=vpc.getVpc(), vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
        fn_db_init.getFn().add_environment(key="DB_SECRET", value=self.db_secret_arn)

        #Create the database.
        iep_schema = CustomLambdaResource(self, "db-schema", fn_db_init.getFn())
        
        # Run custom resource to add Postgres schema after Aurora Postgres is complete
        iep_schema.cr.node.add_dependency(self.AuroraDB)

        #DICOM profile lambda.
        fn_dicom_profiler = PythonLambda(self, "IEP-DICOM-Profiler", lambda_config["DICOMProfiler"], role.getRole(), vpc=vpc.getVpc(), vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
        fn_dicom_profiler.getFn().add_environment(key="DB_SECRET", value=self.db_secret_arn)           
        dicom_profiler_event_source = event_source.SqsEventSource(sqs_queues.getDICOMProfilerQueue() , batch_size=40 , enabled=True , max_batching_window=Duration.seconds(2) , max_concurrency=100 , report_batch_item_failures=True ) 
        fn_dicom_profiler.getFn().add_event_source(dicom_profiler_event_source)

        self.buckets= S3Bucket(self, "IEP-Buckets" , s3_acceleration = s3_config['s3_acceleration'])

        self.buckets.getDICOMBucket().add_object_created_notification(s3n.SqsDestination(sqs_queues.getDICOMProfilerQueue()))
        self.buckets.getDICOMBucket().grant_read_write(role.getRole())

        #GreenGrass component
        self.gg_component = GreenGrassComponent(self, "IEP-GG-Component",  dicom_destination_bucket=self.buckets.getDICOMBucket() , s3_acceleration= s3_config['s3_acceleration'] )

        #Create the AHLI datastore and import role  anf functions if AHLI is enabled.
        if (ahli_config["ahli_enabled"] == True):

            
            #Create the AHLI datastore via a custom resource calling the ahli_create_datastore lambda.
            fn_create_ahli_datastore = PythonLambda(self, "IEP-AHLI-Datastore", lambda_config["CreateAHLIDatastore"], role.getRole(), vpc=vpc.getVpc(), vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_create_ahli_datastore.getFn().add_environment(key="DB_SECRET", value=self.db_secret_arn)   
            ahliDatastore = Datastore(self, "IEP-create-datastore", fn_create_ahli_datastore.getFn())
            ahliDatastore.custom_resource.node.add_dependency(iep_schema.cr)
            
            #Create the AHLI import role.
            ahli_import_role = AhliImportRole(self, "IEP-AHLI-Import-Role", role_name=f"{stack_name}-AHLIImportRole" , s3_dicom_bucket_arn=self.buckets.getDICOMBucket().bucket_arn , ahli_datastore_arn=f"arn:aws:medical-imaging:{region}:{account}:datastore/"+ahliDatastore.getDatastoreId())

            #Create the recurring function to import DICOM data in the AHLI datastore.
            fn_ahli_job_processor = PythonLambda(self, "IEP-AHLI-job-processor", lambda_config["AhliJobProcessor"], role.getRole(), vpc=vpc.getVpc(), vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() )
            fn_ahli_job_processor.getFn().add_environment(key="DB_SECRET", value=self.db_secret_arn)  
            fn_ahli_job_processor.getFn().add_environment("AHLI_IMPORT_ROLE_ARN", ahli_import_role.getAhliImportRoleArn())
            #Add a rule for the Lambda function to run every minute.
            rule = events.Rule(self, "Rule", schedule=events.Schedule.rate(Duration.minutes(1)), targets=[targets.LambdaFunction(fn_ahli_job_processor.getFn())])
 
            #Create the AHLI import job creation lambda. This ambda is triggered by the edge device notification.
            self.fn_ahli_import_job_creator = PythonLambda(self, "IEP-AHLI-import-job-creator", lambda_config["AhliCreateImportJob"], role.getRole(), vpc=vpc.getVpc(), vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS) , security_group=sec_groups.getLambdaSecGroup() ) 
            self.fn_ahli_import_job_creator.getFn().add_environment(key="DB_SECRET", value=self.db_secret_arn)     
            self.fn_ahli_import_job_creator.getFn().add_environment(key="AHLI_DATASTORE_ID", value=ahliDatastore.getDatastoreId())    

        
        

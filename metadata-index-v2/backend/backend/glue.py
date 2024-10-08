"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates Glue database, tables and crawler for the application.
"""

from constructs import Construct
import datalake_tables_config as tables_config
import  aws_cdk.aws_glue_alpha as glue_alpha
from aws_cdk import (
    aws_s3 as s3,
    aws_glue as glue,
    aws_iam as iam)



class GlueDatabase(Construct):
    
    def __init__(self, scope: Construct, id: str, datalake_bucket : s3.IBucket , stack_name: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        database = glue_alpha.Database(self,id='ahi-index-glue-database',database_name=stack_name+"-ahi-index")
        patient_cols = []
        partitions = []
        for col in tables_config.patient_table_columns:
            try:
                if(col['PartitionKey']):
                    partitions.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))
            except:
                patient_cols.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))

        patient_table = glue_alpha.Table( self, "ahi-index-glue-table-patient",
                                    bucket=datalake_bucket,
                                    s3_prefix="patient/",
                                    database=database,
                                    columns=patient_cols,
                                    data_format=glue_alpha.DataFormat.JSON,
                                    description="Patient table",
                                    table_name="patient",
                                    partition_keys=partitions
                                )

        study_cols = []
        partitions = []
        for col in tables_config.study_table_columns:
            try:
                if(col['PartitionKey']):
                    partitions.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))
            except:
                study_cols.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))

        study_table = glue_alpha.Table( self, "ahi-index-glue-table-study",
                                    bucket=datalake_bucket,
                                    s3_prefix="study/",
                                    database=database,
                                    columns=study_cols,
                                    data_format=glue_alpha.DataFormat.JSON,
                                    description="Study table",
                                    table_name="study",
                                    partition_keys=partitions
                                )

        series_cols = []
        partitions = []
        for col in tables_config.series_table_columns:
            try:
                if(col['PartitionKey']):
                    partitions.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))
            except:
                series_cols.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))

        series_table = glue_alpha.Table( self, "ahi-index-glue-table-series",
                                    bucket=datalake_bucket,
                                    s3_prefix="series/",
                                    database=database,
                                    columns=series_cols,
                                    data_format=glue_alpha.DataFormat.JSON,
                                    description="Series table",
                                    table_name="series",
                                    partition_keys=partitions
                                )

        instance_cols = []
        partitions = []
        for col in tables_config.instance_table_columns:
            try:
                if(col['PartitionKey']):
                    partitions.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))
            except:
                instance_cols.append(glue_alpha.Column(name=col['Name'], type=glue_alpha.Type(input_string=col['Type'], is_primitive=True)))

        instance_table = glue_alpha.Table( self, "ahi-index-glue-table-instance",
                                    bucket=datalake_bucket,
                                    s3_prefix="instance/",
                                    database=database,
                                    columns=instance_cols,
                                    data_format=glue_alpha.DataFormat.JSON,
                                    description="Instance table",
                                    table_name="instance",
                                    partition_keys=partitions,
                                    # partition_indexes =[ glue_alpha.PartitionIndex(index_name="seriesinsatnceuid", key_names=["seriesinstanceuid"])]
                                )

        # Create a Glue Crawler
        crawler_role = iam.Role(self, 'ahi-index-crawler-role', role_name = 'ahi-index-crawler-role', assumed_by=iam.ServicePrincipal('glue.amazonaws.com'), managed_policies=[iam.ManagedPolicy.from_aws_managed_policy_name('service-role/AWSGlueServiceRole')])
        datalake_bucket.grant_put(crawler_role)
        datalake_bucket.grant_read(crawler_role)
        crawler = glue.CfnCrawler(
            self, "ahi-index-glue-crawler",
            name=stack_name+"-table-crawler",
            schema_change_policy=glue.CfnCrawler.SchemaChangePolicyProperty(
                delete_behavior="LOG",
                update_behavior="LOG",
                
                 
            ),
            configuration='{"Version": 1.0,"CrawlerOutput": {"Partitions": { "AddOrUpdateBehavior": "InheritFromTable" }}}',
            database_name=database.database_name,
            role=crawler_role.role_arn,
            targets=glue.CfnCrawler.TargetsProperty(
                catalog_targets= [
                    glue.CfnCrawler.CatalogTargetProperty(
                        database_name=database.database_name,
                        tables=[
                            patient_table.table_name,
                            study_table.table_name,
                            series_table.table_name,
                            instance_table.table_name
                ])
                ]
            ),
        )
    
        trigger =glue.CfnTrigger(self, "ahi-index-glue-trigger",
            type="SCHEDULED",
            name=stack_name+"-table-crawler-trigger",
            schedule="cron(0 * * * ? *)",
            start_on_creation= True,
            actions=[
                glue.CfnTrigger.ActionProperty(
                    crawler_name=crawler.name
                )
            ]
        )
        


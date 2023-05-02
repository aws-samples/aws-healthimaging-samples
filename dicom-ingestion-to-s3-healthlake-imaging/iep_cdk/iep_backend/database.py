"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates Aurora Serverless database for the IEP CDK application.
"""

from constructs import Construct
from aws_cdk import (
    Duration,
    RemovalPolicy,
    aws_rds as rds,
    aws_ec2 as ec2,
)


class AuroraServerlessDB(Construct):
    
    def __init__(self, scope: Construct, id: str, vpc: ec2.Vpc, db_name: str, aurora_security_group: ec2.SecurityGroup, pause_timeout: int,  min_acu_capacity: str, max_acu_capacity: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        self._subnetGroup = rds.SubnetGroup(self, "IEP-Aurora-Subnet-Group", vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS), description="IEP Aurora DB Subnet Group")
        self._scalingOptions = rds.ServerlessScalingOptions(auto_pause=Duration.minutes(pause_timeout), min_capacity=rds.AuroraCapacityUnit.ACU_1 , max_capacity=rds.AuroraCapacityUnit.ACU_64)
        self._db_adminpassword = rds.Credentials.from_generated_secret(username="admin")
        
        self._dbCluster = rds.ServerlessCluster(
            self, 
            "IEP-DBCluster", 
            engine=rds.DatabaseClusterEngine.AURORA_MYSQL,
            vpc=vpc,
            default_database_name=db_name,
            security_groups=[aurora_security_group,],
            credentials=self._db_adminpassword,
            subnet_group=self._subnetGroup,
            scaling=self._scalingOptions,
            enable_data_api=True
        )

    def getDbCluster(self) -> rds.ServerlessCluster:
        return self._dbCluster
            
"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates Aurora Serverless database for the application.
"""

from constructs import Construct
from aws_cdk import (
    Duration,
    RemovalPolicy,
    aws_rds as rds,
    aws_ec2 as ec2,
    Stack,
)


class AuroraServerlessDB(Construct):
    
    def __init__(self, scope: Construct, id: str, vpc: ec2.Vpc, db_name: str, aurora_security_group: ec2.SecurityGroup, min_acu_capacity: int, max_acu_capacity: int, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        stack_name = Stack.of(self).stack_name.lower()
        self._subnetGroup = rds.SubnetGroup(self, "ahi-index-Aurora-Subnet-Group", vpc=vpc, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS), description="ahi index Aurora DB Subnet Group")
        self._db_adminpassword = rds.Credentials.from_generated_secret(username="admin")
        
        self._dbCluster = rds.DatabaseCluster(
            self, 
            "ahi-index-DBCluster",
            engine=rds.DatabaseClusterEngine.aurora_mysql( version=rds.AuroraMysqlEngineVersion.of('8.0.mysql_aurora.3.04.0')),
            parameter_group=rds.ParameterGroup.from_parameter_group_name(self, "ahi-index-db-cluster-ParameterGroup", parameter_group_name="default.aurora-mysql8.0"),
            cluster_identifier=stack_name+"-ahi-index-db-cluster",
            default_database_name=db_name,
            security_groups=[aurora_security_group,],
            credentials=self._db_adminpassword,
            subnet_group=self._subnetGroup,
            deletion_protection=True,
            removal_policy=RemovalPolicy.SNAPSHOT,
            storage_encrypted=True,
            iam_authentication=True,
            backtrack_window=Duration.hours(24),
            writer=rds.ClusterInstance.serverless_v2("writer"),
            readers=[rds.ClusterInstance.serverless_v2("reader1", scale_with_writer=True)],
            serverless_v2_min_capacity=8,
            serverless_v2_max_capacity=64,
            vpc=vpc
        )
        self._dbCluster.node.default_child.add_property_override('ServerlessV2ScalingConfiguration', {"MinCapacity": min_acu_capacity, "MaxCapacity": max_acu_capacity})
        #self._dbCluster.add_rotation_single_user(exclude_characters="\"@/\\" , vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS))

    def getDbCluster(self) -> rds.DatabaseCluster:
        return self._dbCluster
            
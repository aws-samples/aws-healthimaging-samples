"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Generates Security groups for the lambda functions and Aurora cluster.
"""


from constructs import Construct
import aws_cdk as cdk
from aws_cdk import aws_ec2 as ec2
import aws_cdk.aws_logs as logs
from aws_cdk import (aws_iam as iam , Stack )

class SecurityGroups(Construct):
    _lambda_secgroup = None
    _aurora_secgroup = None
    def __init__(self, scope: Construct, id: str,  vpc: ec2.Vpc, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        stack_name = Stack.of(self).stack_name.lower()
        self._lambda_secgroup = ec2.SecurityGroup(self, "ahi-index-Lambdas-SG" , vpc=vpc , allow_all_outbound=True, description="Lambdas security group." , security_group_name=f"{stack_name}-Lambdas-SG" )
        self._aurora_secgroup = ec2.SecurityGroup(self, "ahi-index-Aurora-SG" , vpc=vpc , allow_all_outbound=True, description="Aurora MYSQL security group." , security_group_name=f"{stack_name}-Aurora-SG" )

        #This allows members of Lambdas security groups to access to resources in Aurora security group.
        self._aurora_secgroup.add_ingress_rule(peer=ec2.Peer.security_group_id(self._lambda_secgroup.security_group_id) ,connection=ec2.Port.tcp(3306) , description=f"Allows connection to RDS")

    def getLambdaSecGroup(self):
        return self._lambda_secgroup
    
    def getAuroraSecGroup(self):
        return self._aurora_secgroup
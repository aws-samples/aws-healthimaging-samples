"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Generates Lambdas functions for the application.
"""

from constructs import Construct
from aws_cdk import (
    aws_logs as logs,
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_lambda as lambda_,
    aws_lambda_python_alpha as aws_lambda_python,
    Duration as Duration,
)


class PythonLambda(Construct):
    def __init__(self, scope: Construct, id: str, config, role: iam.Role, vpc: ec2.Vpc = None , vpc_subnets: ec2.SubnetSelection = None, security_group: ec2.SecurityGroup = None, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        layers = []
        for l in config["layers"]:         
            layers.append( aws_lambda_python.PythonLayerVersion(self, "ahi-to-index-"+l,
                #code=lambda_.Code.from_asset("lambda_layer/"+l),
                entry="lambda_layer/"+l,
                compatible_runtimes=[lambda_.Runtime.PYTHON_3_11],
                license="Apache-2.0",
                description=""
            ))
        if ((vpc is None) or (vpc_subnets is None) or (security_group is None)):  #Building lambda wihtout any VPC.
            self._fn = lambda_.Function(self, id,
                runtime=lambda_.Runtime.PYTHON_3_11,
                handler=config["index"]+"."+config["handler"],
                code=lambda_.Code.from_asset(config["entry"]),
                layers=layers,
                role=role,
                reserved_concurrent_executions=None,
                timeout= Duration.minutes(int(config["timeout"])),
                memory_size=config["memory"]
            )           
        else: 
            self._fn = lambda_.Function(self, id,
                runtime=lambda_.Runtime.PYTHON_3_11,
                handler=config["index"]+"."+config["handler"],
                code=lambda_.Code.from_asset(config["entry"]),
                layers=layers,
                role=role,
                vpc=vpc,
                vpc_subnets=vpc_subnets,
                security_groups=[security_group,],
                reserved_concurrent_executions=None,
                timeout= Duration.minutes(int(config["timeout"])),
                memory_size=config["memory"]
            )

        for env in config["envs"]:
            self._fn.add_environment(key=str(env), value=str(config["envs"][env]))

    def getFn(self) -> lambda_.Function :
        return self._fn
"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Generates Lambdas functions for the IEP CDK application.
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
    def __init__(self, scope: Construct, id: str, config, role: iam.Role, vpc: ec2.Vpc , vpc_subnets: ec2.SubnetSelection, security_group: ec2.SecurityGroup, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        layers = []
        for l in config["layers"]:
            #layers.append(lambda_.LayerVersion(self, l, entry="lambda_layer/"+l , compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],))
                #code=lambda_.Code.from_asset(path.join(__dirname, "layer-code")),
            
            layers.append( aws_lambda_python.PythonLayerVersion(self, "IEP-"+l,
                #code=lambda_.Code.from_asset("lambda_layer/"+l),
                entry="lambda_layer/"+l,
                compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
                license="Apache-2.0",
                description="A layer to test the L2 construct"
            ))
        self._fn = lambda_.Function(self, "MyFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
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

        # for priv in config["privileges"]:
        #     if(priv["effect"].upper() == 'ALLOW'):
        #         iam_effect = iam.Effect.ALLOW
        #     policy = iam.PolicyStatement(
        #         effect = iam_effect,
        #         actions = priv["actions"],
        #         resources = priv["resources"]
        #         )
        #     self._fn.add_to_role_policy(policy)

        for env in config["envs"]:
            self._fn.add_environment(key=str(env), value=str(config["envs"][env]))

    def getFn(self) -> lambda_.Function :
        return self._fn
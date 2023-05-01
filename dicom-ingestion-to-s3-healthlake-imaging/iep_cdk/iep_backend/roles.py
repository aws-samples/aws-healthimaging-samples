"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates IAM Roles for the Lambda functions.
"""

from constructs import Construct
from aws_cdk import (aws_iam as iam , Stack)

class Roles(Construct):


    _TaskRole = None

    def __init__(self, scope: Construct, id: str, db_secret_arn: str, aws_account: str , **kwargs) -> None :
        super().__init__(scope, id, **kwargs)  
        stack_name = Stack.of(self).stack_name.lower()
        self._TaskRole = iam.Role(self, "Role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="This Role is used by the Lambdas to access to subnets."
        )


        db_secret_policy_statement = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = ['secretsmanager:GetSecretValue'],
                    resources = [db_secret_arn]
                    )
        ahli_policy_statement = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = ['medical-imaging:*'],
                    resources = ['*']
                    )
        iam_passrole_statement = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = ['iam:PassRole'],
                    resources = ['*']
                    )
        self._TaskRole.add_to_policy(db_secret_policy_statement)
        self._TaskRole.add_to_policy(ahli_policy_statement)
        self._TaskRole.add_to_policy(iam_passrole_statement)
        self._TaskRole.add_managed_policy(iam.ManagedPolicy.from_managed_policy_arn(self, 'LambdaVPC','arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'))

        self._GGinstallerRole = iam.Role(self, "GGInstallerRole",
            assumed_by=iam.AccountPrincipal(aws_account),
            description="This Role is used to create STS credentials to install the IOT device.",
            role_name=f"{stack_name}-GGInstallerRole"
        )

        gginstaller_CreateTokenExchangeRole = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = [ "iam:AttachRolePolicy",
                                "iam:CreatePolicy",
                                "iam:CreateRole",
                                "iam:GetPolicy",
                                "iam:GetRole",
                                "iam:PassRole"
                            ],
                    resources = [   f"arn:aws:iam::*:role/{stack_name}-*-GG-Role",
                                    f"arn:aws:iam::*:policy/{stack_name}-*-GG-RoleAccess"
                                ]
                    )

        gginstaller_CreateIoTResources = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = [ "iot:AddThingToThingGroup",
                                "iot:AttachPolicy",
                                "iot:AttachThingPrincipal",
                                "iot:CreateKeysAndCertificate",
                                "iot:CreatePolicy",
                                "iot:CreateRoleAlias",
                                "iot:CreateThing",
                                "iot:CreateThingGroup",
                                "iot:DescribeEndpoint",
                                "iot:DescribeRoleAlias",
                                "iot:DescribeThingGroup",
                                "iot:GetPolicy"
                            ],
                    resources = ["*"]
                    )

        gginstaller_DeployDevTools = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = [ "greengrass:CreateDeployment",
                                "iot:CancelJob",
                                "iot:CreateJob",
                                "iot:DeleteThingShadow",
                                "iot:DescribeJob",
                                "iot:DescribeThing",
                                "iot:DescribeThingGroup",
                                "iot:GetThingShadow",
                                "iot:UpdateJob",
                                "iot:UpdateThingShadow"
                            ],
                    resources = ["*"]
                    )
        self._GGinstallerRole.add_to_policy(gginstaller_CreateTokenExchangeRole)
        self._GGinstallerRole.add_to_policy(gginstaller_CreateIoTResources)
        self._GGinstallerRole.add_to_policy(gginstaller_DeployDevTools)


    def getRoleArn(self) -> str:
        return self._TaskRole.role_arn
    
    def getRole(self) -> iam.Role:
        return self._TaskRole

    def getGGInstallerRole(self) -> iam.Role:
        return self._GGinstallerRole
    
    def getGGinstallerRole(self) -> iam.Role:
        return self._GGinstallerRole
    
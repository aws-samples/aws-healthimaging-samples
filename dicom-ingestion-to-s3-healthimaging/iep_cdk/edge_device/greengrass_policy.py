"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates the Greengrass Policy for the IEP Edgde device.
"""

from constructs import Construct
from aws_cdk import (
    aws_iam as iam,    
    aws_iot as iot        
)

class GreengrassPolicy(Construct):
    def __init__(   self,
                    scope: Construct,
                    id: str,
                    edge_device_name: str,
                    sqs_inbound_queue_arn: str,
                    sqs_outbound_queue_arn: str,
                    sqs_receiver_queue_arn: str,
                    s3_dicom_bucket_arn: str,
                    s3_iot_artifacts_bucket_arn: str,
                     **kwargs) -> None :
        super().__init__(scope, id, **kwargs)  


        sqs_policy = iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "sqs:DeleteMessage",
                        "sqs:ReceiveMessage",
                        "sqs:SendMessage",
                        "sqs:GetQueueUrl",
                        "sqs:GetQueueAttributes",
                    ],
                    resources=[
                            sqs_inbound_queue_arn,
                            sqs_outbound_queue_arn,  
                            sqs_receiver_queue_arn
                            ]
                )
        s3_dicom_policy = iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "s3:PutObject",
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:DeleteObject",
                    ],
                    resources=  [   s3_dicom_bucket_arn,
                                    s3_dicom_bucket_arn + "/*"
                                ]
                )
        s3_atifact_policy = iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "s3:GetObject",
                        "s3:ListBucket",
                    ],
                    resources=  [   s3_iot_artifacts_bucket_arn,
                                    s3_iot_artifacts_bucket_arn + "/*"
                                ]
                )
        kms_policy = iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "kms:Decrypt",
                        "kms:Encrypt",
                        "kms:GenerateDataKey",
                    ],
                    resources=  ["*"]
                )
        iot_access_policy = iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DescribeLogStreams",
                        "s3:GetBucketLocation"
                    ],
                    resources=  ["*"]
                )

        gg_policy = iam.ManagedPolicy(self, "IEP-GG-Policy", managed_policy_name=f"{edge_device_name}-GG-RoleAccess")
        gg_policy.add_statements(sqs_policy)
        gg_policy.add_statements(s3_dicom_policy)
        gg_policy.add_statements(s3_atifact_policy)
        gg_policy.add_statements(kms_policy)
        gg_policy.add_statements(iot_access_policy)

        greengrass_role = iam.Role(self, "IEP-GG-Role", assumed_by=iam.ServicePrincipal("credentials.iot.amazonaws.com"), role_name=f"{edge_device_name}-GG-Role")
        greengrass_role.add_managed_policy(gg_policy)

        greengrass_role_alias =  iot.CfnRoleAlias(self, "MyCfnRoleAlias",role_arn=greengrass_role.role_arn,role_alias=f"{edge_device_name}-GG-Role-Alias",credential_duration_seconds=3600)


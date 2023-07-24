"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates IAM role related to AHLI import.
"""

from constructs import Construct
from aws_cdk import (aws_iam as iam )

class AhliImportRole(Construct):


    _ahliImportRole = None

    def __init__(self, scope: Construct, id: str, role_name: str, s3_dicom_bucket_arn: str, ahli_datastore_arn,  **kwargs) -> None :
        super().__init__(scope, id, **kwargs)  

        self._ahliImportRole = iam.Role(self, "Role",
            assumed_by=iam.CompositePrincipal(
        iam.ServicePrincipal("medical-imaging.amazonaws.com"),
        iam.ServicePrincipal("us-east-1.gamma.controlplane.gateway.medical-imaging.aws.internal")
        ),
            description="This Role is used by AHLI service to import DICOM data.",
            role_name=role_name
        )

        ahli_service_statement = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = ['medical-imaging:*'],
                    resources = [ahli_datastore_arn]
                    )
        ahli_s3_statement = iam.PolicyStatement(
        effect = iam.Effect.ALLOW,
                    actions = ["s3:GetObject","s3:PutObject","s3:ListBucket", "s3:GetEncryptionConfiguration"],
                    resources = [
                                    s3_dicom_bucket_arn,
                                    s3_dicom_bucket_arn + "/*"
                                ]
                    )
        self._ahliImportRole.add_to_policy(ahli_service_statement)
        self._ahliImportRole.add_to_policy(ahli_s3_statement)


        
        
    def getAhliImportRoleArn(self):
        return self._ahliImportRole.role_arn
    
    def getAhliImportRole(self):
        return self._ahliImportRole


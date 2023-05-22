"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates the S3 Bucketss for the IEP CDK application.
"""

from constructs import Construct

from aws_cdk import (
    RemovalPolicy,
    aws_s3 as s3,
    aws_iam as iam 
)

class S3Bucket(Construct):
    def __init__(self, scope: Construct, id: str, s3_acceleration : bool,  **kwargs) -> None:
        super().__init__(scope, id, **kwargs)


        # self._gui_bucket = s3.Bucket(
        #     self,
        #     "IEP-GUI-Bucket",
        #     encryption=s3.BucketEncryption.S3_MANAGED,
        #     removal_policy=RemovalPolicy.DESTROY,
        #     auto_delete_objects=True,
        #     block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        #     enforce_ssl=True,
        # )

        self._dicom_bucket = s3.Bucket(
            self,
            "IEP-DICOM-Bucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            transfer_acceleration=s3_acceleration
        )

        # self._gg_asset_bucket = s3.Bucket(
        #     self,
        #     "IEP-greengrass-component-Bucket",
        #     encryption=s3.BucketEncryption.S3_MANAGED,
        #     removal_policy=RemovalPolicy.DESTROY,
        #     auto_delete_objects=True,
        #     block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        #     enforce_ssl=True,
        # )


    
    def getDICOMBucket(self) -> s3.Bucket :
        return self._dicom_bucket

    # def getGGAssetBucket(self) -> s3.Bucket :
    #     return self._gg_asset_bucket
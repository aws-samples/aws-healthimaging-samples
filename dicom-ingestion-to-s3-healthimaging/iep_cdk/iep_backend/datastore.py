"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Custom resource for AHLI datastore creation.
"""

from constructs import Construct
from aws_cdk import CustomResource, custom_resources as cr, aws_logs as logs , CfnOutput , aws_lambda as  lambda_ , Stack


class Datastore(Construct):
    def __init__(self, scope: Construct, id: str, lambda_handler : lambda_.Function, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        stack_name = Stack.of(self).stack_name.lower()
        self._datastoreid = None
        self.custom_resource = CustomResource(
            self, "CustomLambdaResource", service_token=lambda_handler.function_arn,resource_type="Custom::AHLIDatastore",
        )
        self._datastoreid = self.custom_resource.get_att_string("datastoreId")
        self._datastoreid
        CfnOutput(self, "DatastoreId", value=self._datastoreid , export_name=f"{stack_name}-DatastoreId")
        
    def getDatastoreId(self) -> str:
        return self._datastoreid
"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates the IoT thing Group for the IEP CDK application.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Duration,
    custom_resources as cr,
    aws_iot as iot,
    Stack
)


class IotThingGroup(Construct):
    
    def __init__(self, scope: Construct, id: str, thingGroupName: str , thingGroupDescription: str , **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        stack_name = Stack.of(self).stack_name.lower()
        thingGroupName = stack_name + "-" + thingGroupName
        self._thingGroup= cr.AwsCustomResource(self, "GetParameter",
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE),
            on_create=cr.AwsSdkCall(
                action="createThingGroup",
                service="Iot",
                parameters={
                    "thingGroupName": thingGroupName,
                    "thingGroupProperties": {
                        "thingGroupDescription": thingGroupDescription
                    }
                },
                physical_resource_id=cr.PhysicalResourceId.of(thingGroupName)
            ),  
            on_delete=cr.AwsSdkCall(
                action="deleteThingGroup",
                service="Iot",
                parameters={
                    "thingGroupName": thingGroupName
                },
                physical_resource_id=cr.PhysicalResourceId.of(thingGroupName)
            )
        )
    def getThingGroupArn(self) -> str:
        return self._thingGroup.get_response_field("thingGroupArn")
        
    def getThingGroup(self) -> str:
        return self._thingGroup
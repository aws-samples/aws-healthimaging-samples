"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Edge device stack entry point.
"""

from constructs import Construct
from aws_cdk import (
    Stack,
    aws_lambda_event_sources as event_source,
    NestedStack,
    aws_iot as iot,
    aws_iam as iam
    
)
from .edgedevice_queue import edgeDeviceSQSQueues
from .greengrass_policy import GreengrassPolicy


class EdgeDevice(NestedStack):

    def __init__(self, scope: Construct, construct_id: str, edge_device_name: str , s3_dicom_bucket_arn: str , s3_iot_bucket_arn: str, parameters=None, timeout=None, notificationArns=None, removalPolicy=None, description=None):
        super().__init__(scope, construct_id )
        self.edge_queues = edgeDeviceSQSQueues(self,"IEP-edge-device-queues", edge_device_name)
        self.inbound_notif = event_source.SqsEventSource(self.edge_queues.getInboundNotifQueue(), batch_size=10)
        self.outbound_notif = event_source.SqsEventSource(self.edge_queues.getOutboundNotifQueue(), batch_size=10)
        self.receiver = event_source.SqsEventSource(self.edge_queues.getReceiverQueue())
        greengrass_policy = GreengrassPolicy(self, "IEP-GG-Policy", edge_device_name=edge_device_name, sqs_inbound_queue_arn=self.edge_queues.getInboundNotifQueue().queue_arn , sqs_outbound_queue_arn=self.edge_queues.getOutboundNotifQueue().queue_arn , sqs_receiver_queue_arn=self.edge_queues.getReceiverQueue().queue_arn , s3_dicom_bucket_arn=s3_dicom_bucket_arn , s3_iot_artifacts_bucket_arn=s3_iot_bucket_arn)

    def getInboundNotifEventSource(self):
        return self.inbound_notif

    def getoutboundNotifEventSource(self):
        return self.outbound_notif

    def getReceiverEentSource(self):
        return self.receiver
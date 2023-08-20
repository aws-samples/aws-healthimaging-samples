"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates the SQS queue for the Edge Device.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Duration,
    aws_sqs as sqs,
)

class edgeDeviceSQSQueues(Construct):

    def __init__(self, scope: Construct, id: str, edge_device_id: str , **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        self._inbound_notification_queue = sqs.Queue(self,
                                            edge_device_id + "_inbound.fifo",
                                            encryption=sqs.QueueEncryption.KMS,
                                            retention_period=Duration.days(14),
                                            queue_name=edge_device_id+"_inbound.fifo",
                                            fifo=True,
                                            content_based_deduplication=False,
                                            delivery_delay=Duration.seconds(0),
                                            visibility_timeout=Duration.minutes(1)
                                            )

        self._outbound_notification_queue = sqs.Queue(self,
                                            edge_device_id + "_outbound.fifo",
                                            encryption=sqs.QueueEncryption.KMS,
                                            retention_period=Duration.days(14),
                                            queue_name=edge_device_id+"_outbound.fifo",
                                            fifo=True,
                                            content_based_deduplication=False,
                                            delivery_delay=Duration.seconds(0),
                                            visibility_timeout=Duration.minutes(1)
                                            )

        self._receiver_queue = sqs.Queue(self,
                                            edge_device_id + "_receiver.fifo",
                                            encryption=sqs.QueueEncryption.KMS,
                                            retention_period=Duration.days(14),
                                            queue_name=edge_device_id+"_receiver.fifo",
                                            fifo=True,
                                            content_based_deduplication=False,
                                            delivery_delay=Duration.seconds(0),
                                            visibility_timeout=Duration.minutes(1)
                                            )

    def getInboundNotifQueue(self) -> sqs.Queue:
        return self._inbound_notification_queue
    
    def getOutboundNotifQueue(self) -> sqs.Queue:
        return self._outbound_notification_queue

    def getReceiverQueue(self) -> sqs.Queue:
        return self._receiver_queue
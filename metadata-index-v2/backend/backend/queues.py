"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Generates SQS queues for the application.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_kms as kms,
    aws_sqs as sqs,
    Duration as Duration,
)

class SQSQueues(Construct):

    def __init__(self, scope: Construct, id: str, display_name: str, encryption_master_key: kms.IKey, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        self._dead_letter_queue = sqs.Queue(self, 
                                            id+"-dl",
                                            encryption=sqs.QueueEncryption.KMS,
                                            encryption_master_key=encryption_master_key,
                                            enforce_ssl=True,
                                            retention_period=Duration.days(14),
                                            queue_name=display_name+"-dl",
                                            removal_policy=cdk.RemovalPolicy.DESTROY,
                                            )
        self._queue = sqs.Queue(self,
                                id,
                                dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=10, queue=self._dead_letter_queue),
                                encryption=sqs.QueueEncryption.KMS,
                                encryption_master_key=encryption_master_key,
                                enforce_ssl=True,
                                queue_name=display_name,
                                retention_period=Duration.days(14),
                                visibility_timeout=Duration.minutes(2),
                                removal_policy=cdk.RemovalPolicy.DESTROY,
                                )


    def getQueue(self) -> sqs.Queue:
        return self._queue
        
    
    def getDeadLetterQueue(self) -> sqs.Queue:
        return self._dead_letter_queue
        
        
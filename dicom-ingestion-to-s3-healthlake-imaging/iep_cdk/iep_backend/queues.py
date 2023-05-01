"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates SQS queues for the IEP CDK application backend.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Duration,
    aws_sqs as sqs,
    Stack,
)

class SQSQueues(Construct):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        stack_name = Stack.of(self).stack_name.lower()
        self._dead_letter_queue = sqs.Queue(self, 
                                            f"{stack_name}-iep-s3-to-rds-dl",
                                            encryption=sqs.QueueEncryption.KMS,
                                            retention_period=Duration.days(14),
                                            queue_name=f"{stack_name}-iep-s3-to-rds-dl"
                                            )
        self._dicom_profiler = sqs.Queue(  self,
                                    f"{stack_name}-iep-s3-to-rds",
                                    dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=10, queue=self._dead_letter_queue),
                                    encryption=sqs.QueueEncryption.KMS,
                                    queue_name=f"{stack_name}-iep-s3-to-rds",
                                    retention_period=Duration.days(14),
                                    visibility_timeout=Duration.minutes(2),
                                    
                                )


    def getDICOMProfilerQueue(self) -> sqs.Queue:
        return self._dicom_profiler
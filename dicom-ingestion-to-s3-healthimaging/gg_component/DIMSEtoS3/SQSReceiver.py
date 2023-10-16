import boto3
import os
import collections
from time import sleep
from threading import Thread
import collections
import logging
import sqs_extended_client

class SQSReceiver:

    session = None
    status = 'idle'
    EdgeId = None
    SendJobQueue = None
    sqs = None
    sqs_extended_bucket_name = None


    def __init__(self, EdgeId ,sqs_bucket):
        try:
            self.aws_access_key_id = os.environ['AWS_ACCESS_KEY']
            self.aws_secret_access_key = os.environ['AWS_SECRET_KEY']
            self.region_name = os.environ['REGION_NAME']
            self.session = boto3.Session(self.aws_access_key_id,self.aws_secret_access_key, region_name=self.region_name)
            self.sqs = self.session.resource('sqs')
            self.sqs_extended_bucket_name = sqs_bucket
        
        except:
            logging.warning("[SQSReceiver][__init__] - No AWS IAM credentials provided defaulting to greengrass authentication provider")    
            try:
                self.region_name = os.environ['AWS_REGION']
                self.session = boto3.Session()
                self.sqs = self.session.resource(service_name='sqs', region_name=self.region_name)      
                    
            except:
                logging.error("[SQSReceiver][__init__] - There was an issue creating an boto3 session.")  

        self.EdgeId = EdgeId
        self.SendJobQueue = collections.deque([])

    def ReceiveFromQueue(self):
        queue_name= self.EdgeId+'_receiver.fifo'
        #logging.warning("Connecting to queue : "+ queue_name) 
        queue = self.sqs.get_queue_by_name(QueueName=queue_name)
        queue.large_payload_support = self.sqs_extended_bucket_name
        # receive message and delete after processing
        messages = queue.receive_messages( MaxNumberOfMessages=10,WaitTimeSeconds=1)
        for message in messages:
            logging.debug("[SQSReceiver][ReceiveFromQueue] - Message received : "+str(message))
            self.SendJobQueue.append(message.body)
            message.delete()
        
    def GetSendJobs(self):
        sendjobs = []
        while(len(self.SendJobQueue) > 0):
            sendjobs.append(self.SendJobQueue.popleft())
        return sendjobs

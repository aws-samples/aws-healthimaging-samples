import boto3
import os
import collections
from time import sleep
from threading import Thread
import uuid
import logging 
import sqs_extended_client


class SQSManager:

    session = None
    status = 'idle'
    DICOMInstancetoSend = None
    DICOMInstanceSent = None
    InstanceId= None
    EdgeId = None
    sqs = None
    SqsJobs = None
    queuename = ""
    sqs_extended_bucket_name = None

    def __init__(self, EdgeId , qname, sqs_bucket):
        try:
            self.aws_access_key_id = os.environ['AWS_ACCESS_KEY']
            self.aws_secret_access_key = os.environ['AWS_SECRET_KEY']
            self.region_name = os.environ['REGION_NAME']
            self.session = boto3.Session(self.aws_access_key_id,self.aws_secret_access_key , region_name=self.region_name)
            self.sqs = self.session.resource('sqs')
        except:
            logging.warning("No AWS IAM credentials provided defaulting to greengrass authentication provider")    
            try:
                self.session = boto3.Session()
                self.region_name = os.environ['AWS_REGION']
                self.sqs = self.session.resource(service_name='sqs', region_name=self.region_name)                   
            except BaseException as err:
                logging.error("There was an issue creating an boto3 session : "+str(err))  
        self.sqs_extended_bucket_name = sqs_bucket
        self.SqsJobs = collections.deque([])
        self.EdgeId = EdgeId
        self.queuename = EdgeId+"_"+qname+".fifo"
        thread = Thread(target = self.ProcessMsgs, args = ( ))
        thread.start()



    def AddSendJob(self, sqsjob):
        self.SqsJobs.append(sqsjob)


    def ProcessMsgs(self):
        logging.warning("[SQSManager][InitializeQueue] - Initializing queue : "+self.queuename)
        self.queue = self.sqs.get_queue_by_name(QueueName=self.queuename)
        self.queue.large_payload_support = self.sqs_extended_bucket_name
        logging.warning("[SQSManager][InitializeQueue] - Queue "+self.queuename+" parameters :"+str(self.queue.large_payload_support)+" "+str(self.queue.message_size_threshold))
        while(True):
            if(len(self.SqsJobs) > 0):
                sqsjob = self.SqsJobs.popleft()
                try:
                    response = self.queue.send_message(
                        DelaySeconds=0,
                        MessageAttributes={
                            'EdgeID': {
                                'DataType': 'String',
                                'StringValue': self.EdgeId
                            },  
                        },
                        MessageBody=(sqsjob),
                        MessageGroupId='unset',
                        MessageDeduplicationId=str(uuid.uuid4())
                    )
                    logging.debug("Message posted : "+response['MessageId']+" to "+self.queuename+" : "+sqsjob  )
                except Exception as e:
                    logging.error("[SQSManager][SendtoQueue][ERROR] - ",e)
            else:
                sleep(0.2)
       
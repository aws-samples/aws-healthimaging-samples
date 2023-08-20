import boto3
from botocore.config import Config
import os
import collections
from time import sleep
from threading import Thread
from os.path import exists
import logging
import multiprocessing
from multiprocessing import Process, Queue

class S3FetchManager:

    session = None
    s3 = None
    status = 'idle'
    FetchJobs = multiprocessing.Queue()
    FetchJobsCompleted = multiprocessing.Queue()
    InstanceId= None
    EdgeId = None
    bucket_name = None
    config = Config(s3={"use_accelerate_endpoint": False})

    def __init__(self, InstanceId, EdgeId ,  bucketname , s3_transfer_acceleration : bool = False):

        
        self.bucket_name = bucketname
        self.InstanceId = InstanceId
        self.EdgeId = EdgeId
        FetchJobs = multiprocessing.Queue()
        FetchJobsCompleted = multiprocessing.Queue()
        self.config = Config(s3={"use_accelerate_endpoint": s3_transfer_acceleration, })

        try:
            self.aws_access_key_id = os.environ['AWS_ACCESS_KEY']
            self.aws_secret_access_key = os.environ['AWS_SECRET_KEY']
            self.session = boto3.Session(self.aws_access_key_id,self.aws_secret_access_key)
            self.s3 = self.session.resource('s3' , config=self.config)

        except:          # we might be in greengrass mode :
            logging.warning("No AWS IAM credentials provided defaulting to greengrass authentication provider")    
            try:
                self.session = boto3.Session()
                self.s3 = self.session.resource('s3' , config=self.config)            
            except:
                print("There was an issue creating an boto3 session.")   
        
        p = Process(target=self.ProcessJobs , args = ( self.FetchJobs , self.FetchJobsCompleted))
        p.start()
        
    def AddFetchJob(self,FetchJob):
            self.FetchJobs.put(FetchJob)
            logging.debug("[S3FetchManager][__Fetchfile]["+self.InstanceId+"] - Fetch Job added "+str(FetchJob[0])+".")

    def ProcessJobs(self, FetchJobs : multiprocessing.Queue , FetchJobsCompleted : multiprocessing.Queue ):
        #We will do 2 things here : 
            # Create the database entries.
            # Set the status of the Jobs as ready to send, another in th eparent main will take care of pushing the file to the DICOM destination.        
        while(True):
            #print("Looking for new S3 fetch jobs.")
            if not FetchJobs.empty():
                self.status="busy"
                try:
                    entry = self.FetchJobs.get()
                    folder = os.getcwd()+"/in/"+entry[0]+"/"+entry[3]+"/"+entry[4]
                    try:
                        os.makedirs(folder)
                    except BaseException as err:
                        logging.error("[S3FetchManager][Processjobs]["+self.InstanceId+"] - "+str(err))
                        pass
                    #s3key = entry[9]+"/"+entry[3]+"/"+entry[4]+"/"+entry[5]+".dcm"
                    s3key = entry[9]+"/"+entry[5]+".dcm"
                    destination=entry[6]
                    logging.info(s3key)
                    logging.info(destination)
                    logging.info("[S3FileManager][GetInstancesFetched]["+self.InstanceId+"] - Attempting S3 fetch from bucket: "+self.bucket_name+" Key: "+s3key+ " to "+destination)
                    self.s3.Bucket(self.bucket_name).download_file(s3key ,destination)
                    FetchJobsCompleted.put(entry)
                except Exception as e:
                    logging.error("[S3FetchManager][Processjobs]["+self.InstanceId+"] - Could not copy the file from S3 "+str(e))
            else:
                self.status = 'idle'    
                sleep(0.1)

    def GetInstancesFetched(self):
        if not self.FetchJobsCompleted.empty():
            obj = self.FetchJobsCompleted.get()
            logging.debug("[S3FileManager][GetInstancesFetched]["+self.InstanceId+"] - returning Obj : "+str(obj[0]))
            return obj
        else:
            return None
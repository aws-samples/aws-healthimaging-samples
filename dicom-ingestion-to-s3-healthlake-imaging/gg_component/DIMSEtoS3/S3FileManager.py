import boto3
from botocore.config import Config
import os
import collections
from time import sleep
from threading import Thread
import logging
import multiprocessing
from multiprocessing import Process, Queue


class S3FileManager:

    session = None
    s3 = None
    status = 'idle'
    DICOMInstancetoSend = multiprocessing.Queue()
    DICOMInstanceSent = multiprocessing.Queue()
    InstanceId= None
    EdgeId = None
    bucket_name = None
    config = Config(s3={"use_accelerate_endpoint": False})

    def __init__(self, InstanceId, EdgeId ,  bucketname , s3_transfer_acceleration : bool = False):
 
        
        self.bucket_name = bucketname
        logging.debug(f"This thread will be copying files to/from the bucket {bucketname}")
        try:
            self.aws_access_key_id = os.environ['AWS_ACCESS_KEY']
            self.aws_secret_access_key = os.environ['AWS_SECRET_KEY']
            self.session = boto3.Session(self.aws_access_key_id,self.aws_secret_access_key)
            self.config = Config(s3={"use_accelerate_endpoint": s3_transfer_acceleration})
            self.s3 = self.session.resource('s3' , config=self.config)

        except:          # we might be in greengrass mode :
            logging.warning("No AWS IAM credentials provided defaulting to greengrass authentication provider")    
            try:
                self.session = boto3.Session()
                self.s3 = self.session.resource('s3' , config=self.config)
                    
            except:
                logging.error("There was an issue creating an boto3 session.")   
        self.InstanceId = InstanceId
        self.EdgeId = EdgeId
        p = Process(target=self.__s3upload, args = ( self.DICOMInstancetoSend , self.DICOMInstanceSent))
        p.start()
       
        


    def __uploadfile(self, filepath):
        #print("["+self.InstanceId+"] - sending file "+filepath+".")
        self.status = 'uploading'
        #filename = os.path.basename(filepath)
        filename=os.path.relpath(filepath, os.getcwd()+"/out")
        filename=self.EdgeId+"/"+filename+".dcm"
        #print("Destination filename will be : " +filename)
        try:
            self.s3.Bucket(self.bucket_name).upload_file(filepath,filename , ExtraArgs={'ServerSideEncryption': 'aws:kms'})
        except Exception as S3err:
            logging.error("Could not copy the file to S3. "+str(S3err))
        self.status = 'idle'
   
    def AddSendJob(self,DCMObj):
            self.DICOMInstancetoSend.put(DCMObj)
            #print("["+self.InstanceId+"] - Object added "+str(DCMObj[0])+".")


    def __s3upload(self, DICOMInstancetoSend : multiprocessing.Queue , DICOMInstanceSent : multiprocessing.Queue ):
        while(True):
            if not DICOMInstancetoSend.empty():
                obj = DICOMInstancetoSend.get()
                self.__uploadfile(obj[7])
                DICOMInstanceSent.put(obj)
            else:
                sleep(0.1)
    
    # def GetInstanceSent(self):
    #     return self.DICOMInstanceSent()
    
    def GetInstanceSent(self):
        if not self.DICOMInstanceSent.empty() :
            obj = self.DICOMInstanceSent.get()
            
            # print("[S3FileManager][GetInstanceSent] - returning Obj : "+str(obj[0]))
            return obj
        else:
            return None


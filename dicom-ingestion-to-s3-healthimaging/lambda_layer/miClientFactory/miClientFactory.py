import os
import shutil
import boto3
from botocore.config import Config

class miClientFactory(object):
    def __init__(self) -> None:
        pass

    def __new__(self , endpoint_url : str = None):
        inject_host_prefix = False
        os.environ['AWS_DATA_PATH'] = "/tmp"
        serviceModelPath = '/tmp/medical-imaging/2023-03-30'
        os.makedirs(serviceModelPath, exist_ok=True)
        try:
            shutil.copyfile('/opt/python/service-2.json', '/tmp/medical-imaging/2023-03-30/service-2.json')
        except Exception as err:
            print(err)
        try:
            endpoint_url= os.environ['AHLI_ENDPOINT']
            if( endpoint_url == ''):
                endpoint_url = None
                inject_host_prefix = True

        except:
            endpoint_url=None 
        session = boto3.Session()
        session._loader.search_paths.extend(["/tmp"])
        miClient = boto3.client('medical-imaging', endpoint_url=endpoint_url , config=Config(inject_host_prefix=inject_host_prefix)) 
        return miClient
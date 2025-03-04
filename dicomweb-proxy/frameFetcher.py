import gzip
import orjson
import concurrent.futures
from concurrent.futures import wait
import os
import io
import sys
import logging
import boto3 
import botocore
import datetime
from collections import deque
import threading
import multiprocessing
from multiprocessing import Queue , set_start_method , Manager
import time


class frameFetcher:
        
    cached_items = set()

    def __init__(self , frameFetcherName, getFramePixels , cache_root : str):
        self.logger = logging.getLogger(__name__)
        self.status = 1
        multiprocessing.set_start_method("spawn", force=True)
        self.ctx = multiprocessing.get_context('spawn')
        self.cacheQueue = self.ctx.Queue()
        self.cacheProcessor = self.ctx.Process(target=self.ProcessRunner, args=(self.cacheQueue, frameFetcher.fetchAndStore ,getFramePixels  , cache_root ))
        self.cacheProcessor.start()
        self.frameFetcherName = frameFetcherName


    def addToCacheByMetadata(self, metadata : object):
        print(f"[{self.frameFetcherName}] - in addToCacheByMetadata ")
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            executor.submit(self._addToCacheByMetadata, metadata)
            executor.shutdown(wait=False)

    def _addToCacheByMetadata(self,metadata):
        try:
            datastore_id = metadata["DatastoreID"]
            imageset_id = metadata["ImageSetID"]
            series_uid = next(iter(metadata["Study"]["Series"].keys()))
            instances = iter(metadata["Study"]["Series"][series_uid]["Instances"].keys())
            for instance in instances:
                for frame in metadata["Study"]["Series"][series_uid]["Instances"][instance]["ImageFrames"]:
                    frame_id = frame["ID"]
                    if not datastore_id+imageset_id+frame_id in frameFetcher.cached_items:
                        self.addToCache({ "status" : 0 , "datastore_id" : datastore_id , "imageset_id" : imageset_id , "imageframe_id" : frame_id})
        except Exception as err:
            self.logger.error("_addToCachebyMetadata Exception :")
            self.logger(err)
        
    def addToCache(self, cache_object : dict):
        datastore_id = cache_object["datastore_id"]
        imageset_id = cache_object["imageset_id"]
        imageframe_id = cache_object["imageframe_id"]
        self.logger.debug(f"[{self.frameFetcherName}] - {datastore_id+imageset_id+imageframe_id } Evaluating cache need.")
        if not datastore_id+"/"+imageset_id+"/"+imageframe_id in frameFetcher.cached_items: #let's not add it if this is already there...
            frameFetcher.cached_items.add(datastore_id+"/"+imageset_id+"/"+imageframe_id ) #At this point this is not  hard disk cached yet... This merely prevent an exisiting item to re-enter the processing queue 
            self.cacheQueue.put(cache_object)
            self.logger.debug(f"[{self.frameFetcherName}] - {datastore_id+imageset_id+imageframe_id } Added to fetch queue.")

    def ProcessRunner(self , cacheQueue : Queue , fetchAndStore , getFramePixels , cache_root): 
        client_config = botocore.config.Config(max_pool_connections=100,)
        ahi_client = boto3.client('medical-imaging', config=client_config)
        with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
            while(self.status == 1):
                if not cacheQueue.empty():
                    futures = []
                    while not cacheQueue.empty():
                        cache_it = cacheQueue.get(block=True)
                        datastore_id = cache_it["datastore_id"]
                        imageset_id = cache_it["imageset_id"]
                        imageframe_id = cache_it["imageframe_id"]
                        futures.append(executor.submit(fetchAndStore, getFramePixels, datastore_id, imageset_id, imageframe_id , ahi_client , cache_root))
                else:
                    time.sleep(0.01)
    
    @staticmethod
    def fetchAndStore(getFramePixels, datastore_id, imageset_id, imageframe_id , ahi_client, cache_root):
        frame_file_path =f"{cache_root}/{datastore_id}/{imageset_id}/{imageframe_id}.cache"
        if not os.path.isfile(frame_file_path):
            frame = getFramePixels(datastore_id, imageset_id, imageframe_id , ahi_client)
            os.makedirs(f"{cache_root}/{datastore_id}/{imageset_id}",exist_ok=True)
            frame_file = open(frame_file_path,'wb')
            frame_file.write(frame)
            frame_file.close()

    @staticmethod
    def getFramesToCache(metadata : object):
        return_set = []
        datastore_id = metadata["DatastoreID"]
        imageset_id = metadata["ImageSetID"]
        series_uid = next(iter(metadata["Study"]["Series"].keys()))
        instances = iter(metadata["Study"]["Series"][series_uid]["Instances"].keys())
        for instance in instances:
            for frame in metadata["Study"]["Series"][series_uid]["Instances"][instance]["ImageFrames"]:
                frame_id = frame["ID"]
                return_set.append({ "status" : 0 , "datastore_id" : datastore_id , "imageset_id" : imageset_id , "imageframe_id" : frame_id})    
        return return_set

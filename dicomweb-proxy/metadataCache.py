from collections import deque
import concurrent.futures
import threading
import boto3
import orjson
import gzip
import logging
import datetime
import botocore
import time
from pydicom import datadict
import collections.abc




class metadataCache:
    logger = logging.getLogger(__name__)
    metadata_to_cache = orjson.loads("{}")
    metadata_cache = orjson.loads("{}")
    frame_index = orjson.loads("{}")

    def __init__(self , ahi_client : object = None):
        self.cacheQueue = deque()
        self.cacheProcessor = threading.Thread(target=self.getMetadata)
        if ahi_client == None:
            client_config = botocore.config.Config(max_pool_connections=200)
            self.ahi_client = boto3.client('medical-imaging', config=client_config)
        else:
            self.ahi_client = ahi_client
        pass
        
    def addToCache(self, cache_object : dict):
        self.cacheQueue.append(cache_object)
        if not self.cacheProcessor.is_alive:
            self.cacheProcessor.start()

    def processQueue(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
            while(len(self.cacheQueue) > 0):
                item = self.cacheQueue.popleft()
                executor.submit(self.fetchMetadata(item["datastore_id"] , item["imageset_id"]))

    def fetchMetadata(self, datastore_id : str , imageset_id : str ):
        try:
            # jpleger : 02/15/2023 - was not the best idea....
            # grace_before_fetch = 0
            # while (metadataCache.metadata_cache[f"{datastore_id}{imageset_id}"] == {}) and ( grace_before_fetch < 10 ): # 1 seconds grace period in case another workflow requests the same metadata pending for retrieval. 
            #     time.sleep(0.1)
            #     grace_before_fetch+=1
            #    metadataCache.logger.debug(f"[{__name__}] - CACHE PENDING : {datastore_id}{imageset_id}")
            metadata = metadataCache.metadata_cache[f"{datastore_id}{imageset_id}"]["metadata"]
            metadataCache.logger.debug(f"[{__name__}] - CACHE HIT : {datastore_id}{imageset_id}")
            return metadata
        except:
            try:
                metadataCache.metadata_cache[f"{datastore_id}{imageset_id}"] = {}
                start = datetime.datetime.now()
                metadata = self.ahi_client.get_image_set_metadata(datastoreId=datastore_id , imageSetId=imageset_id)["imageSetMetadataBlob"]
                metadata = gzip.decompress(metadata.read())
                metadata = orjson.loads(metadata)
                metadataCache.metadata_cache[f"{datastore_id}{imageset_id}"] = {"metadata" : metadata , "dt" : datetime.datetime.now()} 
                end = datetime.datetime.now()
                metadataCache.logger.debug(f"[{__name__}] - CACHE MISSED : {datastore_id}{imageset_id} fetch : {end-start}")
                return metadata
            except Exception as AHIErr :
                self.logger.error(f"[{__name__}] - {AHIErr}")
                return None
            
    def getMetadata(self, datastore_id : str, imageset_id : str):
        metadata = self.fetchMetadata(datastore_id, imageset_id  )
        return metadata

    def getMetadataViaTuple(self, fetch_tuple : tuple ):
        datastore_id = fetch_tuple[0]
        imageset_id = fetch_tuple[1]
        metadata = self.fetchMetadata(datastore_id, imageset_id  )
        return metadata

    @staticmethod 
    def metadataToDict(metadata : object ,  instance_uid : str = None):
        series_uid = next(iter(metadata["Study"]["Series"].keys()))
        if instance_uid is None:
            all_instances = []
            patient_block = metadata["Patient"]["DICOM"]
            study_block =  metadata["Study"]["DICOM"]
            series_uid = next(iter(metadata["Study"]["Series"].keys()))
            series_block = metadata["Study"]["Series"][series_uid]["DICOM"]        
            for instance_uid  in iter(metadata["Study"]["Series"][series_uid]["Instances"].keys()):
                all_instances.append(metadataCache.getInstancedDict(instane_uid=instance_uid, patient_dict=patient_block , study_dict=study_block , series_dict=series_block))
            return all_instances
        else:
            return metadataCache.getInstancedDict(instance_uid=instance_uid , metadata=metadata)

    @staticmethod
    def getInstancedDict(instance_uid : str, metadata: object = None, patient_dict: dict = None, study_dict: dict = None, series_dict : dict = None):
        complete_instance = dict()
        series_uid = next(iter(metadata["Study"]["Series"].keys()))
        if patient_dict is None:
            patient_block = metadata["Patient"]["DICOM"]
            patient_dict = metadataCache.getJSONKeys(patient_block)
        if study_dict is None:
            study_block =  metadata["Study"]["DICOM"]   
            study_dict = metadataCache.getJSONKeys(study_block)
        if series_dict is None:
            series_block = metadata["Study"]["Series"][series_uid]["DICOM"]
            series_dict = metadataCache.getJSONKeys(series_block)
        instance_block = metadata["Study"]["Series"][series_uid]["Instances"][instance_uid]["DICOM"]
        instance_dict = metadataCache.getJSONKeys(instance_block)
        complete_instance.update(patient_dict)
        complete_instance.update(study_dict)
        complete_instance.update(series_dict)
        complete_instance.update(instance_dict)
        complete_instance = dict(sorted(complete_instance.items()))
        #Attempt to populate the frame index...
        frame_number = 1
        for frame in metadata["Study"]["Series"][series_uid]["Instances"][instance_uid]["ImageFrames"]:
            metadataCache.frame_index[instance_uid+"_"+str(frame_number)] = { "DatastoreID" : metadata["DatastoreID"], "ImageSetID" : metadata["ImageSetID"] , "ImageFrameID" : frame["ID"] }
            frame_number = frame_number + 1     
        return complete_instance

    @staticmethod
    def getDICOMVRs(self,taglevel, vrlist):
        for theKey in taglevel:
            vrlist.append( [ theKey , taglevel[theKey] ])
            metadataCache.logger.debug(f"[{__name__}][getDICOMVRs] - List of private tags VRs: {vrlist}\r\n")
    
    @staticmethod
    def get8CharTag( hex_representation :  str):
        hex_representation =  hex_representation[2:]
        for x in range ( 8 - len(hex_representation)):
            hex_representation = "0"+hex_representation
        return hex_representation.upper()

    @staticmethod
    def getJSONKeys(tagblock : object, depth : int = 0 ):
        dicom_set = dict()
        for key in tagblock.keys():
            try:
                tag = datadict.tag_for_keyword(key)
                vr = datadict.dictionary_VR(key)
            except Exception as err:
                continue
            tab = ""
            for x in range(depth):
                tab = tab+"\t"
            hex_tag = metadataCache.get8CharTag(hex(tag)) 
            if vr == "IS" and isinstance( tagblock[key] , str):
                tagblock[key] = int(tagblock[key])
            if vr == "SQ":
                depth=depth+1
                element_array = []
                for subelement in tagblock[key]:
                    element_array.append(metadataCache.getJSONKeys(subelement, depth))
                dicom_set[hex_tag] = { "vr" : vr , "Value" : element_array}
            else:
                if tagblock[key] is not None:
                    if isinstance(tagblock[key] , collections.abc.Sequence) and not isinstance(tagblock[key],str):
                        dicom_set[hex_tag] =  { "vr" : vr , "Value" : tagblock[key]}
                    else:
                        dicom_set[hex_tag] =  { "vr" : vr , "Value" : [tagblock[key]]}
                else:
                    dicom_set[hex_tag] =  { "vr" : vr }
        return dicom_set
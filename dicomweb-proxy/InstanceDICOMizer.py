"""
AHItoDICOM Module : This class contains the logic to encapsulate the data and the pixels into a DICOM object.

SPDX-License-Identifier: Apache-2.0
"""

import pydicom
import logging
from pydicom.sequence import Sequence
from pydicom import Dataset , DataElement
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import UID
import base64
import boto3

class InstanceDICOMizer():

    InstanceId  = None
    thread_running = None
    AHI_metadata = None 
    process = None
    status = None
    logger = logging.getLogger(__name__)

    def __init__(self , ahi_client : object = None , header_only : bool = False , omit_tags_larger_than : int = None ) -> None:
        if omit_tags_larger_than is not None:
            self.omit = omit_tags_larger_than
        if header_only == False:
            if ahi_client is None:
                self.client = boto3.client('medical-imaging')
            else:
                self.client = ahi_client
        self.header_only = header_only
    def DICOMize(self, SOPInstanceUID, metadata, first_frame_only : bool = False) -> FileDataset:
        try:
            series_key = next(iter(metadata["Study"]["Series"].keys()))
            vrlist = []       
            file_meta = FileMetaDataset()
            ds = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
            self.getDICOMVRs(metadata["Study"]["Series"][series_key]["Instances"][SOPInstanceUID]["DICOMVRs"] , vrlist)
            PatientLevel = metadata["Patient"]["DICOM"]
            self.getTags(PatientLevel, ds , vrlist)
            StudyLevel = metadata["Study"]["DICOM"]
            self.getTags(StudyLevel, ds , vrlist)
            SeriesLevel=metadata["Study"]["Series"][series_key]["DICOM"]
            self.getTags(SeriesLevel, ds , vrlist)
            InstanceLevel=metadata["Study"]["Series"][series_key]["Instances"][SOPInstanceUID]["DICOM"] 
            self.getTags(InstanceLevel ,  ds , vrlist)
            ds.file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian
            ds.little_endian = True
            ds.implicit_vr = False
            file_meta.MediaStorageSOPInstanceUID = UID(SOPInstanceUID)
            pixels = bytearray()
            if self.header_only == False:
                for frame in metadata["Study"]["Series"][series_key]["Instances"][SOPInstanceUID]["ImageFrames"]:
                    pixels += self.getFramePixels(metadata["DatastoreID"],metadata["ImageSetID"], frame["ID"] , self.client)
                    if first_frame_only == True:
                        ds.NumberOfFrames = 1
                        break
                if (pixels is not None ):
                    if len(pixels) > 0:
                        ds.PixelData = bytes(pixels)
                else:
                    print("This object has no pixel data")
            vrlist.clear()
            return ds
        except Exception as err:
            print("ERROR IN DICOMIZER")
            print(SOPInstanceUID)
            print(metadata["DatastoreID"])
            print(metadata["ImageSetID"])
            print(err.args)
            print(str(err))
            print(type(err))


        
    def getDICOMVRs(self,taglevel, vrlist):
        pydicom_dict_update = {}
        for theKey in taglevel:
            vrlist.append( [ theKey , taglevel[theKey] ])
            InstanceDICOMizer.logger.debug(f"[{__name__}][getDICOMVRs] - List of private tags VRs: {vrlist}\r\n")
            #Let's update the pydicom dict as well since we may need to re-create the DICOM object in the future.
        #     pydicom_dict_update[eval(hex(int(theKey, 16)))] = (taglevel[theKey] , '1' , theKey ,'', theKey )
        # print(pydicom_dict_update)
        # pydicom.datadict.DicomDictionary.update(pydicom_dict_update)
     



    def getTags(self,tagLevel, ds , vrlist):    
        for theKey in tagLevel:
            try:
                try:
                    tagvr = pydicom.datadict.dictionary_VR(theKey)
                except:  #In case the vr is not in the pydicom dictionnary, it might be a private tag , listed in the vrlist
                    tagvr = None
                    for vr in vrlist:
                        if theKey == vr[0]:
                            tagvr = vr[1]
                datavalue=tagLevel[theKey]
                if(tagvr == 'SQ'):
                    seqs = []
                    for underSeq in tagLevel[theKey]:
                        seqds = Dataset()
                        self.getTags(underSeq, seqds, vrlist)
                        seqs.append(seqds)
                    datavalue = Sequence(seqs)
                if(tagvr == 'US or SS'):
                    datavalue=tagLevel[theKey]
                    if isinstance(datavalue, int):  #this could be a multi value element.
                        if (int(datavalue) > 32767):
                            tagvr = 'US'
                        else:
                            tagvr = 'SS'
                    else:
                        tagvr = 'US'
                if( tagvr in  [ 'OB' , 'OD' , 'OF', 'OL', 'OW', 'UN' , 'OB or OW' ] ):
                    base64_str = tagLevel[theKey]
                    base64_bytes = base64_str.encode('utf-8')
                    datavalue = base64.b64decode(base64_bytes)
                data_element = DataElement(theKey , tagvr , datavalue )
                if data_element.tag.group != 2: #This filters Metadata header tags
                    if (data_element.tag.group % 2) == 0: #This filters private tags. Will check later how to add them dynanically to the pydicom dict.
                        try:
                            ds.add(data_element) 
                        except:
                            continue
            except Exception as err:
                InstanceDICOMizer.logger.warning(f"[{__name__}][getTags] - {err}")
                continue

    def getFramePixels(self, datastore_id, imageset_id, imageframe_id , client = None ):
        pass


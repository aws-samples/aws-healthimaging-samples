import os
import collections
from time import sleep
from threading import Thread
from os.path import exists

import pydicom
from pydicom import dcmread
from pydicom import *
from pydicom.errors import InvalidDicomError
import pynetdicom
import logging 
from pydicom.filewriter import write_file_meta_info
from pynetdicom import (
    AE, Association, debug_logger, evt, AllStoragePresentationContexts, StoragePresentationContexts , 
    ALL_TRANSFER_SYNTAXES
    )



class DICOMSendManager:

    status = ""
    InstanceId=None
    currentJob = None
    default_AE = None
    DICOMSendResult = ""
    JobId = ""
    ObjectSentCount = None
    ObjectCount = None

    

    def __init__(self, aetitle , x):

        self.InstanceId=x
        self.default_AE = aetitle
        self.status = 'idle'
        self.ObjectCount = 0
        self.ObjectSentCount = 0
        thread = Thread(target = self.ProcessJob)
        thread.start()

    def getObjectSentcount(self):
        return self.ObjectSentCount

    def getObjectCount(self):
        return self.ObjectCount

    def Assignjob(self, job):
        self.currentJob = job
        Filelist = self.currentJob[4]
        self.ObjectCount = len(Filelist)
        self.status="pending"
        
    def getStatus(self):
        return ( self.status )

    def reset(self):
        if(self.status == "completed"):
            self.DICOMSendResult = ""
            self.status = "idle"
            self.JobId = ""

    def getJobId(self):
        return self.JobId

    def getDescription(self):
            ret = self.DICOMSendResult
            return ret        
    
    def ProcessJob(self):
        while(True):
            #print("[DICOMSEndManager][ProcessJob] -"+self.InstanceId+" - looking for a job")
            if((self.currentJob is not None) and (self.status == "pending")):
                logging.debug("[DICOMSEndManager][ProcessJob] - "+self.InstanceId+" - Sending study.")
                self.status = "processing"
                selfAE = self.currentJob[0]
                destAE  = self.currentJob[1]
                destHostname = self.currentJob[2]
                destPort = self.currentJob[3]
                Filelist = self.currentJob[4]
                self.JobId = self.currentJob[5]
                
                if selfAE:
                    ae = AE(ae_title=selfAE)
                else:
                    ae = AE(ae_title=self.default_AE)
                
                # Add a requested presentation context
                ae.requested_contexts = StoragePresentationContexts
                assoc = ae.associate(destHostname,int(destPort) , None  , destAE )#, max_pdu=args.max_pdu

                if assoc.is_established:
                    ii = 1
                    for fpath in Filelist:
                        try:
                            ds = dcmread(fpath)
                            status = assoc.send_c_store(ds, ii)
                            ii += 1
                            self.ObjectSentCount = ii - 1
                            self.DICOMSendResult="Sending object "+str(self.ObjectSentCount)+"/"+str(self.ObjectCount)+"."
                        except InvalidDicomError as err:
                            logging.error("Bad DICOM file: {fpath}")
                            logging.error(err)
                            self.DICOMSendResult="Failed - "+ str(err)
                            self.status="completed"
                        except Exception as exc:
                            logging.error("Bad DICOM file: {fpath}")("Store failed: {fpath}")
                            logging.error(exc)
                            self.DICOMSendResult="Failed - "+ str(exc)
                            self.status="completed"
                    if( ii  == len(Filelist)+1):
                        self.DICOMSendResult=str(self.ObjectSentCount)+"/"+str(self.ObjectCount)+" sent."
                        self.status="completed"
                    assoc.release()
                else:
                    self.DICOMSendResult="Failed - Could establish DICOM association."    
                self.status="completed"
                logging.debug("DICOM assoc : "+str(self.ObjectSentCount)+"/"+str(self.ObjectCount)+ " : "+self.status+ " : "+self.DICOMSendResult )
            sleep(1)




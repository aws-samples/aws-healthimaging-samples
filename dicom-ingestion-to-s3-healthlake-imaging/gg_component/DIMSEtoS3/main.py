from cmath import e
from concurrent.futures import thread
from io import UnsupportedOperation
import json
import shutil
import uuid
import time
from hashlib import new

import pydicom
import pynetdicom
from DICOMProfiler import *
from ast import IsNot
from contextlib import nullcontext
import os
import sys
import datetime
from pydicom import *
from pydicom.errors import InvalidDicomError
from time import sleep
#import sqlite3
import logging
from threading import Thread
from SQSManager import SQSManager
from DICOMSendManager import DICOMSendManager
from pynetdicom.events import Event
from StorageMonitor import StorageMonitor

from pydicom.filewriter import write_file_meta_info
from pynetdicom import (
    AE, Association, debug_logger, evt, AllStoragePresentationContexts, StoragePresentationContexts , 
    ALL_TRANSFER_SYNTAXES
)

from DBQuery import *
from S3FileManager import *
from S3FetchManager import *
from SQSManager import *
from SQSReceiver import *
from dicomObject import *


# Config pynetdicom to log to a file.
logger = logging.getLogger('pynetdicom')
logger.setLevel(logging.CRITICAL)


conn=None
EdgeId = None
bucketname = None
IsPromiscuous=True
ThreadCount =  1
s3_transfer_acceleration = False
ThreadList = []
S3FetchThreadList = []
DICOMSendThreadList = []
dicom_port=11112
mode = None # this is the app working mode, it can either be 'greengrass' or 'standalone'
DICOMIncoming = collections.deque([])
selfAEtitle = "EDGEDEVICE"


def setLogLevel():
    """
    This methods is used to set the log level base on the LOGLEVEL env variable if provided.
    If the env variable is not provided, or if the provided value does not match any of the following keywords the method set the log level to INFO.
    Keywords:
        ERROR
        WARNING
        INFO
        DEBUG
        CRITICAL
    Args:
        None
    Returns:
        None
    Raises:
        None
    """   
    try:
        loglevel = os.environ["LOGLEVEL"]
        if loglevel.upper() == "INFO" :
            logging.basicConfig(level=logging.INFO)
            return 
        if loglevel.upper() == "WARNING" :
            logging.basicConfig(level=logging.WARNING)
            return 
        if loglevel.upper() == "ERROR" :
            logging.basicConfig(level=logging.ERROR)
            return 
        if loglevel.upper() == "DEBUG" :
            logging.basicConfig(level=logging.DEBUG)
            return 
        if loglevel.upper() == "CRITICAL" :
            logging.basicConfig(level=logging.CRITICAL)
            return 
        #If none of the values were found to match. We set the log level to INFO.    
        logging.basicConfig(level=logging.INFO)
    except:
        logging.basicConfig(level=logging.INFO)


def getDCMJob(assocId):
    entry = (assocId,)
    filetosend = dbq.Query(dbq.GET_ALL_FILE_PATHS_BY_ASSOCIATION,entry)
    dicomparams = dbq.Query( dbq.GET_DICOM_PARAMS_BY_ASSOCIATION,entry)
    DCMinstances = []
    for fpath in filetosend:
        DCMinstances.append(fpath[0])
    returnobject=(dicomparams[0][0], dicomparams[0][1], dicomparams[0][2] , dicomparams[0][3] , DCMinstances , assocId )
    return returnobject



def AdvancefromS3SentToNotifyPrep(args):
    while(True):
        for x in range(ThreadCount):
            dcmsent = ThreadList[x].GetInstanceSent()
            if dcmsent is not None:
                d = (2 , dcmsent[0])
                dbq.Upate(dbq.UPDATE_SOP_STATUS,d)

        sleep(0.1)


def SendAssigner(arg):

    while(True):
        dcms=dbq.Query(dbq.GET_SOPS_WITH_LIMIT,(1000,))
        objinc=0
        for dcm in dcms:
            d = (1, dcm[0],)
            dbq.Upate(dbq.UPDATE_SOP_STATUS,d)
            ThreadList[objinc].AddSendJob(dcm)
            objinc+=1
            if objinc == ThreadCount:
                objinc=0
        sleep(0.2)  



# S3FetchMonitor:
#
# This method is used in a Thread, It updates the database for each Object received from S3,
# and indicates that the association is ready to established with the remoter DICOM peer.
def S3FetchMonitor(arg):
    while(True):
        for x in range(ThreadCount):
            entry=S3FetchThreadList[x].GetInstancesFetched()
            if entry != None:
                try:
                    #print(entry)
                    assocId = entry[0]
                    sqlentry=(assocId,entry[5])
                    dbq.Upate(dbq.UPDATE_FETCH_STATUS_PER_SOPUID_AND_ASSOCIATION,sqlentry)
                    #print("[S3FetchMonitor] - Fetch status updated for instance : "+ sqlentry[1])
                except Exception as e:
                    print("[S3FetchMonitor] - "+str(e))
                try:
                    ##Let see if all the files are there for this association , if so , we trigger the DICOM send.
                    entry = (assocId,)
                    pendingcount = dbq.Query(dbq.GET_PENDING_FETCH_BY_ASSOCIATION, entry )
                    if pendingcount[0][0] == 0:
                        print("[S3FetchMonitor] - count reached for assocId "+assocId)
                        dcmjob = getDCMJob(assocId,)

                        for x in range(ThreadCount):
                            if(DICOMSendThreadList[x].getStatus() == 'idle'):
                                DICOMSendThreadList[x].Assignjob(dcmjob)
                                break
                except Exception as e:
                    print("[S3FetchMonitor] - "+str(e))
            else:
                pass
                #print("[S3FetchMonitor] - S3FetchThread # "+str(x)+" has no pending fetch.")
        sleep(0.1)


def DICOMSendMonitor(arg):
    while(True):
        for x in range(ThreadCount):
            if(DICOMSendThreadList[x].getStatus() != 'idle'):
                obj = {
                    "EdgeId" : EdgeId,
                    "JobId" : DICOMSendThreadList[x].getJobId(),
                    "Direction" : 'outbound',
                    "Status" : DICOMSendThreadList[x].getStatus(),
                    "Description" : DICOMSendThreadList[x].getDescription(),
                    "ObjectSentCount" : DICOMSendThreadList[x].getObjectSentcount(),
                    "ObjectCount" : DICOMSendThreadList[x].getObjectCount()
                }
                jsonobj =json.dumps(obj, default=lambda o: o.__dict__)
                logging.debug("[DICOMSendMonitor] - "+DICOMSendThreadList[x].getJobId()+ " : "+DICOMSendThreadList[x].getDescription())
                SQSOutboundNotif.AddSendJob(jsonobj)
                if(DICOMSendThreadList[x].getStatus() == 'completed'):
                    DICOMSendThreadList[x].reset()
        sleep(5)

def SQSReceive(arg):
    sqsreceiver = SQSReceiver(EdgeId)
    while(True):
        sqsreceiver.ReceiveFromQueue()
        sendjobs = sqsreceiver.GetSendJobs()
        fethInc=0
        for sj in sendjobs:
            SQSJobJSONRep = json.loads(sj)
            print(str(sj))
            jobid = SQSJobJSONRep["JobId"]
            logging.debug(f"[SQSReceive] - DICOM Send job received with id {jobid}")
            for DCMObjs in SQSJobJSONRep["DCMObjs"]:
                for series in DCMObjs["series"]:
                    for SOPs in series["SOPs"]:
                        dbentry = ( str(jobid) ,SQSJobJSONRep["sourceAE"] , SQSJobJSONRep["destinationAE"], DCMObjs["d0020000D"] , series["d0020000E"] , SOPs["d00080018"] , os.getcwd()+"/in/"+str(jobid) +"/"+DCMObjs["d0020000D"]  +"/"+ series["d0020000E"]+"/"+ SOPs["d00080018"]+".dcm" , SQSJobJSONRep["destinationHostname"]  , SQSJobJSONRep["destinationPort"]   )
                        s3entry = ( str(jobid) ,SQSJobJSONRep["sourceAE"] , SQSJobJSONRep["destinationAE"], DCMObjs["d0020000D"] , series["d0020000E"] , SOPs["d00080018"] , os.getcwd()+"/in/"+str(jobid) +"/"+DCMObjs["d0020000D"]  +"/"+ series["d0020000E"]+"/"+ SOPs["d00080018"]+".dcm" , SQSJobJSONRep["destinationHostname"]  , SQSJobJSONRep["destinationPort"] , SOPs["rootdirectory"]  )
                        dbq.Insert(dbq.ADD_S3_FETCH, dbentry)
                        S3FetchThreadList[fethInc].AddFetchJob(s3entry)
                        fethInc+=1
                        if fethInc == ThreadCount:
                            fethInc=0
        sleep(1.5)
           
            
def SQSSend(arg):
    while(True):
        res =  dbq.Query(dbq.GET_COMPLETED_ASSOCIATIONS,())
        #print("Ready to go instance gathered.")
        for r in res:
            logging.debug(f"AssocId candidate for notification : {r[0]}")
            #check if all the instances of the assoc are sent already.
            unsentcnt=dbq.Query(dbq.GET_UNSENT_SOPS_PER_ASSOCIATION,(r[0],))
            if unsentcnt[0][0] == 0:
                Studiestable = []  #<- We use this table to store the SOPS organized by Study/Series/instance hierarchy
                entry= (r[0],)
                studyuids = dbq.Query(dbq.GET_ALL_STUDIES_PER_ASSOCIATION,entry)
                for stdy in range(len(studyuids)):
                    # print(s)
                    # print(studyuids[stdy][0])
                    entry= (r[0], studyuids[stdy][0])
                    seriesuids =dbq.Query(dbq.GET_ALL_SERIES_PER_STUDIES_AND_ASSCOIATION,entry)
                    stu = dicomStudy(studyuids[stdy][0])
                    for sr in range(len(seriesuids)):
                        entry=(r[0], seriesuids[sr][0],)
                        instanceuids =dbq.Query(dbq.GET_ALL_SOPS_PER_SERIES_AND_ASSOCIATION,entry)
                        ser = dicomSeries(seriesuids[sr][0])
                        for i in range(len(instanceuids)):
                            # insta = dicomInstance(instanceuids[i][0])
                            # print("insta : "+insta.d00080018)
                            ser.addInstance(instanceuids[i][0])
                            #print(instanceuids[i][0])
                        stu.addSeries(ser)
                    Studiestable.append(stu)
                obj = json.dumps(Studiestable, default=lambda o: o.__dict__)
                instances=dbq.Query(dbq.GET_ALL_SOPS_PER_ASSOCIATION,(r[0],))
                obj = {

                    "EdgeId" : EdgeId,
                    "DatastoreId" : bucketname,
                    "Direction" : 'inbound',
                    "Status" : 'completed',
                    "Description" : 'Sent to Image Exchange Platform.',
                    "ObjectCount" : str(len(instances)),
                    "ObjectSentCount" : str(len(instances)),
                    "JobId" : instances[0][1],
                    "SourceAE" : instances[0][2],
                    "DestinationAE" : instances[0][3],
                    "DCMObjs" : Studiestable
                }
                #jsonobj = json.dumps(obj)
                jsonobj =json.dumps(obj, default=lambda o: o.__dict__)
                try:
                    SQSInboundNotif.AddSendJob(jsonobj)
                    logging.debug(f"[SQSSend] - Deleting the notified instances for completed association :  {r[0]}")
                    dbq.Delete(dbq.DELETE_SOPS_PER_ASSOCIATION,(r[0],))
                    #trying external process for file deletion
                    #cleanOutAssociationFolder(r[0])
                    p = Process(target=cleanOutAssociationFolder , args = (r[0],))
                    p.start()
                except Exception as e:
                    logging.error(f"[SQSSend][ERROR] - Impossible to send to SQS : {e}")      
        sleep(1)


def cleanOutAssociationFolder(AssocId):
    try:
        logging.debug(f"[cleanOutAssociationFolder] - Deleting the notified instances for completed association :  {AssocId}")
        shutil.rmtree(os.getcwd()+'/out/'+AssocId)
    except BaseException as err :
        logging.error(str(err))   

def PrepareS3Threads():
    logging.warning("[ServiceInit] - Creating S3 transfer thread(s).")
    for x in range(ThreadCount):
        logging.warning("[ServiceInit] - S3 Send thread # "+str(x))
        ThreadList.append(S3FileManager(str(x),EdgeId, bucketname , s3_transfer_acceleration= s3_transfer_acceleration))

def PrepareS3FetchThreads():
    logging.warning("[ServiceInit] - Creating S3 Fetch thread(s).")
    for x in range(ThreadCount):
        logging.warning("[ServiceInit] - S3 Fetch thread # "+str(x))
        S3FetchThreadList.append(S3FetchManager(str(x),EdgeId, bucketname , s3_transfer_acceleration= s3_transfer_acceleration))

def PrepareDICOMSendThreads():
    logging.warning("[ServiceInit] - Creating DICOM Send thread(s).")
    for x in range(ThreadCount):
        logging.warning("[ServiceInit] - DICOMSend thread # "+str(x))
        DICOMSendThreadList.append( DICOMSendManager(selfAEtitle,str(x)))

def FindIdleS3thread():
    for x in range(ThreadCount):
        if( (ThreadList[x]).status == 'idle'):
            return x
    return None



def LoadSystemConfig():
    #we might load the config from parameterStore maybe ?! 
    logging.warning("not implemented.")

def LoadAuthorizedDICOMClients():
    logging.warning("Fetching Authorized DICOM clients list")


def handle_store(event: Event, destination):
    """Handle EVT_C_STORE events."""   
    if(sMonitor.getOutOfResourceStatus()):
        return 0x0107
    alreadythere=0
    associd=event.assoc.name
    for DICOMassoc in DICOMIncoming:
        if( associd == DICOMassoc):
            alreadythere=1
            break
    
    if(alreadythere == 0):
        DICOMIncoming.append(associd)
        obj = {
            "EdgeId" : EdgeId,
            "DatastoreId" : bucketname,
            "Direction" : 'inbound',
            "Status" : 'incoming',
            "Description" : 'acquiring images',
            "ObjectCount" : 0,
            "ObjectSentCount" : 0,
            "JobId" : associd,
            "SourceAE" : event.assoc.requestor.primitive.calling_ae_title,
            "DestinationAE" : event.assoc.requestor.primitive.called_ae_title,
            "DCMObjs" : ''
        }
        jsonobj =json.dumps(obj, default=lambda o: o.__dict__)
        SQSInboundNotif.AddSendJob(jsonobj)
    return storeObject(event, destination)



def storeObject(event, destination):
    if(sMonitor.getThrottleStatus()):
        logging.debug("[soteObject] - Storage treshold reached. Throttling DICOM association by 5 seconds")
        time.sleep(5)
    try:
        os.makedirs(destination, exist_ok=True)
    except:
        # Unable to create output dir, return failure status
        logging.error("[stoeObject] - Could not create the temporary folder.")
        return 0xC001
    ds = event.dataset
    # Add the File Meta Information
    ds.file_meta = event.file_meta
    try:
        destination = destination+"/"+event.assoc.name
        os.makedirs(destination, exist_ok=True)
    except:
            # Unable to create output dir, return failure status
        return 0xC001
    fname = os.path.join(destination, event.request.AffectedSOPInstanceUID)
    with open(fname, 'wb') as f:
        # Write the preamble, prefix and file meta information elements
        f.write(b'\x00' * 128)
        f.write(b'DICM')
        write_file_meta_info(f, event.file_meta)
        # Write the raw encoded dataset
        f.write(event.request.DataSet.getvalue())
    scu_ae=event.assoc.requestor.primitive.calling_ae_title
    scp_ae=event.assoc.requestor.primitive.called_ae_title
    entry = (event.assoc.name, scu_ae, scp_ae, ds.StudyInstanceUID, ds.SeriesInstanceUID, ds.SOPInstanceUID,  os.path.join(destination, event.request.AffectedSOPInstanceUID))
    

    try:
        dbq.Insert(dbq.INSERT_SOP , entry)
    except:
        logging.error("Cloud not insert the entry in the memory DB.")
    #DCMObjIdentifier=DICOMProfiler.GetFullHeader(ds)
    return 0x0000
    
    
def handle_open(event):
    """Print the remote's (host, port) when connected."""
    msg = 'Connected with remote at {}'.format((event.assoc.name))
    


def handle_accepted(event: Event):
    tag = str(uuid.uuid4())
    event.assoc.name=tag

def handle_assoc_close(event):
    logging.debug("[handle_assoc_close] - Updating Assoc Status in the Db for assocId : "+event.assoc.name)
    try:
        associd=event.assoc.name
        entry=(associd,)
        dbq.Upate(dbq.UPDATE_SOP_ASSOC_COMPLETED,entry)
        for DICOMassoc in DICOMIncoming:
            if( associd == DICOMassoc):
                DICOMIncoming.remove(DICOMassoc)
                break
    except BaseException as err:
        logging.error("Error updating the Completion status for association "+event.assoc.name)
        print(err)


def main(argv):
    global EdgeId
    global mode
    global bucketname
    global dbq
    global SQSOutboundNotif
    global SQSInboundNotif
    global dicom_port
    global ThreadCount
    global s3_transfer_acceleration
    global sMonitor

    setLogLevel()
    logging.info("Starting Service.")
    logging.info("ENV variables:")
    logging.info("======================================================")
    logging.info(os.environ)
    logging.info("======================================================")
    logging.info("[ServiceInit] - Creating In Memory database Interface")
    dbq = DBQuery()  
    sMonitor = StorageMonitor(directory= os.getcwd() , space_limit_for_throttle=1000 , space_limit_for_oor=100)

    #Reading env variables : this can be passed by IOT Greengrass or manually on script startup.
    try:
         bucketname = os.environ['BUCKETNAME']
    except:
        try:
            bucketname=argv[0]
        except:
            sys.exit("Exiting : No BUCKETNAME env variable defined.")
    try:
         EdgeId = os.environ['AWS_IOT_THING_NAME']
    except:
        try:
            EdgeId=argv[1]
        except:
            sys.exit("Exiting : No AWS_IOT_THING_NAME env variable defined.")
    try:
         ThreadCount = int(os.environ['THREADCOUNT'])
         if ThreadCount == 0:
             ThreadCount = int(os.cpu_count()) * 4 
             logging.warning("[ServiceInit] - Defaulting to "+str(ThreadCount)+" threads")
    except:
        ThreadCount = int(os.cpu_count()) * 4 
        logging.warning("[ServiceInit] - Defaulting to "+str(ThreadCount)+" threads")
    try:
         aws_access_key = os.environ['AWS_ACCESS_KEY']
         aws_secret_key = os.environ['AWS_SECRET_KEY']
         mode='standalone'
    except:
         mode = 'greengrass'
    try:
        dicom_port = int(os.environ['SCP_PORT'])
    except:
        logging.warning("No DICOM port provided, defaulting to "+str(dicom_port))
    try:
        if (os.environ['S3_TRANSFER_ACCELERATION']).lower() in ("yes", "true", "t", "1"):
            s3_transfer_acceleration = True
            logging.warning("Enabling S3 trasnfer acceleration.")
    except:
        logging.warning("No S3 transfer accelerations specificed. Defaulting to default S3 transfer.")
    try:
         storage_throttle = int(os.environ['STORAGE_THROTTLE'])
    except:
        storage_throttle = 1000
        logging.warning(f"[ServiceInit] - Defaulting to storage throttling treshold to {storage_throttle}")
    try:
         storage_oor = int(os.environ['STORAGE_OOR'])
    except:
        storage_oor = 100
        logging.warning(f"[ServiceInit] - Defaulting to storage out of resource treshold to {storage_oor}")
    logging.info("Starting SCP on edge "+ EdgeId + " on port "+str(dicom_port))    
    handlers = [    (evt.EVT_C_STORE, handle_store, [os.getcwd()+'/out']), (evt.EVT_CONN_OPEN , handle_open), (evt.EVT_ACCEPTED , handle_accepted), (evt.EVT_RELEASED  , handle_assoc_close ) , (evt.EVT_ABORTED  , handle_assoc_close )]
    ae = AE()
    storage_sop_classes = [
        cx.abstract_syntax for cx in AllStoragePresentationContexts
    ]
    for uid in storage_sop_classes:
        ae.add_supported_context(uid, ALL_TRANSFER_SYNTAXES)
    ae.maximum_associations = 100

    PrepareS3Threads()
    PrepareS3FetchThreads()   
    PrepareDICOMSendThreads()
    logging.info("[ServiceInit] - Clearing incoming folder")
    try:
        shutil.rmtree(os.getcwd()+'/in/')
    except BaseException as err :
        logging.error(str(err))        
    os.mkdir(os.getcwd()+'/in/')
    logging.info("[ServiceInit] - Clearing outgoing folder")
    try:
        shutil.rmtree(os.getcwd()+'/out/')
    except BaseException as err :
        logging.error(str(err))        
    os.mkdir(os.getcwd()+'/out/')   

    S3SendAssignerThread = Thread(target = SendAssigner, args = (ThreadCount, ))
    S3SendAssignerThread.start()
    logging.debug("[ServiceInit] - Database polling thread started.")
    NotifyPrepThread = Thread(target = AdvancefromS3SentToNotifyPrep, args = (10, ))
    NotifyPrepThread.start()
    logging.debug("[ServiceInit] - Status Update thread started.")
    SQSSendTread = Thread(target = SQSSend, args = (10, ))
    SQSSendTread.start()
    logging.debug("[ServiceInit] - SQS Queue manager started-up.")

    SQSRecieveTread = Thread(target = SQSReceive, args = (10, ))
    SQSRecieveTread.start()
    logging.debug("[ServiceInit] - SQS Queue Receiver started-up.")
 
    RecieveMonitorTread = Thread(target = S3FetchMonitor, args = (10, ))
    RecieveMonitorTread.start()
    logging.debug("[ServiceInit] - S3 Fetch Monitor started-up.")   

    DICOMSendMonitorThread = Thread(target = DICOMSendMonitor, args = (10, ))
    DICOMSendMonitorThread.start()
    logging.debug("[ServiceInit] - DICOM Send Monitor thread started.")

    logging.debug("[ServiceInit] - Starting SQS Outbound notification emitter.")
    SQSOutboundNotif = SQSManager(EdgeId, "outbound")

    logging.debug("[ServiceInit] - Starting SQS Inbound notification emitter.")
    SQSInboundNotif = SQSManager(EdgeId, "inbound")

    logging.info("[ServiceInit] - Spawning DICOM interface on port "+str(dicom_port)+".")
    ae.start_server(("0.0.0.0", dicom_port), block=False, evt_handlers=handlers)
    
    
if __name__ == "__main__":
    logging.getLogger('botocore').setLevel(logging.CRITICAL)
    main(sys.argv[1:])
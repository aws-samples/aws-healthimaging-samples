
import sqlite3
import threading
import logging

class DBQuery:

    GET_ALL_SOPS="select * from DICOMObjs;"
    GET_ALL_SOPS_PER_ASSOCIATION="select * from DICOMObjs where associd = ?;"
    GET_SOPS_WITH_LIMIT="select * from DICOMObjs where status = 0 LIMIT ?;"
    #: Get the study instance UID from the objects received for the given association ID. Provide the association ID.
    GET_ALL_STUDIES_PER_ASSOCIATION="select distinct [0020000D] from DICOMObjs where assocId = ?;"
    GET_ALL_SERIES_PER_STUDIES_AND_ASSCOIATION="select distinct [0020000E] from DICOMObjs where assocId = ? and [0020000D] = ?;"
    GET_ALL_SOPS_PER_SERIES_AND_ASSOCIATION="select distinct [00080018] from DICOMObjs where assocId = ? and [0020000E] = ?;"
    GET_UNSENT_SOPS_PER_ASSOCIATION="select count(*) from DICOMObjs where status != 2 and assocId = ?;"
    GET_COMPLETED_ASSOCIATIONS="select distinct assocId from DICOMObjs where assocCompleted = 1;"
    GET_COUNT_SOPS_PER_STATUS="select count(*), status from DICOMObjs group by status;"

   

    #update queries
    UPDATE_SOP_ASSOC_COMPLETED="update DICOMObjs set assocCompleted = 1 where assocId = ?;"
    UPDATE_FETCH_STATUS_PER_SOPUID_AND_ASSOCIATION="update S3FetchAndStore set receivedFromS3 = 1 where assocId = ? and [00080018] = ?;"
    UPDATE_SOP_STATUS="update DICOMObjs set status = ? where id = ?;"

    #Insert
    INSERT_SOP="insert into DICOMObjs values ( null,?,?,?,?,?,?,?,0, 0);"
    ADD_S3_FETCH="insert into S3FetchAndStore VALUES ( null , ? , ? , ? , ? , ? , ? , ? , 0 , 0 , ? , ? );"


    GET_ALL_FILE_PATHS_BY_ASSOCIATION="select fsLocation from S3FetchAndStore where assocId = ?;"
    GET_DICOM_PARAMS_BY_ASSOCIATION="select scu_ae, scp_ae, scp_hostname , scp_port from S3FetchAndStore where assocId = ? LIMIT 1;"
    GET_PENDING_FETCH_BY_ASSOCIATION="select count(1) from S3FetchAndStore where assocId = ? and receivedFromS3 = 0;"

    #Delete
    DELETE_SOPS_PER_ASSOCIATION="delete FROM DICOMObjs WHERE assocId = ?;"

    conn = sqlite3.connect(':memory:',check_same_thread = False)
    cursorObject = conn.cursor()
    lock = threading.Lock()

    
    
    def __init__(self):
        createRetrieveAndStoreTable = "CREATE TABLE S3FetchAndStore (id INTEGER PRIMARY KEY AUTOINCREMENT, assocId varchar(256), scu_ae varchar(32) , scp_ae varchar(32),[0020000D] varchar(64), [0020000E] varchar(64), [00080018] varchar(64),  fsLocation varchar(1024),  receivedFromS3 short , sentToDICOMDestination short, scp_hostname varchar(255) , scp_port integer );"
        createDICOMObjsTable = "CREATE TABLE DICOMObjs (id INTEGER PRIMARY KEY AUTOINCREMENT, assocId varchar(256), scu_ae varchar(32) , scp_ae varchar(32),[0020000D] varchar(64), [0020000E] varchar(64), [00080018] varchar(64),  fsLocation varchar(1024), status short , assocCompleted short);"
        createDICOMClientsTable = "CREATE TABLE DICOMClients (id INTEGER PRIMARY KEY AUTOINCREMENT, ae_title varchar(32) , hostname varchar(256) , port int )" #should really be 16 chars for the AE-title , but hey... we might need some spare space for goofy stuff...
        self.conn.execute(createRetrieveAndStoreTable)
        self.conn.execute(createDICOMObjsTable)
        self.conn.execute(createDICOMClientsTable)
        self.cursorObject = self.conn.cursor()
        self.lock = threading.Lock()
        logging.debug("In-Memory database created.")


    def Upate(self, query, entries):
        try:
            self.lock.acquire(True)
            cursorObject = self.conn.cursor()
            cursorObject.execute("BEGIN;")
            cursorObject.execute(query,entries)
            cursorObject.execute("COMMIT;")
        except BaseException as err:
            logging.error("[DBQuery][Upate] - "+str(err))   
        finally:
            self.lock.release()      

    def Insert(self, query, entries):
        try:
            self.lock.acquire(True)
            cursorObject = self.conn.cursor()
            cursorObject.execute("BEGIN;")
            cursorObject.execute(query,entries)
            cursorObject.execute("COMMIT;")
            #self.conn.commit()
        except BaseException as err:
            logging.error("[DBQuery][Insert] - "+str(err))
        finally:
            self.lock.release()    
 
    def Delete(self, query, entries):
        try:
            self.lock.acquire(True)
            cursorObject = self.conn.cursor()
            cursorObject.execute("BEGIN;")
            cursorObject.execute(query,entries)
            cursorObject.execute("COMMIT;")
            #self.conn.commit()
        except BaseException as err:
            logging.error("[DBQuery][Delete] - "+str(err))
        finally:
            self.lock.release()              
 

    def Query(self, query , entries):
        try:
            self.lock.acquire(True)
            self.cursorObject.execute(query, entries)
            retdataset = self.cursorObject.fetchall()
        finally:
            self.lock.release()
        return retdataset 
 
    # return true if the DICOM client is found in the database. 
    def checkDICOMClient(self,scuae):  

     
        CheckClientQuery="SELECT * from DICOMClients where ae_scu = ?"
        self.cursorObject.execute(CheckClientQuery, scuae)
        
        if( self.cursorObject.rowcount >= 1 ):
            return True
        else:
            return False

    def AddDICOMClient():
        logging.debug("[DBQuery][AddDICOMClient] - Not implemented.")
    
    
    def RemoveDICOMClient():
        logging.debug("[DBQuery][RemoveDICOMClient] - Not implemented.")

    def CheckThreadSafety(self):
            assert  sqlite3.threadsafety ==  1

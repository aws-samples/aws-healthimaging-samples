import json
import boto3
import os
import gzip
import time
import mysql.connector
import mysqlConnectionFactory
import miClientFactory
import logging


logging.getLogger().setLevel(logging.INFO)


def lambda_handler(event, context):
    

    miclient = miClientFactory.miClientFactory()
    import_role_arn = os.environ["AHLI_IMPORT_ROLE_ARN"]
    max_concurrent_jobs = int(os.environ["AHLI_MAX_CONCURRENT_JOBS"])
    secret_name = os.environ["DB_SECRET"]
    region_name =  os.environ['AWS_REGION']
    #Get the database credentials
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager',region_name=region_name)
    #Calling SecretsManager
    response = client.get_secret_value(SecretId=secret_name)
    database_secrets = json.loads(response['SecretString'])
    username = database_secrets["username"]
    password = database_secrets["password"]
    hostname = database_secrets["host"]
    database = database_secrets["dbname"]
    cnx = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database)

    pending_jobs=getPendingjobs(cnx , max_concurrent_jobs)
    if(len(pending_jobs)) > 0 :
        for jobrecord in pending_jobs:  
            ahli_job_id = jobrecord["ahli_job_id"]
            datastore_id = jobrecord["datastore_id"]
            result_folder = jobrecord["result_folder"]
            status , submittedAt, endedAt = checkJobStatus(miclient, ahli_job_id , datastore_id )  # Ahli Job id , Ahli datastore id
            if status != 2: #job not in progress any more
                if status == 3:
                    image_set_ids = getAhliImageSetId(datastore_id=datastore_id , ahli_job_id=ahli_job_id , result_folder=result_folder) #pass the resultfolder
                    ahliSeriesUIDs = getSeriesInstanceUID(miclient=miclient, datastoreid=datastore_id, image_set_ids=image_set_ids)
                    if len(ahliSeriesUIDs) > 0:
                        for ids in ahliSeriesUIDs:
                            try: 
                                if(ids[0] is None):
                                    print("SeriesInstanceUID could not be figured.")
                                    sql_code = f"INSERT INTO Ahliimageset VALUES ( NULL , %s , %s) ON DUPLICATE KEY UPDATE imagesetid = %s , datastoreid = %s"
                                    sql_data = (ids[1] , ids[2] , ids[1] , ids[2])
                                else:
                                    sql_code = f"INSERT INTO Ahliimageset VALUES (%s, %s ,%s) ON DUPLICATE KEY UPDATE imagesetid = %s , datastoreid = %s"
                                    sql_data = (ids[0] , ids[1] , ids[2] , ids[1] , ids[2])
                                executeStatement(sql_code, sql_data, cnx)
                                print("Updating the job status")
                                sql_code = f"UPDATE Ahlijob set status = %s , submittedat = %s , endedat = %s where importjobid = %s and status = 2"  #status 3 is  : completed
                                sql_data = (status , submittedAt , endedAt , ahli_job_id )
                                executeStatement(sql_code, sql_data, cnx)
                            except BaseException as sqlError:
                                print("[handler] - Seriesfound - SQLException "+str(sqlError))
                    else:
                        print("NO Series detected in the success file")
                        try: 
                            sql_code = f"UPDATE Ahlijob set status = 4 , submittedat = %s , endedat = %s  where importjobid = %s and status = 2"  #status 3 is  : completed
                            sql_data = (submittedAt , endedAt , ahli_job_id)
                            executeStatement(sql_code, sql_data, cnx)
                        except BaseException as sqlError:
                            logging.error("[handler] - NoSeriesfound - SQLException "+str(sqlError))
                        
            else:
                print(f"Job {ahli_job_id} is in progress...")
    ### Let see if we can start new jobs.
    if(len(pending_jobs) < max_concurrent_jobs) :
        new_jobs = getNewJobs(cnx , max_concurrent_jobs - len(pending_jobs))
        if(len(new_jobs)) > 0:
            for jobrecord in new_jobs:
                job_id = jobrecord["job_id"]
                ahli_job_id = jobrecord["importjob_id"]
                datastore_id = jobrecord["datastore_id"]
                import_location = jobrecord["import_location"]
                result_location = jobrecord["result_location"]
                print(f"Starting Job {job_id} in datastore {datastore_id}")
                try:
                    ImportJob = miclient.start_dicom_import_job(dataAccessRoleArn=import_role_arn,jobName="job-"+str(job_id),datastoreId=datastore_id,inputS3Uri=import_location,outputS3Uri=result_location)
                    time.sleep(1)
                    ahlijobid = ImportJob["jobId"]
                    sql_code = f"UPDATE Ahlijob set status = 2 , importjobid = %s where jobid = %s and status = 1"  #status 2 is  : in progress
                    sql_data = (ahlijobid, job_id )
                    executeStatement(sql_code, sql_data, cnx)
                except BaseException as err:
                    logging.error("[handler] - Error "+str(err))
    cnx.close()
    return 0

def getSeriesInstanceUID(miclient: boto3.session.Session.client ,  image_set_ids , datastoreid: str):
    couplelist = []
    for imageSet_id in image_set_ids:
        try:
            study_metadata = miclient.get_image_set_metadata(datastoreId=datastoreid , imageSetId=imageSet_id  )
            gzipped = study_metadata["imageSetMetadataBlob"].read()
            study_metadata = gzip.decompress(gzipped)
            json_study_metadata = json.loads(study_metadata)
            SeriesUID = str(next(iter((json_study_metadata["Study"]["Series"]))))
            couplelist.append( (SeriesUID , imageSet_id , datastoreid))
        except Exception as err:
            logging.error(f"[getSeriesInstanceUID] - Metadata could not be requested for imageSetId {imageSet_id}")
            logging.error(err)
            couplelist.append( (None , imageSet_id , datastoreid ))
    return couplelist

def checkJobStatus(miclient: boto3.session.Session.client ,  jobid: str , datastoreid: str):
    print(f"Checking Status for Job {jobid} in datastore {datastoreid}")
    jobstatus = miclient.get_dicom_import_job(jobId=jobid, datastoreId=datastoreid )
    status = jobstatus["jobProperties"]["jobStatus"]
    if status == "SUBMITTED":
        logging.debug("AHLI STATUS IS SUBMITTED")
        return 2 , None , None   # our code doe snot really account for Ahli SUBMITTED status. we will considered that IN PROGRESS as well
    if status == "IN_PROGRESS":
        logging.debug("AHLI STATUS IS IN_PROGRESS")
        return 2 , None , None
    if status == "COMPLETED":
        logging.debug("AHLI STATUS IS COMPLETED")
        return 3 , str(jobstatus["jobProperties"]["submittedAt"]).split('+')[0] , str(jobstatus["jobProperties"]["endedAt"]).split('+')[0]
    if status == "FAILED":
        logging.debug("AHLI STATUS IS FAILED")
        return 4  , str(jobstatus["jobProperties"]["submittedAt"]).split('+')[0] , str(jobstatus["jobProperties"]["endedAt"]).split('+')[0]

def getAhliImageSetId( result_folder: str , datastore_id: str , ahli_job_id: str):
    s3_client=boto3.resource('s3')
    result_bucket = result_folder.split("/")[2]
    print(result_bucket)
    success_file_key = f"{result_folder}/{datastore_id}-DicomImport-{ahli_job_id}/SUCCESS/success.ndjson"
    success_file_key = success_file_key[6+len(result_bucket):]
    print(success_file_key)
    obj = s3_client.Object(result_bucket, success_file_key)
    success_file = obj.get()['Body'].read()
    #print(str(success_file))
    ahliimagesetids = []
    lines = success_file.split(b'\n')    
    for line in lines:
        try:
            json_success_file = json.loads(line)
            image_set_id=str(json_success_file["importResponse"]["imageSetId"])
            already_there = 0
            for it in ahliimagesetids:
                if it == image_set_id:
                    already_there = 1 
                    break
            if already_there == 0:
                ahliimagesetids.append(image_set_id)
        except:
            continue
    logging.debug("returning the following ImageSetIds :")
    logging.debug(ahliimagesetids)
    return ahliimagesetids

def executeStatement(sql_code: str , sql_data , cnx):
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, sql_data)
    cnx.commit()
    cursor.close()
    


def getPendingjobs(cnx: mysql.connector.MySQLConnection, max_concurrent_jobs: int ) -> list:
    results = []
    try:
        sql_code = f"SELECT importjobid, ahlidatastoreid, resultlocation from Ahlijob where status = 2 LIMIT %s"  #status 2 is  : in progress
        sql_data = [max_concurrent_jobs]
        cursor = cnx.cursor(buffered=True)
        cursor.execute(sql_code, sql_data)
        for (ahli_job_id, datastore_id, result_folder) in cursor:
            result = { "ahli_job_id": ahli_job_id, "datastore_id": datastore_id, "result_folder": result_folder }
            results.append(result)
        cursor.close()
    except Exception as err:
        logging.error("[getPendingjobs] - Error while getting pending jobs from database :")
        logging.error(err)
    return results

def getNewJobs(cnx: mysql.connector.MySQLConnection, max_concurrent_jobs: int ) -> list:
    results = []
    try:
        sql_code = f"SELECT jobid, importjobid, ahlidatastoreid, status, importlocation, resultlocation from Ahlijob where status = 1 LIMIT %s"  #status 1 is  : pending
        sql_data = [max_concurrent_jobs]
        cursor = cnx.cursor(buffered=True)
        cursor.execute(sql_code, sql_data)
        for (job_id, importjob_id, datastore_id, status , import_location , result_location) in cursor:
            result = { "job_id": job_id, "importjob_id": importjob_id, "datastore_id": datastore_id, "status": status, "import_location" : import_location , "result_location" : result_location }
            results.append(result)
        cursor.close()
    except Exception as err:
        logging.error("[getNewJobs] - Error while getting new jobs from database :")
        logging.error(err)
    return results
import logging
import os
import json
import boto3
import datetime
import mysql.connector
import ssl
from mysql.connector import errorcode , connection
from mysql.connector.constants import ClientFlag
import mysqlConnectionFactory
import AHIClientFactory
#from mysql import connector
from datetime import datetime

logger = logging.getLogger()

secret_name = os.environ["DB_SECRET"]
region_name =  os.environ['AWS_REGION']

def lambda_handler(event, context):
    ahi_client = AHIClientFactory.AHIClientFactory()
    #Get the database credentials
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager',region_name=region_name)
    
    
    # Calling SecretsManager
    response = client.get_secret_value(SecretId=secret_name)
    database_secrets = json.loads(response['SecretString'])
    username = database_secrets["username"]
    #password = database_secrets["password"]
    hostname = database_secrets["host"]
    database = database_secrets["dbname"]


    #Generate the username token : 
    rds_client = boto3.client("rds")
    password = rds_client.generate_db_auth_token(DBHostname=hostname, Port=3306, DBUsername=username)

    #Create the mysql client to Aurora
    cnx = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database , auth_plugin="mysql_clear_password" ) #, ssl_ca="rds-ca-2019-root.pem")
    #cnx = connector.connect(
    #        host=hostname,
    #        database=database,
    #        user=username,
    #        password=password,
    #        auth_plugin="mysql_clear_password",
    #        #ssl_ca="rds-ca-2019-root.pem",
    #    )
    issuer_datamodel = getTableDataModel(cnx, "issuer")
    patient_datamodel = getTableDataModel(cnx, "patient")
    study_datamodel = getTableDataModel(cnx,"study")
    series_datamodel = getTableDataModel(cnx,"series")
    instance_datamodel = getTableDataModel(cnx,"instance")

    if os.environ["POPULATE_INSTANCE_LEVEL"].lower() == "true":
        populateInstanceLevel = True
    else:
        populateFrameLevel = False
    if os.environ["POPULATE_FRAME_LEVEL"].lower() == "true":
        populateFrameLevel = True
        populateInstanceLevel = True
    else:
        populateInstanceLevel = False
    
    # retrieve datastore id and image set ids
    #bucketsAndKeys = getBucketsAndKeysFromSns(event)
    #datastoreidAndImagesetids = getImageSetIds(bucketsAndKeys)
    print("event: %s" % (event))
    datastoreIdAndImageSetIds = getDatastoreIdAndImageSetIds(event)
    print("datastoreIdAndImageSetIds: %s" % (datastoreIdAndImageSetIds))

    # retrieve metadata based on datastore id and image set ids
    metadatas = getMetadatas(datastoreIdAndImageSetIds, ahi_client)
    print("metadatas: %s" % (metadatas))

    for metadata in metadatas:
        datastore_id = metadata["DatastoreID"]
        imageset_id = metadata["ImageSetID"]
        patient_tags = getPatientTags(metadata)
        issuer_values = generateSQLValues(patient_tags, issuer_datamodel)
        issuer_pkey = InsertEntry(issuer_values, cnx)
        patient_tags["issuer_pkey"] = issuer_pkey
        patient_values = generateSQLValues(patient_tags, patient_datamodel)
        patient_pkey = InsertEntry(patient_values, cnx)
        
        study_tags = getStudyTags(metadata)
        study_tags["patient_pkey"] = patient_pkey
        study_values = generateSQLValues(study_tags, study_datamodel)
        study_pkey = InsertEntry(study_values, cnx)
    
        series_tags = getSeriesTags(metadata)
        for series in series_tags:
            series["study_pkey"] = study_pkey
            this_series_values = generateSQLValues(series, series_datamodel)
            series_pkey = InsertEntry(this_series_values, cnx)
            imageset_pkey = InsertImageSet(series_pkey, imageset_id, datastore_id, cnx)
            instance_tags = getInstanceTags(metadata , series["SeriesInstanceUID"])
            if populateInstanceLevel == True:
                for instance in instance_tags:
                    instance["series_pkey"] = series_pkey
                    this_instance_values = generateSQLValues(instance, instance_datamodel)
                    instance_pkey = InsertEntry(this_instance_values, cnx)
                    #Get the Frames from the metadata and insert them in the frames table
                    if populateFrameLevel == True:
                        instance_frames =  getFrameInfo(metadata , series["SeriesInstanceUID"] , instance["SOPInstanceUID"] )
                        sql_code = "INSERT INTO frame VALUES ( %s, %s, %s, %s, %s)"
                        frame_number = 1
                        for frame in instance_frames:
                            sql_data = [ None, instance_pkey , imageset_pkey , frame_number, frame["ID"] ]
                            ExecuteInsert(sql_code,sql_data , cnx , 1)
                            frame_number = frame_number + 1
            UpdateNumberOfSeriesRelatedInstances(series_pkey, cnx)
            UpdateNumberOfStudyRelatedSeriesInstances(study_pkey, cnx)
            

def InsertImageSet(series_pkey : int, imageset_id : str, datastore_id :  str, cnx):
    """ Insert the ImagesetId and datastoreId in the imageset table, like to the series_pkey. If more than 1 entry for the same series_pkey is found in this table the function
    also creates an entry in the table "conflict"  so that an external processs can reconcilitate to 1 series : 1 Imageset.
    
    Parameters:
    series_pkey : Primary key of the series table entry.
    imageset_id : the ImageSetId as found at the top of the AHI metadata.
    datastore_id : The datastoreId as found at the top of the AHI metdata.
    
    Returns:
    imaget_pkey : the primary key of the imagetset entry created.
    """
    sql_code = "INSERT INTO imageset VALUES ( %s, %s, %s, %s ) ON DUPLICATE KEY UPDATE imageset_pkey = LAST_INSERT_ID(imageset_pkey)"
    sql_data = [None, series_pkey , imageset_id , datastore_id] 
    imageset_pkey = ExecuteInsert(sql_code,sql_data, cnx, False)
    
    sql_code  = "SELECT imageset_pkey FROM imageset WHERE series_pkey = %s"
    sql_data = [series_pkey]
    res = ExecuteSelect(sql_code, sql_data, cnx, False)
    if len(res) == 2:   #if there are 2 entries for the same sries then we add the 2 imagesets in the conflict table
        for result in res:
            sql_code = "INSERT INTO conflict VALUES (%s , %s , %s , %s)"
            sql_data = [None, series_pkey , result[0] , 1 ]
            ExecuteInsert(sql_code,sql_data, cnx, True)


    if len(res) > 2: #If there are already more than 2, than we know that the original imageset is already in the conflict table. So we add the new one.
        sql_code = "INSERT INTO conflict VALUES (%s , %s , %s , %s)"
        sql_data = [None, series_pkey , imageset_pkey , 1 ] # The 1 as last variable is the priority. assuming 1 is the lowest.
        ExecuteInsert(sql_code,sql_data, cnx, True)
    else:
        cnx.commit()
    return imageset_pkey

def UpdateNumberOfStudyRelatedSeriesInstances(study_pkey : int , cnx):
    sql_code = "UPDATE study SET numberofstudyrelatedseries = ( SELECT COUNT(DISTINCT(seriesinstanceuid)) FROM series WHERE study_pkey = %s) , numberofstudyrelatedinstances = ( SELECT SUM(numberofseriesrelatedinstances) FROM series WHERE study_pkey = %s) WHERE study_pkey = %s"
    sql_data = [study_pkey,study_pkey,study_pkey] 
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, sql_data)
    cursor.close()
    cnx.commit()

def UpdateNumberOfSeriesRelatedInstances(series_pkey : int , cnx):
    sql_code = "UPDATE series SET numberofseriesrelatedinstances = ( SELECT COUNT(DISTINCT(sopinstanceuid)) FROM instance WHERE series_pkey = %s) WHERE series_pkey = %s"
    sql_data = [series_pkey,series_pkey] 
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, sql_data)
    cursor.close()
    cnx.commit()

def InsertEntry(data_values , cnx) -> int :
    insert_column_list = ""
    insert_data_list = ""
    insert_sql_data = []
    update_sql_data = []
    update_list = ""
    for column_data in data_values:
        #A special fix for the PatientId and IssuerOfPatientID : These fields can be NULL in DICOM but rerquired as value in MYSQL since they are primary keys.
        if column_data["column"] == 'patientid' and column_data["data"] is None:
                column_data["data"] = "NO_PID"
        if column_data["column"]  == 'issuerofpatientid' and column_data["data"] is None:
                column_data["data"] = "DEFAULT_DOMAIN"
        
        insert_column_list += "`"+column_data["column"]+"`, "
        insert_data_list += "%s, " 
        insert_sql_data.append( column_data["data"])
        if column_data["data_key"] == "PRI":
            update_list += column_data["column"]+" = LAST_INSERT_ID(`"+column_data["column"]+"`),"
        else:
            update_list += "`"+column_data["column"]+"` = VALUES(`"+column_data["column"]+"`),"
    sql_code = "INSERT INTO `"+column_data["table"]+"` ("+insert_column_list[:-2]+") VALUES ( "+insert_data_list[:-2]+" ) ON DUPLICATE KEY UPDATE "+update_list[:-1]
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, insert_sql_data)
    cursor.close()
    #print("Last row insert/update in table "+column_data["table"]+" : "+ str(cursor.lastrowid))
    cnx.commit()
    return cursor.lastrowid


def getPatientTags(metadata):
    return  metadata["Patient"]["DICOM"]

def getStudyTags(metadata):
    return  metadata["Study"]["DICOM"]

def getSeriesTags(metadata):
    """Get a list of series. Each series contain the dicom tags for a series.

    Parameters:
    None

    Returns:
    list of dict composed of dicom tags at the series levele.
    """
    iteration = iter(metadata["Study"]["Series"].keys())
    series_tags = []
    for series in iteration:    #This is rather useless for now because as of today ( 08/26/2023 ) there can only be one series per ImageSet.
        series_tags.append(metadata["Study"]["Series"][series]["DICOM"])
    return series_tags

def getInstanceTags(metadata, seriesinstanceuid):
    """Get a list of instances related to a series instance uid in the metadata.
    
    Parameters:
    metadata :          JSON object representing the ImageSet metadata
    seriesinstanceuid : the series instance uid of the instances we are looking for.
    
    Returns:
    List of dic composed of the DICOM tags at the instance level. One dict per instance.
    """
    instance_tags = []
    iteration = iter(metadata["Study"]["Series"][seriesinstanceuid]["Instances"].keys())
    for instance in iteration:
        instance_tags.append(metadata["Study"]["Series"][seriesinstanceuid]["Instances"][instance]["DICOM"])
    return instance_tags

def getFrameInfo(metadata, seriesinstanceuid , sopinstanceuid):
    """Get a list of instances related to a series instance uid in the metadata.
    
    Parameters:
    metadata :          JSON object representing the ImageSet metadata
    seriesinstanceuid : the series instance uid of the instances we are looking for.
    sopinstanceuid : the sop instance uid of the frame we are looking for.
    
    Returns:
    List of dic composed of info at the Frame level. One dict per frame.
    """
    frame_info = []
    for frame in metadata["Study"]["Series"][seriesinstanceuid]["Instances"][sopinstanceuid]["ImageFrames"]:
        frame_info.append(frame)
    return frame_info


def getMetadatas(datastoreIdAndImageSetIds : [], ahi_client):
    """Fetch the metadata from AHI service and returns it as an array of json objects.

    Parameters:
    datastoreIdAndImageSetIds (dict): The list of dict containing the datastoreId and imageSetId for each metadata to fetch.

    Returns:
    list of metadata json objects
    """
    metadatas = []
    for dIdandIId in datastoreIdAndImageSetIds:
        metadata = getMetadata(datastore_id=dIdandIId["datastoreId"] , imageset_id=dIdandIId["imageSetId"] , ahi_client=ahi_client)
        metadatas.append(metadata)
    return metadatas
        


def getDatastoreIdAndImageSetIds(event):
    """Fetch the data ImageSetIds in it.

    Parameters:
    event (dict): list of SQS messages
    
    Returns:
    list of dict containing the datastoreId and imageSetId as str type. eg. [{"datastoreId" : "xxxxx" , "imageSetId" : "xxxx"}]
    """
    datastoreIdAndImageSetIds = []
    
    for message in event['Records']:
        datastoreIdAndImageSetIds.append(processMessage(message))
        
    return datastoreIdAndImageSetIds
    
    
def processMessage(message):
    datastoreIdAndImageSetId = {}
    try:
        print(f"Processing message {message['body']}")
        Body = json.loads(message['body'])
        datastoreId = Body['detail']['datastoreId']
        imageSetId = Body['detail']['imageSetId']
        datastoreIdAndImageSetId = {
            "datastoreId": datastoreId,
            "imageSetId": imageSetId
        }
    except Exception as err:
        print("An error occurred: %s" % (err))
    
    return datastoreIdAndImageSetId
    
    
def getImageSetIds(bucketsAndkeys : []):
    """Fetch the job-output-manifest.json file from the S3 bucket and returns the ImageSetIds in it.

    Parameters:
    event (dict): The list of dict containing the bucket and the keys

    Returns:
    list of dict contaiing the datstoreId and ImagesetId as str type. eg. [{"datastoreid" : "xxxxx" , "imagesetid" : "xxxx"}]
    """
    datastoreidAndImagesetids = []
    s3 = boto3.resource('s3')
    for file_info in bucketsAndkeys:
        manifest = s3.Object(file_info["bucket"], file_info["key"])
        manifest_payload = manifest.get()['Body'].read()
        json_manifest = json.loads(manifest_payload)
        datastoreid = json_manifest["jobSummary"]["datastoreId"]
        for imagesetsummary in json_manifest["jobSummary"]["imageSetsSummary"]:
            datastoreidAndImagesetids.append({ "datastoreid" : datastoreid , "imagesetid" : imagesetsummary["imageSetId"]})
    return datastoreidAndImagesetids
        
   

def getBucketsAndKeysFromSns(event):
    """Iterate through the SNS event and return a list containing dicts with S3 buckets and keys

    Parameters:
    event (dict): the event receives from the SNS topic

    Returns:
    list of dict() eg. [{"bucket" : "bucket1" , "key" : "file.json" }]

    """
    bucketandKeys = []
    for event_entry in event['Records']: #There could be multiple SNS records in the event.
        payload = json.loads(event_entry["Sns"]["Message"])
        for payload_record in payload["Records"]:   #There could be multiple S3 recording in each of the SNS records.
            s3_bucket = payload_record["s3"]["bucket"]["name"]
            manifest_key = payload_record["s3"]["object"]["key"]
            bucketandKeys.append({"bucket" : s3_bucket , "key" : manifest_key})
    return bucketandKeys


def getTableDataModel(cnx : mysql.connector.MySQLConnection, table_name : str):
    """Fetch the data model from the database and returns it as a dict.

    Parameters:
    cnx (connection.MysqlConnection): the connection to the database
    table_name (str): the name of the table to fetch the data model from

    Returns:
    dict containing the data model
    """
    cursor = cnx.cursor()
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE , CHARACTER_MAXIMUM_LENGTH , COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = %s" , (table_name,))
    column_infos = cursor.fetchall()
    datamodel = []
    for column_info in column_infos:
        datamodel_entry = { "table" :  table_name , "name" : column_info[0] , "type" : column_info[1] , "length" : column_info[2] , "key" : column_info[3]}
        datamodel.append(datamodel_entry)   
    cursor.close()
    return datamodel

def generateSQLValues( tags : [] , datamodel : []):
    """Generate the values for the SQL statement.
    """
    sql_values = []
    for column in datamodel:
        data_value = None
        for tag in tags:
            if column["name"] == tag.lower():
                if column["type"].upper() in [ "BIGINT" , "INT" ]: 
                    try:
                        data_value = int(tags[tag])
                    except:
                        data_value = None
                        continue
                if column["type"].upper() in ["CHAR", "VARCHAR", "TINYTEXT", "TEXT" , "MEDIUMTEXT", "LONGTEXT"]:
                    try:
                        data_value = str(tags[tag])
                    except:
                        data_value = None
                        continue
                if column["type"].upper() == "DATE":
                    # Convert date in YYYMMDD format to a date string that MYSQL can understand.
                    try:
                        data_value = datetime.strptime( str(tags[tag]), '%Y%m%d').strftime('%Y-%m-%d')
                    except:
                        data_value = None
                        continue
                if column["type"].upper() == "TIME":
                    try:
                        date_string = str(tags[tag])
                        data_value = datetime.strptime(date_string, '%H%M%S').strftime('%H:%M:%S')
                    except:
                        data_value = None
                        continue
                break
        data_key = False
        if column["key"] in [ "PRI" , "UNI" , "MUL"]:
            data_key = True
        sql_values.append({"table": column["table"] , "column" : column["name"] , "data" : data_value , "data_key" : column["key"]})
    return sql_values
    
def getMetadata(datastore_id, imageset_id , ahi_client = None):
        """
        getMetadata(datastore_id : str = None , image_set_id : str  , client : str = None).

        :param datastore_id: The datastoreId containtaining the DICOM Study.
        :param image_set_id: The ImageSetID of the data to be DICOMized from AHI.
        :param client: Optional boto3 medical-imaging client. The functions creates its own client by default.
        :return: a JSON structure corresponding to the ImageSet Metadata.
        """ 
        import gzip
        try:
            if ahi_client is None:
                ahi_client = AHIClientFactory.AHIClientFactory()
            AHI_study_metadata = ahi_client.get_image_set_metadata(datastoreId=datastore_id , imageSetId=imageset_id)
            json_study_metadata = gzip.decompress(AHI_study_metadata["imageSetMetadataBlob"].read())
            json_study_metadata = json.loads(json_study_metadata)  
            return json_study_metadata
        except Exception as AHIErr :
            logger.error(f"[{__name__}] - {AHIErr}")
            return None
    
    
def ExecuteInsert(sql_code, sql_data, cnx , commit):
    try:
        cursor = cnx.cursor(buffered=True)
        cursor.execute(sql_code, sql_data)
        lastrowid = cursor.lastrowid
        cursor.close()
        if commit == True:
            cnx.commit()
        return lastrowid
    except Exception as err:
        logging.error(err)
        cnx.rollback()

def ExecuteSelect(sql_code, sql_data, cnx , commit):
    try:
        cursor = cnx.cursor(buffered=True)
        cursor.execute(sql_code, sql_data)
        result = cursor.fetchall()
        cursor.close()
        if commit == True :
            cnx.commit()
        return result
    except Exception as err:
        logging.error(err)
        cnx.rollback()

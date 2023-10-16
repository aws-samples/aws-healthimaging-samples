import json
import boto3
import os
import mysqlConnectionFactory
import datetime


def lambda_handler(event, context):
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
    
    try:
        cnx = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database)
        createImportJob(event, cnx)
        statuscode=200
    except:
        statuscode=400
    finally:
        cnx.close()
        return {
            'statusCode': statuscode,
            'body': ''
        }


def createImportJob(event, cnx):
    for msgenvloppe in event["Records"]:

        body=msgenvloppe["body"]
        bucket, key, bodyjson = getEventBody(body)
        EdgeId = bodyjson["EdgeId"]
        JobId = bodyjson["JobId"]
        bucket = bodyjson["DatastoreId"]
        DatastoreId = os.environ['AHLI_DATASTORE_ID']
        Status = bodyjson["Status"]
        msgtype = bodyjson["Type"]
        if Status != 'completed' :
            continue
        dcm_objs = bodyjson["DCMObjs"]
        
        for study in dcm_objs:
            study_instance_uid = study["d0020000D"]
            for series in study["series"]:
                s3importlocation = f"s3://{bucket}/{EdgeId}/{JobId}/{study_instance_uid}/{series['d0020000E']}"
                s3resultlocation = f"s3://{bucket}/results/{EdgeId}/{JobId}/{study_instance_uid}/{series['d0020000E']}"
                sql_code =  f"INSERT Ahlijob VALUES ( NULL, NULL , %s ,  1 , %s , %s , NULL , NULL , NOW()  )" # the import job to status 1 , SUBMITTED.
                # now = datetime.datetime.utcnow()
                # dt=now.strftime('%Y-%m-%d %H:%M:%S')
                sql_data = ( DatastoreId , s3importlocation , s3resultlocation ) #, dt)
                try:
                    executeStatement(sql_code, sql_data, cnx)
                except BaseException as err:
                    print("[createImportJob] - Exception : "+err)
        #we delete the file as the very last thing to do to make sure we will be able to replay the message if any of the above logic fails.
        if bucket is not None:
            s3 = boto3.client('s3')
            s3.delete_object(Bucket=bucket, Key=key)

def getEventBody(body):
    bucket = None
    key = None
    bodyjson = json.loads(body)  
    try:   
        #this will work if the body content is directly available.  If this fails most likely this is because the event body refers to an s3 key location (sqs-extended-cleint)
        JobId = bodyjson["JobId"]
    except: 
        try:
            #If the body content is bigger then 256Kb, it will be stored in S3 and the body will contain a reference to the S3 object.
            s3 = boto3.client('s3')
            bucket = bodyjson[1]["s3BucketName"]
            key = bodyjson[1]["s3Key"]
            obj = s3.get_object(Bucket=bucket, Key=key)
            bodyjson = json.loads(obj['Body'].read())
        except Exception as err:
            print(err)
    return bucket, key, bodyjson

def executeStatement(sql_code: str , sql_data , cnx):
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, sql_data)
    cnx.commit()
    cursor.close()

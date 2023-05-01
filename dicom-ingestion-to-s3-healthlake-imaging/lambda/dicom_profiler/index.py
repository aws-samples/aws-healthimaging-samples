
import json
import urllib.parse
import boto3
from io import BytesIO
from pydicom import dcmread
import PrepareSQL as PrepareSQL
import os
import mysql.connector
import mysqlConnectionFactory

def lambda_handler(event, context):
    batch_item_failures = []
    sqs_batch_response = {} 
    try:
        
        s3 = boto3.resource('s3')
        # Your secret's name and regionSS
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
    
    
        it=0
        db_connection = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database)
        db_connection.autocommit = True
        cursor = db_connection.cursor(buffered=True)
    except:
        for record in event['Records']:
            batch_item_failures.append({"itemIdentifier": record['messageId']})
            sqs_batch_response["batchItemFailures"] = batch_item_failures  
        print("[IEPDICOMProfilerERROR] - Returning all event back to SQS")
        return sqs_batch_response
        
    for record in event['Records']:
        try:
            it=it+1
            payload = json.loads(record["body"])
            #print(payload)
            #print("Received event: " + json.dumps(event, indent=2))
            bucket = payload['Records'][0]['s3']['bucket']['name']
            region = payload['Records'][0]['awsRegion']
            key = urllib.parse.unquote_plus(payload['Records'][0]['s3']['object']['key'], encoding='utf-8')
            print(str(it)+" - Inserting Image "+str(key))
            obj = s3.Object(bucket, key)
            dmcobj = obj.get()['Body'].read()
            try:
                ds = dcmread(BytesIO(dmcobj))
            except Exception as e:
                print("[lambda_handler][dcmread] "+str(e))
                print("[IEPDICOMProfilerERROR] - object "+key+" is non DICOM and will be skipped.")
                continue
            arr = PrepareSQL.PrepInsertInstance(ds)
            arr.append(bucket)
            arr.append(region)
            arr.append(key)
            cursor.callproc("IndexDICOMObject", arr)
        except Exception as e:
            print("[lambda_handler][lambda-ERROR] - "+ str(e))
            batch_item_failures.append({"itemIdentifier": record['messageId']})
    try:
        cursor.close()
        db_connection.close() 
    except Exception as err:
        print("[IEPDICOMProfilerERROR] - cloud not clear DB cursor or connection.")
    finally:
        sqs_batch_response["batchItemFailures"] = batch_item_failures
        if len(batch_item_failures) > 0:
            print("[IEPDICOMProfilerWARNING] - Partial Error Msg IDs will be returned :")
            print(batch_item_failures)
        return sqs_batch_response
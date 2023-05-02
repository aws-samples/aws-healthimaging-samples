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
    
    
    print('received event:')
    print(event)
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
        print(body)
        bodyjson = json.loads(body)
        EdgeId = bodyjson["EdgeId"]
        JobId = bodyjson["JobId"]
        bucket = bodyjson["DatastoreId"]
        DatastoreId = os.environ['AHLI_DATASTORE_ID']
        Status = bodyjson["Status"]
        if Status != 'completed':
            continue
        s3importlocation = f"s3://{bucket}/{EdgeId}/{JobId}"
        s3resultlocation = f"s3://{bucket}/results/{EdgeId}/{JobId}"
        sql_code =  f"INSERT Ahlijob VALUES ( NULL, NULL , %s ,  1 , %s , %s , NULL , NULL , %s  )" # the import job to status 1 , SUBMITTED.
        now = datetime.datetime.utcnow()
        dt=now.strftime('%Y-%m-%d %H:%M:%S')
        sql_data = ( DatastoreId , s3importlocation , s3resultlocation, dt)
        try:
            executeStatement(sql_code, sql_data, cnx)
        except BaseException as err:
            print("[createImportJob] - SQL exception : "+err)
            
def executeStatement(sql_code: str , sql_data , cnx):
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, sql_data)
    cnx.commit()
    cursor.close()

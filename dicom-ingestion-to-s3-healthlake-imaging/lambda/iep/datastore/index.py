import os
import json
import datetime
import miClientFactory
import mysqlConnectionFactory
import deleteDatastore
import createDatastore
import boto3 





def lambda_handler(event, context):
    print(os.getcwd())
    miclient = miClientFactory.miClientFactory()
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
    operation =  event['httpMethod']
    print(operation)
    if operation == 'GET':
        status, payload = listDStore(miclient)
    else:
        db_connection = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database)
        if operation == 'PUT':
            status, payload = createDStore(event, mi_client=miclient, db_connection=db_connection)
        if operation == 'DELETE':
            status, payload = deleteDStore(event, mi_client=miclient, db_connection=db_connection)
        db_connection.close()

    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': payload
    }


def createDStore(event, mi_client, db_connection):
    qsp=event["queryStringParameters"]
    datastoreName=qsp["datastoreName"]
    print("datastoreName : " + str(datastoreName))
    return createDatastore.createDatastore(mi_client=mi_client, datastore_name=datastoreName, db_connection=db_connection)

def listDStore(miclient):
    try:
        ds = miclient.list_datastores()
        return 200 , json.dumps(ds["datastoreSummaries"] , default=DateTimeToEpoch)
    except Exception as err:
        print(f"[listDatastore] - {err}")
        return 503, None

def deleteDStore(event, mi_client, db_connection):
    qsp=event["queryStringParameters"]
    print(str(qsp))
    datastoreId=qsp["datastoreId"]
    return deleteDatastore.deleteDatastore(mi_client=mi_client,datastore_id=datastoreId, db_connection=db_connection)
    
def DateTimeToEpoch(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, datetime.datetime):
        return str(obj.timestamp())
    raise TypeError ("Type %s not serializable" % type(obj))
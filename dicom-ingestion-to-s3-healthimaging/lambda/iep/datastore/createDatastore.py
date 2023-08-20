import json 
import boto3
import os
import mysql.connector as mysql

def createDatastore(mi_client , datastore_name : str,  db_connection : mysql.MySQLConnection ):
    statuscode=200
    try:
        datastoreResponse = mi_client.create_datastore(datastoreName=datastore_name)
        datastoreId = datastoreResponse["datastoreId"]
        createDatastoreLandingBucket(datastoreId)
        insertDatastoreEntry(datastoreId=datastoreId, datastoreName=datastore_name , db_connection=db_connection)
    except Exception as err:
        datastore = None
        statuscode = 503
        print(str(err))
     

    return statuscode , json.dumps(datastoreResponse)
  

def createDatastoreLandingBucket(datastoreId):
    s3_client = boto3.resource('s3')
    s3_client.create_bucket(Bucket=datastoreId)
    bucket_notification = s3_client.BucketNotification(bucket_name=datastoreId)
    sts_client = boto3.client('sts')
    account = sts_client.get_caller_identity()['Account']
    lambda_client = boto3.client('lambda')
    lambda_client.add_permission(
        FunctionName=os.environ["S3TODB_FUNCTION_ARN"].split(":")[6],
        StatementId=datastoreId,
        Action='lambda:InvokeFunction',
        Principal='s3.amazonaws.com',
        SourceArn=str('arn:aws:s3:::'+datastoreId),
        SourceAccount= account
    )
    s3todbarn = os.environ["S3TODB_FUNCTION_ARN"]
    print(s3todbarn)
    data = {}
    NotificationConfiguration={'LambdaFunctionConfigurations': [{'Id': datastoreId, 'LambdaFunctionArn': s3todbarn,'Events': ['s3:ObjectCreated:*'], 'Filter': {'Key' : {"FilterRules": [{"Name": "suffix","Value": "dcm"}]}} }]}

    s3_client.create_bucket(Bucket=datastoreId)
    s3_client = boto3.client("s3")
    s3_client.put_bucket_notification_configuration(Bucket=datastoreId,NotificationConfiguration=NotificationConfiguration)

def insertDatastoreEntry(datastoreId : str, datastoreName : str , db_connection : mysql.MySQLConnection):
    sql_code = f"insert into Ahlidatastore(ahlidatastoreid,ahlidatastorename) values ( %s, %s)"
    sql_data = ( datastoreId , datastoreName)
    cursor = db_connection.cursor()
    results = cursor.execute(sql_code, sql_data)
    db_connection.commit()
    cursor.close()

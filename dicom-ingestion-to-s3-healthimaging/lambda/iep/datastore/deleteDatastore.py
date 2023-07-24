import boto3
import mysql.connector

def deleteDatastore( mi_client , datastore_id : str , db_connection: mysql.connector.MySQLConnection ):
    try:
        datastoreStatus = mi_client.delete_datastore(datastoreId=datastore_id)
        status= 200
    except Exception as err:
        print(str(err))
        status = 503
        datastoreStatus = None 
    try:
        deleteDatastoreLandingBucket(datastore_id)
    except Exception as err:
        print(str(err))
        datastoreStatus = None   
    try:
        deleteDatastoreEntry(datastore_id , db_connection)
    except Exception as err:
        print(str(err))
        status = 503
        datastoreStatus = None   
    return status , datastoreStatus

def deleteDatastoreLandingBucket(datastore_id):
    try:
        resource = boto3.resource("s3")
        bucket_name = datastore_id
        s3_bucket = resource.Bucket(datastore_id)
        s3_bucket.delete()
    except:
        print(f"Could not remove the datastore bucket {datastore_id}")

def deleteDatastoreEntry(datastore_id : str, db_connection: mysql.connector.MySQLConnection ):
    try:
        sql_code = f"delete from Ahlidatastore where ahlidatastoreid = %s"
        sql_data = (datastore_id)
        cursor = db_connection.cursor()
        cursor.execute(sql_code, sql_data)
        db_connection.commit()
        cursor.close()
    except:
        print(f"Could not remove the datastore declaration in the database: {datastore_id}")

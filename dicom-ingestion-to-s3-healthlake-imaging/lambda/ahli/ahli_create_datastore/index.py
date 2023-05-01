import json
import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import mysqlConnectionFactory
import boto3
import os
import miClientFactory
from crhelper import CfnResource

miclient = miClientFactory.miClientFactory()

helper = CfnResource(log_level="DEBUG")
# Your secret's name and region
secret_name = os.environ["DB_SECRET"]
region_name =  os.environ['AWS_REGION']

@helper.delete
def delete_datastore(event, context):
  print(event)
  print(context)
  print(f"Deleting AHLI datastore {event['PhysicalResourceId']}")
  datastoreId = event["PhysicalResourceId"]
  datastoreResponse = miclient.delete_datastore(datastoreId=datastoreId)
      
@helper.update
def update_datastore(event, context):
  pass

@helper.create
def create_datastore(event, context):
  #Get the database credentials
  print(event)
  print(context)
  session = boto3.session.Session()
  client = session.client(service_name='secretsmanager',region_name=region_name)
  # Calling SecretsManager
  response = client.get_secret_value(SecretId=secret_name)
  database_secrets = json.loads(response['SecretString'])
  username = database_secrets["username"]
  password = database_secrets["password"]
  hostname = database_secrets["host"]
  database = database_secrets["dbname"]

  statuscode=200
  try:
    print("trying to create the datastore")
    datastoreResponse = miclient.create_datastore(datastoreName="IEP")
    datastoreId = str(datastoreResponse["datastoreId"])
    print("Datastore created  : " + datastoreId)
    print("Trying to insert into the database")
    cnx = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database)
    sql_code = f"insert into Ahlidatastore(ahlidatastoreid,ahlidatastorename) values ( %s, %s)"
    sql_data = ( datastoreId , "IEP-datastore")
    cursor = cnx.cursor(buffered=True)
    cursor.execute(sql_code, sql_data)
    cnx.commit()
    cursor.close()
    cnx.close()
    print("Insert done") 
    helper.Data.update({"datastoreId": datastoreId})
    return datastoreId
  except Exception as err:
    raise ValueError(err)
  


def lambda_handler(event, context):
  helper(event, context)

import json
import mysql.connector
import ssl
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import mysqlConnectionFactory
import boto3
import base64
import os
import time
from crhelper import CfnResource

helper = CfnResource(log_level="DEBUG")
# Your secret's name and region
secret_name = os.environ["DB_SECRET"]
region_name =  os.environ['AWS_REGION']



# @helper.update
# def db_update_tables(event, context):
#   pass

@helper.delete
def db_drop_tables(event, context):
  pass      

@helper.create
@helper.update
def db_create_tables(event, context):
  #Get the database credentials
  session = boto3.session.Session()
  client = session.client(service_name='secretsmanager',region_name=region_name)
  # Calling SecretsManager
  response = client.get_secret_value(SecretId=secret_name)
  database_secrets = json.loads(response['SecretString'])
  username = database_secrets["username"]
  password = database_secrets["password"]
  hostname = database_secrets["host"]
  database = database_secrets["dbname"]
  #Create the RDS Proxy client to Aurora
  #cnx=createDBconnection(hostname, username, password, database)
  cnx = mysqlConnectionFactory.mysqlConnectionFactory(hostname, username, password, database)
  
  #Iterate through the files to create the tables
  print("Setting up the database config for schema creation...")
  IterateandCreate(cnx, "pre_config")
  print("Creating tables...")
  IterateandCreate(cnx, "schema/tables")
  print("Creating views...")
  IterateandCreate(cnx, "schema/views")
  # print("Creating store procedures...")
  # IterateandCreate(cnx, "schema/storeprocs")
  # print("Creating triggers...")
  # IterateandCreate(cnx, "schema/triggers")
  print("Setting up the database config for schema usage...")
  IterateandCreate(cnx, "post_config")
  print("Injecting data...")
  RunQuery(cnx, "data")

  cnx.close()


  # TODO implement
  return {
      'statusCode': 200,
      'body': json.dumps('Hello from Lambda!')
  } 
  

  
def IterateandCreate(cnx, folderpath):
  try:
    filenames = os.listdir(folderpath)
  except:
    print("No files found in {}".format(folderpath))
    return
  for filename in os.listdir(folderpath):
    filepath = os.path.join(folderpath, filename)
    with open(filepath) as f:
      content = f.read()
      cursor = cnx.cursor()
      try:
        print("Creating {}: ".format(filename), end='')
        results = cursor.execute(content, multi=True)
        try:
            for result in results:
                pass
        except Exception as e:
            pass
        cnx.commit()
        cursor.close()
      except mysql.connector.Error as err:
        if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
          print("already exists.")
        else:
          print(err.msg)
      else:
          print("OK")
      cnx.commit()
      cursor.close()



def RunQuery(cnx, folderpath):
  try:
    filenames = os.listdir(folderpath)
  except:
    print("No files found in {}".format(folderpath))
    return
  for filename in os.listdir(folderpath):
    filepath = os.path.join(folderpath, filename)
    with open(filepath) as f:
      content = f.read()
      cursor = cnx.cursor(buffered=True)
      try:
        cursor.execute(content, multi=True)
        cnx.commit()
        cursor.close()
      except mysql.connector.Error as err:
        print("[RunQuery] - "+err.msg)
      

   

def lambda_handler(event, context):
  helper(event, context)
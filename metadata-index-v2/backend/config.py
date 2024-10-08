#CDK_APP_NAME = "[APP-STACK_NAME]"
CDK_APP_NAME = "metadata-index-v2"

#AHI settings: This should be set regardless of the mode.
#The datstore ARN of the AHI datastore. You can find this value in the AHI Web console on your AWS account.
#AHI_DATASTORE_ARN = "arn:aws:medical-imaging:[REGION]:[ACCOUNT_NUMBER]:datastore/[DATASTORE_ID]"
AHI_DATASTORE_ARN = "arn:aws:medical-imaging:us-east-1:793803570670:datastore/46015371bee548dd90178e18eaa7b96a"

#Note that to use RDBMS mode requires to havve a VPC. Make sure to set USE_PVC to True in the VPC config below.
RDBMS_CONFIG = {
    "enabled" : True,
    #Wether to populate the instance level tags in the instance table or not.
    "populate_instance_level" : True,
    #Wether to populate the frame level tags in the frame table or not. If this is set to True, the instance level tags will also be populated.
    "populate_frame_level" : True,
    "db_name" : "ahiindex",
    "min_acu_capacity" : 1,
    "max_acu_capacity" : 16
}

DATALAKE_CONFIG = {
    "enabled" : True,
    #Wether to populate the instance level tags in the AHI datalake or not.
    "populate_instance_level" : True,
    #If the parameter destination_bucket_name is left empty the solution will create a random bucket name. If you choose to use a bucket name of your own, make sure that the bucket name is not already in use.
    "destination_bucket_name" : "",
    "deploy_glue_default_config" : True,
}

OPENSEARCH_CONFIG = {
    "enabled" : False,
    "populate_instance_level" : True,
    "OPENSEARCH_DOMAIN_NAME" : ""
}

# VPC settings. These are optional for the OpenSearch and Datalake modes, but required for the RDBMS mode.
VPC = {
    "USE_VPC" : True,
    "EXISTING_VPC_ID" : "",
    "NEW_VPC_CIDR" :  "10.10.0.0/22"
}


############################################################################################################################################################
#### DO NOT MODIFY CONFIG BELOW THIS LINE ##################################################################################################################
############################################################################################################################################################
LAMBDA_CONFIG = {

    "DbInit": {
        "entry": "lambda/db_init",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 15,
        "memory": 256,
        "layers": ["mysqlConnector", "mysqlConnectionFactory"],
        "reserved_concurrency": 0,
        "envs": {},
        "privileges" : []
    },

    "AHItoOpenSearch": {
        "entry": "lambda/AHItoOpenSearch",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 2,
        "memory": 4096,
        "layers": ["AHItoDICOMInterface"],
        "reserved_concurrency": 0,
        "envs": {},
        "privileges" : []
       
    },
    
    "AHItoDatalake": {
        "entry": "lambda/AHItoDatalake",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 2,
        "memory": 4096,
        "layers": ["AHItoDICOMInterface"],
        "reserved_concurrency": 0,
        "envs": {},
        "privileges" : []
       
    },

        "AHItoRDBMS": {
        "entry": "lambda/AHItoRDBMS",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 2,
        "memory": 4096,
        "layers": [ "mysqlConnector", "mysqlConnectionFactory" , "AHIClientFactory"],
        "reserved_concurrency": 0,
        "envs": {},
        "privileges" : []
       
    },


}
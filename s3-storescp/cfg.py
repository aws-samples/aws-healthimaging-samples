# Application Configuration
# Note: changing the APP_NAME will result in a new stack being provisioned
APP_NAME = "S3SCP"
APP_VERSION = "version 0.3"
CFN_STACK_DESCRIPTION = "S3StoreSCP (" + APP_VERSION + ")"

DEPLOY_REGION="us-east-1"
RECEIVE_BUCKET_NAME = "" # optional. Name of an existing bucket in the same region as the application deployment. If empty a new bucket will be created.

# VPC options
VPC_CIDR = "10.29.0.0/16" # cidr for the vpc that will be provisioned.
PUBLIC_LOAD_BALANCER = False # If this is set to True, the NLB will have a public Internet IP address
ALLOW_NON_TLS_PORT = True # allow security group access to the non-encrypted port
ALLOWED_PEERS = {
        # access from the provisioned VPC is allowed, specify additional allowed peers:
        #"172.31.0.0/16", # Allow from a subnet, in a peered VPC or remote private network.
        #"123.123.123.123/32", # Allow access from individual IP address, public or private
        #"0.0.0.0/0", # Allow access from anywhere
    }

# Application Options
SCP_PORT = 11112 # non-TLS service port
STUNNEL_PORT = 11113 # TLS service port
ENVIRONMENT = {
    "CREATE_METADATA": False,
    "GZIP_FILES": False,
    "GZIP_LEVEL": 5,
    "ADD_STUDYUID_PREFIX": False,
    "S3_UPLOAD_WORKERS": 10,
    "DICOM_PREFIX": "DICOM",
    "METADATA_PREFIX": "METADATA",
    "CSTORE_DELAY_MS": 0,
    "LOG_LEVEL": "INFO",
    "BOTO_MAX_POOL_CONNECTIONS": 50,
    "SCP_PORT": SCP_PORT,
    "STUNNEL_PORT": STUNNEL_PORT,
    "DIMSE_TIMEOUT": 30,
    "MAXIMUM_ASSOCIATIONS": 20, 
    "MAXIMUM_PDU_SIZE": 0,
    "NETWORK_TIMEOUT": 60
}

# Fargate task defintion parameters
TASK_CPU=2048
TASK_MEMORY_MIB=4096
TASK_COUNT=1
AUTOSCALE_MAX_TASKS=10
# Enable below if ssh access to the containers is required (useful for debugging). 
TASK_ENABLE_EXEC_COMMAND=False
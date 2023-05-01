"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Config file for the solution deployment via CDK
"""


CDK_APP_NAME = "iep1"

VPC_CIDR = "10.10.0.0/22"

RESOURCE_TAGS = {
    "tag_list" : {
        "purpose" : "IEP-demo",
        "exampletag2" : "examplevalue2"
    }
}

EDGE_CONFIG = [
    { "Name" : "edge-1" , "device_type" : "LOCAL" },  #possible device_tpypes are  : EC2 or LOCAL
    # { "Name" : "edge-2" , "device_type" : "LOCAL" }, 
]


AHLI_CONFIG = {
    "ahli_enabled" : True,
    "ahli_endpoint" : "", 
    "ahli_concurrent_imports" : 5
}

## Advanced configurations - NO changes required for default deployment.


DB_CONFIG = {
    "db_name" : "iep",
    "db_engine_pause" : 20,
    "min_acu_capacity" : "ACU_8",
    "max_acu_capacity" : "ACU_64"
}

LAMBDA_CONFIG = {
    "DICOMProfiler": {
        "entry": "lambda/dicom_profiler",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 2,
        "memory": 4096,
        "layers": ["pydicom", "mysqlConnectionFactory", "mysqlConnector"],
        "reserved_concurrency": 0,
        "envs": {},
        "privileges" : []
       
    },
    "datastore": {
        "entry": "lambda/iep/datastore",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 15,
        "memory": 2048,
        "layers": ["miClientFactory", "mysqlConnectionFactory", "mysqlConnector"],
        "reserved_concurrency": 0,
        "need_db":  True,
        "envs": {
            'AHLI_ENDPOINT' : AHLI_CONFIG["ahli_endpoint"]
        },
        "privileges" : []

    },
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



    ### AHLI LAMBDA FUNCTIONS
    "CreateAHLIDatastore": {
        "entry": "lambda/ahli/ahli_create_datastore",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 15,
        "memory": 256,
        "layers": ["miClientFactory", "mysqlConnectionFactory", "mysqlConnector"],
        "reserved_concurrency": 0,
        "need_db":  True,
        "envs": {
            'AHLI_ENDPOINT' : AHLI_CONFIG["ahli_endpoint"]
        },
        "privileges" : []
    },

    "AhliJobProcessor": {
        "entry": "lambda/ahli/ahli_job_processor",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 1,
        "memory": 2048,
        "layers": ["miClientFactory", "mysqlConnectionFactory", "mysqlConnector"],
        "reserved_concurrency": 0,
        "need_db":  True,
        "envs": {
            'AHLI_ENDPOINT' : AHLI_CONFIG["ahli_endpoint"],
            'AHLI_MAX_CONCURRENT_JOBS' : AHLI_CONFIG["ahli_concurrent_imports"]
        },
        "privileges" : []
    },    

    "AhliCreateImportJob": {
        "entry": "lambda/ahli/ahli_create_import_job",
        "handler": "lambda_handler",
        "index": "index",
        "timeout": 1,
        "memory": 256,
        "layers": ["mysqlConnectionFactory", "mysqlConnector"],
        "reserved_concurrency": 0,
        "need_db":  True,
        "envs": {
            'AHLI_ENDPOINT' : AHLI_CONFIG["ahli_endpoint"],             
        },
        "privileges" : []
    }
}



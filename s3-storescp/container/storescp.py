#!/usr/bin/env python3

import io
import os
import logging
import time
import json
import gzip
import shutil
from environs import Env
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import as_completed

import boto3
import botocore
from pynetdicom import AE, evt, AllStoragePresentationContexts, debug_logger
from pynetdicom.sop_class import Verification
from pydicom.filewriter import write_file_meta_info
from pydicom.filereader import dcmread

# Parse the environment
env=Env()
# mandatory:
region = env("AWS_REGION")
bucket = env("RECEIVE_BUCKET")
# optional, with defaults:
create_metadata = env.bool("CREATE_METADATA", False)
gzip_files = env.bool("GZIP_FILES", False)
gzip_level = env.int("GZIP_LEVEL", 5)
add_studyuid_prefix = env.bool("ADD_STUDYUID_PREFIX", False)
s3_upload_workers = env.int("S3_UPLOAD_WORKERS", 10)
scp_port = env.int("SCP_PORT", 11112)   
loglevel = env.log_level("LOG_LEVEL", "INFO")
dicom_prefix = env("DICOM_PREFIX","")
metadata_prefix = env("METADATA_PREFIX","")
cstore_delay_ms = env.int("CSTORE_DELAY_MS", 0)
boto_max_pool_connections = env.int("BOTO_MAX_POOL_CONNECTIONS", 10)
dimse_timeout = env.int("DIMSE_TIMEOUT", 30)
maximum_associations = env.int("MAXIMUM_ASSOCIATIONS", 10)
maximum_pdu_size = env.int("MAXIMUM_PDU_SIZE", 0)
network_timeout = env.int("NETWORK_TIMEOUT", 60)

if dicom_prefix: 
    dicom_prefix = dicom_prefix + '/'
if metadata_prefix:
    metadata_prefix = metadata_prefix + '/'   

# set default logging configuration
logging.basicConfig(format='%(levelname)s - %(asctime)s.%(msecs)03d %(threadName)s: %(message)s',datefmt='%H:%M:%S', level=loglevel)   
logging.info(f'Setting log level to {loglevel}')

# create a shared S3 client and use it for all threads (clients are thread-safe)
logging.info(f'Creating S3 client with max_pool_connections = {boto_max_pool_connections}.')
s3client = boto3.client('s3', region_name=region, config=botocore.client.Config(max_pool_connections=boto_max_pool_connections) )

# initialize thread pool
logging.info(f'Provisioning ThreadPool of {s3_upload_workers} S3 upload workers.')
executor = ThreadPoolExecutor(max_workers=int(s3_upload_workers))

#debug_logger()

# Implement a handler for evt.EVT_C_STORE
def handle_store(event):
    """Handle a C-STORE request event."""
 
    try:
        # initialize the file-like memory object
        buf = io.BytesIO()
        # write raw without decoding
        # https://pydicom.github.io/pynetdicom/stable/examples/storage.html
        # https://github.com/pydicom/pynetdicom/issues/367
        # Write the preamble, prefix, file meta, encoded dataset
        buf.write(b'\x00' * 128)
        buf.write(b'DICM')
        write_file_meta_info(buf, event.file_meta)
        buf.write(event.request.DataSet.getvalue())
        # set read pointer to beginning of buffer 
        buf.seek(0)
        
        # read the non-pixel metadata from memory
        ds = dcmread(buf,stop_before_pixels=True)
        # re-set the read pointer back to beginning of buffer
        buf.seek(0)     

        if add_studyuid_prefix:
            suid_prefix = ds.StudyInstanceUID + '/'
        else:
            suid_prefix = ''
            
        dkey = dicom_prefix + suid_prefix + ds.SOPInstanceUID + '.dcm'
    
        if create_metadata:
            logging.debug("Creating Metadata object")
            js = ds.to_json(dump_handler=json_dumps_compact)
            #print(js)
            mkey = metadata_prefix + suid_prefix + ds.SOPInstanceUID + '.json'
            logging.debug(f'Processing file: {mkey}')
            executor.submit(s3_upload, io.BytesIO(js.encode('utf-8')), bucket, mkey, gzip_files, "application/json")
            
        # submit s3 upload tasks to the thread pool
        logging.debug(f'Processing: {dkey}')
        executor.submit(s3_upload, buf, bucket, dkey, gzip_files, "application/octet-stream")
        
        # optional c-store delay, can be used as a front-end throttling mechanism
        if cstore_delay_ms or cstore_delay_ms!=0:
            logging.info(f'Injecting C-STORE delay: {cstore_delay_ms} ms')
            time.sleep(int(cstore_delay_ms) / 1000)
            
    except BaseException as e:
        logging.error(f'Error in C-STORE processing. {e}')
        return 0xC211
    
    # return success after instance is received and written to memory
    return 0x0000
           
def s3_upload(buf,bucket,key,gzip_files,ctype):    
    start_time = time.time()
    logging.debug(f'Starting s3 upload of {key}')

    try:
        if gzip_files: # optionally in-memory compress the file 
            logging.info(f'Compressing {key}')
            s3buf = io.BytesIO()
            with gzip.GzipFile(fileobj=s3buf, compresslevel=gzip_level, mode='wb') as gz:
                shutil.copyfileobj(buf,gz)
            s3buf.seek(0)
            extraargs = {'ContentType': ctype, 'ContentEncoding': 'gzip'}
        else:
            s3buf = buf
            extraargs = {'ContentType': ctype}
    except BaseException as e:
        logging.error(f'Error in compression. {e}')
    
    try:
        upload = s3client.upload_fileobj(s3buf, bucket, key, ExtraArgs=extraargs)
    except BaseException as e:
        logging.error(f'Error in S3 upload. {e}')
        return False
    
    # clean up the memory objects
    buf.close()
    s3buf.close()
    elapsed_time = time.time() - start_time
    logging.info(f'Finished s3 upload of {key} in {elapsed_time} s')

    return True

def json_dumps_compact(data):
    return json.dumps(data, separators=(',',':'), sort_keys=True)
    
def main():

    logging.warning(f'Starting application.')
    logging.warning(f'Environment: {env}')
          
    # handlers = [    (evt.EVT_C_STORE, handle_store, [os.getcwd()+'/out']), (evt.EVT_CONN_OPEN , handle_open), (evt.EVT_ACCEPTED , handle_accepted), (evt.EVT_RELEASED  , handle_assoc_close ) , (evt.EVT_ABORTED  , handle_assoc_close )]       
    handlers = [(evt.EVT_C_STORE, handle_store)]

    # Initialise the Application Entity
    ae = AE()
    # overwrite AE defaults as per configuration
    ae.maximum_pdu_size = maximum_pdu_size
    ae.dimse_timeout = dimse_timeout
    ae.maximum_associations = maximum_associations
    ae.network_timeout = network_timeout
    
    # Support presentation contexts for all storage SOP Classes
    ae.supported_contexts = AllStoragePresentationContexts
    # enable verification
    ae.add_supported_context(Verification)
    # Start listening for incoming association requests
    logging.warning(f'Starting SCP Listener on port {scp_port}')
    scp = ae.start_server(("", scp_port), evt_handlers=handlers)

if __name__ == "__main__":
    main()

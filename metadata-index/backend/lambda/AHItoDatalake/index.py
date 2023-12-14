import re
import os
import json
import boto3
import datetime
from AHItoDICOMInterface.AHItoDICOM import AHItoDICOM


def lambda_handler(event, context):

    if os.environ["POPULATE_INSTANCE_LEVEL"].lower() == "true":
        populateInstanceLevel = True
    else:
        populateInstanceLevel = False
    bucketsAndKeys = getBucketsAndKeysFromSns(event)
    datastoreidAndImagesetids = getImageSetIds(bucketsAndKeys)
    metadatas = getMetadatas(datastoreidAndImagesetids)
    
    print("Processing Patient level metadata")
    patientLeveLTags = extractTags('patient', metadatas)
    print("Processing Study level metadata")
    studyLeveLTags = extractTags('study', metadatas)
    print("Processing Series level metadata")
    seriesLeveLTags = extractTags('series', metadatas)
    print("Processing Instance level metadata")
    if populateInstanceLevel:
        instanceLeveLTags = extractTags('instance', metadatas)

    
    bucket = os.environ["DESTINATION_BUCKET"]
    
    exporttoS3(bucket=bucket , data=patientLeveLTags)
    exporttoS3(bucket=bucket , data=studyLeveLTags)
    exporttoS3(bucket=bucket , data=seriesLeveLTags)
    if populateInstanceLevel:
        exporttoS3(bucket=bucket , data=instanceLeveLTags)
    




def exporttoS3(bucket: str,  data: []):
    """Export the files contains the json data to the S3 destination.

    Parameters:
    bucket (str): The name of the destination bucket.
    data ([]) : the array containing the file payload.

    Returns:
    None
    """
    for item in data:
        upload_data(bucket, item)
    
def upload_data(bucket: str, data ):
    s3 = boto3.resource('s3')
    converted_data =bytes(json.dumps(data["data"]), encoding='utf-8')
    client = boto3.client('s3')
    response = client.put_object(Body=converted_data, Bucket=bucket, Key=data["identifier"]+".json")


def extractTags(level: str, metadatas: []):
    """Get the DICOM tag associated to the level provided as input in the metdata object.

    Parameters:
    level (str): can be either patient, study , series or instance

    Returns:
    list of dict compose of the Data Identifier and the JSON object.
    """
    jsonDICOMTags = []
    level = level.lower()
    
    for metadata in metadatas:
        datastoreid = metadata["DatastoreID"]
        imagesetid = metadata["ImageSetID"]
        series_key = next(iter(metadata["Study"]["Series"].keys()))
        file_prefix = generateFilePrefix(level, metadata["Study"]["DICOM"])
        
        # Let's find the patient and issuer of patient Id, this will be injected at the Patient and Study level for tables links
        if level == "patient" or level == "study":
            IssuerOfPatientID = ""
            PatientID = ""
            json_block = metadata["Patient"]["DICOM"]
            json_block.update({"datastoreId" : datastoreid})
            json_block.update( {"ImagesetId" : imagesetid})   
            try:
                IssuerOfPatientID=json_block["IssuerOfPatientID"]
            except:
                pass
            try:
                PatientID = json_block["PatientID"]
            except:
                pass
        
        #Let's find the StudyInstanceUID and use it to reference the study in the series table.
        if level == "series":
            StudyInstanceUID = metadata["Study"]["DICOM"]["StudyInstanceUID"]
        

        if level == "patient":
            json_block = metadata["Patient"]["DICOM"]
            json_block.update({"IssuerOfPatientID" : IssuerOfPatientID})
            json_block.update({"PatientID" : PatientID})
            json_block.update({"UpdatedAt" : datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
            jsonDICOMTags.append({"identifier" :file_prefix+IssuerOfPatientID+"-"+PatientID , "data" : json_block})
        elif level == "study":
            json_block = metadata["Study"]["DICOM"]
            json_block.update({"IssuerOfPatientID" : IssuerOfPatientID})
            json_block.update({"PatientID" : PatientID})
            json_block.update({"DatastoreId" : datastoreid})
            json_block.update( {"ImagesetId" : imagesetid})  
            json_block.update({"UpdatedAt" : datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
            jsonDICOMTags.append({"identifier" : file_prefix+json_block["StudyInstanceUID"] , "data" : json_block})
        elif level == "series":
            json_block = metadata["Study"]["Series"][series_key]["DICOM"]
            json_block.update({"DatastoreId" : datastoreid})
            json_block.update( {"ImagesetId" : imagesetid}) 
            json_block.update({"UpdatedAt" : datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
            json_block.update({"StudyInstanceUID" : StudyInstanceUID})    
            jsonDICOMTags.append({"identifier" : file_prefix+series_key , "data" : json_block})
        elif level == "instance":
            for key in metadata["Study"]["Series"][series_key]["Instances"].keys():
                json_block = metadata["Study"]["Series"][series_key]["Instances"][key]["DICOM"]
                json_block.update({"SeriesInstanceUID" : series_key})
                json_block.update({"DatastoreId" : datastoreid})
                json_block.update({"ImagesetId" : imagesetid})      
                json_block.update({"UpdatedAt" : datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")})            
                jsonDICOMTags.append({ "identifier" : file_prefix+key , "data" : json_block})
        else:
            return []   
    
    return jsonDICOMTags


def generateFilePrefix(level: str , metadata ):
    """Generates the file prefix on S3 based on the Study date and the Tag levels. If the StudyDate is not present defaults to current date.
    
    Parameters:
    level (str): The list of dict containing the datastoreId and imageSetId for each metadata to fetch.
    metadata: the Study level JSON DICOM block of the metadata.

    Returns:
    a string corresponding to the S3 prefix.
    """
    def buildCurrentDatePrefix():
        print("No study date found, defaulting to today for prefix creation.")
        now = datetime.date.today()
        date_prefix = "year="+str(now.year)+"/month="+str(now.month)+"/day="+str(now.day)+"/"
        return date_prefix
        
    try:
        study_date = metadata["StudyDate"]
        pattern = "^\d{8}$"
        if re.match(pattern, study_date):
            year = study_date[0:4]
            month = study_date[4:6]
            day = study_date[6:8]
            date_prefix = "year="+str(year)+"/month="+str(month)+"/day="+str(day)+"/"
        else:
            print("No study date found, defaulting to today for prefix creation.")
            date_prefix = buildCurrentDatePrefix()
    except:
        date_prefix = buildCurrentDatePrefix()
    return level+"/"+date_prefix

def getMetadatas(bucketsdatastoreidAndImagesetidsAndkeys : []):
    """Fetch the metadata from AHI service and returns it as an array of json objects.

    Parameters:
    event (dict): The list of dict containing the datastoreId and imageSetId for each metadata to fetch.

    Returns:
    list of metadata json objects
    """
    metadatas = []
    helper = AHItoDICOM()
    for dIdandIId in bucketsdatastoreidAndImagesetidsAndkeys:
        metadata = helper.getMetadata(datastore_id=dIdandIId["datastoreid"] , imageset_id=dIdandIId["imagesetid"])
        metadatas.append(metadata)
    return metadatas
        


def getImageSetIds(bucketsAndkeys : []):
    """Fetch the job-output-manifest.json file from the S3 bucket and returns the ImageSetIds in it.

    Parameters:
    event (dict): The list of dict containing the bucket and the keys

    Returns:
    list of dict contaiing the datstoreId and ImagesetId as str type. eg. [{"datastoreid" : "xxxxx" , "imagesetid" : "xxxx"}]
    """
    datastoreidAndImagesetids = []
    s3 = boto3.resource('s3')
    for file_info in bucketsAndkeys:
        manifest = s3.Object(file_info["bucket"], file_info["key"])
        manifest_payload = manifest.get()['Body'].read()
        json_manifest = json.loads(manifest_payload)
        datastoreid = json_manifest["jobSummary"]["datastoreId"]
        for imagesetsummary in json_manifest["jobSummary"]["imageSetsSummary"]:
            datastoreidAndImagesetids.append({ "datastoreid" : datastoreid , "imagesetid" : imagesetsummary["imageSetId"]})
    return datastoreidAndImagesetids
        
   

def getBucketsAndKeysFromSns(event):
    """Iterate through the SNS event and return a list containing dicts with S3 buckets and keys

    Parameters:
    event (dict): the event receives from the SNS topic

    Returns:
    list of dict() eg. [{"bucket" : "bucket1" , "key" : "file.json" }]

    """
    bucketandKeys = []
    for event_entry in event['Records']:
        payload = json.loads(event_entry["Sns"]["Message"])
        for payload_record in payload["Records"]:
            s3_bucket = payload_record["s3"]["bucket"]["name"]
            manifest_key = payload_record["s3"]["object"]["key"]
            bucketandKeys.append({"bucket" : s3_bucket , "key" : manifest_key})
    print(bucketandKeys)
    return bucketandKeys

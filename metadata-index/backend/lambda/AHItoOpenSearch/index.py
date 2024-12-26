# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
from AHItoDICOMInterface.AHItoDICOM import AHItoDICOM

def lambda_handler(event, context):
    # retrieve datastore id and image set ids
    #bucketsAndKeys = getBucketsAndKeysFromSns(event)
    #datastoreidAndImagesetids = getImageSetIds(bucketsAndKeys)
    print("event: %s" % (event))
    datastoreIdAndImageSetIds = getDatastoreIdAndImageSetIds(event)
    print("datastoreIdAndImageSetIds: %s" % (datastoreIdAndImageSetIds))

    # retrieve metadata based on datastore id and image set ids
    metadatas = getMetadatas(datastoreIdAndImageSetIds)
    print("metadatas: %s" % (metadatas))


def getMetadatas(datastoreIdAndImageSetIds : []):
    """Fetch the metadata from AHI service and returns it as an array of json objects.

    Parameters:
    datastoreIdAndImageSetIds (dict): The list of dict containing the datastoreId and imageSetId for each metadata to fetch.

    Returns:
    list of metadata json objects
    """
    metadatas = []
    helper = AHItoDICOM()
    for dIdandIId in datastoreIdAndImageSetIds:
        metadata = helper.getMetadata(datastore_id=dIdandIId["datastoreId"] , imageset_id=dIdandIId["imageSetId"])
        metadatas.append(metadata)
    return metadatas
    

def getDatastoreIdAndImageSetIds(event):
    """Fetch the data ImageSetIds in it.

    Parameters:
    event (dict): list of SQS messages
    
    Returns:
    list of dict containing the datastoreId and imageSetId as str type. eg. [{"datastoreId" : "xxxxx" , "imageSetId" : "xxxx"}]
    """
    datastoreIdAndImageSetIds = []
    
    for message in event['Records']:
        datastoreIdAndImageSetIds.append(processMessage(message))
    
    return datastoreIdAndImageSetIds
    
    
def processMessage(message):
    datastoreIdAndImageSetId = {}
    try:
        print(f"Processing message {message['body']}")
        Body = json.loads(message['body'])
        datastoreId = Body['detail']['datastoreId']
        imageSetId = Body['detail']['imageSetId']
        datastoreIdAndImageSetId = {
            "datastoreId": datastoreId,
            "imageSetId": imageSetId
        }
    except Exception as err:
        print("An error occurred: %s" % (err))
    
    return datastoreIdAndImageSetId
    
    
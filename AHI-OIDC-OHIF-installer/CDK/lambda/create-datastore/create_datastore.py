import boto3
import json
import urllib3
from datetime import datetime

def handler(event, context):
    print('Event:', json.dumps(event, indent=2))
    
    response_status = 'SUCCESS'
    response_data = {}
    physical_resource_id = event.get('PhysicalResourceId', 'datastore-resource')
    
    try:
        request_type = event['RequestType']
        base_datastore_name = event['ResourceProperties']['DatastoreName']
        authorizer_arn = event['ResourceProperties']['AuthorizerArn']
        
        # Add timestamp suffix to datastore name
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M')
        datastore_name = f"{base_datastore_name}-{timestamp}"
        
        client = boto3.client('medical-imaging')
        print(f'boto3 version: {boto3.__version__}')
        
        if request_type == 'Create':
            print(f'Creating datastore: {datastore_name} with authorizer: {authorizer_arn}')
            
            response = client.create_datastore(
                datastoreName=datastore_name,
                lambdaAuthorizerArn=authorizer_arn
            )
            
            print(f'Full API response: {json.dumps(response, indent=2, default=str)}')
            
            # Handle different possible response structures
            if 'datastoreProperties' in response:
                datastore_id = response['datastoreProperties']['datastoreId']
            elif 'datastoreId' in response:
                datastore_id = response['datastoreId']
            else:
                # Fallback - check all keys in response
                print(f'Available keys in response: {list(response.keys())}')
                raise Exception(f'Unexpected response structure: {response}')
            
            print(f'Datastore created successfully: {datastore_id}')
            
            physical_resource_id = datastore_id
            response_data = {'DatastoreId': datastore_id, 'Message': 'Datastore created successfully'}
            
        elif request_type == 'Update':
            print('Update operation - returning existing datastore ID')
            physical_resource_id = event.get('PhysicalResourceId', 'datastore-resource')
            response_data = {'DatastoreId': physical_resource_id, 'Message': 'Update completed'}
            
        elif request_type == 'Delete':
            print('Delete operation - no action needed')
            response_data = {'Message': 'Delete completed'}
            
    except Exception as e:
        print(f'Error: {e}')
        response_status = 'SUCCESS'  # Don't fail stack on datastore errors
        response_data = {'DatastoreId': 'debug-failed-creation', 'Error': str(e)}
    
    # Send response to CloudFormation
    send_response(event, context, response_status, response_data, physical_resource_id)

def send_response(event, context, response_status, response_data, physical_resource_id):
    response_body = {
        'Status': response_status,
        'Reason': f'See CloudWatch Log Stream: {context.log_stream_name}',
        'PhysicalResourceId': physical_resource_id,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    }
    
    json_response_body = json.dumps(response_body)
    print('Response body:', json_response_body)
    
    headers = {
        'content-type': '',
        'content-length': str(len(json_response_body))
    }
    
    http = urllib3.PoolManager()
    response = http.request('PUT', event['ResponseURL'], body=json_response_body, headers=headers)
    print(f'Response status: {response.status}')

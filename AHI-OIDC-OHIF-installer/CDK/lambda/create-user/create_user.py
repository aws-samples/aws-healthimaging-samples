import boto3
import json
import urllib3

def handler(event, context):
    print('Event:', json.dumps(event, indent=2))
    
    response_status = 'SUCCESS'
    response_data = {}
    
    try:
        request_type = event['RequestType']
        user_pool_id = event['ResourceProperties']['UserPoolId']
        username = event['ResourceProperties']['Username']
        temporary_password = event['ResourceProperties']['TemporaryPassword']
        
        client = boto3.client('cognito-idp')
        
        if request_type == 'Create':
            try:
                client.admin_create_user(
                    UserPoolId=user_pool_id,
                    Username=username,
                    TemporaryPassword=temporary_password,
                    MessageAction='SUPPRESS'
                )
                print(f'User {username} created successfully')
                response_data = {'Message': f'User {username} created'}
            except client.exceptions.UsernameExistsException:
                print(f'User {username} already exists')
                response_data = {'Message': f'User {username} already exists'}
            except Exception as e:
                print(f'Error creating user: {e}')
                response_data = {'Error': str(e)}
                
        elif request_type == 'Delete':
            try:
                client.admin_delete_user(
                    UserPoolId=user_pool_id,
                    Username=username
                )
                print(f'User {username} deleted')
                response_data = {'Message': f'User {username} deleted'}
            except Exception as e:
                print(f'Error deleting user: {e}')
                # Don't fail on delete errors
                response_data = {'Message': f'Delete completed with warning: {e}'}
        else:
            response_data = {'Message': 'No action needed for update'}
            
    except Exception as e:
        print(f'Error: {e}')
        response_status = 'FAILED'
        response_data = {'Error': str(e)}
    
    # Send response to CloudFormation
    send_response(event, context, response_status, response_data)

def send_response(event, context, response_status, response_data):
    response_body = {
        'Status': response_status,
        'Reason': f'See CloudWatch Log Stream: {context.log_stream_name}',
        'PhysicalResourceId': event.get('PhysicalResourceId', 'user-resource'),
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

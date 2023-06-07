import botocore
import boto3
import datetime
import config
from dateutil.tz import tzlocal
from colorama import Fore, Back, Style

assume_role_cache: dict = {}
def assumed_role_session(role_arn: str, base_session: botocore.session.Session = None):
    base_session = base_session or boto3.session.Session()._session
    fetcher = botocore.credentials.AssumeRoleCredentialFetcher(
        client_creator = base_session.create_client,
        source_credentials = base_session.get_credentials(),
        role_arn = role_arn,
        extra_args = {
        #    'RoleSessionName': None # set this if you want something non-default
        }
    )
    creds = botocore.credentials.DeferredRefreshableCredentials(
        method = 'assume-role',
        refresh_using = fetcher.fetch_credentials,
        time_fetcher = lambda: datetime.datetime.now(tzlocal())
    )
    botocore_session = botocore.session.Session()
    botocore_session._credentials = creds
    return boto3.Session(botocore_session = botocore_session)

stack_name = config.CDK_APP_NAME
account_id = boto3.client('sts').get_caller_identity().get('Account')
session = assumed_role_session(f"arn:aws:iam::{account_id}:role/{stack_name}-GGInstallerRole")
aws_region = session.region_name    
print(Fore.GREEN+"Logged on your edge device as "+Fore.YELLOW+"\"ubuntu\""+Fore.GREEN+", copy the content of the "+Fore.YELLOW+stack_name+"-[EDGE_NAME]"+Fore.GREEN+" file(s) in the respective edge device terminal to execute the installation :\r\n")

for edge in config.EDGE_CONFIG:
    edge_name = edge["Name"]
    access_key = session.get_credentials().access_key
    secret_key = session.get_credentials().secret_key
    token = session.get_credentials().token
    file_content = (f"export AWS_ACCESS_KEY_ID={access_key}")
    file_content = file_content + ("\r\n")
    file_content = file_content + (f"export AWS_SECRET_ACCESS_KEY={secret_key}")
    file_content = file_content + ("\r\n")
    file_content = file_content + (f"export AWS_SESSION_TOKEN={token}")
    file_content = file_content + ("\r\n")
    file_content = file_content + ("cd ~")
    file_content = file_content + ("\r\n")
    file_content = file_content + ("sudo apt update && sudo apt -y upgrade && sudo apt -y install default-jre && sudo apt -y install unzip")
    file_content = file_content + ("\r\n")
    file_content = file_content + ("curl -s https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip > greengrass-nucleus-latest.zip && unzip greengrass-nucleus-latest.zip -d GreengrassInstaller")
    file_content = file_content + ("\r\n")
    file_content = file_content + (f"sudo -E java -Droot=\"/greengrass/v2\" -Dlog.store=FILE -jar ./GreengrassInstaller/lib/Greengrass.jar --aws-region {aws_region} --thing-name {stack_name}-{edge_name} --thing-group-name {stack_name}-IEP-devices --component-default-user ggc_user:ggc_group --provision true --setup-system-service true --deploy-dev-tools true -trn {stack_name}-{edge_name}-GG-Role -tra {stack_name}-{edge_name}-GG-Role-Alias")
    file_content = file_content + ("\r\n")
    text_file = open(stack_name+"-"+edge_name+".txt", "w")
    text_file.write(file_content)
    text_file.close()
    print(Fore.GREEN+"Generated "+Fore.YELLOW+stack_name+"-"+edge_name+".txt"+Fore.GREEN+" file for "+Fore.YELLOW+edge_name+Fore.GREEN+" edge device")
    print(Fore.WHITE+"")
#!/usr/bin/env python3
'''
AHI-Index CDK App

Description: This CDK project creates the infrastructure for the AHI-Index application. It can e configured to deploy an Index on RDS Aurora MySQL or export the AHI metadata on S3 as a datalake.
License : MIT-0
'''
import os

import aws_cdk as cdk
from aws_cdk import Aspects
import config as config

from backend.backend import BackendStack
import cdk_nag
from cdk_nag import NagSuppressions , NagPackSuppression

app_name = config.CDK_APP_NAME
app = cdk.App()
env=cdk.Environment(account=os.getenv('CDK_DEFAULT_ACCOUNT'), region=os.getenv('CDK_DEFAULT_REGION'))
backend_stack = BackendStack(app, app_name, config , env=env )

Aspects.of(app).add(cdk_nag.AwsSolutionsChecks())
NagSuppressions.add_stack_suppressions(backend_stack, suppressions=[  
                                                            NagPackSuppression( id = 'AwsSolutions-IAM4' , reason ='Roles created by CDK constructs.'),
                                                            NagPackSuppression( id = 'AwsSolutions-IAM5' , reason ='Access to getImageSetMetadata at datastore level does not provide any privileges but is necessary to allow privelege at lower level of ImageSet within the datastore.'),
                                                            NagPackSuppression( id = 'AwsSolutions-SMG4' , reason ='Password rotation not required.'),
                                                            NagPackSuppression( id = 'AwsSolutions-RDS11' , reason ='Default port is preferred. Access is secured by security group.'),
                                                            NagPackSuppression( id = 'AwsSolutions-RDS16' , reason ='auditing disabled.')])
app.synth()



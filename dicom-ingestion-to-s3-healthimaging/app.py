"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Main Stack entry point for the IEP CDK application.
"""
import os
import aws_cdk as cdk
import config as config
import iep_cdk.iep_backend.iep_backend_stack as IepBackend
import iep_cdk.edge_device.edge_device_stack as IepEdgeDevice
from aws_cdk import Tags 

app = cdk.App()

app_name = config.CDK_APP_NAME


env=cdk.Environment(account=os.getenv('CDK_DEFAULT_ACCOUNT'), region=os.getenv('CDK_DEFAULT_REGION'))
#Create the root backend stack.
iep_backend_stack = IepBackend.IepBackend(app, app_name, config , env=env )


#Iterate through the edge devices and create the edge nested stacks.
edgedevice_config = config.EDGE_CONFIG
for edge in edgedevice_config:
    edgename = edge["Name"]
    edge = IepEdgeDevice.EdgeDevice(iep_backend_stack, f"{app_name}-{edgename}", edge_device_name=f"{app_name}-{edgename}" , s3_dicom_bucket_arn=iep_backend_stack.buckets.getDICOMBucket().bucket_arn , s3_iot_bucket_arn=iep_backend_stack.gg_component.getIotArtifactsS3().bucket_arn )
    if config.AHLI_CONFIG["ahli_enabled"]:
        iep_backend_stack.fn_ahli_import_job_creator.getFn().add_event_source(edge.getInboundNotifEventSource())
 

#Adding the Tags to all the resources of the stack.
tag_list = config.RESOURCE_TAGS
Tags.of(app).add("deployment", app_name)
for envkey in tag_list["tag_list"]:
    Tags.of(app).add(envkey , tag_list["tag_list"][envkey])

app.synth()

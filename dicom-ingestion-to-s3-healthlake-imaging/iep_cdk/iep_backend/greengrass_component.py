"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Creates the resources relates to Greengrass IoT Core for the IEP CDK application.
"""

from typing import cast
from .iotThingGroup import IotThingGroup
#from .iot_certificate  import IotCertificate
#from .iot_certificate_enable_toggle import IotCertificateEnableToggle
from constructs import Construct
from aws_cdk import (
    aws_greengrassv2 as gg,
    aws_s3 as s3,
    aws_s3_assets as s3_assets,
    aws_iot as iot,
    CfnResource,
    Stack
    
)

class GreenGrassComponent(Construct):

    def __init__(self, scope: Construct, id: str, dicom_destination_bucket: s3.Bucket, s3_acceleration : bool, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        stack_name = Stack.of(self).stack_name.lower()
        # Create an Asset with the contents of the Greengrass component directory
        self._asset = s3_assets.Asset(self, "MyAsset", path="./gg_component/DIMSEtoS3")
        bucketname = self._asset.s3_bucket_name
        s3_key = self._asset.s3_object_key
        asset_path=s3_key[:-4]
        recipe = f"""{{
                        "RecipeFormatVersion": "2020-01-25",
                        "ComponentName": "{stack_name}-DIMSEtoS3",
                        "ComponentVersion": "1.0.30",
                        "ComponentType": "aws.greengrass.generic",
                        "ComponentDescription": "Edge device component for DICOM data ingestion in S3 and Amazon HealthLake Imaging.",
                        "ComponentPublisher": "Amazon Web Services",
                        "ComponentDependencies": {{
                            "aws.greengrass.TokenExchangeService": {{
                            "VersionRequirement": ">=2.0.0 <3.0.0",
                            "DependencyType": "HARD"
                            }}
                        }},
                        "ComponentConfiguration": {{
                            "DefaultConfiguration": {{
                            "datastoreid": "{dicom_destination_bucket.bucket_name}"
                            }}
                        }},
                        "Manifests": [
                            {{
                            "Platform": {{
                                "os": "all"
                            }},
                            "Lifecycle": {{
                                "Install": {{
                                    "Script": "apt-get update && apt-get install -y python3-pip && pip3 install -r {{artifacts:decompressedPath}}/{asset_path}/requirements.txt",
                                    "RequiresPrivilege": true
                                    }},
                                "Run": {{
                                    "setEnv": {{
                                        "S3_TRANSFER_ACCELERATION": "{str(s3_acceleration)}",
                                        "THREADCOUNT": "0"
                                    }},
                                    "Script": "python3 {{artifacts:decompressedPath}}/{asset_path}/main.py {{configuration:/datastoreid}}"
                                    }}
                                 

                            }},
                            "Artifacts": [
                                {{
                                "Uri": "s3://{bucketname}/{s3_key}",
                                "Unarchive": "ZIP",
                                "Permission": {{
                                    "Read": "OWNER",
                                    "Execute": "NONE"
                                }}
                                }}
                            ]
                            }}
                        ],
                        "Lifecycle": {{}}
                        }}"""

        self._component_version = gg.CfnComponentVersion(
            self, "MyComponentVersion",
            inline_recipe=recipe
        )

        self._thingGroup = IotThingGroup(self, "IEP-ThingGroup", thingGroupName="IEP-devices" ,thingGroupDescription="Thing group for the edge devices")
        
        self._greengrass_deploy = gg.CfnDeployment(self, "IEP-Greengrass-Deployment",
            deployment_name="DIMSEtoS3",
            target_arn=self._thingGroup.getThingGroupArn(),
            components={
                        f"{stack_name}-DIMSEtoS3": gg.CfnDeployment.ComponentDeploymentSpecificationProperty(
                            component_version= self._component_version.attr_component_version,
                        ),
                        "aws.greengrass.Cli": gg.CfnDeployment.ComponentDeploymentSpecificationProperty(component_version="2.9.0",),
                        "aws.greengrass.Nucleus": gg.CfnDeployment.ComponentDeploymentSpecificationProperty(component_version="2.9.0",)
                    })
        self._greengrass_deploy.node.add_dependency(self._thingGroup)

        #self._certificate = IotCertificate(self, "IEP-IOT-Certificate")
        #toggle = IotCertificateEnableToggle(self, "IEP-IOT-Certificate-Toggle", certificate_id=self._certificate.getCertificateId())
        #toggle.node.add_dependency(self._certificate)

        


    def getGGComponent(self) -> gg.CfnComponentVersion:
        return self._component_version
    
    def getThingGroup(self) -> IotThingGroup:
        return self._thingGroup

    def getIotArtifactsS3(self) -> s3.IBucket:
        return self._asset.bucket
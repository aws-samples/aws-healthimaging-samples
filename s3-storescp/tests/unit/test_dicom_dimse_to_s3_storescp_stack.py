import aws_cdk as core
import aws_cdk.assertions as assertions

from dicom_dimse_to_s3_storescp.dicom_dimse_to_s3_storescp_stack import DicomDimseToS3StorescpStack

# example tests. To run these tests, uncomment this file along with the example
# resource in dicom_dimse_to_s3_storescp/dicom_dimse_to_s3_storescp_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = DicomDimseToS3StorescpStack(app, "dicom-dimse-to-s3-storescp")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })

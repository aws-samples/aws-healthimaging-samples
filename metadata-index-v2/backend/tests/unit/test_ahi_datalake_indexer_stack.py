import aws_cdk as core
import aws_cdk.assertions as assertions

from ahi_datalake_indexer.ahi_datalake_indexer_stack import AhiDatalakeIndexerStack

# example tests. To run these tests, uncomment this file along with the example
# resource in ahi_datalake_indexer/ahi_datalake_indexer_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = AhiDatalakeIndexerStack(app, "ahi-datalake-indexer")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })

# Clean Up Instructions

To avoid ongoing charges, delete the resources you created with this solution:

1. [Delete the EventBridge rule](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-delete-rule.html):  `example-rule-for-healthimaging-events`.

2. [Delete the CloudWatch log group](https://docs.aws.amazon.com/solutions/latest/research-service-workbench-on-aws/deleting-the-aws-cloudwatch-logs.html): `/aws/events/healthimaging-events`.

3. If you created a HealthImaging data store for testing, [delete the HealthImaging data store](https://docs.aws.amazon.com/healthimaging/latest/devguide/delete-data-store.html#:~:text=To%20delete%20a%20data%20store&text=Open%20the%20HealthImaging%20console%20Data,Choose%20Delete.).

4. If you created an EC2 Windows Server instance for querying and testing, terminate the EC2 instance.

5. From the deployment environment, execute the `cdk destroy` command to delete all resources from the `metadata-index-v2` solution.

6. If you created an EC2 Amazon Linux instance as deployment environment, terminate the EC2 instance.

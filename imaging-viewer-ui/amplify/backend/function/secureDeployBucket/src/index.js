/**
 * Currently, Amplify's deployment S3 bucket does not block all public access
 * See the generateRootStackResources function in https://github.com/aws-amplify/amplify-cli/blob/dev/packages/amplify-provider-awscloudformation/src/root-stack-builder/root-stack-builder.ts
 * This custom resource Lambda function blocks public access on Amplify's deployment S3 bucket by:
 *  - Using the nested CloudFormation stack ID from the incoming event, get the root stack ID. This is the Amplify root stack
 *  - The root stack exports the deployment bucket name with the output "DeploymentBucketName"
 *  - Add public access block for all 4 settings to DeploymentBucketName
*/

// CloudFormation Reply
const { cfnReply } = require('./cfnReply');

// AWS
const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const cfClient = new CloudFormationClient();

const { S3Client, PutPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client();

// Get CloudFormation stack name from ID
// Stack ID format: arn:${Partition}:cloudformation:${Region}:${Account}:stack/${StackName}/${Id}
function getStackName(stackId) {
    return stackId.split(':')[5].split('/')[1];
}

// Get root stack ID from custom CloudFormation resource event
async function getRootStack(childStackId) {
    const childStackName = getStackName(childStackId);
    const describeStackCmd = new DescribeStacksCommand({ StackName: childStackName });
    const describeStackRsp = await cfClient.send(describeStackCmd);
    return describeStackRsp.Stacks?.[0]?.RootId;
}

// Get deployment bucket from root stack
async function getRootStackOutput(rootStackId) {
    const rootStackName = getStackName(rootStackId);
    const describeStackCmd = new DescribeStacksCommand({ StackName: rootStackName });
    const describeStackRsp = await cfClient.send(describeStackCmd);
    return describeStackRsp.Stacks?.[0]?.Outputs.find((o) => o.OutputKey === 'DeploymentBucketName').OutputValue;
}

// Block public access on bucket
async function setBpa(bucketName) {
    const bpaInput = {
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
        },
    };
    const bpaCmd = new PutPublicAccessBlockCommand(bpaInput);
    const bpaRsp = await s3Client.send(bpaCmd);
    return bpaRsp['$metadata'].httpStatusCode;
}

async function blockPublicAccess(childStackId) {
    const rootStackId = await getRootStack(childStackId);
    const deploymentBucketName = await getRootStackOutput(rootStackId);
    const setBpaRspCode = await setBpa(deploymentBucketName);
    return setBpaRspCode;
}

exports.handler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event)}`);
    console.log(`Context: ${JSON.stringify(context)}`);

    try {
        if (event.RequestType === 'Delete') {
            await cfnReply(event, context);
            return;
        }
    } catch (e) {
        console.error('Unable to handle delete. Error: ', e);
        await cfnReply(event, context, false);
        return;
    }

    try {
        const stackId = event.StackId;
        await blockPublicAccess(stackId);
        await cfnReply(event, context);
    } catch (e) {
        console.error('Error blocking public access:', e);
        await cfnReply(event, context, false);
    }
};

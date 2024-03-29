// Axios
const axios = require('axios');
const axiosRetry = require('axios-retry').default;

const DEBUG_ENABLED = process.env.DEBUG || true;

async function cfnReply(event, context, success = true, data = {}) {
    let responseUrl = event.ResponseURL;
    if (DEBUG_ENABLED) console.debug('cfnReply URL: ', responseUrl);

    const responseObj = {
        Status: success === true ? 'SUCCESS' : 'FAILED',
        Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        PhysicalResourceId: event.PhysicalResourceId || event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: data,
    };

    if (DEBUG_ENABLED) console.debug('cfnReply response object:', responseObj);

    axiosRetry(axios, {
        retries: 10,
        retryDelay: axiosRetry.exponentialDelay,
    });

    try {
        const cfnResponse = await axios.put(responseUrl, responseObj);
        if (DEBUG_ENABLED) console.debug('cfnReply CloudFormation response:', cfnResponse);
    } catch (e) {
        console.error('cfnReply Error sending status', e);
    }
}

module.exports = { cfnReply };

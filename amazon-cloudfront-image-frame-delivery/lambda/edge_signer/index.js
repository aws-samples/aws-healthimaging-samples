// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws4 = require('aws4');
const log = require('loglevel');

log.setLevel('error');

exports.handler = async function (event, context, callback) {
    // The request will be modified with the signed headers
    let request = event.Records[0].cf.request;
    const headers = request.headers;
    /** CloudFront adds the request ID as X-Amz-Cf-Id to the origin request
     * and all x-amz-* headers need to be signed
     */
    const cfRequestId = event.Records[0].cf.config?.requestId;

    // Verify request method is GET
    if (request?.method !== 'GET') {
        log.error(`Method ${request.method} is not supported.`);
        return request;
    }

    // Verify domain name is for Amazon HealthLake Imaging
    const domainName = request.origin?.custom?.domainName;
    if (
        !/.*runtime-healthlake-imaging\..+(\.amazonaws\.com|\.aws\.dev)/.test(domainName)
    ) {
        log.error(
            `Domain name ${domainName} must match runtime-healthlake-imaging.+\.amazonaws.com`
        );
        return null;
    }

    let signOpts = {
        host: domainName,
        path: request.uri,
        service: 'medical-imaging',
        region: 'us-east-1',
        headers: {
            'X-Amz-Cf-Id': cfRequestId,
        },
    };

    const signedReq = aws4.sign(signOpts);

    // Extract the signature headers
    // Lambda@Edge expects headers to be in the format [{ key: 'key', value: 'value' }]
    let updatedSignedHeaders = {};
    const EXTRACT_HEADERS = [
        'x-amz-security-token',
        'x-amz-date',
        'authorization',
    ];
    Object.keys(signedReq.headers).forEach((h) => {
        if (EXTRACT_HEADERS.includes(h.toLowerCase())) {
            updatedSignedHeaders[h] = [
                {
                    key: h,
                    value: signedReq.headers[h],
                },
            ];
        }
    });

    // Return request is the original request + signed headers
    const returnHeaders = { ...request.headers, ...updatedSignedHeaders };
    request.headers = returnHeaders;

    callback(null, request);
};

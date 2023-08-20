// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws4 = require('aws4');
const log = require('loglevel');

const util = require('util');

// Default loglevel is 'warn'. Possible values are trace, debug, info, warn, error
log.setLevel('warn');

exports.handler = async function (event, context, callback) {
    // The request will be modified with the signed headers
    let request = event.Records[0].cf.request;

    console.log(
        'Event',
        util.inspect(event, {
            showHidden: false,
            depth: null,
            colors: false,
        })
    );

    console.log(
        'Incoming request',
        util.inspect(request, {
            showHidden: false,
            depth: null,
            colors: false,
        })
    );

    const requestBody =
        request.body?.encoding === 'base64'
            ? atob(request?.body?.data)
            : request?.body?.data;

    /** CloudFront adds the request ID as X-Amz-Cf-Id to the origin request
     * and all x-amz-* headers need to be signed
     */
    const cfRequestId = event.Records[0].cf.config?.requestId;

    // Verify request method is GET
    if (request?.method !== 'POST') {
        log.error(`Method ${request.method} is not supported.`);
        return request;
    }

    // Verify domain name is for AWS HealthImaging
    const domainName = request.origin?.custom?.domainName;
    if (
        !/.*runtime-medical-imaging\..+(\.amazonaws\.com|\.aws\.dev)/.test(
            domainName
        )
    ) {
        log.error(
            `Domain name ${domainName} must match runtime-medical-imaging.+\.amazonaws.com`
        );
        return null;
    }

    // extract aws region from cf request host
    const regionMatch = /[\w-]+.([\w]{2}-[\w]+-[0-9]+).[\w.]+/;
    const domainRegion = domainName.match(regionMatch)?.[1] || 'us-east-1';

    let signOpts = {
        host: domainName,
        path: request.uri,
        service: 'medical-imaging',
        region: domainRegion,
        headers: {
            'Content-Type': 'application/json',
            'X-Amz-Cf-Id': cfRequestId,
        },
        body: requestBody,
    };

    const signedReq = aws4.sign(signOpts);

    console.log(
        'Signed request',
        util.inspect(request, {
            showHidden: false,
            depth: null,
            colors: false,
        })
    );

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

    // Replace body with text
    request.body.action = 'replace';
    request.body.encoding = 'text';
    request.body.data = requestBody;

    console.log(
        'Outgoing request',
        util.inspect(request, {
            showHidden: false,
            depth: null,
            colors: false,
        })
    );

    callback(null, request);
};

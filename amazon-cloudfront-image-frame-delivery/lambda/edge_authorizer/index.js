// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Logging
const log = require('loglevel');

/**
 * Lambda@Edge does not support environment variables
 * Use the CDK build process to find/replace these placeholders if auth is used
 */
const AUTH_MODE = true;
const COGNITO_USER_POOL_ID = 'COGNITO_USER_POOL_ID_PLACEHOLDER';
const COGNITO_CLIENT_ID = 'COGNITO_CLIENT_ID_PLACEHOLDER';

// Regex for verifying request URI
const URI_VERIFY =
    /\/datastore\/[0-9a-z]{32}\/imageSet\/[0-9a-z]{32}\/getImageFrame/;

// Default loglevel is 'warn'. Possible values are trace, debug, info, warn, error
log.setLevel('warn');

// Cognito JWT verifier
let verifier;
if (AUTH_MODE) {
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    try {
        verifier = CognitoJwtVerifier.create({
            userPoolId: COGNITO_USER_POOL_ID,
            tokenUse: 'access',
            clientId: ['undefined', 'null'].includes(COGNITO_CLIENT_ID)
                ? null
                : COGNITO_CLIENT_ID,
        });
    } catch (err) {
        throw new Error(
            `Unable to create Amazon Cognito JWT verifier: ${err.toString()}`
        );
    }
}

exports.handler = async function (event, context, callback) {
    const request = event.Records[0].cf.request;

    // Verify request URI is calling GetImageFrame
    const requestUri = request.uri;
    if (!URI_VERIFY.test(requestUri)) {
        const errMsg = `Only GetImageFrame calls are supported, got ${requestUri}`;
        log.error(errMsg);
        const response = {
            status: '401',
            statusDescription: 'Unauthorized',
            body: errMsg,
        };
        callback(null, response);
    }

    if (AUTH_MODE) {
        // Prefer to use the token from the request header, then try the query string token, otherwise assume nothing found
        const headerToken = request.headers?.token?.[0]?.key;
        const queryString = new URLSearchParams(request.querystring || '');
        const queryStringToken = queryString.get('token');
        const token = headerToken || queryStringToken || '';
        try {
            // This throws an exception if JWT isn't able to be validated
            await verifier.verify(token);
        } catch (error) {
            log.error('JWT verifier error: ', error);
            const response = {
                status: '401',
                statusDescription: 'Unauthorized',
                body: 'Unauthorized',
            };
            callback(null, response);
        }
    }

    callback(null, request);
};

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Cognito Auth
const { CognitoJwtVerifier } = require('aws-jwt-verify');
// Logging
const log = require('loglevel');

/** Lambda@Edge does not support environment variables
 *  Depend on the CDK build process to find/replace these placeholders if auth is used
 */
const COGNITO_USER_POOL_ID = 'COGNITO_USER_POOL_ID_PLACEHOLDER';
const COGNITO_CLIENT_ID = 'COGNITO_CLIENT_ID_PLACEHOLDER';

log.setLevel('INFO');

let verifier;
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

exports.handler = async function (event, context, callback) {
    const request = event.Records[0].cf.request;

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

    callback(null, request);
};

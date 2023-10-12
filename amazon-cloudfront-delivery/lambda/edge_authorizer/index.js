// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Lambda@Edge does not support environment variables
 * Use the CDK build process to find/replace these placeholders if auth is used
 */
const AUTH_MODE = true;
const COGNITO_USER_POOL_ID = 'COGNITO_USER_POOL_ID_PLACEHOLDER';
const COGNITO_CLIENT_ID = 'COGNITO_CLIENT_ID_PLACEHOLDER';

// Preflight response
const PREFLIGHT_RESPONSE = {
    status: '204',
    statusDescription: 'No Content',
    headers: {
        'access-control-allow-origin': [
            {
                key: 'Access-Control-Allow-Origin',
                value: '*',
            },
        ],
        'access-control-allow-methods': [
            {
                key: 'Access-Control-Allow-Methods',
                value: 'GET, POST, OPTIONS',
            },
        ],
        'access-control-allow-headers': [
            {
                key: 'Access-Control-Allow-Headers',
                value: '*',
            },
        ],
    },
};

// Unauthorized respnose
const UNAUTHORIZED_RESPONSE = {
    status: '401',
    statusDescription: 'Unauthorized',
    body: 'Unauthorized',
};

/**
 * @description Get bearer token from request headers
 * @param {string} authorization authorization string from request headers
 */
function getBearerToken(authorization) {
    if (
        typeof authorization === 'undefined' ||
        typeof authorization !== 'string' ||
        authorization === null ||
        !authorization
    ) {
        return '';
    }
    const authParts = authorization.split('Bearer ');
    if (authParts.length !== 2) return '';

    if (authParts[1].endsWith(', ')) {
        return token.split(', ')[0];
    } else {
        return authParts[1];
    }
}

// Cognito JWT verifier
let verifier;
if (AUTH_MODE) {
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    try {
        verifier = CognitoJwtVerifier.create({
            userPoolId: COGNITO_USER_POOL_ID,
            tokenUse: 'access',
            clientId: ['undefined', 'null'].includes(COGNITO_CLIENT_ID) ? null : COGNITO_CLIENT_ID,
        });
    } catch (err) {
        throw new Error(`Unable to create Amazon Cognito JWT verifier: ${err.toString()}`);
    }
}

exports.handler = async function (event, context, callback) {
    const request = event.Records[0].cf.request;

    try {
        if (request.method === 'OPTIONS') {
            callback(null, PREFLIGHT_RESPONSE);
        }
    } catch {
        callback(null, UNAUTHORIZED_RESPONSE);
    }

    if (AUTH_MODE) {
        // First look for Bearer token in the header, then 'token' in the header or query string
        const headerAuthorization = request.headers?.authorization?.[0]?.value;
        const headerToken = request.headers?.token?.[0]?.value;
        const queryString = new URLSearchParams(request.querystring || '');
        const queryStringToken = queryString.get('token');
        const token = getBearerToken(headerAuthorization) || headerToken || queryStringToken || '';

        try {
            // This throws an exception if JWT isn't able to be validated
            await verifier.verify(token);
        } catch {
            callback(null, UNAUTHORIZED_RESPONSE);
        }
    }

    callback(null, request);
};

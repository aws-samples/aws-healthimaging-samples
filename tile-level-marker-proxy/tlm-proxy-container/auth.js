// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Cognito Auth
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Logging
const logger = require('./log');
const log = logger('auth');

function authMode() {
    // Auth
    const AUTH_MODE = process.env.AUTH_MODE || 'cognito_jwt';

    if (AUTH_MODE == null || AUTH_MODE === 'null') {
        return null;
    } else {
        return 'cognito_jwt';
    }
}

let verifier;
if (authMode() != null) {
    try {
        verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.COGNITO_USER_POOL_ID,
            tokenUse: 'access',
            clientId:
                typeof process.env.COGNITO_CLIENT_ID === 'undefined' ||
                process.env.COGNITO_CLIENT_ID === 'null'
                    ? null
                    : process.env.COGNITO_CLIENT_ID,
        });
    } catch (err) {
        throw new Error(
            `Unable to create Amazon Cognito JWT verifier: ${err.toString()}`
        );
    }
}

// Validate JWT
// Token can be in the header or in the query string
async function validateJwt(request, reply, done) {
    const token = request.headers?.token || request.query?.token || '';

    try {
        // this throws an exception if JWT isn't able to be validated
        await verifier.verify(token);
    } catch (error) {
        log.info('JWT verifier error: ', error);
        done(new Error('Unauthorized'));
    }

    done();
}

module.exports = { authMode, validateJwt };

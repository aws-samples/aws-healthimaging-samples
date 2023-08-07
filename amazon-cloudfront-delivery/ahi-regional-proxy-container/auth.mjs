// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Cognito Auth
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Logging
import logger from './log.mjs';
const log = logger('auth');

export function authMode() {
    const AUTH_MODE = process.env.AUTH_MODE || 'cognito_jwt';
    if (AUTH_MODE === 'none') {
        return null;
    } else {
        return 'cognito_jwt';
    }
}

/**
 * @description Get bearer token from request headers
 * @param {string} authorization authorization string from request headers
 */
function getBearerToken(authorization) {
    if (typeof authorization === 'undefined' || authorization === null || !authorization) {
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

let verifier;
if (authMode() != null) {
    try {
        verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.COGNITO_USER_POOL_ID,
            tokenUse: 'access',
            clientId: typeof process.env.COGNITO_CLIENT_ID === 'undefined' || process.env.COGNITO_CLIENT_ID === 'null' ? null : process.env.COGNITO_CLIENT_ID,
        });
    } catch (err) {
        throw new Error(`Unable to create Amazon Cognito JWT verifier: ${err.toString()}`);
    }
}

// Validate JWT
export async function validateJwt(request) {
    // First look for Bearer token in the header, then 'token' in the header or query string
    const token = getBearerToken(request.headers?.authorization) || request.headers?.token || request.query?.token || '';
    // This throws an exception if JWT isn't able to be validated
    // @fastify/auth supports returning a promise that throws an error if auth fails
    return verifier.verify(token);
}

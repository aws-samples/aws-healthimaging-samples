// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import aws4 from 'aws4';
import fetch from 'node-fetch';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import getClientRegion from '../utils/getClientRegion.mjs';

const ahiRegion = await getClientRegion();

const PROXY_HEADER_GET_TO_POST = 'X-Proxy-Get-To-Post';
const PROXY_RESPONSE_HEADERS = ['content-type'];

/**
 * @description Proxy request to the AWS HealthImaging.
 * @param {*} request Fastify request object
 * @param {*} reply Fastify reply object
 */
async function proxyToHealthImaging(request, reply) {
    // if PROXY_HEADER_GET_TO_POST was set to true in processGetRequest, convert method to POST
    const requestMethod = reply.getHeader(PROXY_HEADER_GET_TO_POST) ? 'POST' : request.method;

    // get IAM credentials
    const credentials = defaultProvider();

    // Encode query string
    const encodedQueryParams = Object.entries(request.query)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    const requestHost = `runtime-medical-imaging.${ahiRegion}.amazonaws.com`;
    const requestPath = `${request.url.split(/[?#]/)[0]}${encodedQueryParams ? `?${encodedQueryParams}` : ''}`;

    // Pass in a body if the request method is POST
    // For POST requests, if a body was sent in, then use the original body, otherwise use the query string
    let aws4OptsBody = {};
    if (requestMethod === 'POST') {
        if (typeof request.body === 'string' && request.body.trim().length > 0) {
            aws4OptsBody = { body: request.body };
        } else if (typeof request.body === 'object' && Object.keys(request.body).length > 0) {
            aws4OptsBody = { body: JSON.stringify(request.body) };
        } else if (typeof request.query === 'object' && Object.keys(request.query).length > 0) {
            aws4OptsBody = { body: JSON.stringify(request.query) };
        }
    }

    // Build AWS4 signed request
    const aws4Opts = {
        host: requestHost,
        method: requestMethod,
        path: requestPath,
        service: 'medical-imaging',
        ...aws4OptsBody,
    };

    const signedReq = aws4.sign(aws4Opts, await credentials());

    const response = await fetch(`https://${signedReq.host}${signedReq.path}`, signedReq);

    // Check response status
    if (!response.ok) {
        reply.code(500);
        return reply.send(`HTTP error ${response.status}`);
    }

    PROXY_RESPONSE_HEADERS.forEach((header) => {
        const headerValue = response.headers.get(header).toLowerCase();
        if (headerValue) {
            reply.header(header, headerValue);
        }
    });
    reply.code(200);
    return reply.send(response.body);
}

/**
 * @description Process GET request to AWS HealthImaging. Convert GET to POST for
 *              GetImageSet, GetImageFrame, GetImageSetMetadata. Add a header to the request
 *              so proxyToHealthImaging can identify the initial request method
 * @param {*} request
 * @param {*} reply
 * @param {*} done
 */
function processGetRequest(request, reply, done) {
    reply.header(PROXY_HEADER_GET_TO_POST, true);
    done();
}

/**
 * @description Proxy request to AWS HealthImaging. Selectively convert GET to POST for
 *              GetImageSet, GetImageSetMetadata, GetImageFrame
 * @param {*} fastify Server object
 * @param {*} options Object containing authMode
 */
export default async function healthImaging(fastify, options) {
    let routeOpts = {};
    if (options.authMode === 'cognito_jwt') {
        routeOpts = {
            preHandler: fastify.auth([fastify.validateJwt]),
        };
    }

    // GetImageSet
    fastify.route({
        method: 'GET',
        url: '/datastore/:datastoreId/imageSet/:imageSetId/getImageSet',
        onRequest: processGetRequest,
        // handler: proxyToHealthImaging,
        handler: async function (request, reply) {
            await proxyToHealthImaging(request, reply);
        },
        ...routeOpts,
    });

    // GetImageSetMetadata
    fastify.route({
        method: 'GET',
        url: '/datastore/:datastoreId/imageSet/:imageSetId/getImageSetMetadata',
        onRequest: processGetRequest,
        handler: proxyToHealthImaging,
        ...routeOpts,
    });

    // GetImageFrame
    fastify.route({
        method: 'GET',
        url: '/datastore/:datastoreId/imageSet/:imageSetId/getImageFrame',
        onRequest: processGetRequest,
        handler: proxyToHealthImaging,
        ...routeOpts,
    });

    // Proxy all POST requests
    fastify.route({
        method: 'POST',
        url: '/*',
        handler: proxyToHealthImaging,
        ...routeOpts,
    });
}

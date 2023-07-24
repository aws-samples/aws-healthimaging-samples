// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

'use strict';

// Auth
const { authMode, validateJwt } = require('./auth');
const AUTH_MODE = authMode();

// Logging
const logger = require('./log');
const log = logger('container');

// Fasify
const fastify = require('fastify')({
    logger: false,
});
const cors = require('@fastify/cors');
const healthCheckRoutes = require('./routes/healthcheck');
const tlmRoutes = require('./routes/tlm');

// Server options
const HOST = '0.0.0.0';
const PORT = 8080;

// Enable Fastify CORS and health check
fastify.register(cors);
fastify.register(healthCheckRoutes);

// Add JWT validation to Fastify
let tlmRouteAuthOpts = {};
if (AUTH_MODE == null) {
    log.warn('Proxy is running with no authentication!');
    fastify.register(tlmRoutes);
} else {
    fastify.decorate('validateJwt', validateJwt);
    tlmRouteAuthOpts = {
        authMode: 'cognito_jwt',
    };
    fastify.register(require('@fastify/auth')).after(() => tlmRoutes(fastify, { ...tlmRouteAuthOpts }));
}

// Set 404
fastify.setNotFoundHandler((request, reply) => reply.status(404).send('Not Found'));

// Start server
fastify.listen({ host: HOST, port: PORT }, function (err, address) {
    if (err) {
        log.error('Fastify startup error: ', err);
        process.exit(1);
    }
    log.info(`Server listening on ${address}`);
});

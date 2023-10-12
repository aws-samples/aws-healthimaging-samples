// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

'use strict';

// Auth
import { authMode, validateJwt } from './auth.mjs';
const AUTH_MODE = authMode();

// Logging
import logger from './log.mjs';
const log = logger('container');

// Fasify
import Fastify from 'fastify';
const fastify = Fastify({
    logger: log.getLevel() < 1 ? true : false,
});
import fastifyAuth from '@fastify/auth';
import fastifyCors from '@fastify/cors';
import healthCheckRoutes from './routes/healthcheck.mjs';
import healthImagingRoutes from './routes/healthimaging.mjs';

// Server options
const HOST = '0.0.0.0';
const PORT = 8080;

// Enable Fastify CORS
fastify.register(fastifyCors, {
    origin: '*',
    methods: ['POST'],
});

// Register healthcheck
fastify.register(healthCheckRoutes);

// Add JWT validation to Fastify
let healthImagingAuthOpts = {};
if (AUTH_MODE == null) {
    log.warn('Proxy is running with no authentication!');
    fastify.register(healthImagingRoutes);
} else {
    fastify.decorate('validateJwt', validateJwt);
    healthImagingAuthOpts = {
        authMode: 'cognito_jwt',
    };
    fastify.register(fastifyAuth).after(() => healthImagingRoutes(fastify, { ...healthImagingAuthOpts }));
}

// Set 404
fastify.setNotFoundHandler((request, reply) => reply.status(404).send());

// Start server
fastify.listen({ host: HOST, port: PORT }, function (err, address) {
    if (err) {
        log.error('Fastify startup error: ', err);
        process.exit(1);
    }
    log.info(`Server listening on ${address}`);
});

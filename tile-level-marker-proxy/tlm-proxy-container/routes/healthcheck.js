// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

async function healthCheckRoutes(fastify, options) {
    fastify.get('/healthcheck', async (request, reply) => {
        reply.code(200).send();
    });
}

module.exports = healthCheckRoutes;

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export default async function healthCheckRoutes(fastify, options) {
    fastify.get('/healthcheck', { logLevel: 'warn' }, async (request, reply) => {
        reply.code(200).send();
    });
}

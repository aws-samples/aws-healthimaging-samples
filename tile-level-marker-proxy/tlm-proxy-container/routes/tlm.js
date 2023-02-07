// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const tlmProxy = require('../controllers/tlm-proxy');

async function tlmRoutes(fastify, options) {
    let routeOpts = {};
    if (options.authMode === 'cognito_jwt') {
        routeOpts = {
            preHandler: fastify.auth([fastify.validateJwt]),
        };
    }

    fastify.get(
        '/runtime/datastore/:datastoreId/imageset/:imageSetId/imageframe/:imageFrameId',
        routeOpts,
        async (request, reply) => {
            const { datastoreId, imageSetId, imageFrameId } = request.params;
            const { startLevel, endLevel } = request.query;
            await tlmProxy(
                reply,
                datastoreId,
                imageSetId,
                imageFrameId,
                startLevel,
                endLevel
            );
        }
    );

    fastify.get('/', routeOpts, async (request, reply) => {
        const { datastoreId, imageSetId, imageFrameId, startLevel, endLevel } =
            request.query;
        await tlmProxy(
            reply,
            datastoreId,
            imageSetId,
            imageFrameId,
            startLevel,
            endLevel
        );
    });
}

module.exports = tlmRoutes;

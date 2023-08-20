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

    fastify.post('/datastore/:datastoreId/imageSet/:imageSetId/getImageFrame', routeOpts, async (request, reply) => {
        const { datastoreId, imageSetId } = request.params;
        const { startLevel, endLevel } = request.query;
        const { imageFrameId } = request.body;

        const imageFrameObj = {
            datastoreId: datastoreId,
            imageSetId: imageSetId,
            imageFrameId: imageFrameId,
        };
        const tlmLevels = {
            startLevel: startLevel || undefined,
            endLevel: endLevel || undefined,
        };
        await tlmProxy(reply, imageFrameObj, tlmLevels);
    });
}

module.exports = tlmRoutes;

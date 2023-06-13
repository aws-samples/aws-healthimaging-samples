// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Logging
const log = require('loglevel');
log.setLevel('info');

// Amazon HealthLake Imaging SDK
const MedicalImaging = require('../medical-imaging');

// Decoder
const getResolutionRange = require('../decoder/getResolutionRange');

// Cache (Amazon Elasticache - memcached)
const { setCacheValue, getCacheValue } = require('../cache');

// Stream
const { Readable } = require('stream');

// Amazon HealthLake Imaging
// Endpoint (https://github.com/aws/aws-sdk-js/issues/3544)
const nodeLoader = require('aws-sdk/lib/node_loader');
const AHLI_DOMAIN = process.env.AHLI_ENDPOINT
    ? process.env.AHLI_ENDPOINT
    : process.env.AHLI_REGION
    ? `healthlake-imaging.${process.env.AHLI_REGION}.amazonaws.com`
    : 'healthlake-imaging.us-east-1.amazonaws.com';
const endpoint_url = `https://${AHLI_DOMAIN}`;
const endpoint = new nodeLoader.Endpoint(endpoint_url);
const imaging = new MedicalImaging({
    apiVersion: '2023-03-30',
    endpoint: endpoint,
    region: process.env.AHLI_REGION || 'us-east-1',
});

log.info(`Using AHLI Endpoint: ${AHLI_DOMAIN}.`);

// Convert a buffer to a stream
function bufferToStream(binary) {
    const readableInstanceStream = new Readable({
        read() {
            this.push(binary);
            this.push(null);
        },
    });
    return readableInstanceStream;
}

// Call when user requests TLM level 0
// Read frame and cache every level, 0-0, 1-1, etc and the entire frame
async function readAndCacheSingle(
    reply,
    datastoreId,
    imageSetId,
    imageFrameId
) {
    let frameDataStream = imaging
        .getImageFrame({
            datastoreId: datastoreId,
            imageSetId: imageSetId,
            imageFrameId: imageFrameId,
        })
        .createReadStream();
    const responseBufferArray =
        (await getResolutionRange(frameDataStream, 0, undefined, true, {
            reply: reply,
        })) || [];
    // Cache individual level
    for (let i = 0; i < responseBufferArray.length; i++) {
        const cacheKey = `${endpoint_url}/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}/start/${i}/end/${i}`;
        setCacheValue(cacheKey, responseBufferArray[i]);
    }
    // Cache entire frame
    const wholeFrameCacheKey = `${endpoint_url}/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}`;
    setCacheValue(wholeFrameCacheKey, Buffer.concat(responseBufferArray));
}

async function tlmProxy(
    reply,
    datastoreId,
    imageSetId,
    imageFrameId,
    startLevel = undefined,
    endLevel = undefined
) {
    try {
        if (!datastoreId || !imageSetId || !imageFrameId) {
            reply
                .code(400)
                .send(
                    'Missing argument. Required: datastore ID, imageset ID, image frame ID.'
                );
            return;
        }

        const timeStart = performance.now();
        const startLevelInt = startLevel ? parseInt(startLevel) : 0;
        const endLevelInt = endLevel ? parseInt(endLevel) : undefined;

        log.info(
            `Requesting datastore ${datastoreId}, imageset ${imageSetId}, image frame ${imageFrameId}, start ${startLevelInt}, end ${endLevelInt}.`
        );

        const cacheKey = `${endpoint_url}/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}/start/${startLevelInt}/end/${endLevelInt}`;
        let cacheData = await getCacheValue(cacheKey);

        // If the frame isn't in cache, and the requested start and end level is 0
        // Return level 0, and cache every other level and the entire frame
        if (
            typeof cacheData === 'undefined' &&
            startLevelInt === 0 &&
            endLevelInt === 0
        ) {
            await readAndCacheSingle(
                reply,
                datastoreId,
                imageSetId,
                imageFrameId
            );
            return;
        }

        // This will run if request is non-single TLM level, i.e. level 0-1 vs. of 0-0. Or if caching is disabled.
        if (typeof cacheData === 'undefined') {
            // Check if the full frame is in cache
            let frameDataCache = await getCacheValue(
                `${endpoint_url}/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}`
            );
            let frameDataStream;
            if (typeof frameDataCache === 'undefined') {
                frameDataStream = imaging
                    .getImageFrame({
                        datastoreId: datastoreId,
                        imageSetId: imageSetId,
                        imageFrameId: imageFrameId,
                    })
                    .createReadStream();
            } else {
                log.info(
                    `Retrieved full frame from cache with size ${frameDataCache.length}`
                );
                frameDataStream = bufferToStream(frameDataCache);
            }

            const timeGotImageFrame = performance.now();

            const responseBuffer = await getResolutionRange(
                frameDataStream,
                startLevelInt,
                endLevelInt
            );
            const timeGetResolutionRange = performance.now();
            const timeEnd = performance.now();
            log.debug(`--- Levels ${startLevelInt} to ${endLevelInt} --- `);
            log.debug('Buffer length (bytes)     : ', responseBuffer.length);
            log.debug(
                'Start stream (ms)         : ',
                timeGotImageFrame - timeStart
            );
            log.debug(
                'Get resolution range (ms) : ',
                timeGetResolutionRange - timeStart
            );
            log.debug('Total (ms)                : ', timeEnd - timeStart);

            setCacheValue(cacheKey, responseBuffer);

            log.info(`Returning frame with size ${responseBuffer.length}`);
            reply.type('application/octet-stream');
            reply.code(200).send(responseBuffer);
        } else {
            log.info(
                `Returning frame from cache with size ${cacheData.length}`
            );
            reply.type('application/octet-stream');
            reply.code(200).send(cacheData);
        }
    } catch (error) {
        log.error('TLM Proxy Error: ', error);
        reply.code(500).send(error);
    }
}

module.exports = tlmProxy;

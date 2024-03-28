// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Logging
const logger = require('../log');
const log = logger('tlm-proxy');

// AWS HealthImaging SDK
const { MedicalImagingClient, GetImageFrameCommand } = require('@aws-sdk/client-medical-imaging');

// Decoder
const getResolutionRange = require('../decoder/getResolutionRange');

// Cache (Amazon Elasticache - memcached)
const { setCacheValue, getCacheValue } = require('../cache');

// Stream
const { Readable } = require('stream');

let imagingClientConfig = {};
if (process.env.AHI_ENDPOINT) imagingClientConfig.endpoint = process.env.AHI_ENDPOINT;
if (process.env.AHI_REGION) {
    imagingClientConfig.region = process.env.AHI_REGION;
} else if (process.env.AWS_REGION) {
    imagingClientConfig.region = process.env.AWS_REGION;
} else {
    imagingClientConfig.region = 'us-east-1';
}

log.debug(`AHI Client Config: ${JSON.stringify(imagingClientConfig)}.`);

const imagingClient = new MedicalImagingClient(imagingClientConfig);

// Convert a buffer to a stream (cache data to stream)
function bufferToStream(binary) {
    const readableInstanceStream = new Readable({
        read() {
            this.push(binary);
            this.push(null);
        },
    });
    return readableInstanceStream;
}

// Build cache key. Full frames do not include appended /start/#/end/#
// Exclude tlmIntLevels to build cache key for entire frame
function buildCacheKey({ imageFrameObj, tlmIntLevels = {} }) {
    const { datastoreId, imageSetId, imageFrameId } = imageFrameObj;
    const { startLevelInt, endLevelInt } = tlmIntLevels;

    if (Object.keys(tlmIntLevels)?.length === 0) {
        return `/datastore/${datastoreId}/imageSet/${imageSetId}/imageframe/${imageFrameId}`;
    } else {
        return `/datastore/${datastoreId}/imageSet/${imageSetId}/imageframe/${imageFrameId}/start/${startLevelInt}/end/${endLevelInt}`;
    }
}

// Create an image frame read stream
async function createFrameDataStream(imageFrameObj, reply) {
    const { datastoreId, imageSetId, imageFrameId } = imageFrameObj;

    const getImageFrameInput = {
        datastoreId: datastoreId,
        imageSetId: imageSetId,
        imageFrameInformation: {
            imageFrameId: imageFrameId,
        },
    };
    const getImageFrameCmd = new GetImageFrameCommand(getImageFrameInput);
    const getImageFrameRsp = await imagingClient.send(getImageFrameCmd);
    return getImageFrameRsp.imageFrameBlob;
}

// Print debug image stats
function printLogs({ startLevelInt, endLevelInt, bufferLength, startStreamTime, getResolutionRangeTime, totalTime }) {
    log.debug(`--- Levels ${startLevelInt} to ${endLevelInt} --- `);
    log.debug('Buffer length (bytes)     : ', bufferLength);
    log.debug('Start stream (ms)         : ', startStreamTime);
    log.debug('Get resolution range (ms) : ', getResolutionRangeTime);
    log.debug('Total (ms)                : ', totalTime);
}

// Retrieve the entire frame, and cache it level by level
// If firstLevel = true, then return the first TLM level, and continue to read and cache the rest of the frame
async function tlmCacheFullFrame(reply, imageFrameObj, firstLevel = false) {
    const frameDataStream = await createFrameDataStream(imageFrameObj, reply);

    // get entire frame (0 - undefined)
    // if firstLevel = true, then getResolutionRange will reply with the first TLM level
    const responseBufferArray =
        (await getResolutionRange(frameDataStream, 0, undefined, true, firstLevel ? { reply: reply } : null)) || [];
    // if getResolutionRange = false, then reply with the entire frame
    const fullFrame = Buffer.concat(responseBufferArray);
    if (!firstLevel) {
        reply.type('application/octet-stream');
        reply.code(200).send(fullFrame);
    }

    // Cache individual level
    for (let i = 0; i < responseBufferArray.length; i++) {
        const cacheKey = buildCacheKey({
            imageFrameObj: imageFrameObj,
            tlmIntLevels: { startLevelInt: i, endLevelInt: i },
        });
        setCacheValue(cacheKey, responseBufferArray[i]);
    }

    // Cache entire frame
    const wholeFrameCacheKey = buildCacheKey({ imageFrameObj: imageFrameObj });
    setCacheValue(wholeFrameCacheKey, fullFrame);
}

async function tlmProxy(reply, imageFrameObj, tlmLevels) {
    const { datastoreId, imageSetId, imageFrameId } = imageFrameObj;
    const { startLevel, endLevel } = tlmLevels;

    if (!datastoreId || !imageSetId || !imageFrameId) {
        reply.code(400).send('Missing argument. Required: datastore ID, imageSet ID, image frame ID.');
        return;
    }

    const timeStart = performance.now();
    const startLevelInt = startLevel ? parseInt(startLevel) : 0;
    const endLevelInt = endLevel ? parseInt(endLevel) : undefined;

    try {
        log.debug(
            `Requesting datastore ${datastoreId}, imageSet ${imageSetId}, image frame ${imageFrameId}, start ${startLevelInt}, end ${endLevelInt}.`
        );

        const exactCacheKey = buildCacheKey({
            imageFrameObj: imageFrameObj,
            tlmIntLevels: {
                startLevelInt: startLevelInt,
                endLevelInt: endLevelInt,
            },
        });
        const cacheData = await getCacheValue(exactCacheKey);

        if (typeof cacheData !== 'undefined') {
            // If the frame is in cache, return the cached value
            log.debug(`Returning frame from cache with size ${cacheData.length}`);
            reply.type('application/octet-stream');
            reply.code(200).send(cacheData);
            return;
        } else if (startLevelInt === 0 && [0, undefined].includes(endLevelInt)) {
            // If requesting the first TLM level, or the entire frame, read and cache the entire frame
            await tlmCacheFullFrame(reply, imageFrameObj, startLevelInt === 0 && endLevelInt === 0);
            return;
        } else {
            // If the request is a non-single TLM level (i.e. 0-2, 1-3), try using the entire frame cache
            const wholeFrameCacheKey = buildCacheKey({
                imageFrameObj: imageFrameObj,
            });
            const wholeFrameCache = await getCacheValue(wholeFrameCacheKey);

            // Create a data stream by using the cached value or calling the API
            let frameDataStream;
            if (typeof wholeFrameCache === 'undefined') {
                frameDataStream = await createFrameDataStream(imageFrameObj, reply);
            } else {
                log.debug(`Retrieved full frame from cache with size ${wholeFrameCache.length}`);
                frameDataStream = bufferToStream(wholeFrameCache);
            }

            const timeGotImageFrame = performance.now();
            const responseBuffer = await getResolutionRange(frameDataStream, startLevelInt, endLevelInt);
            const timeGetResolutionRange = performance.now();
            const timeEnd = performance.now();

            reply.type('application/octet-stream');
            reply.code(200).send(responseBuffer);
            setCacheValue(exactCacheKey, responseBuffer);

            printLogs({
                startLevel: startLevelInt,
                endLevel: endLevelInt,
                bufferLength: responseBuffer.length,
                startStream: timeGotImageFrame - timeStart,
                getResolutionRange: timeGetResolutionRange - timeStart,
                total: timeEnd - timeStart,
            });
            return;
        }
    } catch (error) {
        log.error('TLM Proxy Error: ', error);
        reply.code(500).send(error);
    }
}

module.exports = tlmProxy;

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/** Enable/Disable Caches
 * Method will check local cache before cloud cache
 */
let ENABLE_LOCAL_NODECACHE = process.env.ENABLE_LOCAL_NODECACHE || true;
let ENABLE_AMAZON_ELASTICACHE = process.env.ENABLE_AMAZON_ELASTICACHE || true;

// Logging
const logger = require('./log');
const log = logger('cache');

// node-cache
const NodeCache = require('node-cache');
const localNodeCache = new NodeCache();

// Memcached
let awsMemcached;
if (ENABLE_AMAZON_ELASTICACHE) {
    const Memcached = require('memcached');
    if (ENABLE_AMAZON_ELASTICACHE) {
        const memcachedAddress = process.env.MEMCACHED_ADDRESS;
        if (/^.+\:[0-9]+$/.test(memcachedAddress)) {
            awsMemcached = new Memcached(memcachedAddress, {
                maxValue: 52428800,
            });
        } else {
            ENABLE_AMAZON_ELASTICACHE = false;
        }
    }
}

// Memcached does not support promises
const { promisify } = require('util');

// Set key:value in cache for duration (default 1 week)
async function setCacheValue(key, value, duration = 604800) {
    try {
        if (ENABLE_LOCAL_NODECACHE) {
            log.info(`Setting local Node.js cache with key ${key}`);
            localNodeCache.set(key, value, duration);
        }
        if (ENABLE_AMAZON_ELASTICACHE) {
            log.info(`Setting Amazon Elasticache with key ${key}`);
            await awsMemcached.set(key, value, duration, function (err) {
                if (err) {
                    log.error('Error in awsMemcached set: ', err);
                }
            });
        }
    } catch (err) {
        log.error('Error in awsMemcached set: ', err);
        return undefined;
    }
}

// Get key from memcached
async function getCacheValue(key) {
    try {
        if (ENABLE_LOCAL_NODECACHE) {
            const localNodeCacheValue = localNodeCache.get(key);
            if (typeof localNodeCacheValue !== 'undefined') {
                return localNodeCacheValue;
            }
        } else if (ENABLE_AMAZON_ELASTICACHE) {
            const getCloudCachePromise = promisify(awsMemcached.get.bind(awsMemcached));
            const cloudCacheValue = await getCloudCachePromise(key);
            if (typeof cloudCacheValue !== 'undefined') {
                return cloudCacheValue;
            }
        }
    } catch (err) {
        log.error('Error in awsMemcached get: ', err);
        return undefined;
    }
}

module.exports = {
    setCacheValue,
    getCacheValue,
};

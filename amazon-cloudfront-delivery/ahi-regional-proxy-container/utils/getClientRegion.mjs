// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import fetch from 'node-fetch';

// Logging
import logger from '../log.mjs';
const log = logger('getClientRegion');

/**
 * Get region for AWS HealthImaging
 * Use AHI_REGION from the project config, otherwise use the region where Fargate is running
 */
export default async function getClientRegion() {
    if (process.env.AHI_REGION) {
        return process.env.AHI_REGION;
    } else {
        try {
            const metadataUrl = `${process.env.ECS_CONTAINER_METADATA_URI_V4}/task`;
            const taskMetadataRsp = await fetch(metadataUrl);
            const taskMetadata = await taskMetadataRsp.json();
            const clusterArn = taskMetadata.Cluster;
            return clusterArn.split(':')[3];
        } catch (error) {
            log.error(`Error getting region: ${JSON.stringify(error)}. Using us-east-1.`);
            return 'us-east-1';
        }
    }
}

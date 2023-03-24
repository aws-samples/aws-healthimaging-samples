// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// gunzip to decompress metadata response
const zlib = require('zlib');
const util = require('util');
const gunzip = util.promisify(zlib.gunzip);
const CRC32 = require('crc-32');

// js/webassembly build of openjph
const openjphjs = require('./openjphjs/openjphjs.js');

/**
 * create an sdk client for healthlake imaging using the service model helper function
 * to use the preview sdk directly, replace the below with:
 *   const AWS = require('./aws-sdk')
 *   const ahli_region = 'us-east-1';
 *   const params = {
 *     region: ahli_region,
 *     'https://medical-imaging.${ahli_region}.amazonaws.com'
 *   }
 *   const miClient = new AWS.MedicalImaging(params)
 */
const MedicalImaging = require('./medical-imaging');
const ahli_region = 'us-east-1';
const nodeLoader = require('aws-sdk/lib/node_loader');
const endpoint_url = 'https://iad.gamma.medical-imaging.ai.aws.dev';
// const endpoint_url = `https://medical-imaging.${ahli_region}.amazonaws.com`;
const endpoint = new nodeLoader.Endpoint(endpoint_url);
const params = {
    apiVersion: '2022-10-19',
    endpoint: endpoint,
    region: ahli_region,
};
const miClient = new MedicalImaging(params);

/**
 * @param {object} metadata - ImageSet metadata
 * @param {string} seriesInstanceUid - series instance UID
 * @param {string} sopInstanceUid - SOP instance UID
 * @return {Array} array of image frame IDs { ID: "imageFrameId" }
 */
const getImageFrameForSopInstance = (metadata, seriesInstanceUid, sopInstanceUid) => {
    try {
        return metadata.Study.Series[seriesInstanceUid].Instances[sopInstanceUid].ImageFrames;
    } catch (e) {
        throw 'Unable to get image frame ID from metadata. Check series and SOP instance UIDs.';
    }
};

openjphjs.onRuntimeInitialized = async (_) => {
    const decoder = new openjphjs.HTJ2KDecoder();

    if (process.argv.length < 5) {
        console.log('node index.js <datastoreid> <imagesetid> <seriesInstanceUid> <sopInstanceUid>');
        process.exit(1);
    }
    const datastoreId = process.argv[2];
    const imageSetId = process.argv[3];
    const seriesInstanceUid = process.argv[4];
    const sopInstanceUid = process.argv[5];

    // get the metadata for the imageset
    const getImageSetMetadataResult = await miClient
        .getImageSetMetadata({
            datastoreId,
            imageSetId,
        })
        .promise();
    const metadataJSON = await gunzip(getImageSetMetadataResult.imageSetMetadataBlob);
    const imageSetMetadata = JSON.parse(metadataJSON);

    // lookup the ImageFrame for the sopInstanceUid
    const imageFrameMeta = getImageFrameForSopInstance(imageSetMetadata, seriesInstanceUid, sopInstanceUid);
    const imageFrameId = imageFrameMeta[0].ID;

    // get the image frame
    const imageFrameData = await miClient
        .getImageFrame({
            datastoreId,
            imageSetId,
            imageFrameId,
        })
        .promise();

    // decode the image frame
    const encodedBuffer = decoder.getEncodedBuffer(imageFrameData.imageFrameBlob.length);
    encodedBuffer.set(imageFrameData.imageFrameBlob);
    decoder.decode();
    const decodedBuffer = decoder.getDecodedBuffer();

    // calculate the CRC32 for the image frame
    const fullResCRC32 = CRC32.buf(decodedBuffer);

    // compare it to the value in the metadata
    const fullResCRC32FromMeta =
        imageFrameMeta[0].PixelDataChecksumFromBaseToFullResolution[
            imageFrameMeta[0].PixelDataChecksumFromBaseToFullResolution.length - 1
        ].Checksum;

    if (fullResCRC32 === fullResCRC32FromMeta) {
        console.log('CRC32 match!');
    } else {
        console.log('CRC32 does NOT match!');
    }
};

// Helper functions
import { medicalImagingGet, medicalImagingPost, medicalImagingDelete } from './awsSign';

// Buffer
import { Buffer } from 'buffer';

// AWS
import { Auth } from 'aws-amplify';

let config = {
    region: '',
    controlPlaneEndpoint: null,
    dataPlaneEndpoint: null,
    cfEndpoint: null,
    cfEndpointAuth: null,
    cfPostToGet: true,
    apiTiming: false,
};

function updateConfig(newSetting) {
    config = { ...config, ...newSetting };
}

/**
 * Control Plane Read
 * https://medical-imaging.us-east-1.amazonaws.com
 */

// List datastores
async function listDatastores() {
    return await medicalImagingGet({
        config: config,
        url: config.controlPlaneEndpoint + '/datastore',
        name: 'List datastore',
    });
}

// List import jobs
async function listDicomImportJobs({ datastoreId }) {
    return await medicalImagingGet({
        config: config,
        url: config.controlPlaneEndpoint + `/listDICOMImportJobs/datastore/${datastoreId}`,
        name: 'List DICOM import jobs',
    });
}

// List tags for resource
async function listTagsForResource({ resourceArn }) {
    return await medicalImagingGet({
        config: config,
        url: config.controlPlaneEndpoint + `/tags/${encodeURIComponent(resourceArn)}`,
        name: 'List tags for resource ARN',
    });
}

/**
 * Control Plane Write
 */

// Tag resource
async function tagResource({ resourceArn, tags }) {
    return await medicalImagingPost({
        config: config,
        url: config.controlPlaneEndpoint + `/tags/${encodeURIComponent(resourceArn)}`,
        data: { tags: tags },
    });
}

// Untag resource
async function untagResource({ resourceArn, tags }) {
    if ([0, undefined].includes(tags?.length)) return;

    const tagKeys = tags.map((t) => `tagKeys=${t}`).join('&');
    const untagResourceUrl = config.controlPlaneEndpoint + `/tags/${encodeURIComponent(resourceArn)}?${tagKeys}`;
    return await medicalImagingDelete({
        config: config,
        url: untagResourceUrl,
    });
}

/**
 * Data Plane
 * https://runtime-medical-imaging.us-east-1.amazonaws.com
 */

/**
 * @description If a CloudFront endpoint (cloudfront.endpointUrl) is specified,
 *   1/ use CloudFront as the host.
 *   2/ add the Cognito JWT to the Authorization header if specified (cloudfront.endpointUrlAuth === 'cognito_jwt').
 *   3/ redirect POST to GET if specified (cloudfront.posttoget).
 *  Otherwise pass through the request with the data plane endpoint
 * @param {object} config API configuration. Defined above and updated elsewhere in the app
 * @param {string} url Request URL
 * @param {name} name API call name. Used to print API timings if enabled
 * @param {Boolean} returnReq (optional) Return the request instead of calling it and returning the result. Default: false
 * @returns {object} request
 */
async function cloudFrontDataPlaneWrapper({ config, url, name, returnReq = false }) {
    let cfRequest = {
        config: config,
        url: url,
        name: name,
        returnReq: returnReq,
    };

    if (config.cfEndpoint) {
        // Parse the CloudFront endpoint URL
        const cfEndpointUrl = new URL(config.cfEndpoint);

        // Do not sigv4 sign the request
        cfRequest.sign = false;

        // Update the request URL with the CloudFront protocol and hostname
        const requestUrl = new URL(cfRequest.url);
        requestUrl.protocol = cfEndpointUrl.protocol;
        requestUrl.hostname = cfEndpointUrl.hostname;
        // .href includes search parameters
        cfRequest.url = requestUrl.href;

        // If using Cognito auth, update the request header with the JWT
        if (config.cfEndpointAuth === 'cognito_jwt') {
            const currentSession = await Auth.currentSession();
            cfRequest.headers = {
                Authorization: `Bearer ${currentSession.accessToken?.jwtToken}`,
                ...cfRequest.headers,
            };
        }

        // If cloudfront.posttoget is set to true, call GET, otherwise call POST
        if (config.cfPostToGet === true) {
            return await medicalImagingGet(cfRequest);
        } else {
            return await medicalImagingPost(cfRequest);
        }
    } else {
        // Convert the query string to body
        const searchParams = new URL(url);
        const requestBody = Object.fromEntries(searchParams.searchParams);
        cfRequest.body = requestBody;
        cfRequest.data = requestBody;
        return await medicalImagingPost(cfRequest);
    }
}

async function getImageSet({ datastoreId, imageSetId, versionId = null }) {
    let getImageSetUrl = config.dataPlaneEndpoint + `/datastore/${datastoreId}/imageSet/${imageSetId}/getImageSet`;
    if (versionId) {
        const versionInt = parseInt(versionId);
        if (typeof versionInt === 'number') {
            getImageSetUrl += `?version=${versionInt}`;
        }
    }
    return await cloudFrontDataPlaneWrapper({
        config: config,
        url: getImageSetUrl,
        name: 'GetImageSet',
    });
}

// ListImageSetVersions
async function listImageSetVersions({ datastoreId, imageSetId }) {
    return await medicalImagingPost({
        config: config,
        url: config.dataPlaneEndpoint + `/datastore/${datastoreId}/imageSet/${imageSetId}/listImageSetVersions`,
        name: 'List image set versions',
    });
}

// GetDicomStudyMetadata
async function getDicomStudyMetadata({ datastoreId, imageSetId, versionId = null }) {
    let metadataUrl = config.dataPlaneEndpoint + `/datastore/${datastoreId}/imageSet/${imageSetId}/getImageSetMetadata`;
    if (versionId) {
        const versionInt = parseInt(versionId);
        if (typeof versionInt === 'number') {
            metadataUrl += `?version=${versionInt}`;
        }
    }
    return await cloudFrontDataPlaneWrapper({
        config: config,
        url: metadataUrl,
        name: 'GetDicomStudyMetadata',
    });
}

// GetImageFrame
async function getImageFrame({ datastoreId, imageSetId, imageFrameId, returnReq = false }) {
    const imageFrameUrl =
        config.dataPlaneEndpoint +
        `/datastore/${datastoreId}/imageSet/${imageSetId}/getImageFrame?imageFrameId=${imageFrameId}`;

    return await cloudFrontDataPlaneWrapper({
        config: config,
        url: imageFrameUrl,
        name: 'GetImageFrame',
        returnReq: returnReq,
    });
}

/**
// Get DICOM frame
// Pass in returnReq to only return the sigv4-signed image frame URL
async function getImageFrame({
    datastoreId,
    imageSetId,
    imageFrameId,
    returnReq = false,
    imageFrameOverrideUrl = null,
    imageFrameOverrideAuth = 'cognito_jwt',
    cfPostToGet = false,
}) {
    const endpoint = imageFrameOverrideUrl || config.dataPlaneEndpoint;

    // If using a custom endpoint and auth is Cognito JWT, append the session token to the end of the URL
    let urlSuffix = '';
    let signRequest = true;
    if (imageFrameOverrideUrl && imageFrameOverrideAuth === 'cognito_jwt') {
        const currentSession = await Auth.currentSession();
        urlSuffix = `?token=${currentSession.accessToken?.jwtToken}`;
    } else if (imageFrameOverrideUrl) {
        signRequest = false;
    }

    const getImageFrameReq = {
        config: config,
        url: endpoint + `/datastore/${datastoreId}/imageSet/${imageSetId}/getImageFrame` + urlSuffix,
        sign: signRequest,
        name: returnReq ? 'Get image frame URL' : 'Get full image frame',
        ...(returnReq && { returnReq: true }),
    };

    if (cfPostToGet) {
        const joinType = (urlSuffix += urlSuffix ? '&' : '?');
        const imageFrameQueryString = `${joinType}imageFrameId=${imageFrameId}`;
        const getImageFrameGetReq = {
            ...getImageFrameReq,
            url: getImageFrameReq.url + imageFrameQueryString,
        };
        return await medicalImagingGet(getImageFrameGetReq);
    } else {
        const getImageFramePostReq = {
            ...getImageFrameReq,
            data: {
                imageFrameId: imageFrameId,
            },
        };
        return await medicalImagingPost(getImageFramePostReq);
    }
}
*/

// Search ImageSets
async function searchImageSets({ datastoreId, data = {}, maxResults = null, nextToken = null }) {
    // datastoreId is [0-9a-z] with 32 characters
    if (!/[0-9a-z]{32}/.test(datastoreId)) throw new Error('Invalid datastore ID.');
    // maxResults is between 1 and 50
    if (maxResults && (parseInt(maxResults) < 1 || parseInt(maxResults) > 50)) maxResults = null;
    // nextToken is an ASCII string between 1 and 8192 characters
    if (nextToken && (nextToken?.length < 1 || nextToken?.length > 8192)) nextToken = null;
    // Build search URL
    let searchUrl = config.dataPlaneEndpoint + '/datastore/' + datastoreId + '/searchImageSets';
    let queryString = [`maxResults=${maxResults}`, `nextToken=${nextToken}`]
        .filter((val) => {
            if (val.split('=')?.[1] !== 'null') return true;
            return false;
        })
        .join('&');
    searchUrl = [searchUrl, queryString].filter(Boolean).join('?');
    return await medicalImagingPost({
        config: config,
        url: searchUrl,
        data: data,
    });
}

/**
 * Control Plane Write
 */

// Update or remove imageset metadata
async function updateImageSetMetadata({
    datastoreId,
    imageSetId,
    latestVersionId,
    removableAttributes = {},
    updatableAttributes = {},
}) {
    if (Object.keys(removableAttributes).length === 0 && Object.keys(updatableAttributes).length === 0) return;

    let dicomUpdates = {
        DICOMUpdates: {},
    };

    if (Object.keys(removableAttributes).length > 0) {
        dicomUpdates.DICOMUpdates.removableAttributes = Buffer.from(JSON.stringify(removableAttributes)).toString(
            'base64'
        );
    }

    if (Object.keys(updatableAttributes).length > 0) {
        dicomUpdates.DICOMUpdates.updatableAttributes = Buffer.from(JSON.stringify(updatableAttributes)).toString(
            'base64'
        );
    }

    const updateImageSetMetadtaUrl =
        config.dataPlaneEndpoint +
        `/datastore/${datastoreId}/imageSet/${imageSetId}/updateImageSetMetadata?latestVersion=${latestVersionId}`;

    return await medicalImagingPost({
        config: config,
        url: updateImageSetMetadtaUrl,
        data: dicomUpdates,
    });
}

export {
    updateConfig,
    listDatastores,
    listDicomImportJobs,
    listTagsForResource,
    tagResource,
    untagResource,
    getImageSet,
    listImageSetVersions,
    getDicomStudyMetadata,
    getImageFrame,
    searchImageSets,
    updateImageSetMetadata,
};

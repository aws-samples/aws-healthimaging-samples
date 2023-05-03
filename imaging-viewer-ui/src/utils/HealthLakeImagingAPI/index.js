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
    apiTiming: false,
};

function updateConfig(newSetting) {
    config = { ...config, ...newSetting };
}

/**
 * Control Plane Read
 * https://healthlake-imaging.us-east-1.amazonaws.com
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
 * https://runtime-healthlake-imaging.us-east-1.amazonaws.com
 */

async function getImageSet({ datastoreId, imageSetId }) {
    return await medicalImagingGet({
        config: config,
        url: config.dataPlaneEndpoint + `/runtime/datastore/${datastoreId}/imageset/${imageSetId}`,
        name: 'Get image set',
    });
}

async function listImageSetVersions({ datastoreId, imageSetId }) {
    return await medicalImagingGet({
        config: config,
        url: config.dataPlaneEndpoint + `/runtime/datastore/${datastoreId}/imageset/${imageSetId}/versions`,
        name: 'List image set versions',
    });
}

// Get DICOM study metadata
async function getDicomStudyMetadata({ datastoreId, imageSetId, versionId = null }) {
    let metadataUrl = config.dataPlaneEndpoint + `/runtime/datastore/${datastoreId}/imageset?imageSetId=${imageSetId}`;
    if (versionId) {
        const versionInt = parseInt(versionId);
        if (typeof versionInt === 'number') {
            metadataUrl += `&version=${versionInt}`;
        }
    }
    return await medicalImagingGet({
        config: config,
        url: metadataUrl,
        name: 'Get DICOM study metadata',
    });
}

// Get DICOM frame
// Pass in returnUrl to only return the sigv4-signed image frame URL
async function getDicomFrame({
    datastoreId,
    imageSetId,
    imageFrameId,
    returnUrl = false,
    imageFrameOverrideUrl = null,
    imageFrameOverrideAuth = 'cognito_jwt',
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

    if (returnUrl) {
        return await medicalImagingGet({
            config: config,
            url: `${endpoint}/runtime/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}${urlSuffix}`,
            name: 'Get DICOM frame URL',
            returnUrl: true,
            sign: signRequest,
        });
    } else {
        return await medicalImagingGet({
            config: config,
            url: `${endpoint}/runtime/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}${urlSuffix}`,
            name: 'Get full DICOM frame',
            axiosArgs: { responseType: 'arraybuffer' },
            sign: signRequest,
        });
    }
}

// Search ImageSets
async function searchImageSets({ datastoreId, data = {}, maxResults = null, nextToken = null }) {
    // datastoreId is [0-9a-z] with 32 characters
    if (!/[0-9a-z]{32}/.test(datastoreId)) throw new Error('Invalid datastore ID.');
    // maxResults is between 1 and 50
    if (maxResults && (parseInt(maxResults) < 1 || parseInt(maxResults) > 50)) maxResults = null;
    // nextToken is an ASCII string between 1 and 8192 characters
    if (nextToken && (nextToken?.length < 1 || nextToken?.length > 8192)) nextToken = null;
    // Build search URL
    let searchUrl = config.dataPlaneEndpoint + '/runtime/datastore/' + datastoreId;
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
// TODO: currently only supports update
async function updateImageSetMetadata({
    datastoreId,
    imageSetId,
    latestVersionId,
    removableAttributes = {},
    updatableAttributes = {},
}) {
    if (Object.keys(removableAttributes) === 0 && Object.keys(updatableAttributes) === 0) return;

    let updateItemBlob = Buffer.from(JSON.stringify(updatableAttributes)).toString('base64');
    let updateUpdateable = { updatableAttributes: updateItemBlob };
    let dicomUpdates = {
        DICOMUpdates: updateUpdateable,
    };

    const updateImageSetMetadtaUrl =
        config.dataPlaneEndpoint +
        `/runtime/datastore/${datastoreId}/imageset/${imageSetId}/metadata?latestVersion=${latestVersionId}`;

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
    getDicomFrame,
    searchImageSets,
    updateImageSetMetadata,
};

// Helper functions
import { medicalImagingGet, medicalImagingPost } from './awsSign';

// AWS
import { Auth } from 'aws-amplify';

let config = {
    region: '',
    endpoint: '',
    apiTiming: false,
};

function updateConfig(newSetting) {
    config = { ...config, ...newSetting };
}

// List datastores
async function listDatastores() {
    return await medicalImagingGet({
        config: config,
        url: config.endpoint + '/datastore',
        name: 'List datastore',
    });
}

// List import jobs
async function listDicomImportJobs({ datastoreId }) {
    return await medicalImagingGet({
        config: config,
        url: config.endpoint + `/listDICOMImportJobs/datastore/${datastoreId}`,
        name: 'List DICOM import jobs',
    });
}

async function getImageSet({ datastoreId, imageSetId }) {
    return await medicalImagingGet({
        config: config,
        url: config.endpoint + `/runtime/datastore/${datastoreId}/imageset/${imageSetId}`,
        name: 'Get image set',
    });
}

async function listImageSetVersions({ datastoreId, imageSetId }) {
    return await medicalImagingGet({
        config: config,
        url: config.endpoint + `/runtime/datastore/${datastoreId}/imageset/${imageSetId}/versions`,
        name: 'List image set versions',
    });
}

// Get DICOM study metadata
async function getDicomStudyMetadata({ datastoreId, imageSetId, versionId = null }) {
    let metadataUrl = config.endpoint + `/runtime/datastore/${datastoreId}/imageset?imageSetId=${imageSetId}`;
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
    const endpoint = imageFrameOverrideUrl || config.endpoint;

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
    let searchUrl = config.endpoint + '/runtime/datastore/' + datastoreId;
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

export {
    updateConfig,
    listDatastores,
    listDicomImportJobs,
    getImageSet,
    listImageSetVersions,
    getDicomStudyMetadata,
    getDicomFrame,
    searchImageSets,
};

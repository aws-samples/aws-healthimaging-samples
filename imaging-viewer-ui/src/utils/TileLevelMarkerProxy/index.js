import axios from 'axios';
import { Auth } from 'aws-amplify';

async function getFrameTlm({
    datastoreId,
    imageSetId,
    imageFrameId,
    startlevel,
    endLevel,
    tlmProxyUrl,
    tlmProxyAuth = 'cognito_jwt',
}) {
    const start = new Date();

    let url = `${tlmProxyUrl}/runtime/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}?startLevel=${startlevel}&endLevel=${endLevel}`;

    if (tlmProxyAuth === 'cognito_jwt') {
        const currentSession = await Auth.currentSession();
        url += `&token=${currentSession.accessToken?.jwtToken}`;
    }

    const tlmProxyGetData = await axios(url, { responseType: 'arraybuffer' });

    const end = new Date();

    // console.info(`tlmProxyGet time: ${end - start}ms`);
    return {
        fetchTime: end - start,
        ...tlmProxyGetData,
    };
}

async function getFrameTlmUrl({ datastoreId, imageSetId, imageFrameId, tlmProxyUrl, tlmProxyAuth = 'cognito_jwt' }) {
    let url = tlmProxyUrl + `/runtime/datastore/${datastoreId}/imageset/${imageSetId}/imageframe/${imageFrameId}`;
    if (tlmProxyAuth === 'cognito_jwt') {
        const currentSession = await Auth.currentSession();
        url += `?token=${currentSession.accessToken?.jwtToken}`;
    }
    return url;
}

export { getFrameTlm, getFrameTlmUrl };

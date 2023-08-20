import { Auth } from 'aws-amplify';

async function getFrameTlmObj({ datastoreId, imageSetId, imageFrameId, tlmProxyUrl, tlmProxyAuth = 'cognito_jwt' }) {
    const imageFrameInformation = {
        imageFrameId: imageFrameId,
    };

    let tlmReq = {
        method: 'POST',
        url: tlmProxyUrl + `/datastore/${datastoreId}/imageSet/${imageSetId}/getImageFrame`,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageFrameInformation),
    };

    if (tlmProxyAuth === 'cognito_jwt') {
        const currentSession = await Auth.currentSession();
        tlmReq.url += `?token=${currentSession.accessToken?.jwtToken}`;
    }
    return tlmReq;
}

export { getFrameTlmObj };

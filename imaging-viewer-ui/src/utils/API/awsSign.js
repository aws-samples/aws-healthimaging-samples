// AWS
import { Auth, Signer } from 'aws-amplify';

// Axios
import axios from 'axios';

// Return accessInfo for Amplify Signer input
async function getCreds() {
    const credentials = await Auth.currentCredentials();
    return {
        access_key: credentials.accessKeyId,
        secret_key: credentials.secretAccessKey,
        session_token: credentials.sessionToken,
    };
}

/*******************
 * Helper Functions
 *******************/
export async function medicalImagingGet({ config, url, axiosArgs, returnUrl = false, sign = true }) {
    if (!config.region || !url) throw new Error('API configuration not set');
    const serviceInfo = {
        service: 'medical-imaging',
        region: config.region,
    };

    const start = performance.now();
    // sign or leave the URL alone (if sigv4 is not needed) and save to processedUrl
    const processedUrl = sign ? Signer.signUrl(url, await getCreds(), serviceInfo) : url;
    // Return signed URL immediately if returnUrl is set, otherwise get the result
    if (returnUrl) return processedUrl;
    const getResult = await axios(processedUrl, { ...axiosArgs });
    const end = performance.now();
    if (config.apiTiming) console.debug(`Time: ${end - start}ms for URL ${url}`);

    return {
        fetchTime: end - start,
        ...getResult,
    };
}

export async function medicalImagingPost({ config, url, data = {}, axiosArgs, returnReq = false }) {
    if (!config.region || !url) throw new Error('API configuration not set.');
    const serviceInfo = {
        service: 'medical-imaging',
        region: config.region,
    };

    const request = {
        method: 'POST',
        url: url,
        data: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const start = performance.now();
    let signedReq = Signer.sign(request, await getCreds(), serviceInfo);
    // Remove the host header, as we have signedReq.url
    delete signedReq.headers?.host;
    // Return signed request immediately if returnUrl is set, otherwise get the result
    if (returnReq) return signedReq;
    const postResult = await axios({ ...signedReq }, { ...axiosArgs });
    const end = performance.now();
    if (config.apiTiming) console.debug(`Time: ${end - start}ms for URL ${url}`);

    return {
        fetchTime: end - start,
        ...postResult,
    };
}

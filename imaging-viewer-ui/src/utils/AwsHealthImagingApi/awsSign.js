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
export async function medicalImagingGet({ config, url, axiosArgs, returnReq = false, sign = true }) {
    if (!config.region || !url) throw new Error('API configuration not set');
    const serviceInfo = {
        service: 'medical-imaging',
        region: config.region,
    };

    const start = performance.now();
    // sign or leave the URL alone (if sigv4 is not needed) and save to processedUrl
    const processedUrl = sign ? Signer.signUrl(url, await getCreds(), serviceInfo) : url;
    // Return signed URL immediately if returnReq is set, otherwise get the result
    if (returnReq) return processedUrl;
    const getResult = await axios(processedUrl, { ...axiosArgs });
    const end = performance.now();
    if (config.apiTiming) console.debug(`Time: ${end - start}ms for URL ${url}`);

    return {
        fetchTime: end - start,
        ...getResult,
    };
}

async function medicalImagingVerb({ config, verb, url, data = {}, axiosArgs, returnReq = false, sign = true }) {
    if (!config.region || !url) throw new Error('API configuration not set.');
    const serviceInfo = {
        service: 'medical-imaging',
        region: config.region,
    };

    let request = {
        method: verb,
        url: url,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) {
        request.data = JSON.stringify(data);
        request.body = JSON.stringify(data);
    }

    const start = performance.now();
    let signedReq = sign ? Signer.sign(request, await getCreds(), serviceInfo) : request;
    // Remove the host header, as we have signedReq.url
    delete signedReq.headers?.host;
    // Return signed request immediately if returnReq is set, otherwise get the result
    if (returnReq) return signedReq;
    const verbResult = await axios({ ...signedReq }, { ...axiosArgs });
    const end = performance.now();
    if (config.apiTiming) console.debug(`Time: ${end - start}ms for URL ${url}`);

    return {
        fetchTime: end - start,
        ...verbResult,
    };
}

export async function medicalImagingPost({ config, url, data = {}, axiosArgs, returnReq = false, sign }) {
    return medicalImagingVerb({
        config: config,
        verb: 'POST',
        url: url,
        data: data,
        axiosArgs: axiosArgs,
        returnReq: returnReq,
        sign: sign,
    });
}

export async function medicalImagingDelete({ config, url, axiosArgs, returnReq = false, sign }) {
    return medicalImagingVerb({
        config: config,
        verb: 'DELETE',
        url: url,
        axiosArgs: axiosArgs,
        returnReq: returnReq,
        sign: sign,
    });
}

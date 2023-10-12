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

/**
 * @description Call AWS Medical Imaging API with a verb
 * @param {Object} config (required) app configuration
 * @param {String} verb (required) HTTP verb
 * @param {String} url (required) URL
 * @param {Object} headers (optional) request headers. these are not signed
 * @param {Object} data (optional) request data
 * @param {Object} axiosArgs (optional) axios arguments
 * @param {Boolean} returnReq (optional) return signed request instead of result
 * @param {Boolean} sign (optional) sigv4 sign the URL
 */
async function medicalImagingVerb({
    config,
    verb,
    url,
    headers = {},
    data = {},
    axiosArgs = {},
    returnReq = false,
    sign = true,
}) {
    if (!config.region || !url) throw new Error('API configuration not set.');
    const serviceInfo = {
        service: 'medical-imaging',
        region: config.region,
    };

    let signedReq = '';

    if (verb === 'GET') {
        const signedUrl = sign ? Signer.signUrl(url, await getCreds(), serviceInfo) : url;
        signedReq = {
            method: 'GET',
            url: signedUrl,
        };

        if (typeof headers === 'object' && Object.keys(headers).length > 0) {
            signedReq.headers = headers;
        }
    } else {
        let request = {
            method: verb,
            url: url,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };
        if (data) {
            request.data = JSON.stringify(data);
            request.body = JSON.stringify(data);
        }
        signedReq = sign ? Signer.sign(request, await getCreds(), serviceInfo) : request;
        // Remove the host header, as we have signedReq.url
        delete signedReq.headers?.host;
    }

    // Return signed request immediately if returnReq is set, otherwise get the result
    if (returnReq) return signedReq;

    const start = performance.now();
    const verbResult = await axios({ ...signedReq }, { ...axiosArgs });
    const end = performance.now();
    if (config.apiTiming) console.debug(`Time: ${end - start}ms for URL ${url}`);

    return {
        fetchTime: end - start,
        ...verbResult,
    };
}

export async function medicalImagingGet({ config, url, headers = {}, axiosArgs = {}, returnReq = false, sign = true }) {
    return medicalImagingVerb({
        config: config,
        verb: 'GET',
        url: url,
        headers: headers,
        axiosArgs: axiosArgs,
        returnReq: returnReq,
        sign: sign,
    });
}

export async function medicalImagingPost({ config, url, headers = {}, data = {}, axiosArgs, returnReq = false, sign }) {
    return medicalImagingVerb({
        config: config,
        verb: 'POST',
        url: url,
        headers: headers,
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
    });
}

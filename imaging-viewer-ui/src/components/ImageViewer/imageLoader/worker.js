// eslint-disable-next-line no-restricted-globals
self.importScripts('./openjphjs.js');

/**
 * Resolve this class after HTJ2K decoder init
 * otherwise messages may come in before decoder is defined
 */
class WorkerReady {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}
const isWorkerReady = new WorkerReady();

let decoder;
// eslint-disable-next-line no-undef
Module.onRuntimeInitialized = () => {
    // eslint-disable-next-line no-undef
    decoder = new Module.HTJ2KDecoder();
    isWorkerReady.resolve(null);
};

/**
 * Build a unique URL string from an imageframeReqObj (post req)
 * Append imageFrameId from the request body to the URL
 * TODO: deduplicate from workerPool.js
 */
function buildUrl(imageframeReqObj) {
    if (imageframeReqObj.body) {
        const postDataObj = JSON.parse(imageframeReqObj.body);
        const imageFrameId = postDataObj.imageFrameId;
        return imageframeReqObj.url + '?imageFrameId=' + imageFrameId;
    } else {
        return imageframeReqObj.url;
    }
}

/**
 * Load the entire frame, then display it
 */
function defaultLoader({ imageframeReqObj, instance }) {
    const fetchStart = new Date();

    fetch(imageframeReqObj.url, imageframeReqObj).then(async (response) => {
        const body = await response.arrayBuffer();
        const fetchEnd = new Date();

        const encodedBitStream = new Uint8Array(body);
        const encodedBuffer = decoder.getEncodedBuffer(encodedBitStream.length);
        encodedBuffer.set(encodedBitStream);

        decoder.readHeader();
        const decodeStart = new Date();
        decoder.decode();
        const decodeEnd = new Date();

        const frameInfo = decoder.getFrameInfo();
        const uncompressedImageFrame = new Uint8Array(decoder.getDecodedBuffer().length);
        uncompressedImageFrame.set(decoder.getDecodedBuffer());

        const rsp = {
            url: buildUrl(imageframeReqObj),
            instance: instance,
            frameInfo: frameInfo,
            buffer: uncompressedImageFrame.buffer,
            encodedSize: encodedBitStream.length,
            fetchTime: fetchEnd - fetchStart,
            decodeTime: decodeEnd - decodeStart,
        };

        postMessage(rsp);
    });
}

/**
 * Load the frame one chunk at a time, then display it
 * @param {string} url incoming message is the sigv4URL of the image frame
 * @param {object} instance
 */
function progressiveLoader({ imageframeReqObj, instance }) {
    const fetchStart = new Date();
    let result = new Uint8Array([]);

    fetch(imageframeReqObj.url, imageframeReqObj).then(async (response) => {
        const reader = response.body.getReader();

        reader.read().then(function processData({ done, value }) {
            if (done) {
                return;
            }

            const fetchEnd = new Date();
            const chunk = value;
            let newResult = new Uint8Array(result.length + chunk.length);
            newResult.set(result);
            newResult.set(chunk, result.length);
            result = newResult;

            const encodedBuffer = decoder.getEncodedBuffer(result.length);
            encodedBuffer.set(result);
            decoder.readHeader();
            const decodeStart = new Date();
            decoder.decode();
            const decodeEnd = new Date();

            const frameInfo = decoder.getFrameInfo();
            const uncompressedImageFrame = new Uint8Array(decoder.getDecodedBuffer().length);
            uncompressedImageFrame.set(decoder.getDecodedBuffer());

            const rsp = {
                url: buildUrl(imageframeReqObj),
                instance: instance,
                frameInfo: frameInfo,
                buffer: uncompressedImageFrame.buffer,
                encodedSize: encodedBuffer.length,
                fetchTime: fetchEnd - fetchStart,
                decodeTime: decodeEnd - decodeStart,
            };

            postMessage(rsp);

            return reader.read().then(processData);
        });
    });
}

/**
 * Wait for conditionFunction to become true
 *
 * @param {*} conditionFunction
 * @returns {Promise}
 */
function waitFor(conditionFunction) {
    const poll = (resolve) => {
        if (conditionFunction()) resolve();
        else setTimeout((_) => poll(resolve), 300);
    };
    return new Promise(poll);
}
/**
 * Join the first count of arrays
 *
 * @param {arrayBuffer[]} arrays
 * @param {number} count
 * @returns {Uint8Array.buffer}
 */
function joinArrayBuffers(arrays, count) {
    const reduceArray = arrays.slice(0, count + 1);
    const size = reduceArray.reduce((a, b) => a + b.byteLength, 0);
    let result = new Uint8Array(size);
    let offset = 0;
    for (let arr of reduceArray) {
        result.set(new Uint8Array(arr), offset);
        offset += arr.byteLength;
    }
    return result.buffer;
}
/**
 * Decode result and post a message with the frame info and various metrics
 * @param {string} url
 * @param {object} instance
 * @param {number} decodeLevel
 * @param {arrayBuffer} result
 * @returns {number} number of decompositions
 */
function decodeAndPost(url, instance, decodeLevel, result) {
    const encodedBitStream = new Uint8Array(result);
    const encodedBuffer = decoder.getEncodedBuffer(encodedBitStream.length);
    encodedBuffer.set(encodedBitStream);

    decoder.readHeader();
    const decodeStart = new Date();
    decoder.decode();
    const decodeEnd = new Date();

    const frameInfo = decoder.getFrameInfo();
    const uncompressedImageFrame = new Uint8Array(decoder.getDecodedBuffer().length);
    uncompressedImageFrame.set(decoder.getDecodedBuffer());

    let rsp = {
        url: url,
        instance: instance,
        frameInfo: frameInfo,
        buffer: uncompressedImageFrame.buffer,
        encodedSize: encodedBuffer.length,
        decodeTime: decodeEnd - decodeStart,
    };

    // calcualte decompositions and resolutions at level 0
    const numDecompositions = decoder.getNumDecompositions();
    let decompositionData = {};
    if (decodeLevel === 0) {
        for (let i = 0; i <= numDecompositions; i++) {
            decompositionData[i] = decoder.calculateSizeAtDecompositionLevel(numDecompositions - i);
        }
        rsp = { ...rsp, decompositionData: decompositionData };
    }

    postMessage(rsp);
    return numDecompositions;
}

/**
 * Given a TLM imageframeReqObj, a start level and an end level,
 * Return an updated imageframeReqObj with an updated URL
 * @param {object} imageframeReqObj
 * @param {number} startLevel
 * @param {number} endLevel
 */
function updateImageframeReqTlmObj(imageframeReqObj, startLevel, endLevel) {
    const urlJoinChar = imageframeReqObj.url.includes('?') ? '&' : '?';
    const updatedUrl = `${imageframeReqObj.url}${urlJoinChar}startLevel=${startLevel}&endLevel=${endLevel}`;
    return { ...imageframeReqObj, url: updatedUrl };
}

/**
 * Load the frame one TLM level at a time, then display it
 * append ?startLevel=0&endLevel=0 to the first call, then post the response
 * then increment start/end levels until tlmDecodeLevel or the URL returns nothing
 *
 * @param {string} url public TLM-proxy URL of the image frame
 * @param {object} instance
 * @param {number} tlmDecodeLevel
 */
async function tlmLoader({ imageframeReqObj, instance, tlmDecodeLevel }) {
    const reqUrl = buildUrl(imageframeReqObj);
    try {
        const initialTlmObj = updateImageframeReqTlmObj(imageframeReqObj, 0, 0);
        let imageFrameResponse = []; // array of data from TLM proxy. Size will be decomposition levels + 1

        const response = await fetch(initialTlmObj.url, initialTlmObj);
        const body = await response.arrayBuffer();
        imageFrameResponse[0] = body;

        const decompositionLevels = decodeAndPost(reqUrl, instance, 0, imageFrameResponse[0]) || 1;

        // max TLM level to retrieve
        // if tlmDecodeLevel is -1, use decompositionLevels
        // otherwise, use tlmDecodeLevel, unless tlmDecodeLevel is higher than decompositionLevels
        const maxDecodeLevel =
            tlmDecodeLevel === -1
                ? decompositionLevels
                : tlmDecodeLevel > decompositionLevels
                ? decompositionLevels
                : tlmDecodeLevel;

        const seqArray = Array.from({ length: maxDecodeLevel }, (_, i) => i + 1);
        seqArray.forEach((i) => {
            const tlmObj = updateImageframeReqTlmObj(imageframeReqObj, i, i);
            fetch(tlmObj.url, tlmObj).then(async (response) => {
                const tlmData = await response.arrayBuffer();
                imageFrameResponse[i] = tlmData;
            });
        });
        // Loop through the levels again, wait for the data to be there, join the bufferArrays and display the image
        for (let i = 1; i <= maxDecodeLevel; i++) {
            await waitFor((_) => imageFrameResponse[i] !== undefined);
            const newImageFrame = joinArrayBuffers(imageFrameResponse, i);
            decodeAndPost(reqUrl, instance, i, newImageFrame);
        }
    } catch (error) {
        postMessage({ url: reqUrl, error: new Error(error) });
    }
}

onmessage = function (e) {
    isWorkerReady.promise.then(() => {
        switch (e.data?.loadMethod) {
            case 'progressive':
                progressiveLoader(e.data);
                break;
            case 'tlm':
                tlmLoader(e.data);
                break;
            case 'default':
            default:
                defaultLoader(e.data);
        }
    });
};

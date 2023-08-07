/* eslint-disable no-loop-func */

// Workers
import getPixelData from './getPixelData';
import cornerstone from 'cornerstone-core';

// App
import createImage from './createImage';
import getMinMax from './getMinMax';

const requests = {};
let workers = [];
let nextWorker = 0;
let createdImages = [];

/**
 * Build a unique URL string from an imageframeReqObj (post req)
 * Append imageFrameId from the request body to the URL
 * TODO: deduplicate from worker.js
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

function init(numWorkers = 1) {
    for (var i = 0; i < numWorkers; i++) {
        const worker = new Worker(new URL('./worker.js', import.meta.url));

        workers.push(worker);
        worker.index = i;

        // Receiving message from worker
        worker.onmessage = (e) => {
            /** Support progressive decoding:
             * On inititial load (first chunk), the image object is pushed into createdImages using the URL as the key
             * On subsequent messages from the worker (more chunks), the image object is retrieved from createdImages
             *   and its getPixelData method is replaced with the new chunk's data
             * Finally, the image is marked as invalidated to rerender (https://github.com/cornerstonejs/cornerstone/wiki/invalidateImageId-api)
             * The createdImages object needs to be reset between loading series
             */
            if ('instance' in e.data) {
                const workerStats = {
                    decodeTime: e.data.decodeTime || 0,
                    encodedSize: e.data.encodedSize || 0,
                    fetchTime: e.data.fetchTime || 0,
                    decompositionData: e.data.decompositionData || {},
                };
                if (e.data.url in createdImages) {
                    const imageObj = createdImages[e.data.url];
                    const uncompressedImageFrame = new Uint8Array(e.data.buffer);
                    const pixelData = getPixelData(e?.data?.instance, uncompressedImageFrame);
                    const minMax = getMinMax(pixelData);
                    imageObj.minPixelValue = minMax.min;
                    imageObj.maxPixelValue = minMax.max;
                    imageObj.getPixelData = () => {
                        return pixelData;
                    };
                    imageObj.workerStats = workerStats;
                    cornerstone.invalidateImageId(imageObj.imageId);
                    // custom event to send back worker stats
                    cornerstone.triggerEvent(cornerstone.events, 'cornerstoneimageinvalidated', {
                        imageId: imageObj.imageId,
                        ...workerStats,
                    });
                } else {
                    const request = requests[e.data.url];
                    const uncompressedImageFrame = new Uint8Array(e.data.buffer);
                    const image = createImage(
                        e?.data?.instance,
                        e?.data?.frameInfo,
                        uncompressedImageFrame,
                        workerStats
                    );
                    createdImages[e.data.url] = image;
                    request.resolve(image);
                }
            } else if ('error' in e.data) {
                console.error('Error message from worker: ', e.data);
                const request = requests[e.data.url];
                request.reject(e.data.error);
            } else {
                console.error('Unhandled message from worker: ', e.data);
            }
        };
    }
}

function resetCreatedImages() {
    createdImages = [];
}

function queueRequest(request) {
    const workerId = nextWorker++ % workers.length;
    requests[buildUrl(request.imageframeReqObj)] = request;

    workers[workerId].postMessage({
        imageframeReqObj: request.imageframeReqObj,
        instance: request.instance,
        loadMethod: request.loadMethod,
        tlmDecodeLevel: request.tlmDecodeLevel,
    });
}

// terminate and reset workers
function terminateAllWorkers() {
    workers.forEach((w) => {
        w.terminate();
    });
    workers = [];
}

const workerPool = {
    init,
    queueRequest,
    resetCreatedImages,
    terminateAllWorkers,
};

export default workerPool;

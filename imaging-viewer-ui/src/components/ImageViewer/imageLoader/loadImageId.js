// App
import workerPool from './workerPool';
import { getImageFrame } from '../../../utils/AwsHealthImagingApi';
import { getFrameTlmObj } from '../../../utils/TileLevelMarkerProxy';

// imageId is a URI built in ImageViewer.jsx using index.makeImageId
function loadImageId(imageId, config) {
    const imageIdParts = imageId.split('/');
    const promise = new Promise(async (resolve, reject) => {
        const datastoreId = imageIdParts[2];
        const imageSetId = imageIdParts[3];
        const seriesInstanceUid = imageIdParts[4];
        const sopInstanceUid = imageIdParts[5];
        const frame = parseInt(imageIdParts[6]);

        const metadata = config.collections[imageSetId];

        const instance = metadata.Study.Series[seriesInstanceUid].Instances[sopInstanceUid];
        const imageFrameId = instance.ImageFrames[frame].ID;

        const imageframeReqObj =
            config.loadMethod === 'tlm'
                ? await getFrameTlmObj({
                      datastoreId: datastoreId,
                      imageSetId: imageSetId,
                      imageFrameId: imageFrameId,
                      tlmProxyUrl: config.tlmProxyUrl,
                      tlmProxyAuth: config.tlmProxyAuth,
                  })
                : await getImageFrame({
                      datastoreId: datastoreId,
                      imageSetId: imageSetId,
                      imageFrameId: imageFrameId,
                      returnReq: true,
                  });

        workerPool.queueRequest({
            resolve: resolve,
            reject: reject,
            imageframeReqObj: imageframeReqObj,
            instance: instance,
            loadMethod: config.loadMethod,
            tlmDecodeLevel: config.tlmDecodeLevel,
        });
    });

    const cancelFn = () => {};

    return {
        promise,
        cancelFn,
    };
}

export default loadImageId;

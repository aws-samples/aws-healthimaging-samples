// Cornerstone
import cornerstone from 'cornerstone-core';

// App
import getNumWorkers from './getNumWorkers';
import workerPool from './workerPool';
import loadImageId from './loadImageId';
import loadMetadataInternal from './loadMetadata';

let config = {
    numWorkers: getNumWorkers(),
    collections: {},
    loadMethod: 'default',
    tlmDecodeLevel: -1,
};

function init(configuration) {
    if (configuration) {
        config.numWorkers = configuration.numWorkers ? configuration.numWorkers : config.numWorkers;
    }
    cornerstone.registerImageLoader('ahi', loadImage);
    workerPool.init(config.numWorkers, config.addFlashMessage);
}

function loadImage(imageId) {
    return loadImageId(imageId, config);
}

async function loadMetadata(datastoreId, imageSetId) {
    return loadMetadataInternal(datastoreId, imageSetId, config);
}

function makeImageId(datastoreId, imageSetId, seriesUid, instanceUid, frame) {
    const result = 'ahi://' + datastoreId + '/' + imageSetId + '/' + seriesUid + '/' + instanceUid + '/' + frame;
    return result;
}

function updateConfig(newSetting) {
    config = { ...config, ...newSetting };
}

function resetWorkers() {
    workerPool.terminateAllWorkers();
    workerPool.init(config.numWorkers);
}

const resetCreatedImages = workerPool.resetCreatedImages;

const external = {
    init,
    loadMetadata,
    makeImageId,
    updateConfig,
    resetWorkers,
    resetCreatedImages,
};

export default external;

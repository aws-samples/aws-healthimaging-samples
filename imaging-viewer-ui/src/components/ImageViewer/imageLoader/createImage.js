import getMinMax from './getMinMax';
import getMultiValue from './getMultiValue';
import getPixelData from './getPixelData';

// Cornerstone
import cornerstone from 'cornerstone-core';

const createImage = (instance, frameInfo, uncompressedImageFrame, workerStats = {}) => {
    const pixelData = getPixelData(instance, uncompressedImageFrame, frameInfo);
    const minMax = getMinMax(pixelData);

    const image = {
        imageId: '' + Date.now(),
        minPixelValue: minMax.min,
        maxPixelValue: minMax.max,
        slope: instance.DICOM.RescaleSlope ? parseFloat(instance.DICOM.RescaleSlope) : 1,
        intercept: instance.DICOM.RescaleIntercept ? parseFloat(instance.DICOM.RescaleIntercept) : 0,
        windowCenter: getMultiValue(instance.DICOM.WindowCenter),
        windowWidth: getMultiValue(instance.DICOM.WindowWidth),
        render: cornerstone.renderGrayscaleImage,
        getPixelData: () => {
            return pixelData;
        },
        rows: frameInfo.height,
        columns: frameInfo.width,
        height: frameInfo.height,
        width: frameInfo.width,
        color: frameInfo?.componentCount === 3,
        columnPixelSpacing: instance.DICOM.PixelSpacing ? parseFloat(instance.DICOM.PixelSpacing[1]) : undefined,
        rowPixelSpacing: instance.DICOM.PixelSpacing ? parseFloat(instance.DICOM.PixelSpacing[0]) : undefined,
        invert: instance.DICOM.PhotometricInterpretation === 'MONOCHROME1',
        sizeInBytes: uncompressedImageFrame.length,
        rgba: false,
        workerStats: workerStats,
    };

    if (image.color) {
        image.windowWidth = 255;
        image.windowCenter = 127;
        image.render = cornerstone.renderColorImage;
    }

    return image;
};

export default createImage;

function convertToRgb(instance, frameInfo, imageData) {
    const rows = instance.DICOM.Rows;
    const columns = instance.DICOM.Columns;
    let returnData = new Uint8ClampedArray(rows * columns * 4);

    let shift = frameInfo.bitsPerSample > 8 ? 8 : 0;
    let outOffset = 0;
    let inOffset = 0;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            returnData[outOffset++] = imageData[inOffset++] >> shift;
            returnData[outOffset++] = imageData[inOffset++] >> shift;
            returnData[outOffset++] = imageData[inOffset++] >> shift;
            returnData[outOffset++] = 255;
        }
    }
    return returnData;
}

const getPixelData = (instance, uncompressedImageFrame, frameInfo = {}) => {
    if (frameInfo?.componentCount === 3) {
        return convertToRgb(instance, frameInfo, uncompressedImageFrame);
    } else if (instance.DICOM.BitsAllocated === 8) {
        return new Uint8Array(uncompressedImageFrame.buffer);
    } else {
        if (instance.DICOM.PixelRepresentation === 0) {
            return new Uint16Array(uncompressedImageFrame.buffer);
        } else {
            return new Int16Array(uncompressedImageFrame.buffer);
        }
    }
};

export default getPixelData;

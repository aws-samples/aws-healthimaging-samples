const getPixelData = (instance, uncompressedImageFrame) => {
    if (instance.DICOM.BitsAllocated === 8) {
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

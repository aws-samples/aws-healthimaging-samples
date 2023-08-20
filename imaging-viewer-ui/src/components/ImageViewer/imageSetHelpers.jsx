import imageLoader from './imageLoader';

export function getSeriesDataFromMetadata(imageSetMetadata) {
    return Object.keys(imageSetMetadata?.Study?.Series || [])
        .map((seriesUid) => {
            const seriesDesc = imageSetMetadata?.Study?.Series?.[seriesUid]?.DICOM?.SeriesDescription;
            let seriesName = seriesDesc
                ? seriesDesc
                : 'Series #' + imageSetMetadata?.Study?.Series?.[seriesUid]?.DICOM?.SeriesNumber;
            if (Object.keys(imageSetMetadata?.Study?.Series?.[seriesUid]?.Instances)?.length === 1) {
                seriesName +=
                    ' (' + Object.keys(imageSetMetadata?.Study?.Series?.[seriesUid]?.Instances)?.length + ' instance';
                const instanceName = Object.keys(imageSetMetadata?.Study?.Series?.[seriesUid]?.Instances)[0];
                const numFrames =
                    imageSetMetadata?.Study?.Series?.[seriesUid]?.Instances[instanceName].ImageFrames.length;
                if (numFrames > 1) {
                    seriesName += ', ' + numFrames + ' frames';
                }
                seriesName += ')';
            } else {
                seriesName +=
                    ' (' + Object.keys(imageSetMetadata?.Study?.Series?.[seriesUid]?.Instances)?.length + ' instances)';
            }
            return {
                label: seriesName,
                value: seriesUid,
            };
        })
        .sort((a, b) => {
            return (
                parseInt(imageSetMetadata.Study.Series[a.value].DICOM.SeriesNumber) -
                parseInt(imageSetMetadata.Study.Series[b.value].DICOM.SeriesNumber)
            );
        });
}

// Return an array of ahi:// URIs for the given seriesID (series instance UID)
export function getSeriesImageIds({ datastoreId, imageSetId, seriesId, metadata }) {
    const imageUids = Object.keys(metadata.Study.Series[seriesId].Instances);
    imageUids.sort((a, b) => {
        return (
            parseInt(metadata.Study.Series[seriesId].Instances[a].DICOM.InstanceNumber) -
            parseInt(metadata.Study.Series[seriesId].Instances[b].DICOM.InstanceNumber)
        );
    });

    // Handle possible multi-image multi-frame series
    const imageIds = imageUids.flatMap((imageUid) => {
        const image = metadata.Study.Series[seriesId].Instances[imageUid];
        return image.ImageFrames.map((_, i) => {
            return imageLoader.makeImageId(datastoreId, imageSetId, seriesId, image.DICOM.SOPInstanceUID, i);
        });
    });

    return imageIds;
}

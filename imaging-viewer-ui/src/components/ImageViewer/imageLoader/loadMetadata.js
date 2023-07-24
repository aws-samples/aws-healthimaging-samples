// App
import { getDicomStudyMetadata } from '../../../utils/AwsHealthImagingApi';

// Get ImageSet metadata using helper function
// 1. Update config.collections with ImageSet key with metadata data
// 2. Return metadata and fetch time to the caller
export default async function loadMetadataInternal(datastoreId, imageSetId, config) {
    const metadataResult = await getDicomStudyMetadata({
        datastoreId: datastoreId,
        imageSetId: imageSetId,
    });

    config.collections[metadataResult.data.ImageSetID] = metadataResult.data;
    return { fetchTime: metadataResult.fetchTime, ...metadataResult.data };
}

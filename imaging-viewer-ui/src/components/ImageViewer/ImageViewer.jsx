import { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useLocation, useSearchParams } from 'react-router-dom';

// Cloudscape
import {
    ColumnLayout,
    Container,
    ContentLayout,
    Form,
    Input,
    SpaceBetween,
    Toggle,
} from '@cloudscape-design/components';

// Cornerstone
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import { useCornerstone } from './useCornerstone';

// App
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDataStoreImageSetInput } from '../../hooks/useDataStoreImageSetInput';
import { getSeriesDataFromMetadata, getSeriesImageIds } from './imageSetHelpers';
import SelectDatastore from '../../common/SelectDatastore';
import imageLoader from './imageLoader';
import { useMetrics } from './useMetrics';
import { useTlmOptions } from './useTlmOptions';
import { ViewerContainerHeader, LoadMethodSelection, SeriesSelect, TlmLevelSelect } from './viewerContainerComponents';

imageLoader.init();

export default function ImageViewer() {
    const { addFlashMessage, buildCrumb, appSettings } = useContext(AppContext);
    // Router
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    // Series options, array for <Select />
    const [seriesOptions, setSeriesOptions] = useState([]);
    // Selected series in <Select />. Contains .label and .value
    const [selectedSeries, setSelectedSeries] = useState(null);
    // Series <Select /> status: pending, loading, finished, error. Set to loading when Metadata is loading
    const [seriesStatusType, setSeriesStatusType] = useState('pending');
    // Selected load method in <Select /> Contains .label and .value
    const [selectedLoadMethod, setSelectedLoadMethod] = useLocalStorage('Viewer-Load-Method', {
        label: 'Load: Default',
        value: 'default',
    });
    // automatically display the image first series
    const [autoDisplayFirstSeries, setAutoDisplayFirstSeries] = useLocalStorage('Viewer-Auto-Load-First-Series', true);
    // Images loading
    const [imageLoading, setImageLoading] = useState(false);
    // ImageSet metadata object
    const [imageSetMetadata, setImageSetMetadata] = useState({});
    // Datastore select and ImageSet input
    const {
        errorText,
        setErrorText,
        selectedDatastore,
        setSelectedDatastore,
        verifyDatastoreId,
        imageSetId,
        setImageSetId,
        verifyImageSetId,
    } = useDataStoreImageSetInput();
    // TLM options
    const { levelOptions, updateLevels, resetLevels, selectedLevel, setSelectedLevel } = useTlmOptions(
        imageLoader.updateConfig
    );
    // Cornerstone
    const { enableCornerstone, disableCornerstone } = useCornerstone();
    // Metrics
    const { loadMetrics, updateMetric, updateMetricLoadTime, resetStats, Metrics } = useMetrics();
    // Viewer settings
    const tlmProxyUrl = appSettings['viewer.tlmProxyUrl'];
    const tlmProxyAuth = appSettings['viewer.tlmProxyAuth']?.value;

    // Viewer element
    const imageBoxRef = useRef();
    const imageBoxElement = imageBoxRef.current;

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, 'Image Viewer');
    }, [buildCrumb, location]);

    // update imageLoader's load method
    useEffect(() => {
        imageLoader.updateConfig({
            loadMethod: selectedLoadMethod.value,
        });
    }, [selectedLoadMethod.value]);

    /**
     * When an image is loaded
     *   - increment frames loaded
     *   - update data loaded
     *   - update load time
     *   - update encoded size array
     */
    const handleCornerstoneImageLoaded = useCallback(
        (e) => {
            updateMetric('framesLoaded', null, 1);
            updateMetric('dataLoaded', null, e.detail.image.sizeInBytes);
            updateMetricLoadTime();
            updateMetric('encodedSizeList', null, {
                [e.detail.image.imageId]: e.detail.image.workerStats.encodedSize,
            });
            const decompositionData = e.detail.image.workerStats?.decompositionData;
            if (decompositionData.constructor === Object && Object.keys(decompositionData).length > 0) {
                updateLevels(decompositionData);
            }
        },
        [updateLevels, updateMetric, updateMetricLoadTime]
    );
    /**
     * When an image is invalidated, i.e. image is updated progressively,
     *   - update encoded size
     */
    const handleCornerstoneImageInvalidated = useCallback(
        (e) => {
            if (e.detail?.imageId && e.detail?.encodedSize) {
                updateMetric('encodedSizeList', null, {
                    [e.detail.imageId]: e.detail.encodedSize,
                });
            }
        },
        [updateMetric]
    );
    /**
     * When an image is rendered
     *   - update current frame number
     */
    const handleImageBoxImageRendered = useCallback(
        (e) => {
            const stackState = cornerstoneTools.getToolState(imageBoxElement, 'stack');
            // this returns undefined if the rendered image is not a stack; set currentFrameIndex to 1 if that's the case
            const currentImageIdIndex = stackState?.data?.[0]?.currentImageIdIndex;
            if (typeof currentImageIdIndex === 'undefined') {
                updateMetric('currentFrameIndex', 1);
            } else {
                updateMetric('currentFrameIndex', currentImageIdIndex + 1);
            }
        },
        [imageBoxElement, updateMetric]
    );
    const cornerstoneEventHandlers = {
        handleCornerstoneImageLoaded: handleCornerstoneImageLoaded,
        handleCornerstoneImageInvalidated: handleCornerstoneImageInvalidated,
        handleImageBoxImageRendered: handleImageBoxImageRendered,
    };

    /**
     * Enable Cornerstone for the image box element
     * Attempt to display images if nothing has been rendered yet
     */
    useEffect(() => {
        if (imageBoxElement != null) {
            enableCornerstone(imageBoxElement, cornerstoneEventHandlers);
        }
        return () => {
            resetStats();
            if (imageBoxElement != null) {
                disableCornerstone(imageBoxElement, cornerstoneEventHandlers);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageBoxElement]);

    /**
     * Memoized data
     */
    const isSomethingLoading = useMemo(
        () => seriesStatusType === 'loading' || imageLoading,
        [imageLoading, seriesStatusType]
    );
    // has something changed on the form, used to enable the reset button
    const formDirty = useMemo(() => {
        if (imageSetId || Object.keys(imageSetMetadata)?.length > 0) return true;
    }, [imageSetId, imageSetMetadata]);
    // string for study name -> uid -> image set id
    const studyNiceName = useMemo(() => {
        if (!imageSetMetadata || Object.keys(imageSetMetadata)?.length === 0) return '';
        const studyDesc = imageSetMetadata?.Study?.DICOM?.StudyDescription;
        const studyUid = imageSetMetadata?.Study?.DICOM?.StudyInstanceUID;
        return studyDesc ? studyDesc : studyUid ? studyUid : imageSetId;
    }, [imageSetId, imageSetMetadata]);

    /**
     * Handlers
     */
    async function getMetadata(oDatastoreId = null, oImageSetId = null) {
        setSeriesStatusType('loading');
        try {
            const metadataResult = await imageLoader.loadMetadata(
                oDatastoreId || selectedDatastore?.value,
                oImageSetId || imageSetId
            );
            setImageSetMetadata(metadataResult);
            return metadataResult;
        } catch (error) {
            addFlashMessage({
                header: 'Metadata',
                content: error.response?.data?.message.toString() || error.toString(),
                type: 'error',
            });
            setImageSetMetadata(null);
            return null;
        } finally {
            setSeriesStatusType('finished');
        }
    }

    /**
     * Reset button - enabled after metadata is loaded
     */
    async function handleReset() {
        setImageSetId('');
        setImageSetMetadata({});
        setSeriesOptions([]);
        setSelectedSeries(null);
        setSeriesStatusType('pending');
        setSearchParams();
        resetStats();
        resetLevels();
        imageLoader.resetWorkers();
    }

    /**
     * Display ImageSet, with optional override datastoreId and imageSetId
     * @param {string} oDatastoreId
     * @param {string} oImageSetId
     */
    async function handleLoadImageSet(oDatastoreId = null, oImageSetId = null) {
        // Validate inputs
        setErrorText('');
        const inputData =
            oDatastoreId && oImageSetId
                ? {
                      datastoreId: oDatastoreId,
                      imageSetId: oImageSetId,
                  }
                : {
                      datastoreId: selectedDatastore?.value,
                      imageSetId: imageSetId,
                  };
        if (!verifyDatastoreId(inputData.datastoreId)) return;
        if (!verifyImageSetId(inputData.imageSetId)) return;

        // Set metadata based on input
        const metadata = await getMetadata(inputData.datastoreId, inputData.imageSetId);

        // If metadata fails, return
        if (metadata == null || !metadata?.Study?.Series) return;
        // Otherwise get a list of series []
        const seriesOpts = getSeriesDataFromMetadata(metadata);
        setSeriesOptions(seriesOpts);
        // If autoDisplayFirstSeries is enabled, select the first series
        if (autoDisplayFirstSeries && selectedSeries !== seriesOpts[0]) {
            setSelectedSeries(seriesOpts[0]);
            displayImages(undefined, inputData.datastoreId, inputData.imageSetId, seriesOpts[0].value, metadata);
        } else {
            setSelectedSeries(null);
        }
    }

    // Load imageset when search params are specified
    useEffect(() => {
        // imageeBoxElement is null on initial load
        if (imageBoxElement === null) return;

        const sDatastoreId = searchParams.get('datastoreId');
        const sImageSetId = searchParams.get('imageSetId');
        if (sDatastoreId && sImageSetId) {
            setImageSetId(sImageSetId);
            handleLoadImageSet(sDatastoreId, sImageSetId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, imageBoxElement]);

    function displayImages(
        elem = imageBoxElement,
        dsId = selectedDatastore?.value,
        isId = imageSetId,
        seId = selectedSeries?.value,
        md = imageSetMetadata
    ) {
        // If any required inputs are empty, return
        if (
            ![elem, dsId, isId, seId, md].every((e) => {
                if (
                    typeof e === 'undefined' ||
                    e === null ||
                    (e.constructor === Object && Object.keys(e).length === 0)
                ) {
                    return false;
                }
                return true;
            })
        ) {
            return;
        }

        // reset workers in case there is something still being loaded
        if (cornerstone.imageCache.getCacheInfo()?.numberOfImagesCached > 0) imageLoader.resetWorkers();

        setImageLoading(true);
        const imageIds = getSeriesImageIds({
            datastoreId: dsId,
            imageSetId: isId,
            seriesId: seId,
            metadata: md,
        });

        imageLoader.resetCreatedImages();
        cornerstone.imageCache.purgeCache();
        resetStats();
        updateMetric('totalFramesToLoad', imageIds.length);

        if (imageIds.length > 1) {
            const stack = {
                currentImageIdIndex: 0,
                imageIds: imageIds,
            };
            cornerstone
                .loadAndCacheImage(imageIds[0])
                .then((image) => {
                    cornerstone.displayImage(elem, image);
                    cornerstone.reset(elem);
                    cornerstoneTools.addStackStateManager(elem, ['stack']);
                    cornerstoneTools.addToolState(elem, 'stack', stack);
                    cornerstoneTools.stackPrefetch.enable(elem);
                })
                .catch((e) => {
                    addFlashMessage({
                        header: 'Image Viewer',
                        content: e.toString(),
                        type: 'error',
                    });
                });
            cornerstoneTools.setToolActive('StackScroll', { mouseButtonMask: 1 });
            cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 4 });
        } else {
            cornerstone.loadAndCacheImage(imageIds[0]).then((image) => {
                cornerstone.displayImage(elem, image);
                cornerstone.reset(elem);
            });
            cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
        }
        setImageLoading(false);
    }

    /**
     * If a TLM proxy is unconfigured, set the selected load method to default
     * If the TLM proxy is configured, update the imageLoader with the proxy URL and auth options
     */
    useEffect(() => {
        if (!tlmProxyUrl && selectedLoadMethod.value === 'tlm') {
            setSelectedLoadMethod({
                label: 'Load: Default',
                value: 'default',
            });
            return;
        }
        if (tlmProxyUrl || tlmProxyAuth) {
            imageLoader.updateConfig({
                tlmProxyUrl: tlmProxyUrl,
                tlmProxyAuth: tlmProxyAuth,
            });
        }
    }, [selectedLoadMethod.value, setSelectedLoadMethod, tlmProxyAuth, tlmProxyUrl]);

    /**
     * Reset web workers on unload in case there's activity still happening
     */
    useEffect(() => {
        return () => {
            imageLoader.resetWorkers();
        };
    }, []);

    return (
        <ContentLayout
            header={
                <SpaceBetween size="m">
                    <ViewerContainerHeader
                        formDirty={formDirty}
                        isLoading={loadMetrics.framesLoaded < loadMetrics.totalFramesToLoad}
                        handleReset={handleReset}
                        handleLoadImageSet={handleLoadImageSet}
                    />
                    <form onSubmit={(e) => e.preventDefault()}>
                        <Form errorText={errorText}>
                            <ColumnLayout columns={3}>
                                <LoadMethodSelection
                                    selectedLoadMethod={selectedLoadMethod}
                                    handleChange={(selectedOption) => {
                                        imageLoader.updateConfig({
                                            loadMethod: selectedOption.value,
                                        });
                                        setSelectedLoadMethod(selectedOption);
                                        displayImages();
                                    }}
                                    disabled={isSomethingLoading}
                                    options={[
                                        { label: 'Load: Default', value: 'default' },
                                        { label: 'Load: Progressive', value: 'progressive' },
                                        { label: 'Load: Tile Level Markers', value: 'tlm', disabled: !tlmProxyUrl },
                                    ]}
                                />
                                <SelectDatastore
                                    selectedDatastore={selectedDatastore}
                                    setSelectedDatastore={setSelectedDatastore}
                                    disabled={isSomethingLoading || Object.keys(imageSetMetadata || {})?.length > 0}
                                />
                                {Object.keys(imageSetMetadata || {})?.length === 0 ? (
                                    <Input
                                        placeholder="Enter ImageSet ID"
                                        value={imageSetId}
                                        onChange={({ detail }) => setImageSetId(detail.value)}
                                        disabled={isSomethingLoading}
                                    />
                                ) : (
                                    <div
                                        id="imageSetId"
                                        style={{ display: 'flex', alignItems: 'center', height: '100%' }}
                                    >
                                        <strong>{studyNiceName}</strong>
                                    </div>
                                )}
                                <SeriesSelect
                                    selectedSeries={selectedSeries}
                                    handleChange={(selectedOption) => {
                                        setSelectedSeries(selectedOption);
                                        displayImages(undefined, undefined, undefined, selectedOption.value, undefined);
                                    }}
                                    seriesOptions={seriesOptions}
                                    seriesStatusType={seriesStatusType}
                                />
                                <div
                                    id="autoLoadToggle"
                                    style={{ display: 'flex', alignItems: 'center', height: '100%' }}
                                >
                                    <Toggle
                                        onChange={({ detail }) => {
                                            setAutoDisplayFirstSeries(detail.checked);
                                        }}
                                        checked={autoDisplayFirstSeries}
                                    >
                                        Automatically Display First Series
                                    </Toggle>
                                </div>
                                {selectedLoadMethod.value === 'tlm' && (
                                    <TlmLevelSelect
                                        selectedLevel={selectedLevel}
                                        handleChange={(selectedOption) => {
                                            setSelectedLevel(selectedOption);
                                            imageLoader.updateConfig({
                                                tlmDecodeLevel: selectedOption.value,
                                            });
                                            displayImages();
                                        }}
                                        setSelectedLevel={setSelectedLevel}
                                        levelOptions={levelOptions}
                                        updateConfig={imageLoader.updateConfig}
                                    />
                                )}
                            </ColumnLayout>
                        </Form>
                    </form>
                </SpaceBetween>
            }
        >
            <Container>
                <Metrics />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <div
                        ref={imageBoxRef}
                        style={{ aspectRatio: '1 / 1', width: '100%' }}
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseDown={(e) => e.preventDefault()}
                    />
                </div>
            </Container>
        </ContentLayout>
    );
}

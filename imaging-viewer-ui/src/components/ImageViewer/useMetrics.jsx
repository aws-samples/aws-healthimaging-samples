import { useState, useMemo } from 'react';

// Cloudscape
import { SpaceBetween } from '@cloudscape-design/components';

// App
import KeyValuePair from '../../common/KeyValuePair';

// Utils
import prettyBytes from 'pretty-bytes';

// Stats
let imageLoadStart = new Date();
const DEFAULT_LOAD_METRICS = {
    framesLoaded: 0,
    totalFramesToLoad: 0,
    dataLoaded: 0,
    loadTime: 0,
    currentFrameIndex: 0,
    encodedSizeList: {},
};

export function useMetrics() {
    // Metrics
    const [loadMetrics, setLoadMetrics] = useState(DEFAULT_LOAD_METRICS);

    // Update metrics - either replace or update existing metric
    function updateMetric(metricName, newMetricValue = null, updateMetricValue = null) {
        if (metricName === 'encodedSizeList') {
            setLoadMetrics((prevMetrics) => ({
                ...prevMetrics,
                encodedSizeList: {
                    ...prevMetrics.encodedSizeList,
                    ...updateMetricValue,
                },
            }));
        } else {
            setLoadMetrics((prevMetrics) => ({
                ...prevMetrics,
                [metricName]: newMetricValue ? newMetricValue : prevMetrics[metricName] + updateMetricValue,
            }));
        }
    }

    function updateMetricLoadTime() {
        updateMetric('loadTime', new Date() - imageLoadStart);
    }

    // Reset stats
    function resetStats() {
        setLoadMetrics(DEFAULT_LOAD_METRICS);
        imageLoadStart = new Date();
    }

    // total encoded data for all loaded image frames
    const totalEncodedData = useMemo(
        () => Object.values(loadMetrics.encodedSizeList || {}).reduce((a, b) => a + b, 0),
        [loadMetrics.encodedSizeList]
    );

    function Metrics() {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingBottom: '1em',
                }}
            >
                <SpaceBetween direction="horizontal" size="xl">
                    <KeyValuePair label="Frames Loaded">
                        {loadMetrics.framesLoaded === loadMetrics.totalFramesToLoad
                            ? loadMetrics.framesLoaded
                            : `${loadMetrics.framesLoaded}/${loadMetrics.totalFramesToLoad}`}
                    </KeyValuePair>
                    <KeyValuePair label="Current Frame">{loadMetrics.currentFrameIndex}</KeyValuePair>
                    <KeyValuePair label="Load Time (ms)">{loadMetrics.loadTime}</KeyValuePair>
                    <KeyValuePair label="Loaded Data">{prettyBytes(totalEncodedData || 0)}</KeyValuePair>
                    <KeyValuePair label="Decompressed Data">{prettyBytes(loadMetrics.dataLoaded || 0)}</KeyValuePair>
                </SpaceBetween>
            </div>
        );
    }

    return { loadMetrics, updateMetric, updateMetricLoadTime, resetStats, Metrics };
}

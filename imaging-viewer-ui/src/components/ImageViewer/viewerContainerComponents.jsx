// Router
import { useNavigate } from 'react-router-dom';

// Cloudscape
import { Button, Header, Link, Select, SpaceBetween, Spinner } from '@cloudscape-design/components';

// Container header
export function ViewerContainerHeader({ formDirty, isLoading, handleReset, handleLoadImageSet }) {
    const navigate = useNavigate();

    return (
        <Header
            variant="awsui-h1-sticky"
            description={
                <>
                    Select a data store and specify and ImageSet ID or use the{' '}
                    <Link onFollow={() => navigate('/search')}>search feature</Link>.
                </>
            }
            actions={
                <SpaceBetween direction="horizontal" size="xs">
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        {isLoading && <Spinner />}
                    </div>
                    <Button disabled={!formDirty} onClick={() => handleReset()}>
                        Reset
                    </Button>
                    <Button variant="primary" onClick={() => handleLoadImageSet()}>
                        Load ImageSet
                    </Button>
                </SpaceBetween>
            }
        >
            Image Viewer
        </Header>
    );
}

export function LoadMethodSelection({ selectedLoadMethod, handleChange, options, disabled = false }) {
    return (
        <Select
            selectedOption={selectedLoadMethod}
            onChange={({ detail }) => {
                handleChange(detail.selectedOption);
            }}
            expandToViewport={true}
            placeholder="Select a load method"
            options={options}
            disabled={disabled}
        />
    );
}

export function SeriesSelect({ selectedSeries, handleChange, seriesOptions, seriesStatusType }) {
    return (
        <Select
            selectedOption={selectedSeries}
            onChange={({ detail }) => {
                handleChange(detail.selectedOption);
            }}
            expandToViewport={true}
            placeholder="Select a series"
            loadingText="Loading series for ImageSet..."
            options={seriesOptions}
            statusType={seriesStatusType}
            disabled={seriesOptions?.length === 0}
        />
    );
}

export function TlmLevelSelect({ selectedLevel, handleChange, levelOptions }) {
    return (
        <Select
            selectedOption={selectedLevel}
            onChange={({ detail }) => {
                handleChange(detail.selectedOption);
            }}
            expandToViewport={true}
            triggerVariant="option"
            placeholder="Select a TLM level"
            loadingText="Loading TLM levels..."
            options={levelOptions}
            disabled={levelOptions?.length === 0}
        />
    );
}

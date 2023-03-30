import { useMemo, memo } from 'react';

// Router
import { useNavigate } from 'react-router-dom';

// Cloudscape
import { Button, ColumnLayout, Form, Header, Input, Link, Select } from '@cloudscape-design/components';

// Dates
import dayjs from 'dayjs';

// App
import SelectDatastore from '../../common/SelectDatastore';

const HeaderDescription = memo(function HeaderDescription() {
    const navigate = useNavigate();
    return (
        <>
            Select a data store and specify and ImageSet ID or use the{' '}
            <Link onFollow={() => navigate('/search')}>search feature</Link>.
        </>
    );
});

const MetadataViewerHeader = memo(function MetadataViewerHeader({ isSomethingLoading, handleRetrieveMetadata }) {
    return (
        <Header
            variant="awsui-h1-sticky"
            description={<HeaderDescription />}
            actions={
                <Button variant="primary" disabled={isSomethingLoading} onClick={() => handleRetrieveMetadata()}>
                    Retrieve Metadata
                </Button>
            }
        >
            Metadata Viewer
        </Header>
    );
});

function buildVersionOption(imageSetVersion) {
    let tags = [
        `Updated at: ${dayjs.unix(imageSetVersion.updatedAt).format('YYYY-MM-DD H:mm')}`,
        `Created at: ${dayjs.unix(imageSetVersion.createdAt).format('YYYY-MM-DD H:mm')}`,
    ];
    if (imageSetVersion.message) tags.push(`Message: ${imageSetVersion.message}`);
    return {
        label: `Version ${imageSetVersion.versionId}`,
        value: imageSetVersion.versionId,
        tags: tags,
    };
}

const MetadataViewerSearch = memo(function MetadataViewerSearch({
    selectedDatastore,
    setSelectedDatastore,
    imageSetId,
    setImageSetId,
    imageSetVersions,
    selectedVersion,
    handleChangeVersion,
    errorText,
    isSomethingLoading,
}) {
    const versionOptions = useMemo(() => imageSetVersions.map((v) => buildVersionOption(v)), [imageSetVersions]);
    return (
        <form style={{ paddingBottom: '1em', width: '100%' }} onSubmit={(e) => e.preventDefault()}>
            <Form errorText={errorText}>
                <ColumnLayout columns={3}>
                    <SelectDatastore
                        selectedDatastore={selectedDatastore}
                        setSelectedDatastore={setSelectedDatastore}
                        disabled={isSomethingLoading}
                    />
                    <Input
                        placeholder="Enter ImageSet ID"
                        disabled={isSomethingLoading}
                        value={imageSetId}
                        onChange={({ detail }) => setImageSetId(detail.value)}
                    />
                    <Select
                        selectedOption={selectedVersion}
                        onChange={({ detail }) => handleChangeVersion(detail.selectedOption)}
                        options={versionOptions || []}
                        disabled={isSomethingLoading || versionOptions.length === 0}
                        placeholder="Select a version"
                        empty="No versions"
                        filteringType="auto"
                    />
                </ColumnLayout>
            </Form>
        </form>
    );
});

export { buildVersionOption, MetadataViewerHeader, MetadataViewerSearch };

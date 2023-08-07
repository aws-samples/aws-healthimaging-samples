import { useState, useEffect, useMemo, memo } from 'react';

// Router
import { useNavigate } from 'react-router-dom';

// Cloudscape
import {
    Button,
    ColumnLayout,
    Form,
    Header,
    Input,
    Link,
    Popover,
    Select,
    SpaceBetween,
    Spinner,
} from '@cloudscape-design/components';

// Dates
import dayjs from 'dayjs';

// App
import SelectDatastore from '../../common/SelectDatastore';
import KeyValuePair from '../../common/KeyValuePair';
import { getImageSet } from '../../utils/AwsHealthImagingApi';

// Metadata header description. Not exported
const HeaderDescription = memo(function HeaderDescription() {
    const navigate = useNavigate();
    return (
        <>
            Select a data store and specify and ImageSet ID or use the{' '}
            <Link onFollow={() => navigate('/search')}>search feature</Link>. <br /> The latest metadata version can be
            edited.
        </>
    );
});

// Metadata header
const MetadataHeader = memo(function MetadataHeader({
    isSomethingLoading,
    handleRetrieveMetadata,
    setMetadataMode,
    editEnabled,
    resetEnabled,
    handleReset,
    navigate,
}) {
    return (
        <Header
            variant="awsui-h1-sticky"
            description={<HeaderDescription />}
            actions={
                <SpaceBetween direction="horizontal" size="xs">
                    <Button disabled={!resetEnabled} onClick={() => handleReset()}>
                        Reset
                    </Button>
                    <Button disabled={!editEnabled} onClick={() => setMetadataMode('editor')}>
                        Edit
                    </Button>
                    <Button variant="primary" disabled={isSomethingLoading} onClick={() => handleRetrieveMetadata()}>
                        Retrieve Metadata
                    </Button>
                </SpaceBetween>
            }
        >
            Metadata
        </Header>
    );
});

// Create a <Select /> option object from an imageSetVersion object
function buildVersionOption(imageSetVersion) {
    let tags = [
        `Updated at: ${dayjs.unix(imageSetVersion.updatedAt).format('YYYY-MM-DD H:mm')}`,
        // `Created at: ${dayjs.unix(imageSetVersion.createdAt).format('YYYY-MM-DD H:mm')}`,
    ];
    if (imageSetVersion.ImageSetWorkflowStatus === 'UPDATING')
        tags.push(`Status: ${imageSetVersion.ImageSetWorkflowStatus}`);
    if (imageSetVersion.message) tags.push(`Message: ${imageSetVersion.message}`);
    let selectOption = {
        label: `Version ${imageSetVersion.versionId}`,
        value: imageSetVersion.versionId,
        tags: tags,
    };
    if (imageSetVersion.ImageSetWorkflowStatus === 'UPDATING') selectOption.disabled = true;
    return selectOption;
}

const MemoImageSetDetails = memo(function ImageSetDetails({ datastoreId, imageSetId, imageSetVersion }) {
    const [imageSetDetails, setImageSetDetails] = useState(<Spinner />);

    useEffect(() => {
        async function getImageSetDetails() {
            if (!datastoreId || !imageSetId) return;
            const imageSetDetails = await getImageSet({
                datastoreId: datastoreId,
                imageSetId: imageSetId,
                versionId: imageSetVersion || null,
            });
            setImageSetDetails(
                <SpaceBetween size="m">
                    <KeyValuePair center={false} label="ImageSet ID">
                        {imageSetDetails.data.imageSetId}
                    </KeyValuePair>
                    <KeyValuePair center={false} label="Datastore ID">
                        {imageSetDetails.data.datastoreId}
                    </KeyValuePair>
                    <KeyValuePair center={false} label="State">
                        {imageSetDetails.data.imageSetState}
                    </KeyValuePair>
                    <KeyValuePair center={false} label="Workflow Status">
                        {imageSetDetails.data.imageSetWorkflowStatus || '---'}
                    </KeyValuePair>
                    <KeyValuePair center={false} label="Created At">
                        {dayjs.unix(imageSetDetails.data.createdAt).format('YYYY-MM-DD H:mm')}
                    </KeyValuePair>
                    <KeyValuePair center={false} label="Updated At">
                        {dayjs.unix(imageSetDetails.data.updatedAt).format('YYYY-MM-DD H:mm')}
                    </KeyValuePair>
                    {imageSetDetails.data.message && (
                        <KeyValuePair center={false} label="Message">
                            {imageSetDetails.data.message}
                        </KeyValuePair>
                    )}
                </SpaceBetween>
            );
        }
        getImageSetDetails();
    }, [datastoreId, imageSetId, imageSetVersion]);

    return imageSetDetails;
});

// Image set ID object
// When metadata is not loaded (versionsLoaded = false) - <Input />
// When metadata is loaded (versionsLoaded = true) - popover with imageset information
function ImageSetId({
    selectedDatastore,
    isSomethingLoading,
    imageSetId,
    setImageSetId,
    versionsLoaded,
    selectedVersion,
}) {
    if (versionsLoaded) {
        return (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Popover
                    header="Image Set Details"
                    fixedWidth
                    size="medium"
                    content={
                        <MemoImageSetDetails
                            datastoreId={selectedDatastore?.value}
                            imageSetId={imageSetId}
                            imageSetVersion={selectedVersion?.value}
                        />
                    }
                >
                    {imageSetId}
                </Popover>
            </div>
        );
    } else {
        return (
            <Input
                placeholder="Enter ImageSet ID"
                disabled={isSomethingLoading}
                value={imageSetId}
                onChange={({ detail }) => setImageSetId(detail.value)}
            />
        );
    }
}

// Metadata search row
const MetadataSearch = memo(function MetadataSearch({
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
    const versionOptions = useMemo(
        () => imageSetVersions.map((v) => buildVersionOption(v)).sort((a, b) => Number(b.value) - Number(a.value)),
        [imageSetVersions]
    );

    return (
        <form style={{ paddingBottom: '1em', width: '100%' }} onSubmit={(e) => e.preventDefault()}>
            <Form errorText={errorText}>
                <ColumnLayout columns={3}>
                    <SelectDatastore
                        selectedDatastore={selectedDatastore}
                        setSelectedDatastore={setSelectedDatastore}
                        disabled={isSomethingLoading}
                    />
                    <ImageSetId
                        selectedDatastore={selectedDatastore}
                        isSomethingLoading={isSomethingLoading}
                        imageSetId={imageSetId}
                        setImageSetId={setImageSetId}
                        versionsLoaded={imageSetVersions.length > 0}
                        selectedVersion={selectedVersion}
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

export { buildVersionOption, MetadataHeader, MetadataSearch };

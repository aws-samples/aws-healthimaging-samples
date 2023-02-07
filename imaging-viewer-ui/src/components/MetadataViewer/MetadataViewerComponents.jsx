// Router
import { useNavigate } from 'react-router-dom';

// Cloudscape
import { Button, ColumnLayout, Form, Header, Input, Link } from '@cloudscape-design/components';

// App
import SelectDatastore from '../../common/SelectDatastore';

function HeaderDescription() {
    const navigate = useNavigate();

    return (
        <>
            Select a data store and specify and ImageSet ID or use the{' '}
            <Link onFollow={() => navigate('/search')}>search feature</Link>.
        </>
    );
}

export function MetadataViewerHeader({ isSomethingLoading, handleRetrieveMetadata }) {
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
}

export function MetadataViewerSearch({
    selectedDatastore,
    setSelectedDatastore,
    imageSetId,
    setImageSetId,
    errorText,
    isSomethingLoading,
}) {
    return (
        <form style={{ paddingBottom: '1em', width: '100%' }} onSubmit={(e) => e.preventDefault()}>
            <Form errorText={errorText}>
                <ColumnLayout columns={2}>
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
                </ColumnLayout>
            </Form>
        </form>
    );
}

import { useState, useEffect, useContext } from 'react';

// Cloudscape
import { Box, Button, ColumnLayout, Container, Header, Popover, StatusIndicator } from '@cloudscape-design/components';

// Clipboardy
import clipboard from 'clipboardy';

// Utils
import { displayUnixDate } from '../../utils/DateTime';

// API
import { listTagsForResource } from '../../utils/API/imagingApiRead';

// App
import { AppContext } from '../App';
import { TagViewer } from './datastoreTag';

// Top of the page datastore config
export function DatastoreConfiguration({ datastore }) {
    function datastoreIndicatorStatus(status) {
        switch (status) {
            case 'ACTIVE':
                return 'success';
            case 'DELETED':
                return 'stopped';
            case 'CREATE_FAILED':
                return 'warning';
            case 'CREATING':
            case 'DELETING':
                return 'in-progress';
            default:
                return 'info';
        }
    }

    function ContainerDetails() {
        return (
            <ColumnLayout columns={3} variant="text-grid">
                <div>
                    <Box variant="awsui-key-label">Name</Box>
                    <div>{datastore.datastoreName}</div>
                </div>
                <div>
                    <Box variant="awsui-key-label">Created At</Box>
                    <div>{displayUnixDate(datastore.createdAt)}</div>
                </div>
                <div>
                    <Box variant="awsui-key-label">Updated At</Box>
                    <div>{displayUnixDate(datastore.updatedAt)}</div>
                </div>
                <div>
                    <Box variant="awsui-key-label">Status</Box>
                    <StatusIndicator type={datastoreIndicatorStatus(datastore.datastoreStatus)}>
                        Available
                    </StatusIndicator>
                </div>
                <div>
                    <Box variant="awsui-key-label" display="inline">
                        ID
                    </Box>
                    <Popover
                        triggerType="custom"
                        dismissButton={false}
                        content={<StatusIndicator type="success">Data store ID copied to clipboard</StatusIndicator>}
                    >
                        <Button
                            variant="icon"
                            iconName="copy"
                            disabled={!datastore.datastoreId}
                            onClick={() => {
                                clipboard.write(datastore.datastoreId);
                            }}
                        />
                    </Popover>
                    <div>{datastore.datastoreId}</div>
                </div>
                <div>
                    <Box variant="awsui-key-label" display="inline">
                        ARN
                    </Box>
                    <Popover
                        triggerType="custom"
                        dismissButton={false}
                        content={<StatusIndicator type="success">Data store ARN copied to clipboard</StatusIndicator>}
                    >
                        <Button
                            variant="icon"
                            iconName="copy"
                            disabled={!datastore.datastoreArn}
                            onClick={() => {
                                clipboard.write(datastore.datastoreArn);
                            }}
                        />
                    </Popover>
                    <div>{datastore.datastoreArn}</div>
                </div>
            </ColumnLayout>
        );
    }

    return (
        <Container header={<Header variant="h2">Datastore Configuration</Header>}>
            <ContainerDetails />
        </Container>
    );
}

// Bottom of page Tab element - tags
export function DatastoreTags({ datastoreArn }) {
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState([]);

    const { setToolsOpen } = useContext(AppContext);

    useEffect(() => {
        if (!datastoreArn) return;
        async function getTagsForDatastore() {
            setLoading(true);
            const tags = await listTagsForResource({ resourceArn: datastoreArn });
            if (tags?.data?.tags) setTags(Object.entries(tags.data.tags).map(([key, value]) => ({ key, value })));
            setLoading(false);
        }
        getTagsForDatastore();
    }, [datastoreArn]);

    return <TagViewer tags={tags} loading={loading} setToolsOpen={setToolsOpen} />;
}

import { useState, useEffect, useContext } from 'react';

// Cloudscape
import { Box, Button, Header, Link, Table } from '@cloudscape-design/components';

// Context
import { AppContext } from '../App';

// App
import { listTagsForResource } from '../../utils/API/imagingApiRead';

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

    return (
        <Table
            columnDefinitions={[
                {
                    id: 'key',
                    header: 'Key',
                    cell: (t) => t.key,
                    sortingField: 'key',
                },
                {
                    id: 'value',
                    header: 'Value',
                    cell: (t) => t.value,
                    sortingField: 'value',
                },
            ]}
            items={tags}
            loading={loading}
            loadingText="Loading tags"
            empty={
                <Box textAlign="center" color="inherit">
                    <b>No tags</b>
                </Box>
            }
            header={
                <Header
                    variant="h2"
                    counter={`(${tags.length})`}
                    info={
                        <Link variant="info" onFollow={() => setToolsOpen(true)}>
                            Info
                        </Link>
                    }
                    actions={<Button>Manage tags</Button>}
                    description={
                        <>
                            A tag is a label that you assign to an AWS resource. Each tag consists of a key and an
                            optional value. You can use tags to search and filter your resources or track your AWS
                            costs.
                        </>
                    }
                >
                    Tags
                </Header>
            }
        />
    );
}

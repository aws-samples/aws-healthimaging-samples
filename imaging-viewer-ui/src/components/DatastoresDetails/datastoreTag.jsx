// Cloudscape
import { Box, Button, Header, Link, Table } from '@cloudscape-design/components';

const tagTableColumnDefinitions = [
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
];

export function TagViewer({ tags, loading, setToolsOpen }) {
    return (
        <Table
            columnDefinitions={tagTableColumnDefinitions}
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

export function TagEditor() {}

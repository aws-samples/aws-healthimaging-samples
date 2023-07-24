import { useState, useEffect, useContext } from 'react';

// Router
import { useNavigate, useLocation } from 'react-router-dom';

// Cloudscape
import { Box, Button, Container, Header, Link, SpaceBetween, Table, TagEditor } from '@cloudscape-design/components';

// App
import { AppContext } from '../App';
import { tagDescription, tagTableColumnDefinitions, tagEditorI18n } from './datastoreTagConsts';
import { keyValueToObj } from '../../utils/Array';

// API
import { listTagsForResource, tagResource, untagResource } from '../../utils/AwsHealthImagingApi';

function TagEdit({ datastoreArn, existingTags, loading, setToolsOpen, navigate }) {
    const [tags, setTags] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTags(existingTags?.map((t) => ({ ...t, existing: true })));
    }, [existingTags]);

    async function handleSave() {
        setSaving(true);
        const newUpdateTags = tags.filter((t) => t.value !== existingTags.find((et) => et.key === t.key)?.value);
        const removeTags = tags.filter((t) => t.markedForRemoval === true);

        if (newUpdateTags.length > 0) {
            // convert array of objects with key/value keys into an object of key/value pairs
            const newUpdateTagsData = keyValueToObj(newUpdateTags);
            await tagResource({ resourceArn: datastoreArn, tags: newUpdateTagsData });
        }

        if (removeTags.length > 0) {
            const removeTagKeys = removeTags.map((t) => t.key);
            await untagResource({ resourceArn: datastoreArn, tags: removeTagKeys });
        }

        navigate(-1);
    }

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    description={tagDescription}
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button onClick={() => navigate(-1)}>Cancel</Button>
                            <Button variant="primary" onClick={() => handleSave()}>
                                Save
                            </Button>
                        </SpaceBetween>
                    }
                    info={
                        <Link variant="info" onFollow={() => setToolsOpen(true)}>
                            Info
                        </Link>
                    }
                >
                    Manage Tags
                </Header>
            }
        >
            <TagEditor
                i18nStrings={tagEditorI18n}
                loading={loading || saving}
                tags={tags}
                onChange={({ detail }) => setTags(detail.tags)}
            />
        </Container>
    );
}

function TagView({ tags, loading, setToolsOpen, navigate }) {
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
                    actions={<Button onClick={() => navigate('tags')}>Manage tags</Button>}
                    description={<>{tagDescription}</>}
                >
                    Tags
                </Header>
            }
        />
    );
}

// Bottom of page Tab element - tags
export function DatastoreTags({ datastoreArn }) {
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState([]);

    const { setToolsOpen } = useContext(AppContext);

    // Router
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!datastoreArn) return;
        async function getTagsForDatastore() {
            setLoading(true);
            const tags = await listTagsForResource({ resourceArn: datastoreArn });
            if (tags?.data?.tags) setTags(Object.entries(tags.data.tags).map(([key, value]) => ({ key, value })));
            setLoading(false);
        }
        getTagsForDatastore();
    }, [datastoreArn, location]);

    if (location.pathname.endsWith('/tags')) {
        return (
            <TagEdit
                datastoreArn={datastoreArn}
                existingTags={tags}
                loading={loading}
                setToolsOpen={setToolsOpen}
                navigate={navigate}
            />
        );
    } else {
        return <TagView tags={tags} loading={loading} setToolsOpen={setToolsOpen} navigate={navigate} />;
    }
}

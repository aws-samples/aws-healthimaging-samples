import { useState, useEffect, useContext, useMemo } from 'react';

// Cloudscape
import { Button, Container, Header, Link, SpaceBetween, TagEditor } from '@cloudscape-design/components';

// Flatten/Unflatten JSON
import { flatten, unflatten } from 'flat';

// App
import { AppContext } from '../App';
import { INITIAL_DICOM_KEYS, METADATA_TAG_EDITOR_I18N } from './metadataConsts';
import { keyValueToObj } from '../../utils/Array';

// API
import { updateImageSetMetadata } from '../../utils/AwsHealthImagingApi';

const flatOpts = { delimiter: '|' };

// Return initial tags for <TagEditor>
function getInitialTags(flatMetadata) {
    let initialTags = [];
    INITIAL_DICOM_KEYS.forEach((k) => {
        const keyValue = flatMetadata[k];
        if (keyValue) {
            initialTags.push({
                key: k,
                value: keyValue,
                existing: true,
            });
        }
    });
    return initialTags;
}

export function MetadataEditor({
    imageSetMetadata,
    setMetadataMode,
    saveEnabled,
    maxVersion,
    metadataLoading,
    handleRetrieveMetadata,
}) {
    const { setToolsOpen } = useContext(AppContext);
    const [tags, setTags] = useState([]);
    const [saving, setSaving] = useState(false);

    // flatten metadata
    const flatMetadata = useMemo(() => {
        try {
            let tempMetadata = JSON.parse(imageSetMetadata);
            ['SchemaVersion', 'DatastoreID', 'ImageSetID'].forEach((k) => delete tempMetadata[k]);
            Object.keys(tempMetadata?.Study?.Series || {}).forEach((seriesUid) => {
                delete tempMetadata.Study.Series[seriesUid]?.Instances;
            });
            return flatten(tempMetadata, flatOpts);
        } catch (error) {
            return {};
        }
    }, [imageSetMetadata]);

    // set (initial) tags when metadata changes
    useEffect(() => {
        setTags(getInitialTags(flatMetadata));
    }, [flatMetadata]);

    // return possible keys for <TagEditor>
    // this is the keys from flatMetadata minus the keys in existing tags
    function keysRequest() {
        return new Promise(function (resolve, reject) {
            try {
                resolve(Object.keys(flatMetadata).filter((mk) => !tags.map((t) => t.key).includes(mk)));
            } catch (error) {
                resolve([]);
            }
        });
    }

    // return possible values for <TagEditor>
    // this is the vakue from flatMetadata for the given key, if it exists, otherwise return rejected promise
    function valueRequest(key) {
        return new Promise(function (resolve, reject) {
            const val = flatMetadata[key];
            if (typeof val === 'undefined') {
                reject();
            } else if (val == null) {
                resolve(['null']);
            } else {
                resolve([val]);
            }
        });
    }

    async function handleSave() {
        setSaving(true);
        const { SchemaVersion, DatastoreID, ImageSetID } = JSON.parse(imageSetMetadata);

        // Get new or updated tags, save to updateData object
        let updateData = {};
        const newUpdateTags = tags.filter((t) => {
            if (['', 'null'].includes(t.value)) {
                return null !== flatMetadata[t.key];
            } else {
                return t.value !== flatMetadata[t.key];
            }
        });
        if (newUpdateTags.length > 0) {
            // convert array of objects with key/value keys into an object of key/value pairs
            const newUpdateTagsFlattenedData = keyValueToObj(newUpdateTags);
            const newUpdateTagsData = unflatten(newUpdateTagsFlattenedData, flatOpts);
            updateData = { SchemaVersion: SchemaVersion, ...newUpdateTagsData };
        }

        // Get removed tags
        let removeData = {};
        const removeTags = tags.filter((t) => t.markedForRemoval === true || t.value === 'REMOVE');
        if (removeTags.length > 0) {
            const removedTagsFlattenedData = keyValueToObj(removeTags);
            const removedTagsData = unflatten(removedTagsFlattenedData, flatOpts);
            removeData = { SchemaVersion: SchemaVersion, ...removedTagsData };
        }

        await updateImageSetMetadata({
            datastoreId: DatastoreID,
            imageSetId: ImageSetID,
            latestVersionId: maxVersion,
            removableAttributes: removeData,
            updatableAttributes: updateData,
        });

        setMetadataMode('viewer');
        handleRetrieveMetadata();
        setSaving(false);
    }

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    description={
                        <>
                            DICOM tags can be updated or removed. This creates a new version of metadata for this image
                            set. <br /> Previous versions are still accessible. <br /> A blank or null value is treated
                            as null. A REMOVE value removes the tag.
                        </>
                    }
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button onClick={() => setMetadataMode('viewer')}>Cancel</Button>
                            <Button variant="primary" disabled={!saveEnabled} onClick={() => handleSave()}>
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
                    Edit Metadata
                </Header>
            }
        >
            <TagEditor
                allowedCharacterPattern=".*"
                i18nStrings={METADATA_TAG_EDITOR_I18N}
                tags={tags}
                loading={metadataLoading || saving}
                onChange={({ detail }) => setTags(detail.tags)}
                keysRequest={() => keysRequest()}
                valuesRequest={(key) => valueRequest(key)}
            />
        </Container>
    );
}

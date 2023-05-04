import { useEffect, useContext, useState, useCallback, useMemo } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

// Cloudscape
import { ContentLayout, SpaceBetween } from '@cloudscape-design/components';

// App
import { buildVersionOption, MetadataViewerHeader, MetadataViewerSearch } from './metadataHeaderComponents';
import { useDataStoreImageSetInput } from '../../hooks/useDataStoreImageSetInput';
import { DATA_STORE_ID_REGEX, IMAGESET_ID_REGEX } from '../../consts/apiRegex';
import { getDicomStudyMetadata, listImageSetVersions } from '../../utils/HealthLakeImagingAPI';
import { MetadataViewer } from './MetadataViewer';
import { MetadataEditor } from './MetadataEditor';

// Flashbar topic
const ERROR_MESSAGE_TOPIC = 'Metadata';

export default function Metadata() {
    const { addFlashMessage, buildCrumb } = useContext(AppContext);

    const [aceLoading, setAceLoading] = useState(false); // ace editor loading
    const [metadataLoading, setMetadataLoading] = useState(false); // true while the metadata is being retrieved
    const [imageSetMetadata, setImageSetMetadata] = useState(''); // ImageSet metadata json
    const [imageSetVersions, setImageSetVersions] = useState([]); // ImageSet versions
    const [selectedVersion, setSelectedVersion] = useState(null); // selected ImageSet version

    const {
        errorText,
        setErrorText,
        selectedDatastore,
        setSelectedDatastore,
        verifyDatastoreId,
        imageSetId,
        setImageSetId,
        verifyImageSetId,
    } = useDataStoreImageSetInput();

    // Router
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const isSomethingLoading = useMemo(() => aceLoading || metadataLoading, [aceLoading, metadataLoading]);

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, 'Metadata');
    }, [buildCrumb, location]);

    // Get ImageSet versions
    const getImageSetVersions = useCallback(
        async (datastoreId, imageSetId, versionId = 'LATEST') => {
            try {
                const listImageSetVersionsRsp = await listImageSetVersions({
                    datastoreId: datastoreId,
                    imageSetId: imageSetId,
                });
                // extract and sort image set versions. [0] is the lowest versionId
                const imageSetVersions =
                    listImageSetVersionsRsp.data?.imageSetPropertiesList.sort((a, b) => {
                        return parseInt(a.versionId) - parseInt(b.versionId);
                    }) || [];
                // set selected version to latest if nothing is passed (default = LATEST), or if null is passed
                if (versionId === 'LATEST' || versionId === null) {
                    setSelectedVersion(
                        buildVersionOption(
                            imageSetVersions.filter((v) => v.ImageSetWorkflowStatus !== 'UPDATING').slice(-1)[0]
                        )
                    );
                } else if (versionId) {
                    const selectedVersion = imageSetVersions.find((v) => v.versionId === versionId.toString());
                    if (typeof selectedVersion !== 'undefined') setSelectedVersion(buildVersionOption(selectedVersion));
                }
                setImageSetVersions(imageSetVersions);
            } catch (error) {
                addFlashMessage({
                    header: ERROR_MESSAGE_TOPIC,
                    content: error.response?.data?.message.toString() || error.toString(),
                    type: 'error',
                });
            }
        },
        [addFlashMessage]
    );

    // Max image set version
    const maxVersion = useMemo(() => imageSetVersions.slice(-1)[0]?.versionId || 1, [imageSetVersions]);

    // Enable save/edit
    const editEnabled = useMemo(
        () => imageSetMetadata.length > 0 && maxVersion === selectedVersion.value,
        [imageSetMetadata, maxVersion, selectedVersion]
    );

    // Get metadata from the API
    const getMetadata = useCallback(
        async (datastoreId, imageSetId, versionId = null) => {
            setMetadataLoading(true);
            if (!datastoreId || !imageSetId) return;
            try {
                const metadataResult = await getDicomStudyMetadata({
                    datastoreId: datastoreId,
                    imageSetId: imageSetId,
                    versionId: versionId,
                });
                setImageSetMetadata(JSON.stringify(metadataResult.data, null, 2));
            } catch (error) {
                let flashMessage = {
                    header: ERROR_MESSAGE_TOPIC,
                    content: error.response?.data?.message.toString() || error.toString(),
                    type: 'error',
                };
                if (error?.response?.status === 409) {
                    flashMessage.content += ' Try retrieving metadata in a few moments after the operation is complete.'
                    flashMessage.type = 'success';
                    flashMessage.otherParams = {
                        loading: true,
                    };
                }
                addFlashMessage(flashMessage);
            }
            setMetadataLoading(false);
        },
        [addFlashMessage]
    );

    // Load metadata if search params are present or if location changes (coming back from editing metadata)
    useEffect(() => {
        const datastoreId = searchParams.get('datastoreId');
        const imageSetId = searchParams.get('imageSetId');
        const versionId = searchParams.get('versionId');
        if (!aceLoading && DATA_STORE_ID_REGEX.test(datastoreId) && IMAGESET_ID_REGEX.test(imageSetId)) {
            setImageSetId(imageSetId);
            getImageSetVersions(datastoreId, imageSetId, versionId);
            getMetadata(datastoreId, imageSetId, versionId);
        }
    }, [aceLoading, getImageSetVersions, getMetadata, searchParams, setImageSetId, location]);

    // Handle reset button
    function handleReset() {
        setImageSetMetadata('');
        setImageSetVersions([]);
        setSelectedVersion(null);
        setImageSetId('');
        setSearchParams();
    }

    // Handle Retrieve Metadata/Submit button - always get the latest version
    function handleRetrieveMetadata() {
        setErrorText('');
        if (!verifyDatastoreId()) return;
        if (!verifyImageSetId()) return;
        setSearchParams((currentSearchParams) => {
            const newSearchParams = {
                ...currentSearchParams,
                datastoreId: selectedDatastore.value,
                imageSetId: imageSetId,
            };
            return newSearchParams;
        });
        getImageSetVersions(selectedDatastore.value, imageSetId, 'LATEST');
        getMetadata(selectedDatastore.value, imageSetId);
    }

    // Handle change select ImageSet version
    function handleChangeVersion(version) {
        setSearchParams((currentSearchParams) => {
            const newSearchParams = {
                ...currentSearchParams,
                datastoreId: selectedDatastore.value,
                imageSetId: imageSetId,
                versionId: version.value,
            };
            return newSearchParams;
        });
        setSelectedVersion(version);
        getMetadata(selectedDatastore.value, imageSetId, version.value);
    }

    return (
        <ContentLayout
            header={
                <SpaceBetween size="m">
                    <MetadataViewerHeader
                        isSomethingLoading={isSomethingLoading}
                        handleRetrieveMetadata={handleRetrieveMetadata}
                        editEnabled={editEnabled}
                        resetEnabled={imageSetMetadata.length > 0}
                        handleReset={handleReset}
                        navigate={navigate}
                    />
                    <MetadataViewerSearch
                        selectedDatastore={selectedDatastore}
                        setSelectedDatastore={setSelectedDatastore}
                        imageSetId={imageSetId}
                        setImageSetId={setImageSetId}
                        imageSetVersions={imageSetVersions}
                        selectedVersion={selectedVersion}
                        handleChangeVersion={handleChangeVersion}
                        errorText={errorText}
                        isSomethingLoading={isSomethingLoading}
                    />
                </SpaceBetween>
            }
        >
            {location.pathname.endsWith('/edit') ? (
                <MetadataEditor
                    imageSetMetadata={imageSetMetadata}
                    saveEnabled={editEnabled}
                    maxVersion={maxVersion}
                    metadataLoading={metadataLoading}
                    navigate={navigate}
                />
            ) : (
                <MetadataViewer
                    imageSetMetadata={imageSetMetadata}
                    isSomethingLoading={isSomethingLoading}
                    setAceLoading={setAceLoading}
                />
            )}
        </ContentLayout>
    );
}

import { useEffect, useContext, useState, useCallback, useMemo } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useLocation, useSearchParams } from 'react-router-dom';

// Cloudscape
import { CodeEditor, Container, ContentLayout, SpaceBetween } from '@cloudscape-design/components';

// App
import { buildVersionOption, MetadataViewerHeader, MetadataViewerSearch } from './MetadataViewerComponents';
import { useDataStoreImageSetInput } from '../../hooks/useDataStoreImageSetInput';
import { CODE_EDITOR_I18N, THEMES } from './metadataConsts';
import { DATA_STORE_ID_REGEX, IMAGESET_ID_REGEX } from '../../consts/apiRegex';
import { getDicomStudyMetadata, listImageSetVersions } from '../../utils/API/imagingApiRead';

// Ace Editor
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';

// Flashbar topic
const ERROR_MESSAGE_TOPIC = 'Metadata';

export default function MetadataViewer() {
    const { addFlashMessage, appTheme, buildCrumb } = useContext(AppContext);

    const [ace, setAce] = useState(undefined); // ace editor object
    const [aceLoading, setAceLoading] = useState(true); // ace editor loading
    const [metadataLoading, setMetadataLoading] = useState(false); // true while the metadata is being retrieved
    const [imageSetMetadata, setImageSetMetadata] = useState(''); // ImageSet metadata json
    const [imageSetVersions, setImageSetVersions] = useState([]); // ImageSet versions
    const [selectedVersion, setSelectedVersion] = useState(null); // selected ImageSet version
    const [preferences, setPreferences] = useState({
        wrapLines: true,
        theme: appTheme === 'theme.light' ? 'dawn' : 'tomorrow_night_bright',
    }); // CodeEditor preferences. Do not use useLocalStorage because of theme

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

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const isSomethingLoading = useMemo(() => aceLoading || metadataLoading, [aceLoading, metadataLoading]);

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, 'Metadata Viewer');
    }, [buildCrumb, location]);

    // Load Ace editor
    useEffect(() => {
        setAceLoading(true);
        import('ace-builds')
            .then((ace) =>
                import('ace-builds/webpack-resolver')
                    .then(() => {
                        ace.config.set('useStrictCSP', true);
                        ace.config.set('loadWorkerFromBlob', false);
                        ace.config.set('tabSize', 2);
                        setAce(ace);
                        setAceLoading(false);
                    })
                    .catch(() => setAceLoading(false))
            )
            .catch(() => setAceLoading(false));
    }, []);

    // Update Ace theme if theme changes
    useEffect(() => {
        if (appTheme === 'theme.light') {
            setPreferences({ ...preferences, ...{ theme: 'dawn' } });
        } else {
            setPreferences({ ...preferences, ...{ theme: 'tomorrow_night_bright' } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appTheme]);

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
                // set selected version to latest if nothing is passed (default = LATEST), or if nul is passed
                if (versionId === 'LATEST' || versionId === null) {
                    setSelectedVersion(buildVersionOption(imageSetVersions.slice(-1)[0]));
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
                addFlashMessage({
                    header: ERROR_MESSAGE_TOPIC,
                    content: error.response?.data?.message.toString() || error.toString(),
                    type: 'error',
                });
            }
            setMetadataLoading(false);
        },
        [addFlashMessage]
    );

    // Load metadata if search params are present
    useEffect(() => {
        const datastoreId = searchParams.get('datastoreId');
        const imageSetId = searchParams.get('imageSetId');
        const versionId = searchParams.get('versionId');
        if (!aceLoading && DATA_STORE_ID_REGEX.test(datastoreId) && IMAGESET_ID_REGEX.test(imageSetId)) {
            setImageSetId(imageSetId);
            getImageSetVersions(datastoreId, imageSetId, versionId);
            getMetadata(datastoreId, imageSetId, versionId);
        }
    }, [aceLoading, getImageSetVersions, getMetadata, searchParams, setImageSetId]);

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
                        resetEnabled={imageSetMetadata.length > 0}
                        handleReset={handleReset}
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
            <Container>
                <CodeEditor
                    ace={ace}
                    loading={isSomethingLoading}
                    value={imageSetMetadata}
                    language={'json'}
                    preferences={preferences}
                    onPreferencesChange={(e) => setPreferences(e.detail)}
                    i18nStrings={CODE_EDITOR_I18N}
                    themes={THEMES}
                />
            </Container>
        </ContentLayout>
    );
}

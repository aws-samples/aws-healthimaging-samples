import { useEffect, useContext, useState, useCallback, useMemo } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useLocation, useSearchParams } from 'react-router-dom';

// Cloudscape
import { CodeEditor, Container } from '@cloudscape-design/components';

// App
import { MetadataViewerHeader, MetadataViewerSearch } from './MetadataViewerComponents';
import { useDataStoreImageSetInput } from '../../hooks/useDataStoreImageSetInput';
import { CODE_EDITOR_I18N, THEMES } from './metadataConsts';
import { DATA_STORE_ID_REGEX, IMAGESET_ID_REGEX } from '../../consts/apiRegex';
import { getDicomStudyMetadata } from '../../utils/API/imagingApiRead';

// Ace Editor
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';

export default function MetadataViewer() {
    const { appTheme, buildCrumb } = useContext(AppContext);

    const [ace, setAce] = useState(undefined); // ace editor object
    const [aceLoading, setAceLoading] = useState(true); // ace editor loading
    const [metadataLoading, setMetadataLoading] = useState(false); // true while the metadata is being retrieved
    const [imageSetMetadata, setImageSetMetadata] = useState(''); // ImageSet metadata json
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

    const [searchParams] = useSearchParams();
    const location = useLocation();

    const isSomethingLoading = useMemo(() => aceLoading || metadataLoading, [aceLoading, metadataLoading]);

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, ['Metadata Viewer']);
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

    // Get metadata from the API
    const getMetadata = useCallback(async (datastoreId, imageSetId) => {
        setMetadataLoading(true);

        if (!datastoreId || !imageSetId) return;

        const metadataResult = await getDicomStudyMetadata({
            datastoreId: datastoreId,
            imageSetId: imageSetId,
        });
        setImageSetMetadata(JSON.stringify(metadataResult.data, null, 2));
        setMetadataLoading(false);
    }, []);

    // Load metadata if search params are present
    useEffect(() => {
        const datastoreId = searchParams.get('datastoreId');
        const imageSetId = searchParams.get('imageSetId');

        if (!aceLoading && DATA_STORE_ID_REGEX.test(datastoreId) && IMAGESET_ID_REGEX.test(imageSetId)) {
            setImageSetId(imageSetId);
            getMetadata(datastoreId, imageSetId);
        }
    }, [aceLoading, getMetadata, searchParams, setImageSetId]);

    // Handle Submit button
    function handleRetrieveMetadata() {
        setErrorText('');
        if (!verifyDatastoreId()) return;
        if (!verifyImageSetId()) return;
        getMetadata(selectedDatastore.value, imageSetId);
    }

    return (
        <Container
            header={
                <MetadataViewerHeader
                    isSomethingLoading={isSomethingLoading}
                    handleRetrieveMetadata={handleRetrieveMetadata}
                />
            }
        >
            <MetadataViewerSearch
                selectedDatastore={selectedDatastore}
                setSelectedDatastore={setSelectedDatastore}
                imageSetId={imageSetId}
                setImageSetId={setImageSetId}
                errorText={errorText}
                isSomethingLoading={isSomethingLoading}
            />
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
    );
}

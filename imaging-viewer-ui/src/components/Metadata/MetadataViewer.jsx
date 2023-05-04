import { useEffect, useContext, useState } from 'react';

// Context
import { AppContext } from '../App';

// Cloudscape
import { CodeEditor, Container } from '@cloudscape-design/components';

// App
import { CODE_EDITOR_I18N, THEMES } from './metadataConsts';

// Ace Editor
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';

export function MetadataViewer({ imageSetMetadata, isSomethingLoading, setAceLoading }) {
    const { appTheme } = useContext(AppContext);

    const [ace, setAce] = useState(undefined); // ace editor object
    const [preferences, setPreferences] = useState({
        wrapLines: true,
        theme: appTheme === 'theme.light' ? 'dawn' : 'tomorrow_night_bright',
    }); // CodeEditor preferences. Do not use useLocalStorage because of theme

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
    }, [setAceLoading]);

    // Update Ace theme if theme changes
    useEffect(() => {
        if (appTheme === 'theme.light') {
            setPreferences({ ...preferences, ...{ theme: 'dawn' } });
        } else {
            setPreferences({ ...preferences, ...{ theme: 'tomorrow_night_bright' } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appTheme]);

    return (
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
    );
}

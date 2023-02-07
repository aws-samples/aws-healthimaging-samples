import { useState, useEffect, useCallback, createContext, Suspense, lazy } from 'react';

// Cloudscape
import { AppLayout, Box, BreadcrumbGroup, Flashbar, SideNavigation } from '@cloudscape-design/components';

// Router
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';

// AWS Amplify
import { Amplify } from 'aws-amplify';
import { useAuthenticator } from '@aws-amplify/ui-react';

// Utils
import dayjs from 'dayjs';
import { isUserAuth } from '../../utils/Auth';
import { nowTime } from '../../utils/DateTime';
import { updateConfig, listDatastores } from '../../utils/API/imagingApiRead';

// App
import { DEFAULT_SETTINGS } from './defaultSettings';
import { sideNavItems } from './sideNavItems';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import SuspenseLoader from '../SuspenseLoader';
import TopNav from '../TopNav';
import Welcome from '../Welcome';
import ToolsContent from '../ToolsContent';

// Configure AWS Amplify
import awsExports from '../../aws-exports';
Amplify.configure(awsExports);

// Lazy components
const Datastores = lazy(() => import('../Datastores'));
const Search = lazy(() => import('../Search'));
const MetadataViewer = lazy(() => import('../MetadataViewer'));
const ImageViewer = lazy(() => import('../ImageViewer'));
const Settings = lazy(() => import('../Settings'));

// App Context
const AppContext = createContext();

export default function App() {
    const [activeHref, setActiveHref] = useState('/'); // active link for SideNavigation
    const [activeBreadcrumbs, setActiveBreadcrumbs] = useState([{ text: 'Home', href: '/' }]); // active breadcrumbs for BreadcrumGroup
    const [flashbarItems, setFlashbaritems] = useState([]); // items for the flashbar
    const [datastores, setDatastores] = useState([]); // keep datastore state here because it's needed by multiple child components
    const [datastoreLoadStatus, setDatastoreLoadStatus] = useState({
        card: true, // status for Card component: true, false
        select: 'loading', // status for Select component: pending, loading, finished, error
    }); // datastore loading status based on component
    const [appSettings, setAppSettings] = useLocalStorage('App-Settings', DEFAULT_SETTINGS);

    const [appTheme, setAppTheme] = useLocalStorage('App-Theme', 'theme.light');

    // Cognito user context and signOut from AWS Amplify
    const { user, signOut } = useAuthenticator((context) => [context.user]);

    // Navigation
    const navigate = useNavigate();

    // Build and set crumbs from a link and text
    // Text can be a literal string or an array of strings
    // Returns an array of breadcrumbs (object: text, href)
    const buildCrumb = useCallback((href, text) => {
        setActiveHref(href);
        const hrefArray = ['/', ...href.split('/').filter((h) => h !== '')];
        setActiveBreadcrumbs(
            hrefArray.map((h, i) => {
                // build full href from beginning to index
                const fullHref = hrefArray
                    .slice(0, i + 1)
                    .join('/')
                    .replace('//', '/');
                if (h === '/') {
                    return { text: 'Home', href: '/' };
                } else if (Array.isArray(text)) {
                    // if crumbText is an array, use it - should be set for crumb depths > 1
                    return { text: text[i - 1], href: fullHref };
                } else {
                    // otherwise use the link text
                    return { text: text, href: fullHref };
                }
            })
        );
    }, []);

    // Add flash message
    // Type can be success, error, warning, info.
    const addFlashMessage = useCallback(({ id = null, header = null, content, type = 'info', dismissible = true, otherParams }) => {
        if (!content) return;
        const idValue = id ? id : `${header} ${content}`;
        const headerItem = header ? { header } : `${dayjs().format('H:mm')} - ${header}`;
        const newMessage = {
            id: idValue,
            ...headerItem,
            type: type,
            content: typeof content === 'string' ? `${nowTime()}: ${content}` : content,
            dismissible: dismissible,
            onDismiss: () => setFlashbaritems((items) => items.filter((item) => item.id !== idValue)),
            ...otherParams,
        };
        setFlashbaritems((currentMessages) => [...currentMessages, newMessage]);
    }, []);

    // Get datastores
    const getDatastores = useCallback(async () => {
        try {
            setDatastoreLoadStatus({
                card: true,
                select: 'loading',
            });
            const datastoreResult = await listDatastores();
            const sortedDatastoreResult = datastoreResult.data?.datastoreSummaries?.sort((a, b) => a.createdAt - b.createdAt);
            setDatastores(sortedDatastoreResult);
            setDatastoreLoadStatus({
                card: false,
                select: 'finished',
            });
            return sortedDatastoreResult;
        } catch (e) {
            setDatastoreLoadStatus({
                card: false,
                select: 'error',
            });
            addFlashMessage({
                content: `Unable to retrieve datastores: ${e.message}. See debug console for more information.`,
                type: 'error',
            });
        }
    }, [addFlashMessage]);

    // Navigation
    // * if external URL, open in a new window and return
    // * set active href to event for SideNavigation
    // * update breadcrumbs
    // * navigate to url
    function onNavigate(e) {
        e.preventDefault();
        if (e.detail.external === true) {
            window.open(e.detail.href, '_blank', 'noopener');
            return;
        }
        buildCrumb(e.detail.href, e.detail.crumbText || e.detail.text);
        navigate(e.detail.href);
    }

    // update API config with app settings
    useEffect(() => {
        const region = appSettings['app.region']?.value || 'us-east-1';
        const endpoint = appSettings['app.serviceEndpointOverride'] ? appSettings['app.serviceEndpointOverride'] : `https://medical-imaging.${region}.amazonaws.com`;
        const apiTiming = appSettings['app.apiTiming']?.value || false;
        updateConfig({
            region: region,
            endpoint: endpoint,
            apiTiming: apiTiming,
        });
    }, [appSettings]);

    // Set default context values
    const appContextValue = {
        appTheme: appTheme,
        user: user,
        buildCrumb: buildCrumb,
        addFlashMessage: addFlashMessage,
        datastores: datastores,
        datastoreLoadStatus: datastoreLoadStatus,
        getDatastores: getDatastores,
        appSettings: appSettings,
    };

    return (
        <AppContext.Provider value={appContextValue}>
            <TopNav signOut={signOut} setAppTheme={setAppTheme} />
            <AppLayout
                tools={<ToolsContent />}
                contentHeader={
                    <Box>
                        <Flashbar items={flashbarItems} />
                    </Box>
                }
                breadcrumbs={<BreadcrumbGroup onFollow={onNavigate} items={activeBreadcrumbs} />}
                navigation={<SideNavigation activeHref={activeHref} onFollow={(e) => onNavigate(e)} items={sideNavItems} />}
                content={
                    <Suspense fallback={<SuspenseLoader />}>
                        {isUserAuth(user) ? (
                            <Routes>
                                <Route index element={<Welcome />} />
                                <Route path="/datastores" element={<Datastores />} />
                                <Route path="/search" element={<Search />} />
                                <Route path="/metadata" element={<MetadataViewer />} />
                                <Route path="/viewer" element={<ImageViewer />} />
                                <Route path="/settings" element={<Settings setAppSettings={setAppSettings} />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        ) : (
                            <Routes>
                                <Route path="*" element={<Welcome />} />
                            </Routes>
                        )}
                    </Suspense>
                }
            />
        </AppContext.Provider>
    );
}

export { AppContext };

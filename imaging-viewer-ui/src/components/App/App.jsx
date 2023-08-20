import { useState, useCallback, createContext, Suspense, lazy } from 'react';

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
import { listDatastores } from '../../utils/AwsHealthImagingApi';

// App
import { sideNavItems } from './sideNavItems';
import SuspenseLoader from '../SuspenseLoader';
import TopNav from '../TopNav';
import Welcome from '../Welcome';
import ToolsContent from '../ToolsContent';

// Hooks
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSettings } from '../../hooks/useSettings';

import Debug from '../Debug';

// Configure AWS Amplify
import awsExports from '../../aws-exports';
Amplify.configure(awsExports);

// Lazy components
const Datastores = lazy(() => import('../Datastores'));
const DatastoresDetails = lazy(() => import('../DatastoresDetails'));
const Search = lazy(() => import('../Search'));
const Metadata = lazy(() => import('../Metadata'));
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
    const [toolsOpen, setToolsOpen] = useState(false); // whether the tools drawer is open
    const [appSettings, setAppSettings] = useSettings();

    const [appTheme, setAppTheme] = useLocalStorage('App-Theme', 'theme.light');

    // Cognito user context and signOut from AWS Amplify
    const { user, signOut } = useAuthenticator((context) => [context.user]);

    // Navigation
    const navigate = useNavigate();

    // Build and set crumbs from a link and text
    // Text can be a literal string or an array of strings
    // Returns an array of breadcrumbs (object: text, href)
    const buildCrumb = useCallback((href, text = null) => {
        const hrefArray = ['/', ...href.split('/').filter((h) => h !== '')];
        // Only set the first two elements of href as the active href
        if (hrefArray.length <= 2) {
            setActiveHref(href);
        } else {
            setActiveHref(hrefArray.slice(0, 2).join(''));
        }
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
        if (e.detail.href === '/') buildCrumb(e.detail.href, e.detail.text);
        navigate(e.detail.href);
    }

    // Set default context values
    const appContextValue = {
        appTheme: appTheme,
        user: user,
        buildCrumb: buildCrumb,
        addFlashMessage: addFlashMessage,
        setToolsOpen: setToolsOpen,
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
                toolsOpen={toolsOpen}
                onToolsChange={({ detail }) => setToolsOpen(detail.open)}
                notifications={
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
                                <Route path="/debug" element={<Debug />} />
                                <Route path="/datastores" element={<Datastores />} />
                                <Route path="/datastores/:datastoreId/*" element={<DatastoresDetails />} />
                                <Route path="/search" element={<Search />} />
                                <Route path="/metadata" element={<Metadata />} />
                                <Route path="/metadata/edit" element={<Metadata />} />
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

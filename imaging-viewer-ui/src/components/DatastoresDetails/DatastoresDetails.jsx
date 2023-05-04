import { useEffect, useContext, useMemo } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useLocation, useParams } from 'react-router-dom';

// Cloudscape
import {
    Container,
    ContentLayout,
    Header,
    SpaceBetween,
    Spinner,
    StatusIndicator,
    Tabs,
} from '@cloudscape-design/components';

// App
import { DatastoreConfiguration } from './DatastoreConfiguration';
import { DatastoreTags } from './DatastoreTags';

export default function DatastoresDetails() {
    const { buildCrumb, datastoreLoadStatus, datastores } = useContext(AppContext);

    // Router
    const location = useLocation();
    const { datastoreId } = useParams();

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, ['Data Stores', location?.pathname?.split('/')?.[2]]);
    }, [buildCrumb, location]);

    // Active datastore
    const activeDatastore = useMemo(
        () => datastores.find((d) => d.datastoreId === datastoreId),
        [datastoreId, datastores]
    );

    // Tabs
    const tabs = [
        {
            label: 'Tags',
            id: 'tab-tags',
            content: <DatastoreTags datastoreArn={activeDatastore?.datastoreArn} />,
        },
    ];

    return (
        <ContentLayout header={<Header>{activeDatastore?.datastoreName}</Header>}>
            {datastoreLoadStatus?.select === 'loading' ? (
                <Container>
                    <Spinner />
                </Container>
            ) : activeDatastore == null || !activeDatastore.datastoreId ? (
                <Container>
                    <StatusIndicator type="error">Datastore ID not found</StatusIndicator>
                </Container>
            ) : (
                <SpaceBetween size="l">
                    <DatastoreConfiguration datastore={activeDatastore} />
                    <Tabs tabs={tabs} />
                </SpaceBetween>
            )}
        </ContentLayout>
    );
}

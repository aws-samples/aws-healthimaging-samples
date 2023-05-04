import { useEffect, useContext, memo } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useLocation, useNavigate } from 'react-router-dom';

// App
import { useLocalStorage } from '../../hooks/useLocalStorage';
import CardHeader from './DatastoreCardHeader';
import TableEmptyState from '../../common/Table/TableEmptyState';

// Prefs
import {
    cardDefinitions,
    VISIBLE_CONTENT_OPTIONS,
    PAGE_SIZE_OPTIONS,
    DEFAULT_PREFERENCES,
} from './datastoreDefaultPrefs';

// Cloudscape
import { useCollection } from '@cloudscape-design/collection-hooks';
import { Button, Cards, CollectionPreferences, Pagination, TextFilter } from '@cloudscape-design/components';

function Datastores() {
    const { buildCrumb, datastores, datastoreLoadStatus, getDatastores } = useContext(AppContext);
    const [showDeleted, setShowDeleted] = useLocalStorage('Datastore-Show-Deleted', false); // show deleted datstores toggle
    const [preferences, setPreferences] = useLocalStorage('Datastore-Cards-Preferences', DEFAULT_PREFERENCES);

    // Router
    const location = useLocation();
    const navigate = useNavigate();

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, 'Data Stores');
    }, [buildCrumb, location]);

    const { items, actions, filteredItemsCount, collectionProps, filterProps, paginationProps } = useCollection(
        showDeleted ? datastores : datastores.filter((d) => d.datastoreStatus !== 'DELETED'),
        {
            filtering: {
                empty: <TableEmptyState title="No data stores" subtitle="No data stores to display." />,
                noMatch: (
                    <TableEmptyState
                        title="No matches"
                        subtitle="We cannot find a match."
                        action={<Button onClick={() => actions.setFiltering('')}>Clear filter</Button>}
                    />
                ),
            },
            pagination: { pageSize: preferences.pageSize },
            sorting: {},
            selection: {},
        }
    );

    // if any of the datastores are creating or deleting, refresh every 15 seconds
    useEffect(() => {
        let refreshInterval;
        if (['CREATING', 'DELETING'].some((s) => datastores.map((d) => d.datastoreStatus).includes(s))) {
            refreshInterval = setInterval(function () {
                getDatastores();
            }, 10000);

            return () => clearInterval(refreshInterval);
        }
    }, [datastores, getDatastores]);

    return (
        <Cards
            {...collectionProps}
            variant="full-page"
            stickyHeader={true}
            cardDefinition={cardDefinitions(navigate)}
            visibleSections={preferences.visibleContent}
            loading={datastoreLoadStatus.card}
            loadingText="Loading datastores"
            items={items}
            header={CardHeader(showDeleted, setShowDeleted, getDatastores)}
            isItemDisabled={(item) => item.datastoreStatus !== 'ACTIVE'}
            filter={
                <TextFilter
                    {...filterProps}
                    filteringPlaceholder="Find data stores"
                    countText={`${filteredItemsCount} ${filteredItemsCount === 1 ? 'match' : 'matches'}`}
                    disabled={datastoreLoadStatus.card}
                />
            }
            pagination={<Pagination {...paginationProps} disabled={datastoreLoadStatus.card} />}
            preferences={
                <CollectionPreferences
                    title="Preferences"
                    confirmLabel="Confirm"
                    cancelLabel="Cancel"
                    disabled={datastoreLoadStatus.card}
                    preferences={preferences}
                    onConfirm={({ detail }) => setPreferences(detail)}
                    pageSizePreference={{
                        title: 'Page size',
                        options: PAGE_SIZE_OPTIONS,
                    }}
                    visibleContentPreference={{
                        title: 'Select visible columns',
                        options: VISIBLE_CONTENT_OPTIONS,
                    }}
                />
            }
        />
    );
}

export default memo(Datastores);

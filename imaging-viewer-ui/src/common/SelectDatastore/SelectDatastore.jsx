import { useEffect, useMemo, useContext, memo } from 'react';

// Context
import { AppContext } from '../../components/App';

// Router
import { useSearchParams } from 'react-router-dom';

// Cloudscape
import { Select } from '@cloudscape-design/components';

function SelectDatastore({ selectedDatastore, setSelectedDatastore, disabled = false }) {
    const { getDatastores, datastores, datastoreLoadStatus } = useContext(AppContext);

    // Router
    const [searchParams, setSearchParams] = useSearchParams();

    // Build select options from datastores
    const datastoreSelectOptions = useMemo(() => {
        return datastores
            .filter((d) => {
                if (d.datastoreStatus === 'ACTIVE') return true;
                return false;
            })
            .sort((a, b) => a.datastoreName.localeCompare(b.datastoreName))
            .map((d) => {
                return {
                    value: d.datastoreId,
                    label: d.datastoreName,
                };
            });
    }, [datastores]);

    // Handle changing selected datastore
    // * update selectedDatastore
    // * update search params with the datastore ID
    // selectedDatastore object - { value: datastoreId, label: niceName }
    function handleChangeDatastore(selectedDatastore) {
        setSelectedDatastore(selectedDatastore);
        setSearchParams((currentSearchParams) => {
            const newSearchParams = {
                ...currentSearchParams,
                datastoreId: selectedDatastore.value,
            };
            return newSearchParams;
        });
    }

    // Automatically select a datastore if there is no datastore selected
    useEffect(() => {
        if (selectedDatastore != null || datastoreSelectOptions?.length === 0) return;

        const pDatastoreId = searchParams.get('datastoreId');
        const pSelectDatastore = datastoreSelectOptions.find((d) => d.value === pDatastoreId);
        if (pSelectDatastore !== undefined) {
            setSelectedDatastore(pSelectDatastore);
        } else {
            setSelectedDatastore(datastoreSelectOptions[0]);
        }
    }, [datastoreSelectOptions, searchParams, selectedDatastore, setSelectedDatastore]);

    return (
        <Select
            selectedOption={selectedDatastore}
            onChange={({ detail }) => handleChangeDatastore(detail.selectedOption)}
            loadingText="Loading data stores"
            placeholder="Select a data store"
            errorText="Error getting data stores"
            empty="No data stores"
            recoveryText="Retry"
            statusType={datastoreLoadStatus.select}
            options={datastoreSelectOptions}
            expandToViewport={true}
            disabled={disabled}
            onLoadItems={() => getDatastores()}
        />
    );
}

export default memo(SelectDatastore);

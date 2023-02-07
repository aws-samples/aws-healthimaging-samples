import { useState, useContext, useMemo, useEffect } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useNavigate } from 'react-router-dom';

// Cloudscape
import { CollectionPreferences } from '@cloudscape-design/components';
import {
    Button,
    ColumnLayout,
    DateRangePicker,
    Form,
    Header,
    Input,
    SpaceBetween,
} from '@cloudscape-design/components';

// App
import SelectDatastore from '../../common/SelectDatastore';
import { formatSearchParams } from './searchUtils';
import { collectionPreferencesProps } from './tablePrefs';
import { datePickerRelativeOptions, DATE_PICKER_I18N } from './tableDateRangePickerOpts';

/**
 * Table preferences
 */
export function TablePreferences({ preferences, setPreferences }) {
    return (
        <CollectionPreferences
            {...collectionPreferencesProps}
            preferences={preferences}
            onConfirm={({ detail }) => setPreferences(detail)}
        />
    );
}

/**
 * Table header functional components
 */
function TableHeaderActions({ selectedDatastore, setSelectedDatastore, selectedImageSet, actionButtonDisabled }) {
    const { datastoreLoadStatus, getDatastores } = useContext(AppContext);
    const navigate = useNavigate();

    function handleViewMetadataClick() {
        if (selectedImageSet.length === 0) return;
        const url = `/metadata?datastoreId=${selectedDatastore.value}&imageSetId=${selectedImageSet?.[0]?.imageSetId}`;
        navigate(url);
    }

    function handleViewImageClick() {
        if (selectedImageSet.length === 0) return;
        const url = `/viewer?datastoreId=${selectedDatastore.value}&imageSetId=${selectedImageSet?.[0]?.imageSetId}`;
        navigate(url);
    }

    return (
        <SpaceBetween direction="horizontal" size="s">
            <SelectDatastore selectedDatastore={selectedDatastore} setSelectedDatastore={setSelectedDatastore} />
            <Button
                iconName="refresh"
                variant="icon"
                onClick={() => getDatastores()}
                disabled={datastoreLoadStatus.select === 'finished'}
            />
            <Button disabled={actionButtonDisabled} onClick={() => handleViewMetadataClick()}>
                View Metadata
            </Button>
            <Button onClick={() => handleViewImageClick()} disabled={actionButtonDisabled}>
                View ImageSet
            </Button>
        </SpaceBetween>
    );
}

/**
 * Table header
 */
export function TableHeader({
    selectedDatastore,
    setSelectedDatastore,
    selectedImageSet,
    actionButtonDisabled,
    headerCounterText,
    searchImageSets,
}) {
    const [searchParams, setSearchParams] = useState({});

    // Disable search ImageSets if there's no datastore selected
    const searchImageSetsDisabled = useMemo(
        () => (selectedDatastore?.value ? false : true),
        [selectedDatastore?.value]
    );

    // Search all on datastore change (and initial page load)
    useEffect(() => {
        if (selectedDatastore) {
            searchImageSets(formatSearchParams(searchParams));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchImageSets, selectedDatastore]);

    // Disable input if one field has a value
    function isInputDisabled(id) {
        // If there are search params AND this is the id that has a value
        //   OR there are no search params, input is not disabled
        if ((id in searchParams && Object.keys(searchParams)).length > 0 || Object.keys(searchParams).length === 0) {
            return false;
        } else {
            return true;
        }
    }

    // Update searchParam to id: value
    function handleInputChange(id, value) {
        if (value) {
            setSearchParams((currentSearchParams) => {
                const newSearchParams = {
                    ...currentSearchParams,
                    [id]: value,
                };
                return newSearchParams;
            });
        } else {
            setSearchParams((currentSearchParams) => {
                const newSearchParams = { ...currentSearchParams };
                delete newSearchParams[id];
                return newSearchParams;
            });
        }
    }

    return (
        <>
            <Header
                variant="awsui-h1-sticky"
                counter={headerCounterText}
                actions={
                    <TableHeaderActions
                        selectedDatastore={selectedDatastore}
                        setSelectedDatastore={setSelectedDatastore}
                        selectedImageSet={selectedImageSet}
                        actionButtonDisabled={actionButtonDisabled}
                    />
                }
            >
                Search
            </Header>
            <form style={{ paddingTop: '1em' }} onSubmit={(e) => e.preventDefault()}>
                <Form
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button onClick={() => setSearchParams({})}>Clear</Button>
                            <Button
                                variant="primary"
                                disabled={searchImageSetsDisabled}
                                onClick={() => searchImageSets(formatSearchParams(searchParams))}
                            >
                                Search
                            </Button>
                        </SpaceBetween>
                    }
                >
                    <ColumnLayout columns={3}>
                        <Input
                            placeholder="Patient ID"
                            value={searchParams?.patientId}
                            disabled={isInputDisabled('patientId')}
                            onChange={(e) => handleInputChange('patientId', e.detail.value)}
                        />
                        <Input
                            placeholder="Accession Number"
                            value={searchParams?.accessionNumber}
                            disabled={isInputDisabled('accessionNumber')}
                            onChange={(e) => handleInputChange('accessionNumber', e.detail.value)}
                        />
                        <Input
                            placeholder="Study ID"
                            value={searchParams?.studyId}
                            disabled={isInputDisabled('studyId')}
                            onChange={(e) => handleInputChange('studyId', e.detail.value)}
                        />
                    </ColumnLayout>
                    <ColumnLayout columns={2}>
                        <Input
                            placeholder="Study Instance UID"
                            value={searchParams?.studyUid}
                            disabled={isInputDisabled('studyUid')}
                            onChange={(e) => handleInputChange('studyUid', e.detail.value)}
                        />
                        <DateRangePicker
                            className="date-range-picker"
                            placeholder="Study Date"
                            value={searchParams?.studyDate}
                            disabled={isInputDisabled('studyDate')}
                            onChange={(e) => handleInputChange('studyDate', e.detail.value)}
                            relativeOptions={datePickerRelativeOptions}
                            i18nStrings={DATE_PICKER_I18N}
                        />
                    </ColumnLayout>
                </Form>
            </form>
        </>
    );
}

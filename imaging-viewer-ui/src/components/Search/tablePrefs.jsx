import { columnDefs } from './tableColumnDefs';

export const collectionPreferencesProps = {
    title: 'Preferences',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    preferences: {
        pageSize: 10,
        visibleContent: ['variable', 'value', 'type', 'description'],
    },
    pageSizePreference: {
        title: 'Select page size',
        options: [
            { value: 10, label: '10 ImageSets' },
            { value: 15, label: '15 ImageSets' },
            { value: 20, label: '20 ImageSets' },
        ],
    },
    wrapLinesPreference: {
        label: 'Wrap line',
        description: 'Check to see all the text and wrap the lines',
    },
    stripedRowsPreference: {
        label: 'Striped rows',
        description: 'Check to add alternating shaded rows',
    },
    visibleContentPreference: {
        title: 'Select visible content',
        options: [
            {
                label: 'ImageSet properties',
                options: columnDefs.map((c) => {
                    return {
                        id: c.id,
                        label: c.header,
                    };
                }),
            },
        ],
    },
};

export const DEFAULT_PREFERENCES = {
    pageSize: 20,
    wrapLines: false,
    stripedRows: true,
    visibleContent: [
        'DICOMPatientId',
        'DICOMPatientName',
        'DICOMStudyDate',
        'DICOMAccessionNumber',
        'DICOMStudyDescription',
        'DICOMStudyId',
        'DICOMStudyInstanceUID',
    ],
};

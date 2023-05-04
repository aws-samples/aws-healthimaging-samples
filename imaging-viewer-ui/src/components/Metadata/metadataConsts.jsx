export const CODE_EDITOR_I18N = {
    loadingState: 'Loading code editor',
    errorState: 'There was an error loading the code editor.',
    errorStateRecovery: 'Retry',

    editorGroupAriaLabel: 'Code editor',
    statusBarGroupAriaLabel: 'Status bar',

    cursorPosition: (row, column) => `Ln ${row}, Col ${column}`,
    errorsTab: 'Errors',
    warningsTab: 'Warnings',
    preferencesButtonAriaLabel: 'Preferences',

    paneCloseButtonAriaLabel: 'Close',

    preferencesModalHeader: 'Preferences',
    preferencesModalCancel: 'Cancel',
    preferencesModalConfirm: 'Confirm',
    preferencesModalWrapLines: 'Wrap lines',
    preferencesModalTheme: 'Theme',
    preferencesModalLightThemes: 'Light themes',
    preferencesModalDarkThemes: 'Dark themes',
};

export const THEMES = {
    dark: ['tomorrow_night_bright'],
    light: ['dawn'],
};

export const INITIAL_DICOM_KEYS = [
    'Patient|DICOM|PatientID',
    'Patient|DICOM|PatientName',
    'Study|DICOM|AccessionNumber',
    'Study|DICOM|StudyDescription',
    'Study|DICOM|StudyID',
    'Study|DICOM|StudyInstanceUID',
];

export const METADATA_TAG_EDITOR_I18N = {
    keyPlaceholder: 'Enter key',
    valuePlaceholder: 'Enter value',
    addButton: 'Add new DICOM tag',
    removeButton: 'Remove',
    undoButton: 'Undo',
    undoPrompt: 'This DICOM tag will be removed upon saving changes',
    loading: 'Loading DICOM tags that are associated with this resource',
    keyHeader: 'Key',
    valueHeader: 'Value',
    optional: 'optional',
    keySuggestion: 'Custom DICOM tag key',
    valueSuggestion: 'Custom DICOM tag value',
    emptyTags: 'No DICOM tags associated with the resource.',
    tooManyKeysSuggestion: 'You have more keys than can be displayed',
    tooManyValuesSuggestion: 'You have more values than can be displayed',
    keysSuggestionLoading: 'Loading DICOM tag keys',
    keysSuggestionError: 'Tag keys could not be retrieved',
    valuesSuggestionLoading: 'Loading DICOM tag values',
    valuesSuggestionError: 'Tag values could not be retrieved',
    emptyKeyError: 'You must specify a DICOM tag key',
    maxKeyCharLengthError: 'The maximum number of characters you can use in a DICOM tag key is 128.',
    maxValueCharLengthError: 'The maximum number of characters you can use in a DICOM tag value is 256.',
    duplicateKeyError: 'You must specify a unique DICOM tag key.',
    invalidKeyError:
        'Invalid key. Keys can only contain Unicode letters, digits, white space and any of the following: _.:/=+@-',
    invalidValueError:
        'Invalid value. Values can only contain Unicode letters, digits, white space and any of the following: _.:/=+@-',
    awsPrefixError: 'Cannot start with aws:',
    tagLimit: (availableTags, tagLimit) =>
        availableTags === tagLimit
            ? 'You can add up to ' + tagLimit + ' DICOM tags.'
            : availableTags === 1
            ? 'You can add up to 1 more DICOM tag.'
            : 'You can add up to ' + availableTags + ' more DICOM tags.',
    tagLimitReached: (tagLimit) =>
        tagLimit === 1
            ? 'You have reached the limit of 1 DICOM tag.'
            : 'You have reached the limit of ' + tagLimit + ' DICOM tags.',
    tagLimitExceeded: (tagLimit) =>
        tagLimit === 1
            ? 'You have exceeded the limit of 1 DICOM tag.'
            : 'You have exceeded the limit of ' + tagLimit + ' DICOM tags.',
    enteredKeyLabel: (key) => 'Use "' + key + '"',
    enteredValueLabel: (value) => 'Use "' + value + '"',
};

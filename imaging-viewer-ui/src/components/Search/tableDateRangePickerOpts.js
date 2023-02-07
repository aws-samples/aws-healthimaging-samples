export const DATE_PICKER_I18N = {
    todayAriaLabel: 'Today',
    nextMonthAriaLabel: 'Next month',
    previousMonthAriaLabel: 'Previous month',
    customRelativeRangeDurationLabel: 'Duration',
    customRelativeRangeDurationPlaceholder: 'Enter duration',
    customRelativeRangeOptionLabel: 'Custom range',
    customRelativeRangeOptionDescription: 'Set a custom range in the past',
    customRelativeRangeUnitLabel: 'Unit of time',
    formatRelativeRange: (e) => {
        const t = 1 === e.amount ? e.unit : `${e.unit}s`;
        return `Last ${e.amount} ${t}`;
    },
    formatUnit: (e, t) => (1 === t ? e : `${e}s`),
    dateTimeConstraintText: 'Range must be between 6 and 30 days. Use 24 hour format.',
    relativeModeTitle: 'Relative range',
    absoluteModeTitle: 'Absolute range',
    relativeRangeSelectionHeading: 'Choose a range',
    startDateLabel: 'Start date',
    endDateLabel: 'End date',
    startTimeLabel: 'Start time',
    endTimeLabel: 'End time',
    clearButtonLabel: 'Clear and dismiss',
    cancelButtonLabel: 'Cancel',
    applyButtonLabel: 'Apply',
};

export const datePickerRelativeOptions = [
    {
        key: 'previous-1-day',
        amount: 1,
        unit: 'day',
        type: 'relative',
    },
    {
        key: 'previous-1-week',
        amount: 1,
        unit: 'week',
        type: 'relative',
    },
    {
        key: 'previous-1-month',
        amount: 1,
        unit: 'month',
        type: 'relative',
    },
    {
        key: 'previous-1-year',
        amount: 1,
        unit: 'year',
        type: 'relative',
    },
];

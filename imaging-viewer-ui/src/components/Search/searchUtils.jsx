// Utils
import dayjs from 'dayjs';

// Format searchParams for nativeSearch() - only 1 total supported as of 11/7/22
export function formatSearchParams(searchParams) {
    if (Object.keys(searchParams).length === 0) return {};
    // Return one-member filter array
    function filterEqual(key, value) {
        return {
            filters: [
                {
                    operator: 'EQUAL',
                    values: [
                        {
                            [key]: value,
                        },
                    ],
                },
            ],
        };
    }
    // Return two-member study date/study time filter
    function filterBetween(dateRangeData) {
        const start =
            dateRangeData.type === 'relative'
                ? dayjs().subtract(dateRangeData.amount, dateRangeData.unit)
                : dayjs(dateRangeData.startDate);
        const end = dateRangeData.type === 'relative' ? dayjs() : dayjs(dateRangeData.endDate);
        const dateFormat = 'YYYYMMDD';
        const timeFormat = 'HHmmss.000000';
        return {
            filters: [
                {
                    operator: 'BETWEEN',
                    values: [
                        {
                            DICOMStudyDateAndTime: {
                                DICOMStudyDate: start.format(dateFormat),
                                DICOMStudyTime: start.format(timeFormat),
                            },
                        },
                        {
                            DICOMStudyDateAndTime: {
                                DICOMStudyDate: end.format(dateFormat),
                                DICOMStudyTime: end.format(timeFormat),
                            },
                        },
                    ],
                },
            ],
        };
    }

    const searchKey = Object.keys(searchParams)[0];
    switch (searchKey) {
        case 'patientId':
            return filterEqual('DICOMPatientId', searchParams[searchKey]);
        case 'accessionNumber':
            return filterEqual('DICOMAccessionNumber', searchParams[searchKey]);
        case 'studyId':
            return filterEqual('DICOMStudyId', searchParams[searchKey]);
        case 'studyUid':
            return filterEqual('DICOMStudyInstanceUID', searchParams[searchKey]);
        case 'studyDate':
            return filterBetween(searchParams[searchKey]);
        default:
            return {};
    }
}
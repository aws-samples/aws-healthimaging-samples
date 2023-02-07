import dayjs from 'dayjs';

export const columnDefs = [
    {
        id: 'DICOMPatientId',
        header: 'Patient ID',
        cell: (e) => e.DICOMPatientId,
        sortingField: 'DICOMPatientId',
    },
    {
        id: 'DICOMPatientName',
        header: 'Patient Name',
        cell: (e) => e.DICOMPatientName,
        sortingField: 'DICOMPatientName',
    },
    {
        id: 'DICOMStudyDate',
        header: 'Study Date',
        cell: (e) => dayjs(e.DICOMStudyDate + e.DICOMStudyTime).format('YYYY-MM-DD hh:mm A'),
        sortingField: 'DICOMStudyDate',
    },
    {
        id: 'DICOMAccessionNumber',
        header: 'Accession Number',
        cell: (e) => e.DICOMAccessionNumber,
        sortingField: 'DICOMAccessionNumber',
    },
    {
        id: 'DICOMStudyDescription',
        header: 'Study Description',
        cell: (e) => e.DICOMStudyDescription,
        sortingField: 'DICOMStudyDescription',
    },
    {
        id: 'DICOMStudyId',
        header: 'Study ID',
        cell: (e) => e.DICOMStudyId,
        sortingField: 'DICOMStudyId',
    },
    {
        id: 'DICOMStudyInstanceUID',
        header: 'Study Instance UID',
        cell: (e) => e.DICOMStudyInstanceUID,
        sortingField: 'DICOMStudyInstanceUID',
    },
    // objects below here are not shown by default
    {
        id: 'imageSetId',
        header: 'ImageSet ID',
        cell: (e) => e.imageSetId,
        sortingField: 'imageSetId',
    },
    {
        id: 'DICOMNumberOfStudyRelatedInstances',
        header: 'Related Instances',
        cell: (e) => e.DICOMNumberOfStudyRelatedInstances,
        sortingField: 'DICOMNumberOfStudyRelatedInstances',
    },
    {
        id: 'DICOMNumberOfStudyRelatedSeries',
        header: 'Related Series',
        cell: (e) => e.DICOMNumberOfStudyRelatedSeries,
        sortingField: 'DICOMNumberOfStudyRelatedSeries',
    },
    {
        id: 'DICOMPatientSex',
        header: 'Patient Sex',
        cell: (e) => e.DICOMPatientSex,
        sortingField: 'DICOMPatientSex',
    },
    {
        id: 'DICOMPatientBirthDate',
        header: 'Patient Birthdate',
        cell: (e) => e.DICOMPatientBirthDate,
        sortingField: 'DICOMPatientBirthDate',
    },
    {
        id: 'creationDate',
        header: 'Created At',
        cell: (e) => dayjs(e.creationDate).format('YYYY-MM-DD hh:mm A'),
        sortingField: 'creationDate',
    },
    {
        id: 'lastUpdatedDate',
        header: 'Updated At',
        cell: (e) => dayjs(e.lastUpdatedDate).format('YYYY-MM-DD hh:mm A'),
        sortingField: 'lastUpdatedDate',
    },
    {
        id: 'version',
        header: 'Version',
        cell: (e) => e.version,
        sortingField: 'version',
    },
];

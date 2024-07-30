SearchForstudiesTags = {
    "00080020": "StudyDate",
    "00080030": "StudyTime",
    "00080050": "AccessionNumber",
    "00081030": "StudyDescription",         #Not in the Standard but we should be able to support it.
    "00080061": "ModalitiesInStudy",
    "00080090": "ReferringPhysicianName",
    "00100020": "PatientID",
    "00100030": "PatientBirthDate",
    "00100010": "PatientName",
    "00100040": "PatientSex",
    "0020000D": "StudyInstanceUID",
    "00200010": "StudyID",
}

SearchForSeriesTags = {
    "00080060": "Modality",
    "0020000D": "StudyInstanceUID",
    "0020000E": "SeriesInstanceUID",
    "00200011": "SeriesNumber",
    "00400244": "PerformedProcedureStepStartDate",
    "00400245": "PerformedProcedureStepStartTime",
    "00400275": "RequestAttributesSequence",
    "00400009": "ScheduledProcedureStepID",
    "00401001": "RequestedProcedureID",
}

SearchForInstancesTags = {
    "00080060": "Modality",
    "00080016": "SOPClassUID",
    "00080018": "SOPInstanceUID",
    "00200013": "InstanceNumber",
}
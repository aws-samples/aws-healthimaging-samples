tables = {
    "study_table" : "study",
    "patient_table" : "patient",
    "series_table" : "series",
    "instance_table" : "instance"   
}

table_unique_keys = {
    "study_table" : "study_pkey",
    "patient_table" : "patient_pkey",
    "series_table" : "series_pkey",
    "instance_table" : "instance_pkey"
}

# patientTagsfields = {
#     "00100030" : "patientbirthdate", # Patient's Birth Date
#     "00100040" : "patientsex", # Patient's sex
#     "00100010" : "patientname", # Patient's Name
#     "00100020" : "patientid", # Patient ID
# }

studyTagsTofields = {
    # Study
        "00100030" : "patientbirthdate", # Patient's Birth Date
        "00100040" : "patientsex", # Patient's sex
        "00100010" : "patientname", # Patient's Name
        "00100020" : "patientid", # Patient ID
        "00100021" : "issuerofpatientid", # Issuer of patient ID
        "00080005" : "d00080005", # Specific Character Set
        "00080020" : "studydate", # Study Date  
        "00080030" : "studytime", # Study Time
        "00080050" : "accessionnumber", # Accession Number
        #"00080056" : "d00080056", # Instance Availability
        "00080061" : "modalitiesinstudy", # Modalities in Study
        "00080090" : "referringphysicianname", # Referring Physician's Name
        "00081030" : "studydescription", # Study Description
        #"00080201" : "d00080201", # Timezone Offset From UTC
        #"00081190" : "d00081190", # Retrieve URL
        "0020000D" : "studyinstanceuid", # Study Instance UID
        "00200010" : "studyid", # Study ID
        "00201206" : "numberofstudyrelatedseries", # Number of Study Related Series
        "00201208" : "numberofstudyrelatedinstances", # Number of Study Related Instances
        "00200010" : "StudyID",

}

seriesTagsTofields = {
    # Series
        "00080060" : "modality", # Modality
        "0020000D" : "studyinstanceuid",
        "00080201" : "d00080201", # Timezone Offset From UTC
        "00080021" : "seriesdate", # Series Date
        "0008103E" : "seriesdescription", # Series Description
        "00081190" : "d00081190", # Retrieve URL
        "0020000E" : "seriesinstanceuid", # Series Instance UID
        "00200011" : "seriesnumber", # Series Number
        "00201209" : "numberofseriesrelatedinstances", # Number of Series Related Instances
        "00400244" : "performedprocedurestepstartdate", # Performed Procedure Step Start Date
        "00400245" : "performedprocedurestepstarttime", # Performed Procedure Step Start Time
        "00400275" : "d00400275", # Request Attributes Sequence
        "00400009" : "d00400009", # Scheduled Procedure Step ID
        "00401001" : "d00401001", # Requested Procedure ID
        "00180015" : "bodypartexamined"
}

instanceTagsTofields = {
    # Instance
        "00080060" : "modality", # Modality
        "00080016" : "sopclassuid", # SOP Class UID
        "00080018" : "sopinstanceuid", # SOP Instance UID
        "00080056" : "d00080056", # Instance Availability
        "00080201" : "d00080201", # Timezone Offset From UTC
        "00081190" : "d00081190", # Retrieve URL
        "00200013" : "instancenumber", # Instance Number
        "00280010" : "rows", # Rows
        "00280011" : "columns", # Columns
        "00280100" : "bitallocated", # Bits Allocated
        "00280008" : "numberOfframes", # Number of Frames
}
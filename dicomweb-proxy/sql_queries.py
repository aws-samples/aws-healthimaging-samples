WADO_STUDY = "SELECT * FROM Instancelocation WHERE instanceid IN (SELECT instanceid FROM Instance WHERE seriesid IN (SELECT seriesid FROM Series WHERE studyid IN (SELECT studyid FROM Study WHERE d0020000d = %s)))"
WADO_SERIES = "SELECT * FROM Instancelocation WHERE instanceid IN (SELECT instanceid FROM Instance WHERE seriesid IN (SELECT seriesid FROM Series WHERE d0020000e = %s))"
WADO_INSTANCE = "SELECT * FROM Instancelocation INNER JOIN Instance ON Instancelocation.instanceid = Instance.instanceid  WHERE Instancelocation.instanceid IN (SELECT instanceid FROM Instance WHERE d00080018 = %s)"

WADO_METADTA_STUDY = "SELECT metadata, metadataendoffset FROM Instancemetadata WHERE instanceid IN (SELECT instanceid FROM Instance WHERE seriesid IN (SELECT seriesid FROM Series WHERE studyid IN (SELECT studyid FROM Study WHERE d0020000d = %s)))"
WADO_METADATA_SERIES = "SELECT metadata, metadataendoffset FROM Instancemetadata WHERE instanceid IN (SELECT instanceid FROM Instance WHERE seriesid IN (SELECT seriesid FROM Series WHERE d0020000e = %s))"
WADO_METDATA_INSTANCE = "SELECT metadata, metadataendoffset FROM Instancemetadata INNER JOIN Instance ON Instancelocation.instanceid = Instance.instanceid  WHERE Instancelocation.instanceid IN (SELECT instanceid FROM Instance WHERE d00080018 = %s)"

WADO_STUDIES_METADATA = "SELECT i.datastoreid , i.imagesetid from imageset i INNER JOIN series se on i.series_pkey = se.series_pkey INNER JOIN study on se.study_pkey = study.study_pkey WHERE study.studyinstanceuid = %s"
WADO_SERIES_METADATA = "SELECT i.datastoreid , i.imagesetid from imageset i, series s where  s.seriesinstanceuid  = %s and s.series_pkey = i.series_pkey order by i.imageset_pkey "
WADO_INSTANCE_METADATA = "SELECT distinct i.datastoreid , i.imagesetid from imageset i INNER JOIN instance on i.series_pkey = instance.series_pkey and instance.SOPInstanceUID = %s "


WADO_INSTANCE_IN_SERIES = "select i.sopinstanceuid from instance i , series s where i.series_pkey = s.series_pkey and s.seriesinstanceuid = %s"

QIDO_STUDY =    {
        'select' : "SELECT study.*, group_concat(distinct modality separator '/') as modalitiesinstudy, issuer.issuerofpatientid, patient.patientname , patient.patientid , patient.patientsex, patient.patientbirthdate FROM issuer, study , patient , series",
        'where' : " WHERE study.patient_pkey = patient.patient_pkey and series.study_pkey = study.study_pkey and issuer.issuer_pkey = patient.issuer_pkey ",
        'group_by' : " group by study.study_pkey ",
        'having' : "",
        'order_by' : ''
}
      

IMAGESET_PER_SERIES = "SELECT datastoreid , imagesetid FROM imageset INNER JOIN series on series.series_pkey = imageset.series_pkey WHERE series.seriesinstanceuid = %s ORDER BY imageset_pkey DESC"
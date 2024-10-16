patient_table_columns = [
  {
    "Name": "patientid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "issuerofpatientid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientbirthdate",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientsex",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientname",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "datastoreid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "imagesetid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientsize",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientbodymassindex",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "updatedat",
    "Type": "timestamp",
    "Comment": ""
  },
  {
    "Name": "year",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (0)"
  },
  {
    "Name": "month",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (1)"
  },
  {
    "Name": "day",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (2)"
  }
]

study_table_columns =[
  {
    "Name": "studyinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "studydate",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "studydescription",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "studytime",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "modalitiesinstudy",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "accessionnumber",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "studyid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "referringphysicianname",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "datastoreid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "imagesetid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientage",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "issuerofpatientid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "reasonforvisit",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientstate",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "updatedat",
    "Type": "timestamp",
    "Comment": ""
  },
  {
    "Name": "year",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (0)"
  },
  {
    "Name": "month",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (1)"
  },
  {
    "Name": "day",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (2)"
  }
]

series_table_columns =  [
  {
    "Name": "datastoreid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "imagesetid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "studyinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "seriesinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "patientposition",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "modality",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "softwareversions",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "institutionname",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "manufacturermodelname",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "deviceserialnumber",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "seriesdescription",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "positionreferenceindicator",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "stationname",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "pixelpaddingvalue",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "spatialresolution",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "seriesdate",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "seriesnumber",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "frameofreferenceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "laterality",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "seriestime",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "dateoflastcalibration",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "bodypartexamined",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "updatedat",
    "Type": "timestamp",
    "Comment": ""
  },
  {
    "Name": "year",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (0)"
  },
  {
    "Name": "month",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (1)"
  },
  {
    "Name": "day",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (2)"
  }
]

instance_table_columns = [
  {
    "Name": "datastoreid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "imagesetid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "instancenumber",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "seriesinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "instanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "specificcharacterset",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "windowwidth",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "slicelocation",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "imagetype",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "bitsallocated",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "imageorientationpatient",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "referencedframeofreferenceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "mediastoragesopclassuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "exposuretime",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "contentdate",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "sopinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "sopclassuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "rotationdirection",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "highbit",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "storagemediafilesetuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "implementationversionname",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "reconstructiondiameter",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "acquisitionnumber",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "exposure",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "acquisitiontime",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "contrastbolusagent",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "filtertype",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "spiralpitchfactor",
    "Type": "float",
    "Comment": ""
  },
  {
    "Name": "singlecollimationwidth",
    "Type": "float",
    "Comment": ""
  },
  {
    "Name": "windowcenter",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "rescaleslope",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "scanoptions",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "distancesourcetopatient",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "totalcollimationwidth",
    "Type": "float",
    "Comment": ""
  },
  {
    "Name": "tablespeed",
    "Type": "float",
    "Comment": ""
  },
  {
    "Name": "kvp",
    "Type": "float",
    "Comment": ""
  },
  {
    "Name": "samplesperpixel",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "gantrydetectortilt",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "bitsstored",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "pixelrepresentation",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "datacollectiondiameter",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "focalspots",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "filemetainformationversion",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "synchronizationframeofreferenceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "implementationclassuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "photometricinterpretation",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "mediastoragesopinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "acquisitiondate",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "distancesourcetodetector",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "referencedsopinstanceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "xraytubecurrent",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "rows",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "contrastbolusroute",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "transfersyntaxuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "relatedframeofreferenceuid",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "columns",
    "Type": "int",
    "Comment": ""
  },
  {
    "Name": "rescaleintercept",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "imagepositionpatient",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "contenttime",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "convolutionkernel",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "generatorpower",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "revolutiontime",
    "Type": "float",
    "Comment": ""
  },
  {
    "Name": "tableheight",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "slicethickness",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "pixelspacing",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "rescaletype",
    "Type": "string",
    "Comment": ""
  },
  {
    "Name": "updatedat",
    "Type": "timestamp",
    "Comment": ""
  },
  {
    "Name": "year",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (0)"
  },
  {
    "Name": "month",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (1)"
  },
  {
    "Name": "day",
    "Type": "string",
    "Comment": "",
    "PartitionKey": "Partition (2)"
  }
]
import json
from pydicom.tag import Tag 
from pydicom.datadict import dictionary_VR

class PrepareSQL(object):
    DICOMIdentifierTags = [ 
                   
            Tag(0x00080012),
        	Tag(0x00080008),
        	Tag(0x00080013),
        	Tag(0x00080016),
        	Tag(0x00080018),
        	Tag(0x00200013),
        	Tag(0x00200037),
        	Tag(0x00200032),
        	Tag(0x00080032),
        	Tag(0x00080022),
        	Tag(0x00080023),
        	Tag(0x00082218),
        	Tag(0x00200012),
        	Tag(0x00200020),
        	Tag(0x00204000),
        	Tag(0x00080301),
        	Tag(0x00280302),
        	Tag(0x20500020),
        	Tag(0x00880200),
			Tag(0x00280002),
			Tag(0x00280004),
			Tag(0x00280010),
			Tag(0x00280011),
			Tag(0x00280100),
			Tag(0x00280102),
			Tag(0x00280103),
			Tag(0x00281052),
			Tag(0x00281053),
        	Tag(0x0020000e),
        	Tag(0x00080031),
        	Tag(0x00080021),
        	Tag(0x0008103e),
        	Tag(0x0008103f),
        	Tag(0x00200011),
        	Tag(0x00080015),
        	Tag(0x00080060),
        	Tag(0x00081050),
        	Tag(0x00081052),
        	Tag(0x00102210),
        	Tag(0x00180015),
        	Tag(0x00181030),
        	Tag(0x00185100),
        	Tag(0x0020000d),
        	Tag(0x00080061),
        	Tag(0x00080050),
        	Tag(0x00081060),
        	Tag(0x00080020),
        	Tag(0x00080030),
        	Tag(0x00080090),
        	Tag(0x0008009C),
        	Tag(0x00081030),
        	Tag(0x00080005),
        	Tag(0x00080051),
        	Tag(0x00081032),
        	Tag(0x00321033),
        	Tag(0x00100010),
        	Tag(0x00100020),
        	Tag(0x00100021),	
        	Tag(0x00100030),	
        	Tag(0x00100040)
			]


def PrepInsertInstance(dset):
	tempvalarray = []
	for x in range( len(PrepareSQL.DICOMIdentifierTags)):
		if PrepareSQL.DICOMIdentifierTags[x] in dset:
			tempval= str(dset[PrepareSQL.DICOMIdentifierTags[x]].value)
			tempval= tempval[0:254]
		else:
			tempval = None
		tempvalarray.append(tempval)
	return tempvalarray
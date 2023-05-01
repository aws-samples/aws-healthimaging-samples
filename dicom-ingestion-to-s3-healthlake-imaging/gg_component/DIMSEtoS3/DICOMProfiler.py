from pydicom import *
from pydicom.tag import Tag
from pydicom.filewriter import correct_ambiguous_vr
import logging

class DICOMProfiler(object):
    DICOMIdentifierTags = [   
                    Tag(0x0020000D),    # Study Instance UID
                    Tag(0x00080018),    # SOP Instance UID
                    Tag(0x0020000E),    # Series Instance UID
                    Tag(0x00200011),    # Series Number                           
                    Tag(0x00080050),    # Accession Number  
                    Tag(0x00080051),    # Issuer of Accession Number Sequence                   
                    Tag(0x00080060),    # Study modality
                    Tag(0x00080090),    # Referring Physician Name   
                    Tag(0x00080096),    # Referring Physician Identification Sequence 
                    Tag(0x0008009C),    # Consulting Physician's Name    
                    Tag(0x0008009D),    # Consulting Physician Identification Sequence 
                    Tag(0x00081048),    # Physician(s) of Record     
                    Tag(0x00081049),    # Physician(s) of Record Identification Sequence
                    Tag(0x00081060),    # Name of Physician(s) Reading Study  
                    Tag(0x00081062),    # Name of Physician(s) Reading Study Sequence
                    Tag(0x00080061),    # Modalities in Study.
                    Tag(0x00100010),    # Patient Name
                    Tag(0x00100020),    # Patient ID
                    Tag(0x00100021),    # Issuer of Patient ID
                    Tag(0x00100024),    # Issuer of Patient ID Qualifiers Sequence
                    Tag(0x00100030),    # Patient Birth Date 
                    Tag(0x00100032),    # Patient Birth Time 
                    Tag(0x00100033),    # Date of birth of the named Patient in the Alternative Calendar (0010,0035).
                    Tag(0x00100034),    # Date of death of the named Patient in the Alternative Calendar (0010,0035).
                    Tag(0x00100035),    # The Alternative Calendar used for Patient's Birth Date in Alternative Calendar (0010,0033) and Patient's Death Date in Alternative Calendar (0010,0034).
                    Tag(0x00100040),    # Sex of the named Patient.
                    Tag(0x00100050),	# Patient's Insurance Plan Code Sequence
                    Tag(0x00101001),    # Other Patient Names
                    Tag(0x00101002),    # Other Patient ID sequence
                    Tag(0x00101005),    # Patient's Birth Name
                    Tag(0x00101040),    # Patient's Address
                    Tag(0x00101050),    # Patient's Insurance Plan Code Sequence
                    Tag(0x00102150),    # Patient's Country of Residence
                    Tag(0x00102152),    # Patient's Region of Residence
                    Tag(0x00102154),    # Patient's Phone numbers      
                    Tag(0x00102155),	# Patient's Telecom Information              
                    Tag(0x00102297),    # Name of person with medical or welfare decision making authority for the Patient.    
                    Tag(0x00104000),    # Patient comments.          
                    Tag(0x00080020),    # Study Date
                    Tag(0x00080030),    # Study Time                   
                    Tag(0x00080032)     # Study Acquistion Time                   
                ]

    @staticmethod
    def BuildIdentifierObject(DCMObj: Dataset):
        DCMObj = correct_ambiguous_vr( DCMObj , True)
        try:
            for t in DCMObj:
                if not t.tag in DICOMProfiler.DICOMIdentifierTags:
                    del DCMObj[t.tag]
            return DCMObj
        except BaseException as err:
            logging.error("[DICOMProfiler][BuildIdentifierObject] - "+str(err))
            return None

    def GetFullHeader(DCMObj: Dataset):
        try:
            DCMObj = correct_ambiguous_vr( DCMObj , True) 
            DCMObj.remove_private_tags()
            del DCMObj[0x7fe00010]
            return DCMObj
        except BaseException as err:
            logging.error("[DICOMProfiler][BuildIdentifierObject] - "+str(err))
            return None        
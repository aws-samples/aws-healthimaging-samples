import json
from json import JSONEncoder




class dicomStudy:
    d0020000D = ""
    series = []

    def __init__(self, d0020000D):
        self.d0020000D = d0020000D
        self.series = []
    
    def addSeries( self, seriesObj ):
        self.series.append(seriesObj)


class dicomSeries:
    d0020000E = ""
    SOPs = []

    def __init__(self, d0020000E):
        self.d0020000E = d0020000E
        self.SOPs = []


    def addInstance( self, instance ):
        self.SOPs.append(instance)   


class dicomInstance:
    d00080018 = ""

    def __init__(self, d00080018):
        self.d00080018 = d00080018


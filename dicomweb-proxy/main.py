"""
wado service entrypoint. Contains the business logic to configure the service per the env variables

SPDX-License-Identifier: Apache 2.0
"""
import numpy
from PIL import Image
import array
import boto3
import botocore
import pydicom
from pydicom import Dataset , DataElement , uid 
from waitress import serve
from flask import Flask, request, Response
from flask_cors import CORS
import logging
import mysqlConnectionFactory
import datetime
import os
import sql_queries
from db_mappings import *
from qido_search_tags import *
from uuid import uuid4
import gzip
from openjpeg import decode
import io
from InstanceDICOMizer import InstanceDICOMizer
from pydicom import config
config.settings.reading_validation_mode = config.RAISE
import concurrent.futures
from concurrent.futures import wait
import orjson
from metadataCache import metadataCache
from werkzeug.serving import WSGIRequestHandler
from frameFetcher import frameFetcher
from cacheCleaner import cacheCleaner
import multiprocessing

app = Flask(__name__)
cors = CORS(app)
sql_pool = None
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        res = Response()
        #res.headers['X-Content-Type-Options'] = '*'
        return res
    
### Health Check endpoint ###
@app.route("/", methods=["GET" , "OPTIONS"])
@app.route("/aetitle/health", methods=["GET" , "OPTIONS"])
def healthcheck():
    httpstatus = 200
    mimetype = "text/html"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps("OK"), mimetype=mimetype , content_type=contentType )
    return http_response   

### QIDO ENDPOINTS ###
@app.route("/aetitle/studies", methods=["GET" , "OPTIONS"])
def SearchForStudies():
    parameters = _processParameters(level="STUDY")
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )
    return http_response

#resource Study's Series
@app.route("/aetitle/studies/<studyInstanceUID>/series", methods=["GET" , "OPTIONS"])
def SearchForStudySeries(studyInstanceUID : str):
    parameters = _processParameters(level="STUDY.SERIES")
    parameters["StudyInstanceUID"] = studyInstanceUID
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )
    return http_response

#Study's Instances
@app.route("/aetitle/studies/<studyInstanceUID>/instances", methods=["GET" , "OPTIONS"])
def SearchForStudyInstances(studyInstanceUID: str):
    parameters = _processParameters(level="STUDY.INSTANCE")
    parameters["StudyInstanceUID"] = studyInstanceUID
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )
    return http_response

#All Series
@app.route("/aetitle/series", methods=["GET" , "OPTIONS"])
def SearchForSeries():
    parameters = _processParameters(level="SERIES")
    logging.debug(parameters)
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )
    return http_response

#Study's Series' Instances
@app.route("/aetitle/studies/<studyInstanceUID>/series/<seriesInstanceUID>/instances", methods=["GET" , "OPTIONS"])
def SearchForStudySeriesInstances(studyInstanceUID: str, seriesInstanceUID: str):
    parameters = _processParameters(level="STUDY.SERIES.INSTANCE")
    parameters["StudyInstanceUID"] = studyInstanceUID
    parameters["SeriesInstanceUID"] = seriesInstanceUID
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    logging.debug(field_names)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )
    return http_response

#All Instances
@app.route("/aetitle/instances", methods=["GET" , "OPTIONS"])
def SearchForInstances():
    parameters = _processParameters(level="INSTANCE")
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )

### WADO ENDPOINTS ###
@app.route('/aetitle/studies/<StudyInstanceUID>', methods=['GET' , 'OPTIONS'])
def RetrieveStudies(StudyInstanceUID : str):
    logging.debug(request)
    parameters = _processParameters(level="STUDY")
    parameters["StudyInstanceUID"] = StudyInstanceUID
    parameters["wherefields"]["0020000D"] = StudyInstanceUID
    query , query_parameters = _constructQuery(parameters)
    field_names, db_results = _executeQuery(query , query_parameters)
    resp = _convertToJSON(field_names , db_results , parameters)
    httpstatus = 200
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = httpstatus , response=orjson.dumps(resp), mimetype=mimetype , content_type=contentType )
    return http_response
    


@app.route('/aetitle/studies/<StudyInstanceUID>/metadata', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesMetadata(StudyInstanceUID : str):
    metadata=RetrieveMetadata(sql_queries.WADO_STUDIES_METADATA , StudyInstanceUID)
    if len(metadata) > 0:
        http_code = 200
    else:
        http_code = 400
    mimetype = "text/json"
    contentType = "application/dicom+json"
    if 'gzip' in request.headers.get('Accept-Encoding','').lower():
        logging.debug("response will be gzipped")
        content = gzip.compress(orjson.dumps(metadata),5)
        http_response = Response(status = http_code , response=content, mimetype=mimetype , content_type=contentType )
        http_response.headers['Content-length'] = len(content)
        http_response.headers['Content-Encoding'] = 'gzip'
    else:
        http_response = Response(status = http_code , response=orjson.dumps(metadata), mimetype=mimetype , content_type=contentType )
    return http_response

@app.route('/aetitle/studies/<StudyInstanceUID>/rendered', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesRendered(StudyInstanceUID : str):
    pass

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeries(StudyInstanceUID : str , SeriesInstanceUID : str):
    # get the image sets 
    sql_conn = sql_pool.get_connection()
    cursor = sql_conn.cursor()
    cursor.execute(sql_queries.WADO_INSTANCE_IN_SERIES , [SeriesInstanceUID])
    results = cursor.fetchall()
    cursor.close()
    sql_conn.close()
    resp_boundary = multipart_boundary()
    return instancesYield(results, resp_boundary) , { "Content-Type" : "multipart/related; type=\"application/dicom\"; boundary="+resp_boundary }

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/rendered', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeriesRendered(StudyInstanceUID : str , SeriesInstanceUID : str):
    pass

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/metadata', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeriesMetadata(StudyInstanceUID : str , SeriesInstanceUID : str):
    metadata=RetrieveMetadata(sql_queries.WADO_SERIES_METADATA , SeriesInstanceUID)
    if len(metadata) > 0:
        http_code = 200
    else:
        http_code = 400
    mimetype = "text/json"
    contentType = "application/dicom+json"

    if 'gzip' in request.headers.get('Accept-Encoding','').lower():
        logging.debug("response will be gzipped")
        content = gzip.compress(orjson.dumps(metadata),5)
        http_response = Response(status = http_code , response=content, mimetype=mimetype , content_type=contentType )
        http_response.headers['Content-length'] = len(content)
        http_response.headers['Content-Encoding'] = 'gzip'
    else:
        http_response = Response(status = http_code , response=orjson.dumps(metadata), mimetype=mimetype , content_type=contentType )
    return http_response

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/instances/<InstanceUID>', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeriesInstance(StudyInstanceUID : str , SeriesInstanceUID : str , InstanceUID : str):
    import uuid
    request_id = str(uuid.uuid4())
    resp_boundary = multipart_boundary()
    return instancesYield([[InstanceUID]] , resp_boundary) , { "Content-Type" : "multipart/related; type=\"application/dicom\"; boundary="+resp_boundary }

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/instances/<InstanceUID>/rendered', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeriesInstanceRendered(StudyInstanceUID : str , SeriesInstanceUID : str , InstanceUID : str):
    sql_conn = sql_pool.get_connection()
    cursor = sql_conn.cursor()
    cursor.execute(sql_queries.WADO_INSTANCE_METADATA , (InstanceUID,))
    results = cursor.fetchall()
    cursor.close()
    sql_conn.close()

    for res in results:
        datastore_id = res[0]
        imageset_id = res[1] 
        metadata = metadatacache.getMetadata(datastore_id=datastore_id , imageset_id=imageset_id)
        assignToCache(metadata=metadata)
        series_uid = next(iter(metadata["Study"]["Series"].keys()))
        if InstanceUID in metadata["Study"]["Series"][series_uid]["Instances"].keys():
            insDICOMizer = InstanceDICOMizer(ahi_client=ahi_client)
            insDICOMizer.getFramePixels = getFramePixels
            ds = insDICOMizer.DICOMize(InstanceUID, metadata ,first_frame_only=True )

    mimetype = "image/jpeg"
    contentType = "image/jpeg"
    http_code = 200
    new_image = ds.pixel_array.astype(float)
    scaled_image = (numpy.maximum(new_image, 0) / new_image.max()) * 255.0
    scaled_image = numpy.uint8(scaled_image)
    final_image = Image.fromarray(scaled_image)
    img_byte_arr = io.BytesIO()
    final_image.save(img_byte_arr , "JPEG")
    http_response = Response(status = http_code , response=img_byte_arr.getvalue(), mimetype=mimetype , content_type=contentType )
    return http_response

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/instances/<InstanceUID>/metadata', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeriesInstanceMetadata(StudyInstanceUID : str , SeriesInstanceUID : str , InstanceUID : str):
    metadata=RetrieveMetadata(sql_queries.WADO_INSTANCE_METADATA , InstanceUID)
    if len(metadata) > 0:
        http_code = 200
    else:
        http_code = 400
    mimetype = "text/json"
    contentType = "application/dicom+json"

    if 'gzip' in request.headers.get('Accept-Encoding','').lower():
        logging.debug("response will be gzipped")
        content = gzip.compress(orjson.dumps(metadata),5)
        http_response = Response(status = http_code , response=content, mimetype=mimetype , content_type=contentType )
        http_response.headers['Content-length'] = len(content)
        http_response.headers['Content-Encoding'] = 'gzip'
    else:
        http_response = Response(status = http_code , response=orjson.dumps(metadata), mimetype=mimetype , content_type=contentType )
    return http_response

@app.route('/aetitle/studies/<StudyInstanceUID>/series/<SeriesInstanceUID>/instances/<InstanceUID>/frames/<Frames>', methods=['GET' , 'OPTIONS'])
def RetrieveStudiesSeriesInstanceFrame(StudyInstanceUID : str , SeriesInstanceUID : str , InstanceUID : str , Frames : str):

    frame_list = []
    frame_list = [int(i) for i in Frames.split(",")]
    frame_list = _RetrievePixelData(sql_queries.WADO_INSTANCE_METADATA , SeriesInstanceUID , InstanceUID , frame_list)
    mimetype = "multipart/related"
    contentType = 'multipart/related; type="application/octet-stream"; boundary=KOIN'
    if 'gzip' in request.headers.get('Accept-Encoding','').lower():    
        logging.debug("response will be gzipped")
        content = gzip.compress(frame_list, 5)
        http_response = Response(status = 200 , response=content, mimetype=mimetype , content_type=contentType )
        http_response.headers['Content-length'] = len(content)
        http_response.headers['Content-Encoding'] = 'gzip'
    else:
        http_response = Response(status = 200 , response=frame_list, mimetype=mimetype , content_type=contentType )
    return http_response

@app.route('/aetitle/<BulkDataURIReference>', methods=['GET' , 'OPTIONS'])
def RetrieveBulkDataURIReference(BulkDataURIReference : str):
    mimetype = "text/json"
    contentType = "application/dicom+json"
    http_response = Response(status = 200 , response="", mimetype=mimetype , content_type=contentType )
    return http_response


def _executeQuery(query : str , query_parameters : array):
    sql_conn = sql_pool.get_connection()
    cursor = sql_conn.cursor()
    cursor.execute("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED")
    cursor.execute(query, query_parameters)
    db_results = cursor.fetchall()
    field_names = [i[0] for i in cursor.description]
    sql_conn.commit()
    cursor.execute("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ")
    cursor.close()
    sql_conn.close()
    return field_names , db_results

def instancesYield(results, boundary):
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
        futures = []
        for res in results:
            InstanceUID = res[0]  
            futures.append(executor.submit(RetrieveInstance, sql_queries.WADO_INSTANCE_METADATA , InstanceUID))
        wait(futures)
        for future in concurrent.futures.as_completed(futures):  
            yield( multipartEncapsulate(boundary=boundary, content_type= "application/dicom" , payload=future.result() ))
        yield(bytes("--"+boundary+"--", 'utf-8'))

def _convertToJSON(column_index , db_results , params: dict):
    level = params["queryLevel"]
    json_array = []
    match level:
        case "STUDY":
            tagDict = studyTagsTofields
        case "SERIES":
            tagDict = seriesTagsTofields
        case "INSTANCE":
            tagDict = instanceTagsTofields
        case "STUDY.SERIES":
            tagDict = seriesTagsTofields
        case "STUDY.INSTANCE":
            tagDict = instanceTagsTofields
        case "STUDY.SERIES.INSTANCE":
            tagDict = instanceTagsTofields

    for result in db_results:
        ds = Dataset()
        for tag in tagDict:
            try:
                index = column_index.index(tagDict[tag].lower())
                tagvalue = _serializeValue(result[index])
                if ( pydicom.datadict.dictionary_VR(tag) == "CS" ) and ( "/" in tagvalue):
                    tagvalue = tagvalue.split("/")
                ds.add(DataElement(tag, pydicom.datadict.dictionary_VR(tag) , tagvalue))
            except BaseException as err:
                pass

        for tag in params["includefield"]:
            try:
                index = column_index.index(tagDict[tag].lower())
                tagvalue = _serializeValue(result[index])
                ds.add(DataElement(tag, pydicom.datadict.dictionary_VR(tag) , tagvalue))
            except BaseException as err:
                pass
        #tag = "00081190"
        #ds.add(DataElement(tag, pydicom.datadict.dictionary_VR(tag) , "http://10.10.34.42:8080/aetitle/studies/1.2.840.113619.2.30.1.1762295590.1623.978668949.886"))
        json_array.append(ds.to_json_dict())


    return json_array

def _serializeValue(obj : any):
    if isinstance(obj, datetime.date):
        return obj.strftime('%Y%m%d')
    if isinstance(obj , datetime.timedelta):
        return obj.strftime('%H%M%S.%f')
    return obj

def _processParameters(level : str):

    bypassOtherIncludeFields = False
    returnfields = []
    wherefields = {}
    havingfields = {}
    orderbyfields = []
    query_offset = 0
    query_limit = 0
    for arg in request.args:
        logging.info(f"Query parameter {arg} = {request.args.get(arg)}")
        arg_value = request.args.get(arg)
        match arg:
            case "includefield":
                if  arg_value == "all":
                        bypassOtherIncludeFields = True
                        returnfields.clear()
                        returnfields[0] = "*"
                else:
                    if bypassOtherIncludeFields == False:
                        if "," in arg_value:
                             for field  in arg_value.split(","):
                                returnfields.append(field)
                        else:
                            returnfields.append(arg_value)
            case "fuzzyMatching":
                pass
            case "limit":
                query_limit = arg_value
            case "offset":
                query_offset = arg_value
            case "orderby":
                orderbyfields.append(arg_value)
            case other :
                match level:
                    case "STUDY":
                        tagDict = SearchForstudiesTags
                    case "SERIES":
                        tagDict = ({**SearchForstudiesTags, **SearchForSeriesTags})
                    case "INSTANCE":
                        tagDict = SearchForInstancesTags
                    case "STUDY.SERIES":
                        tagDict = SearchForSeriesTags
                    case "STUDY.INSTANCE":
                        tagDict = SearchForInstancesTags
                    case "STUDY.SERIES.INSTANCE":
                        tagDict = SearchForInstancesTags
                if arg in tagDict:     # If the parameter provided is the DICOM tag
                    wherefields[arg] = arg_value
                if arg in tagDict.values():     # If the parameter provided is the Normalized tag
                    for key, value in tagDict.items():
                        if arg == value:
                            wherefields[key] = arg_value
                            continue
    if "00080061" in wherefields.keys():
        havingfields["00080061"] = wherefields["00080061"]
        del wherefields["00080061"]
    return_obj = {
        "queryLevel": level,
        "limit": query_limit,
        "offset": query_offset,
        "includefield": returnfields,
        "wherefields": wherefields,
        "havingfields" : havingfields,
        "orderbyfields": orderbyfields 
    }
    return  return_obj

def _constructQuery(params : dict):
    level = params["queryLevel"]
    sql_where_params = [] # used to store the query params, the filter value and if the operator will be = or LIKE
    having_parameters = []
    query_parameters = [] # used to store the query params, this will be used to call the parametrized query with mysql.connector

    group_by = ""
    match level:
        case "STUDY":
            study_table= tables["study_table"]
            patient_table = tables["patient_table"]
            series_table = tables["series_table"]
            study_ukey = table_unique_keys["study_table"]
            patient_ukey = table_unique_keys["patient_table"]
            series_ukey = table_unique_keys["series_table"]
            #query_prototype = f"SELECT {study_table}.*, group_concat(distinct modality separator '/') as modalitiesinstudy FROM {study_table} , {patient_table} , {series_table} WHERE {study_table}.{patient_ukey} = {patient_table}.{patient_ukey} and {series_table}.{study_ukey} = {study_table}.{study_ukey} "
            query_prototype = sql_queries.QIDO_STUDY
            tagDict = studyTagsTofields
            # if "StudyInstanceUID" in params.keys():
            #     query_parameters.append(params["StudyInstanceUID"])

        case "STUDY.SERIES":
            series_table= tables["series_table"]
            study_table= tables["study_table"]
            study_ukey = table_unique_keys["study_table"]
            study_uid = studyTagsTofields["0020000D"]
            query_prototype = f"SELECT * FROM {series_table} WHERE {series_table}.{study_ukey} IN ( SELECT {study_table}.{study_ukey} FROM {study_table} WHERE {study_uid} = %s ) " #nosec - bandit confused by string literal variales in query construction.
            query_parameters.append(params["StudyInstanceUID"])
            tagDict = seriesTagsTofields
        case "STUDY.SERIES.INSTANCE":
            series_table= tables["series_table"]
            study_table= tables["study_table"]
            instance_table = tables["instance_table"]
            study_ukey = table_unique_keys["study_table"]
            series_ukey = table_unique_keys["series_table"]
            patient_ukey = table_unique_keys["patient_table"]
            study_uid = studyTagsTofields["0020000D"]
            series_uid = seriesTagsTofields["0020000E"]
            query_prototype = f"SELECT * FROM (({instance_table} INNER JOIN {series_table} on {series_table}.{series_ukey} = {instance_table}.{series_ukey}) INNER join {study_table} on {series_table}.{study_ukey} = {study_table}.{study_ukey}) where {study_uid} = %s and {series_table}.{series_uid} = %s " #nosec - bandit confused by string literal variales in query construction.
            query_parameters.append(params["StudyInstanceUID"])
            query_parameters.append(params["SeriesInstanceUID"])
            tagDict = seriesTagsTofields
        case "STUDY.INSTANCE":
            series_table= tables["series_table"]
            study_table= tables["study_table"]
            instance_table = tables["instance_table"]
            series_ukey = table_unique_keys["series_table"]
            study_ukey = table_unique_keys["study_table"]
            study_uid = studyTagsTofields["0020000D"]
            query_prototype = f"SELECT * FROM (({instance_table} INNER JOIN {series_table} on {series_table}.{series_ukey} = {instance_table}.{series_ukey}) INNER join {study_table} on {series_table}.{study_ukey} = {study_table}.{study_ukey}) where {study_uid} = %s " #nosec - bandit confused by string literal variales in query construction.
            query_parameters.append(params["StudyInstanceUID"])
            tagDict = instanceTagsTofields
        case "SERIES":
            series_table= tables["series_table"]
            study_table= tables["study_table"]
            study_ukey = table_unique_keys["study_table"]
            study_uid = studyTagsTofields["0020000D"]
            query_prototype = f"SELECT * FROM {series_table} INNER JOIN {study_table} ON {study_table}.{study_ukey} = {series_table}.{study_ukey} WHERE 1=1 " #nosec - bandit confused by string literal variales in query construction.
            tagDict = seriesTagsTofields
        case "INSTANCE":
            instance_table= tables["instance_table"]
            series_table= tables["series_table"]
            series_ukey = table_unique_keys["series_table"]
            query_prototype = f"SELECT * FROM (({instance_table} INNER JOIN {series_table} on {series_table}.{series_ukey} = {instance_table}.{series_ukey}) INNER join {study_table} on {series_table}.{study_ukey} = {study_table}.{study_ukey}) WHERE 1=1 " #nosec - bandit confused by string literal variales in query construction.
            tagDict = instanceTagsTofields
    where_prototype , where_params = ConstructQueryFilters(params=params["wherefields"], tagDict=tagDict)
    having_prototype , having_params = ConstructQueryFilters(params=params["havingfields"], tagDict=tagDict)
    query_parameters = query_parameters + where_params + having_params

    #Check if we need to add ORDER BY statement.
    orderby_prototype=""
    if len(params["orderbyfields"]) > 0:
        orderby_prototype = " ORDER BY "
        param_added = False
        for orderby_param in params["orderbyfields"]:
            try:
                add_desc =","
                if orderby_param[0] == "-":
                    orderby_param = orderby_param[1:]
                    add_desc = " DESC,"
                try:
                    dbmapping = tagDict[orderby_param]
                except:
                    if orderby_param.lower() in tagDict.values():
                        dbmapping = orderby_param.lower() 
                    else:
                        continue
                if add_desc:
                    orderby_prototype += f"{dbmapping}{add_desc}"
                param_added = True
            except:
                continue
        if param_added == False:
            orderby_prototype=""
        else:
            orderby_prototype = orderby_prototype[:-1]
    if int(params["limit"]) > 0:
        limit_offset = f" LIMIT {str(params['offset'])} , {str(params['limit'])}"
    else:
        limit_offset = ""
    if type(query_prototype) == dict:
        if len(having_params) > 0 :
            having_prototype = " HAVING " + having_prototype[4:]
        full_query = query_prototype["select"]+query_prototype["where"]+where_prototype+query_prototype["group_by"]+query_prototype["having"]+str(having_prototype)+str(orderby_prototype)+str(limit_offset)
    else:
        full_query = str(query_prototype)+str(where_prototype)+group_by+str(orderby_prototype)+str(limit_offset)
    return full_query, query_parameters

def ConstructQueryFilters(params , tagDict):
    sql_filter_params = []
    query_parameters = []
    for filter_params in params:
        for key, db_field in tagDict.items():
            filter_value = params[filter_params]
            if filter_params == key:
                if key in (  "00080020" , "00100030"):
                    if "-" in filter_value:
                        operator = "BETWEEN"
                    else:
                        operator = "="
                else:
                    if "*" in filter_value:
                        operator = "LIKE"
                    elif "," in filter_value:
                        operator = "IN"
                    else:
                        operator = "="
                    filter_value = filter_value.replace("*", "%")
                sql_filter_params.append((db_field, operator, filter_value))
                continue
    filter_prototype = ""
    for filter_params in sql_filter_params:
        if filter_params[1] == "BETWEEN":
            filter_prototype = filter_prototype + f" AND {str(filter_params[0])} {str(filter_params[1])} %s AND %s " #nosec - bandit confused by string literal variales in query construction.
            query_parameters.append(filter_params[2].split("-")[0])
            query_parameters.append(filter_params[2].split("-")[1])
        elif filter_params[1] == "IN":
            filter_prototype = filter_prototype + f" AND {str(filter_params[0])} {str(filter_params[1])} ("
            items =  filter_params[2].split(",")
            for item in items:
                filter_prototype = filter_prototype + f" %s ,"
                query_parameters.append(item)
            filter_prototype = filter_prototype[:-1] + ")"
        else:
            filter_prototype = filter_prototype + f" AND {str(filter_params[0])} {str(filter_params[1])} %s  " #nosec - bandit confused by string literal variales in query construction.
            query_parameters.append(filter_params[2])
    return filter_prototype, query_parameters

def _RetrievePixelData(query: str,  SeriesInstanceUID ,  InstanceUID : str , frame_list: list , multipart : bool = True): #right now this function only handles one frame per call... don't be fooled by frame_list being a list we will only use frame 0
    try:
        index = metadataCache.frame_index[InstanceUID+"_"+str(frame_list[0])]
        frame = getFramePixels(datastore_id=index["DatastoreID"], imageset_id=index["ImageSetID"], imageframe_id=index["ImageFrameID"], client=ahi_client )
        if multipart:
            boundary = multipart_boundary()
            payload = multipart_payload(uid.ExplicitVRLittleEndian, frame , boundary) #defaulting to ELE transfer syntax , the decoder has uncompressed the data. In theory we should comply to whatever is asked by the client...
            return payload
        else :
            return frame        
    except:
        logging.debug(f"[_RetrievePixelData] - {InstanceUID} not in cache")
    """Retieves a single DICOM object from AHI"""
    sql_conn = sql_pool.get_connection()
    cursor = sql_conn.cursor()
    cursor.execute(query , (InstanceUID,))
    results = cursor.fetchall()
    cursor.close()
    sql_conn.close()
    for res in results:
        datastore_id = res[0]
        imageset_id = res[1]
        metadata = metadatacache.getMetadata(datastore_id= datastore_id , imageset_id= imageset_id)
        assignToCache(metadata=metadata)
        frame_id = None
        try:
            frame_id = metadata["Study"]["Series"][SeriesInstanceUID]["Instances"][InstanceUID]["ImageFrames"][frame_list[0]-1]["ID"] #This only honors the 1st entry of the frame list...
            
        except Exception as err:
            logging.error(err)
            continue
        frame = getFramePixels(datastore_id=datastore_id, imageset_id=imageset_id , imageframe_id=frame_id, client=ahi_client )
        if multipart:
            boundary = multipart_boundary()
            payload = multipart_payload(uid.ExplicitVRLittleEndian, frame , boundary) #defaulting to ELE transfer syntax , the decoder has uncompressed the data. In theory we should comply to whatever is asked by the client...

            return payload
        else :
            return frame

def multipartEncapsulate(boundary : str, content_type: str,  payload : bytes):
    boundary = bytes("--"+boundary, 'utf-8')
    content_type = bytes("\r\nContent-Type: "+content_type, 'utf-8')
    content_length = bytes("\r\nContent-Length: "+str(len(payload)), 'utf-8')
    mime_type = bytes("\r\nMIME-Version: 1.0", 'utf-8')
    crlf = bytes("\r\n", 'utf-8')
    return boundary + content_type + content_length + mime_type + crlf + crlf + payload + crlf

def multipart_boundary():
    boundary = str(uuid4().hex)+"-"+str(uuid4().hex)
    return boundary

def multipart_payload(transfer_syntax, object_bytes , boundary):
    multipart_frame = bytearray()
    hd = '--' + boundary + '\r\nContent-Type: '
    ct = get_content_type(transfer_syntax)
    tshd = '; transfer-syntax="'
    ts = transfer_syntax
    tsft = '"'
    crlf = '\r\n\r\n'
    ft = '\r\n--' + boundary + '--'
    multipart_frame+=hd.encode()
    multipart_frame+=ct.encode()
    multipart_frame+=tshd.encode()
    multipart_frame+=ts.encode()
    multipart_frame+=tsft.encode()
    multipart_frame+=crlf.encode()
    multipart_frame+=object_bytes
    multipart_frame+=ft.encode()
    return bytes(multipart_frame)


def multipart_footer(boundary : str , payload : bytes):
    ft = '\r\n--' + boundary + '--'
    return payload+ft.encode()



def get_content_type (transfer_syntax):
    content_types = {
            uid.ImplicitVRLittleEndian:         "application/octet-stream",
            uid.ExplicitVRLittleEndian:         "application/octet-stream",
            uid.DeflatedExplicitVRLittleEndian: "application/octet-stream",
            uid.ExplicitVRBigEndian:            "application/octet-stream",
            uid.JPEGBaseline8Bit:               "image/jpeg",
            uid.JPEGExtended12Bit:              "image/jpeg",
            uid.JPEGLossless    :               "image/jpeg",
            uid.JPEGLosslessSV1:                "image/jpeg",
            uid.RLELossless:                    "image/dicom-rle",
            uid.JPEGLSLossless:                 "image/jls",
            uid.JPEGLSNearLossless:             "image/jls",
            uid.JPEG2000Lossless:               "image/jp2",
            uid.JPEG2000:                       "image/jp2",
            uid.JPEG2000MCLossless:             "image/jpx",
            uid.JPEG2000MC:                     "image/jpx",
            uid.MPEG2MPML:                      "video/mpeg2",
            uid.MPEG2MPHL:                      "video/mpeg2",
            uid.MPEG4HP41:                      "video/mp4",
            uid.MPEG4HP41BD:                    "video/mp4",
            uid.MPEG4HP422D:                    "video/mp4",
            uid.MPEG4HP423D:                    "video/mp4",
            uid.MPEG4HP42STEREO:                "video/mp4",
        }
    try:
        cont_type = content_types[transfer_syntax]
    except:
        cont_type = transfer_syntax
    return cont_type


def RetrieveMetadata(query, UID : str):
    start = datetime.datetime.now()
    fields , results = _executeQuery(query , (UID,) )
    end = datetime.datetime.now()
    ahi_metadatas = []
    metadata_table = []
    #Get the metadatas from the Cache or from AHI.
    start = datetime.datetime.now()
    meta_fetch = []
    for res in results:
        datastore_id = res[0]
        imageset_id = res[1]  
        meta_fetch.append((datastore_id,imageset_id,))
    with concurrent.futures.ThreadPoolExecutor(100) as executor:
        ahi_metadatas = executor.map(metadatacache.getMetadataViaTuple, meta_fetch)  
    end = datetime.datetime.now()
    instance_array = set()
    for metadata in ahi_metadatas:
        patient_dict = metadataCache.getJSONKeys(metadata["Patient"]["DICOM"])
        study_dict = metadataCache.getJSONKeys(metadata["Study"]["DICOM"])
        seriesinstanceuid = next(iter(metadata["Study"]["Series"].keys()))
        series_dict = metadataCache.getJSONKeys(metadata["Study"]["Series"][seriesinstanceuid]["DICOM"])
        iteration = iter(metadata["Study"]["Series"][seriesinstanceuid]["Instances"].keys())
        for instance in iteration:
            if not instance in instance_array:
                instance_meta=metadataCache.getInstancedDict(instance_uid=instance, metadata=metadata, patient_dict=patient_dict , study_dict=study_dict , series_dict=series_dict)
                instance_array.add(instance)
                metadata_table.append(instance_meta)
    return metadata_table


def RetrieveInstance(query, UID : str):
    fields , results = _executeQuery(query , (UID,) )

    for res in results:
        datastore_id = res[0]
        imageset_id = res[1] 
        metadata = metadatacache.getMetadata(datastore_id=datastore_id , imageset_id=imageset_id)
        assignToCache(metadata=metadata)
        series_uid = next(iter(metadata["Study"]["Series"].keys()))
        if UID in metadata["Study"]["Series"][series_uid]["Instances"].keys():
            insDICOMizer = InstanceDICOMizer(ahi_client=ahi_client)
            if metadata["Study"]["Series"][series_uid]["Instances"][UID]["DICOM"]["SOPClassUID"] == "1.2.840.10008.5.1.4.1.1.66.4": # <-- jpleger : 01/09/2025 - a bit hacky, just to support binary segmentation class... Need proper SOPClassUID conditions handling... I should normally also check the Segmentation format , BINARY , FRACTIONAL or LABELMAP. At the moment this only works for BINARY
                insDICOMizer.getFramePixels = getFrame  #getFrame merely return the bytes array as received from AHI
            else:
                insDICOMizer.getFramePixels = getFramePixels #getFramePixels decodes HTJ2K data and return the bytes array.
            ds = insDICOMizer.DICOMize(UID, metadata )
            buffer = io.BytesIO()
            ds.save_as(buffer, enforce_file_format=True)
            buffer.seek(0)
            return buffer.read()
    logging.error("no matching instance found")
    return None

def _getSecret(secret_arn):
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager')
    response = client.get_secret_value(SecretId=secret_arn)
    database_secrets = orjson.loads(response['SecretString'])
    return database_secrets


def genMetadata(fetch_files):
    first = True
    yield "["
    for fetch_file in fetch_files:
        dcm_obj = fetch_file
        if dcm_obj[0] == 2:
            if first == True:
                yield orjson.dumps((dcm_obj[1]))
                first = False
            else:
                yield ","+orjson.dumps(dcm_obj[1])
    yield "]"



def getFrame(datastore_id, imageset_id, imageframe_id , client = None ):
    try:
        frame_cache_file = open(f"./cache/{datastore_id}/{imageset_id}/{imageframe_id}.cache", 'rb')
        frame = frame_cache_file.read()
        frame_cache_file.close()
        logging.debug(f"cache HIT    : {datastore_id}/{imageset_id}/{imageframe_id}")
        return frame
    except:
        try:
            logging.debug(f"cache MISSED : {datastore_id}/{imageset_id}/{imageframe_id}")
            if client is None :
                client = boto3.client('medical-imaging')
            res = client.get_image_frame(
                datastoreId=datastore_id,
                imageSetId=imageset_id,
                imageFrameInformation= {'imageFrameId' :imageframe_id})
            return res['imageFrameBlob'].read()
        except Exception as e:
            return None

def getFramePixels(datastore_id, imageset_id, imageframe_id , client = None ):
    try:
        b = getFrame(datastore_id, imageset_id, imageframe_id , client)
        b = io.BytesIO(b)

        if b.getvalue():
            try:
                d = decode(b)
                return d.tobytes()
            except Exception as e:
                with Image.open(b) as img:
                    output = io.BytesIO()
                    img.save(output, format='JPEG')
                    output.seek(0)
                    return output.getvalue()
        else:
            with Image.open(b) as img:
                output = io.BytesIO()
                img.save(output, format='JPEG')
                output.seek(0)
                return output.getvalue()
    except Exception as e:
        logging.error("[{__name__}] - Frame could not be decoded.")
        logging.error(f"{datastore_id}/{imageset_id}/{imageframe_id}")
        logging.error(e)
        return None


def assignToCache(metadata : object = None , frame_dict : object =None):
    frames_dict = frameFetcher.getFramesToCache(metadata=metadata)
    ff_count = len(framefetchers)
    ff_selected = 0
    for frame in frames_dict:
        framefetchers[ff_selected].addToCache(frame)
        ff_selected+=1
        if ff_selected == ff_count:
            ff_selected=0

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    logging.getLogger('InstanceDICOMizer').setLevel(logging.CRITICAL)
    logging.getLogger('frameFetcher').setLevel(logging.CRITICAL)
    logging.getLogger('metadataCache').setLevel(logging.CRITICAL)
    logging.getLogger('cacheCleaner').setLevel(logging.CRITICAL)
    config_good = True  # This variable is used to ensure that all config driven by env variables are set properly before the service to start.
    forbidden_cache_roots = ["/" , "/var" , "/usr" , "/dev" , "/lib" , "/tmp" , "/etc" ,  "/boot" , "/bin" , "/sys" , "/run" , "root" , "/opt"]

    secret_arn = os.environ['DB_SECRET_ARN']
    try:
        port = os.environ['PORT']
    except:
        port = 8080
    try: 
        cache_root = os.environ['CACHE_ROOT']
        folder_root = "/"+os.path.abspath(cache_root).split("/")[1]
        if folder_root in forbidden_cache_roots :
           config_good = False
           logging.error(f"{folder_root} is a forbidden cache location. Avoid using the following folders : {forbidden_cache_roots}")
           
    except:
        logging.warning("No cache location provided, defaulting to "+os.curdir+"/cache/")
        cache_root = './cache'
        os.makedirs(cache_root,exist_ok=True)
        
    if config_good == True:    
        ahi_client = boto3.client('medical-imaging', config=botocore.config.Config(max_pool_connections=100))
        metadatacache = metadataCache(ahi_client)
        framefetchers: list[frameFetcher] = []
        cpu_count = multiprocessing.cpu_count()
        if cpu_count > 1:
            spare = 1
        else:
            spare = 0
        for ff_id in range(cpu_count-spare):
            logging.info(f"[Startup] - Forking FrameFetcher FF{ff_id}")
            framefetchers.append(frameFetcher(f"FF{ff_id}",getFrame, cache_root)) #first fetcher also embedds the cache cleaner
        cCleaner = cacheCleaner(framefetchers[0].cached_items , cache_root=cache_root)
        db_secret = _getSecret(secret_arn)
        sql_pool = mysqlConnectionFactory.mysqlConnectionFactory(hostname=db_secret['host'], username=db_secret['username'], password=db_secret['password'], database=db_secret['dbname'], port=int(db_secret['port']), pool_size=100)
        logging.info("QIDO/WADO-RS service started.")
   

        WSGIRequestHandler.protocol_version = "HTTP/2"

        serve(app, host="0.0.0.0", port=port, url_scheme='http', max_request_body_size=4294967296,  threads=100,  asyncore_use_poll=True) #nosec - binding all intefaces on purpose
      
    else :
        exit(1)


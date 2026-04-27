#!/usr/bin/env python3
# Copyright 2026 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
"""
Read-Only C-FIND Handler

Simplified C-FIND implementation that queries a single HealthImaging datastore.
"""

import logging

import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from pydicom import Dataset
from urllib.parse import urlencode


class ReadOnlyCFindHandler:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)

        self.session = boto3.Session()
        self.credentials = self.session.get_credentials()
        self.base_url = f'https://dicom-medical-imaging.{config.aws_region}.amazonaws.com'

        self.attribute_map = {
            'PatientID': 'PatientID',
            'PatientName': 'PatientName',
            'PatientBirthDate': 'PatientBirthDate',
            'PatientBirthTime': 'PatientBirthTime',
            'StudyInstanceUID': 'StudyInstanceUID',
            'StudyDate': 'StudyDate',
            'StudyTime': 'StudyTime',
            'StudyID': 'StudyID',
            'StudyDescription': 'StudyDescription',
            'AccessionNumber': 'AccessionNumber',
            'ModalitiesInStudy': 'ModalitiesInStudy',
            'ReferringPhysicianName': 'ReferringPhysicianName',
            'SeriesInstanceUID': 'SeriesInstanceUID',
            'Modality': 'Modality',
            'SOPClassUID': 'SOPClassUID',
            'SOPInstanceUID': 'SOPInstanceUID',
        }

        self.tag_map = {
            '00100020': 'PatientID',
            '00100010': 'PatientName',
            '00100030': 'PatientBirthDate',
            '00100032': 'PatientBirthTime',
            '0020000D': 'StudyInstanceUID',
            '00080020': 'StudyDate',
            '00080030': 'StudyTime',
            '00200010': 'StudyID',
            '00081030': 'StudyDescription',
            '00080050': 'AccessionNumber',
            '00080061': 'ModalitiesInStudy',
            '00080090': 'ReferringPhysicianName',
            '0008103E': 'SeriesDescription',
            '00080060': 'Modality',
            '0020000E': 'SeriesInstanceUID',
            '00080016': 'SOPClassUID',
            '00080018': 'SOPInstanceUID',
        }

    def handle_c_find(self, event):
        """Handle C-FIND request."""
        try:
            query_dataset = event.identifier
            query_level = self._get_query_level(query_dataset)

            self.logger.info(f"C-FIND query at {query_level} level")

            qido_params = self._build_qido_params(query_dataset)
            results = self._execute_qido_query(query_level, qido_params, query_dataset)

            for result in results:
                response_dataset = self._map_qido_to_dicom(result, query_level)
                if response_dataset:
                    yield (0xFF00, response_dataset)

            yield (0x0000, None)

        except Exception as e:
            self.logger.error(f"C-FIND error: {e}")
            yield (0xC000, None)

    def _get_query_level(self, dataset):
        """Determine query level from QueryRetrieveLevel in the dataset."""
        if hasattr(dataset, 'QueryRetrieveLevel') and dataset.QueryRetrieveLevel:
            level = dataset.QueryRetrieveLevel.strip().upper()
            if level == 'IMAGE':
                return 'instances'
            return level.lower()
        # Fallback: default to studies
        return 'studies'

    def _build_qido_params(self, dataset):
        """Build QIDO-RS query parameters from non-empty dataset attributes."""
        params = {}
        for dicom_tag, qido_param in self.attribute_map.items():
            if hasattr(dataset, dicom_tag):
                value = getattr(dataset, dicom_tag)
                if value:
                    params[qido_param] = str(value)
        return params

    def _execute_qido_query(self, level, params, query_dataset):
        """Execute QIDO-RS query against HealthImaging with correct endpoint for level."""
        base = f"{self.base_url}/datastore/{self.config.datastore_id}"

        if level == 'instances':
            study_uid = getattr(query_dataset, 'StudyInstanceUID', None)
            series_uid = getattr(query_dataset, 'SeriesInstanceUID', None)
            if study_uid and series_uid:
                url = f"{base}/studies/{study_uid}/series/{series_uid}/instances"
            elif study_uid:
                url = f"{base}/studies/{study_uid}/instances"
            else:
                url = f"{base}/instances"
        elif level == 'series':
            study_uid = getattr(query_dataset, 'StudyInstanceUID', None)
            if study_uid:
                url = f"{base}/studies/{study_uid}/series"
            else:
                url = f"{base}/series"
        else:
            url = f"{base}/studies"

        # Remove UIDs already encoded in the path from query params
        params.pop('StudyInstanceUID', None) if '/studies/' in url and level != 'studies' else None
        params.pop('SeriesInstanceUID', None) if '/series/' in url and level != 'series' else None

        params['limit'] = '100'

        if params:
            url += "?" + urlencode(params)

        self.logger.info(f"QIDO-RS URL: {url}")

        request = AWSRequest(method='GET', url=url)
        request.headers['Accept'] = 'application/dicom+json'
        request.headers['Content-Type'] = 'application/dicom+json'
        SigV4Auth(self.credentials, 'medical-imaging', self.config.aws_region).add_auth(request)

        try:
            response = requests.get(url, headers=dict(request.headers), timeout=30)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            self.logger.error(f"QIDO-RS request failed: {e}")
            return []

        try:
            results = response.json()
            if not isinstance(results, list):
                self.logger.error(f"Unexpected QIDO-RS response format: {type(results)}")
                return []
        except (ValueError, TypeError) as e:
            self.logger.error(f"Failed to parse QIDO-RS response: {e}")
            return []

        self.logger.info(f"QIDO-RS returned {len(results)} results")
        self.logger.debug(f"First result: {results[0] if results else 'none'}")

        return results

    def _map_qido_to_dicom(self, qido_result, level):
        """Map QIDO-RS result to DICOM dataset."""
        dataset = Dataset()

        try:
            for dicom_tag, attr_name in self.tag_map.items():
                if dicom_tag in qido_result:
                    value_obj = qido_result[dicom_tag]
                    if isinstance(value_obj, dict) and 'Value' in value_obj and value_obj['Value']:
                        value = value_obj['Value'][0]
                        if isinstance(value, dict) and 'Alphabetic' in value:
                            setattr(dataset, attr_name, str(value['Alphabetic']))
                        else:
                            setattr(dataset, attr_name, str(value))

            dataset.QueryRetrieveLevel = level.upper()
            return dataset

        except Exception as e:
            self.logger.error(f"Error mapping QIDO result: {e}")
            self.logger.debug(f"QIDO result: {qido_result}")
            return None

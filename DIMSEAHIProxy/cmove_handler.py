#!/usr/bin/env python3
# Copyright 2026 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
"""
Read-Only C-MOVE Handler

Simplified C-MOVE implementation that retrieves from HealthImaging and delivers to configured SCU.
"""

import io
import logging
from queue import Queue
from concurrent.futures import ThreadPoolExecutor

import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from pydicom import dcmread, Dataset


class ReadOnlyCMoveHandler:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)

        self.session = boto3.Session()
        self.credentials = self.session.get_credentials()
        self.base_url = f'https://dicom-medical-imaging.{config.aws_region}.amazonaws.com'

    def handle_c_move(self, event, scu_hostname, scu_port):
        """Handle C-MOVE request with per-AE destination."""
        try:
            query_dataset = event.identifier
            move_destination = event.move_destination

            # move_destination is bytes padded to 16 chars
            if isinstance(move_destination, bytes):
                move_destination = move_destination.decode('ascii').strip()
            else:
                move_destination = str(move_destination).strip()

            if not self.config.is_authorized(move_destination):
                self.logger.error(f"Unknown move destination AE: '{move_destination}'")
                yield (0xA801, None)
                return

            self.logger.info(f"C-MOVE request to {move_destination} - will deliver to {scu_hostname}:{scu_port}")

            instances = self._find_instances(query_dataset)
            if not instances:
                yield (0x0000, None)
                return

            yield (scu_hostname, scu_port)

            total = len(instances)
            yield total

            self.logger.info(f"Starting parallel retrieval and delivery of {total} instances")

            completed = 0
            failed = 0
            delivery_queue = Queue(maxsize=10)

            def fetch_worker(inst):
                try:
                    dicom_data = self._retrieve_instance(inst)
                    dataset = dcmread(io.BytesIO(dicom_data))
                    delivery_queue.put(('success', inst, dataset))
                except Exception as e:
                    self.logger.error(f"Failed to retrieve instance {inst['SOPInstanceUID']}: {e}")
                    delivery_queue.put(('error', inst, None))

            max_workers = min(20, total)
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                for inst in instances:
                    executor.submit(fetch_worker, inst)

                delivered_count = 0
                while delivered_count < total:
                    try:
                        result_type, inst, dataset = delivery_queue.get(timeout=60)
                        delivered_count += 1

                        if result_type == 'success':
                            self.logger.debug(f"Yielding instance for C-STORE: {inst['SOPInstanceUID']}")
                            yield (0xFF00, dataset)
                            completed += 1
                        else:
                            failed += 1
                            yield (0xB000, None)

                    except Exception as e:
                        self.logger.error(f"Error in delivery pipeline: {e}")
                        failed += 1
                        delivered_count += 1
                        yield (0xB000, None)

            self.logger.info(f"C-MOVE completed: {completed} delivered, {failed} failed")

            final_ds = Dataset()
            yield (0x0000, final_ds) if failed == 0 else (0xB000, final_ds)

        except Exception as e:
            self.logger.error(f"C-MOVE error: {e}")
            yield (0xC000, None)

    def _find_instances(self, query_dataset):
        """Find instances matching the query. Supports study, series, and patient level."""
        study_uid = getattr(query_dataset, 'StudyInstanceUID', None)
        series_uid = getattr(query_dataset, 'SeriesInstanceUID', None)
        patient_id = getattr(query_dataset, 'PatientID', None)

        # Determine which studies to retrieve
        study_uids = []
        if study_uid:
            # May be a single UID string or a multi-valued list of UIDs
            if hasattr(study_uid, '__iter__') and not isinstance(study_uid, str):
                study_uids = [str(u) for u in study_uid]
            else:
                study_uids = [str(study_uid)]
        elif patient_id:
            study_uids = self._find_studies_for_patient(str(patient_id))
        else:
            self.logger.error("StudyInstanceUID or PatientID required for C-MOVE")
            return []

        instances = []
        for suid in study_uids:
            # If series-level, only fetch that series
            series_list = [str(series_uid)] if series_uid else self._get_series_for_study(suid)
            for ser_uid in series_list:
                instances.extend(self._get_instances_for_series(suid, ser_uid))

        self.logger.info(f"Found {len(instances)} total instances across {len(study_uids)} studies")
        return instances

    def _find_studies_for_patient(self, patient_id):
        """Find all study UIDs for a patient via QIDO-RS."""
        from urllib.parse import urlencode
        url = (f"{self.base_url}/datastore/{self.config.datastore_id}/studies?"
               + urlencode({'PatientID': patient_id}))
        try:
            results = self._signed_get(url, 'application/dicom+json').json()
            if not isinstance(results, list):
                return []
            uids = [r['0020000D']['Value'][0] for r in results
                    if '0020000D' in r and 'Value' in r.get('0020000D', {}) and r['0020000D']['Value']]
        except (ValueError, TypeError, KeyError, IndexError) as e:
            self.logger.error(f"Failed to parse study UIDs: {e}")
            return []
        self.logger.info(f"Found {len(uids)} studies for patient {patient_id}")
        return uids

    def _signed_get(self, url, accept, timeout=30):
        """Make a SigV4-signed GET request."""
        request = AWSRequest(method='GET', url=url)
        request.headers['Accept'] = accept
        request.headers['Content-Type'] = 'application/dicom+json'
        SigV4Auth(self.credentials, 'medical-imaging', self.config.aws_region).add_auth(request)

        try:
            response = requests.get(url, headers=dict(request.headers), timeout=timeout)
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed: {e}")
            raise

        self.logger.debug(f"GET {url} -> {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Request failed: {response.status_code} - {response.text}")
            response.raise_for_status()

        return response

    def _get_series_for_study(self, study_uid):
        """Get all series UIDs for a study."""
        url = f"{self.base_url}/datastore/{self.config.datastore_id}/studies/{study_uid}/series"
        try:
            results = self._signed_get(url, 'application/dicom+json').json()
            if not isinstance(results, list):
                return []
            series_list = [r['0020000E']['Value'][0] for r in results
                          if '0020000E' in r and 'Value' in r.get('0020000E', {}) and r['0020000E']['Value']]
        except (ValueError, TypeError, KeyError, IndexError) as e:
            self.logger.error(f"Failed to parse series UIDs for study {study_uid}: {e}")
            return []
        self.logger.info(f"Found {len(series_list)} series for study {study_uid}")
        return series_list

    def _get_instances_for_series(self, study_uid, series_uid):
        """Get all instances for a series."""
        url = f"{self.base_url}/datastore/{self.config.datastore_id}/studies/{study_uid}/series/{series_uid}/instances"
        try:
            results = self._signed_get(url, 'application/dicom+json').json()
            if not isinstance(results, list):
                return []
            instances = [
                {
                    'SOPInstanceUID': r['00080018']['Value'][0],
                    'StudyInstanceUID': study_uid,
                    'SeriesInstanceUID': series_uid,
                }
                for r in results
                if '00080018' in r and 'Value' in r.get('00080018', {}) and r['00080018']['Value']
            ]
        except (ValueError, TypeError, KeyError, IndexError) as e:
            self.logger.error(f"Failed to parse instance UIDs for series {series_uid}: {e}")
            return []
        self.logger.info(f"Found {len(instances)} instances for series {series_uid}")
        return instances

    def _retrieve_instance(self, instance):
        """Retrieve instance via WADO-RS."""
        url = (f"{self.base_url}/datastore/{self.config.datastore_id}/"
               f"studies/{instance['StudyInstanceUID']}/series/{instance['SeriesInstanceUID']}/"
               f"instances/{instance['SOPInstanceUID']}")

        return self._signed_get(url, 'application/dicom; transfer-syntax=1.2.840.10008.1.2.1', timeout=60).content

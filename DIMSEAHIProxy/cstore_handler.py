#!/usr/bin/env python3
# Copyright 2026 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
"""
C-STORE Handler with STOW-RS Forwarding

Receives DICOM instances via C-STORE, buffers in memory, and forwards
to AWS HealthImaging via multipart STOW-RS when buffer exceeds threshold
or association ends.
"""

import io
import logging
import uuid
import hashlib
import threading

import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from pydicom.filewriter import dcmwrite

FLUSH_THRESHOLD_BYTES = 50 * 1024 * 1024  # 50MB


class StowRSClient:
    """Sends multipart STOW-RS requests to AWS HealthImaging."""

    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.session = boto3.Session()
        self.credentials = self.session.get_credentials()
        self.base_url = f'https://dicom-medical-imaging.{config.aws_region}.amazonaws.com'

    def store(self, instances):
        """Send instances via multipart STOW-RS. Retries indefinitely on throttling."""
        if not instances:
            return True, []

        boundary = uuid.uuid4().hex
        body = self._build_multipart_body(instances, boundary)
        url = f"{self.base_url}/datastore/{self.config.datastore_id}/studies"
        content_hash = hashlib.sha256(body).hexdigest()
        attempt = 0

        while True:
            attempt += 1

            # Re-sign every attempt (signature includes timestamp)
            request = AWSRequest(method='POST', url=url, data=body)
            request.headers['Accept'] = 'application/dicom+json'
            request.headers['Content-Type'] = f'multipart/related; boundary={boundary}'
            request.headers['x-amz-content-sha256'] = content_hash
            SigV4Auth(self.credentials, 'medical-imaging', self.config.aws_region).add_auth(request)

            self.logger.info(f"STOW-RS POST {url} ({len(instances)} instances, {len(body)} bytes, attempt {attempt})")

            try:
                response = requests.post(url, data=body, headers=dict(request.headers), timeout=300)
            except requests.exceptions.RequestException as e:
                self.logger.error(f"STOW-RS request failed: {e}")
                return False, [uid for uid, _ in instances]

            self.logger.info(f"STOW-RS response: {response.status_code} (attempt {attempt})")
            self.logger.info(f"STOW-RS response body: {response.text[:2000]}")

            # Throttled — retry immediately
            if response.status_code in (429, 503):
                self.logger.warning(f"STOW-RS throttled ({response.status_code}), retrying immediately (attempt {attempt})")
                continue

            if response.status_code not in (200, 409):
                self.logger.error(f"STOW-RS HTTP error: {response.status_code} - {response.text}")
                return False, [uid for uid, _ in instances]

            # Parse response manifest for failures
            try:
                manifest = response.json()
                success_seq = manifest.get('00081199', {}).get('Value', [])
                failed_seq = manifest.get('00081198', {}).get('Value', [])
                self.logger.info(f"STOW-RS manifest: {len(success_seq)} succeeded, {len(failed_seq)} failed")

                if failed_seq:
                    failed_uids = []
                    for item in failed_seq:
                        uid = item.get('00080018', {}).get('Value', ['unknown'])[0]
                        reason = item.get('00081197', {}).get('Value', ['unknown'])[0]
                        self.logger.error(f"STOW-RS failed instance {uid}: {reason}")
                        failed_uids.append(uid)
                    return False, failed_uids
            except (ValueError, TypeError, KeyError) as e:
                self.logger.error(f"Failed to parse STOW-RS manifest: {e}")
                return False, [uid for uid, _ in instances]

            return True, []

    def _build_multipart_body(self, instances, boundary):
        """Build multipart/related body from list of (uid, raw_bytes) tuples."""
        parts = []
        for _, raw_bytes in instances:
            parts.append(f'--{boundary}\r\nContent-Type: application/dicom\r\n\r\n'.encode())
            parts.append(raw_bytes)
            parts.append(b'\r\n')
        parts.append(f'--{boundary}--\r\n'.encode())
        return b''.join(parts)


class CStoreHandler:
    """Per-proxy C-STORE handler. Supports sync and buffered STOW modes."""

    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.stow_client = StowRSClient(config)
        # assoc id -> {"instances": [(uid, bytes)], "size": int, "failed": bool}
        self._buffers = {}
        self._lock = threading.Lock()

    def handle_c_store(self, event, stow_mode='buffered'):
        """EVT_C_STORE handler. Returns DICOM status code."""
        dataset = event.dataset
        dataset.file_meta = event.file_meta

        sop_uid = str(dataset.SOPInstanceUID)
        sop_class = str(getattr(dataset, 'SOPClassUID', 'unknown'))
        self.logger.info(f"C-STORE received: SOP={sop_uid} class={sop_class}")

        # Serialize to bytes in memory
        buf = io.BytesIO()
        dcmwrite(buf, dataset, enforce_file_format=True)
        raw = buf.getvalue()
        self.logger.info(f"Serialized {sop_uid}: {len(raw)} bytes")

        if stow_mode == 'sync':
            return self._handle_sync(sop_uid, raw)
        return self._handle_buffered(event, sop_uid, raw)

    def _handle_sync(self, sop_uid, raw):
        """STOW immediately, return status only after AHI confirms."""
        self.logger.info(f"Sync STOW: sending {sop_uid} ({len(raw)} bytes)")
        success, failed_uids = self.stow_client.store([(sop_uid, raw)])
        if success:
            self.logger.info(f"Sync STOW OK: {sop_uid}")
            return 0x0000
        self.logger.error(f"Sync STOW failed: {sop_uid}: {failed_uids}")
        return 0xA700

    def _handle_buffered(self, event, sop_uid, raw):
        """Buffer instance, flush at threshold."""
        assoc_id = id(event.assoc)

        with self._lock:
            if assoc_id not in self._buffers:
                self._buffers[assoc_id] = {"instances": [], "size": 0, "failed": False}
            state = self._buffers[assoc_id]

            if state["failed"]:
                return 0xA700  # Prior STOW failed, reject further stores

            state["instances"].append((sop_uid, raw))
            state["size"] += len(raw)

            self.logger.info(
                f"Buffered {sop_uid} ({len(raw)} bytes, "
                f"total: {state['size']} bytes, {len(state['instances'])} instances)"
            )

            # Flush if over threshold
            if state["size"] >= FLUSH_THRESHOLD_BYTES:
                return self._flush_locked(assoc_id, state)

        return 0x0000

    def handle_released(self, event):
        """EVT_RELEASED handler. Flush remaining buffer."""
        assoc_id = id(event.assoc)
        self.logger.info(f"Association {assoc_id} released, checking for buffered instances")

        with self._lock:
            state = self._buffers.pop(assoc_id, None)

        if not state or not state["instances"]:
            self.logger.info(f"Association {assoc_id}: no buffered instances to flush")
            return

        if state["failed"]:
            self.logger.warning(f"Association {assoc_id} released with prior STOW failure, skipping final flush")
            return

        self.logger.info(
            f"Association {assoc_id}: flushing {len(state['instances'])} remaining instances ({state['size']} bytes)"
        )

        success, failed_uids = self.stow_client.store(state["instances"])
        if not success:
            self.logger.error(
                f"Final STOW-RS flush failed for association {assoc_id}: {failed_uids}"
            )
        else:
            self.logger.info(
                f"Final STOW-RS flush OK: {len(state['instances'])} instances"
            )

    def _flush_locked(self, assoc_id, state):
        """Flush buffer while lock is held. Returns DICOM status."""
        instances = state["instances"]
        self.logger.info(f"Flushing {len(instances)} instances ({state['size']} bytes)")

        # Release lock during network call
        self._lock.release()
        try:
            success, failed_uids = self.stow_client.store(instances)
        finally:
            self._lock.acquire()

        if success:
            state["instances"] = []
            state["size"] = 0
            return 0x0000
        else:
            state["failed"] = True
            self.logger.error(f"Mid-association STOW failed: {failed_uids}")
            return 0xA700  # Out of resources — triggers abort on sender side

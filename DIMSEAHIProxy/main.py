#!/usr/bin/env python3
# Copyright 2026 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
"""
DICOM Proxy for AWS HealthImaging

Supports C-FIND, C-MOVE, and C-STORE operations with per-AE-title
authorization and granular permissions configured via config.json.

- C-FIND → QIDO-RS queries (requires 'query' permission)
- C-MOVE → WADO-RS retrieval + C-STORE delivery (requires 'retrieve' permission)
- C-STORE → STOW-RS forwarding (requires 'store' permission)
"""

import json
import logging
import signal
import socket
import ssl
import sys
import os
import time
import atexit

from pynetdicom import AE, evt, AllStoragePresentationContexts
from pynetdicom.sop_class import (
    Verification,
    StudyRootQueryRetrieveInformationModelFind,
    StudyRootQueryRetrieveInformationModelMove,
    StudyRootQueryRetrieveInformationModelGet,
    PatientRootQueryRetrieveInformationModelFind,
    PatientRootQueryRetrieveInformationModelMove,
    PatientRootQueryRetrieveInformationModelGet,
    PatientStudyOnlyQueryRetrieveInformationModelFind,
    PatientStudyOnlyQueryRetrieveInformationModelMove,
    PatientStudyOnlyQueryRetrieveInformationModelGet,
)

from cfind_handler import ReadOnlyCFindHandler
from cmove_handler import ReadOnlyCMoveHandler
from cstore_handler import CStoreHandler

VALID_PERMISSIONS = {'query', 'retrieve', 'store'}


class ProxyConfig:
    def __init__(self, config_path='config.json'):
        with open(config_path) as f:
            raw = json.load(f)

        self.ae_title = raw.get('ae_title', 'DICOM_PROXY')
        self.port = raw.get('port', 11112)
        self.max_associations = raw.get('max_associations', 20)
        self.log_level = raw.get('log_level', 'INFO').upper()
        self.datastore_id = raw.get('datastore_id')
        self.aws_region = raw.get('aws_region')

        if not self.datastore_id:
            raise ValueError("config.json: 'datastore_id' is required")

        if not self.aws_region:
            import boto3
            self.aws_region = boto3.Session().region_name or 'us-east-1'

        ae_list = raw.get('authorized_ae_titles')
        if not ae_list or not isinstance(ae_list, list):
            raise ValueError("config.json: 'authorized_ae_titles' must be a non-empty list")

        self._ae_configs = {}
        for entry in ae_list:
            ae = entry.get('ae_title')
            perms = set(entry.get('permissions', []))
            if not ae:
                raise ValueError("config.json: each authorized AE must have 'ae_title'")
            if not perms:
                raise ValueError(f"config.json: AE '{ae}' must have at least one permission")
            invalid = perms - VALID_PERMISSIONS
            if invalid:
                raise ValueError(f"config.json: AE '{ae}' has invalid permissions: {invalid}")
            if 'retrieve' in perms and not entry.get('scu_hostname'):
                raise ValueError(f"config.json: AE '{ae}' has 'retrieve' permission but no 'scu_hostname'")
            stow_mode = entry.get('stow_mode', 'buffered').lower()
            if stow_mode not in ('sync', 'buffered'):
                raise ValueError(f"config.json: AE '{ae}' has invalid stow_mode: '{stow_mode}'")
            self._ae_configs[ae] = {
                'permissions': perms,
                'scu_hostname': entry.get('scu_hostname'),
                'scu_port': entry.get('scu_port', 104),
                'stow_mode': stow_mode,
            }

        # Optional TLS configuration
        tls = raw.get('tls', {})
        self.tls_enabled = tls.get('enabled', False)
        self.tls_cert_file = tls.get('cert_file')
        self.tls_key_file = tls.get('key_file')
        self.tls_ca_file = tls.get('ca_file')
        if self.tls_enabled:
            if not self.tls_cert_file or not self.tls_key_file:
                raise ValueError("config.json: TLS enabled but 'cert_file' and 'key_file' are required")
            if not os.path.isfile(self.tls_cert_file):
                raise ValueError(f"config.json: TLS cert_file not found: {self.tls_cert_file}")
            if not os.path.isfile(self.tls_key_file):
                raise ValueError(f"config.json: TLS key_file not found: {self.tls_key_file}")
            if self.tls_ca_file and not os.path.isfile(self.tls_ca_file):
                raise ValueError(f"config.json: TLS ca_file not found: {self.tls_ca_file}")

    def is_authorized(self, ae_title):
        return ae_title in self._ae_configs

    def get_ae_config(self, ae_title):
        return self._ae_configs.get(ae_title)

    def has_permission(self, ae_title, permission):
        cfg = self._ae_configs.get(ae_title)
        return cfg is not None and permission in cfg['permissions']


QR_CONTEXTS = [
    StudyRootQueryRetrieveInformationModelFind,
    StudyRootQueryRetrieveInformationModelMove,
    StudyRootQueryRetrieveInformationModelGet,
    PatientRootQueryRetrieveInformationModelFind,
    PatientRootQueryRetrieveInformationModelMove,
    PatientRootQueryRetrieveInformationModelGet,
    PatientStudyOnlyQueryRetrieveInformationModelFind,
    PatientStudyOnlyQueryRetrieveInformationModelMove,
    PatientStudyOnlyQueryRetrieveInformationModelGet,
]

STORAGE_CONTEXTS = [cx.abstract_syntax for cx in AllStoragePresentationContexts]


class DICOMProxy:
    def __init__(self):
        self.config = ProxyConfig()
        self.logger = logging.getLogger(__name__)
        self.ae = None
        self._server = None
        self._running = False
        # Track calling AE per association for permission checks
        self._assoc_ae = {}

        self.cfind_handler = ReadOnlyCFindHandler(self.config)
        self.cmove_handler = ReadOnlyCMoveHandler(self.config)
        self.cstore_handler = CStoreHandler(self.config)

        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        atexit.register(self._shutdown)

    def _signal_handler(self, signum, frame):
        self.logger.info(f"Received signal {signum}, shutting down...")
        self._running = False
        self._shutdown()

    def _shutdown(self):
        if self._server:
            try:
                self._server.shutdown()
                self._server.server_close()
            except Exception:
                pass
            self._server = None
        if self.ae:
            try:
                self.ae.shutdown()
            except Exception:
                pass
            self.ae = None

    def _get_calling_ae(self, event):
        """Get the calling AE title for this association."""
        assoc_id = id(event.assoc)
        ae = self._assoc_ae.get(assoc_id)
        if ae:
            return ae
        # Fallback: read from the A-ASSOCIATE primitive
        prim = getattr(event.assoc.requestor, 'primitive', None)
        if prim:
            return prim.calling_ae_title.strip()
        return None

    def initialize(self):
        self.ae = AE(ae_title=self.config.ae_title)
        self.ae.maximum_associations = self.config.max_associations
        self.ae._server_socket_options = [(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)]

        self.ae.add_supported_context(Verification)
        for context in QR_CONTEXTS:
            self.ae.add_supported_context(context)
        for context in STORAGE_CONTEXTS:
            self.ae.add_supported_context(context)
        for context in STORAGE_CONTEXTS[:128]:
            self.ae.add_requested_context(context)

        self.event_handlers = [
            (evt.EVT_REQUESTED, self._handle_association_requested),
            (evt.EVT_C_FIND, self._handle_c_find),
            (evt.EVT_C_MOVE, self._handle_c_move),
            (evt.EVT_C_STORE, self._handle_c_store),
            (evt.EVT_RELEASED, self._handle_released),
        ]

        self.logger.info("DICOM proxy initialized")
        self.logger.info(f"AE Title: {self.config.ae_title}")
        self.logger.info(f"HealthImaging datastore: {self.config.datastore_id}")
        self.logger.info(f"Region: {self.config.aws_region}")
        for ae, cfg in self.config._ae_configs.items():
            perms = ', '.join(sorted(cfg['permissions']))
            self.logger.info(f"Authorized AE: {ae} [{perms}]")

    def _handle_association_requested(self, event):
        prim = getattr(event.assoc.requestor, 'primitive', None)
        calling_ae = prim.calling_ae_title.strip() if prim else None

        self.logger.info(f"Association request from AE: '{calling_ae}'")

        if not calling_ae or not self.config.is_authorized(calling_ae):
            self.logger.warning(f"Unauthorized AE: '{calling_ae}'")
            event.assoc.abort()
            return

        self._assoc_ae[id(event.assoc)] = calling_ae

    def _handle_c_find(self, event):
        calling_ae = self._get_calling_ae(event)
        if not self.config.has_permission(calling_ae, 'query'):
            self.logger.warning(f"C-FIND rejected — AE '{calling_ae}' lacks 'query' permission")
            yield (0xC000, None)
            return
        yield from self.cfind_handler.handle_c_find(event)

    def _handle_c_move(self, event):
        calling_ae = self._get_calling_ae(event)
        if not self.config.has_permission(calling_ae, 'retrieve'):
            self.logger.warning(f"C-MOVE rejected — AE '{calling_ae}' lacks 'retrieve' permission")
            yield (0xA801, None)
            return
        ae_cfg = self.config.get_ae_config(calling_ae)
        yield from self.cmove_handler.handle_c_move(event, ae_cfg['scu_hostname'], ae_cfg['scu_port'])

    def _handle_c_store(self, event):
        calling_ae = self._get_calling_ae(event)
        if not self.config.has_permission(calling_ae, 'store'):
            self.logger.warning(f"C-STORE rejected — AE '{calling_ae}' lacks 'store' permission")
            return 0xC000
        ae_cfg = self.config.get_ae_config(calling_ae)
        return self.cstore_handler.handle_c_store(event, ae_cfg['stow_mode'])

    def _handle_released(self, event):
        self.cstore_handler.handle_released(event)
        self._assoc_ae.pop(id(event.assoc), None)

    def start(self):
        try:
            self.logger.info(f"Starting DICOM proxy on port {self.config.port}")
            server_kwargs = {
                'block': False,
                'evt_handlers': self.event_handlers,
            }
            if self.config.tls_enabled:
                ssl_cx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
                ssl_cx.load_cert_chain(
                    certfile=self.config.tls_cert_file,
                    keyfile=self.config.tls_key_file,
                )
                if self.config.tls_ca_file:
                    ssl_cx.verify_mode = ssl.CERT_REQUIRED
                    ssl_cx.load_verify_locations(cafile=self.config.tls_ca_file)
                server_kwargs['ssl_context'] = ssl_cx
                self.logger.info("TLS enabled for DICOM listener")
            self._server = self.ae.start_server(
                ('', self.config.port), **server_kwargs
            )
            self._running = True
            while self._running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            self.logger.info("Received keyboard interrupt")
        except Exception as e:
            self.logger.error(f"Server error: {e}")
            return 1
        finally:
            self.logger.info("Shutting down...")
            self._shutdown()
            self.logger.info("Shutdown complete")
        return 0


def main():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    )
    try:
        proxy = DICOMProxy()
        logging.getLogger().setLevel(proxy.config.log_level)
        proxy.initialize()
        return proxy.start()
    except Exception as e:
        logging.error(f"Failed to start proxy: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

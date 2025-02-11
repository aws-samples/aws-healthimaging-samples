# AWS HealthImaging Metadata Indexing Project

A project that uses EventBridge events to trigger the indexing of metadata of DICOM studies stored in AWS HealthImaging to target data stores in Amazon Aurora MySQL, Amazon Simple Storage Service (Amazon S3) data lake, and OpenSearch.

## Table of Contents

### Solution Architecture

Follow this link for [Solution Architecture](./doc/architecture/README.md).

### Deployment Instructions

Follow this link for [Deployment Instructions](./doc/deployment/README.md).

### Testing Instructions

Follow this link for [Testing Instructions](./doc/testing/README.md).

### Clean Up Instructions

Follow this link for [Clean Up Instructions](./doc/clean_up/README.md).

### Data Models

Each metadata store has a slightly different data model due to the target data store characterisitcs. The data model for each data store is described in the following sections:<br /><br />

- [RDBMS data model and Lambda parser](./doc/data_models/rdbms/README.md)<br /><br />

- [Datalake data model and Lambda parser](./doc/data_models/datalake/README.md)<br /><br />

- [Opensearch data model and Lambda parser](./doc/data_models/opensearch/README.md) <- Not implemented yet.<br /><br />

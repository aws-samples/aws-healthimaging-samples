
# AWS HealthImaging Indexing project

A project to index the metadata of DICOM studies stored in AWS HealthImaging to Aurora MYSQL, AWS S3 Datalake or AWS OpenSearch Service.


## Table of Contents

### Architecture
Follow this link for documentation about the solution architecture [Architecture](./doc/architecture/README.md)

### Solution deployment
Follow this link to know more about this project and how to deploy it in your AWS account: [Deployment](./doc/deployment/README.md)

### Data models
Each mode has a slightly different data model due to the target data store characterisitcs. The data model for each data store is described in the following sections:<br />
- [RDBMS data model and Lambda parser](./doc/data_models/rdbms/README.md)<br /><br />
- [Datalake data model and Lambda parser](./doc/data_models/datalake/README.md)<br /><br />
- [Opensearch data model and Lambda parser](./doc/data_models/opensearch/README.md) <- Not implemented yet.<br /><br />





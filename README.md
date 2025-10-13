# AWS HealthImaging Samples

This monorepo provides examples on working with the [AWS HealthImaging](https://aws.amazon.com/healthimaging) service.

AWS HealthImaging is a new HIPAA-eligible capability that enables healthcare providers and their software partners to easily store, access, and analyze medical images at petabyte scale.

-   [Ingestion](#ingestion)
-   [Validate/Verify](#validateverify)
-   [Retrieval](#retrieval)
-   [Proxies](#proxies)
-   [Front-End](#front-end)
-   [Security](#security)
-   [License](#license)

## Ingestion

### [S3 StoreSCP](s3-storescp) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) ![CDK](https://img.shields.io/badge/cdk-ff9900?style=for-the-badge)

This [AWS CDK](https://aws.amazon.com/cdk/) project implements a DICOM [StoreSCP](https://dicom.nema.org/medical/dicom/current/output/html/part04.html#sect_B.2.2) listener capable of receiving DIMSE messages and storing the received SOP instances as DICOM Part10 files on Amazon S3. The listener is deployed as service on [AWS ECS Fargate](https://aws.amazon.com/fargate/). DICOM Part10 files stored on S3 can then be imported into AWS HealthImaging.

### [DICOM Ingestion From On-Prem to AWS HealthImaging](dicom-ingestion-to-s3-healthimaging/) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) ![CDK](https://img.shields.io/badge/cdk-ff9900?style=for-the-badge)

This AWS CDK project allows to host a DICOM Service to receive data via DICOM-DIMSE and ingest it to S3 and HealthImaging. The on-prem service is hosted as part of [AWS Greengrass IOT service](https://aws.amazon.com/greengrass/). The project also demonstrates how to profile DICOM data, index it into a database and manage a queue of import jobs into AWS HealthImaging.

### [AWS HealthImaging Metadata Index with RDBMS and Datalake (Athena)](metadata-index/) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) ![CDK](https://img.shields.io/badge/cdk-ff9900?style=for-the-badge)

This AWS CDK project allows the indexing of DICOM metadata as it is being imported in AWS HealthImaging. The metadata can be stored in a relational database (RDS MySQL) and/or a data lake (Amazon S3 with [AWS Athena](https://aws.amazon.com/athena/)), enabling with query and analytics capabilities.

## Validate/Verify

### [Pixel Data Verification](pixel-data-verification/) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

This example demonstrates how to use the AWS HealthImaging Pixel Data Verification feature to ensure the image you decoded matches the original DICOM P10 Image.

## Retrieval

### [AHI Batch Image Frame Retrieval](ahi-batch-image-frame-retrieve/) ![C++](https://img.shields.io/badge/c++-%2300599C.svg?style=for-the-badge&logo=c%2B%2B&logoColor=white)

This repository contains a C++ library and command line tool that performs high speed batch image frame retrieval from AWS HealthImaging. These can be used to rapidly download large data sets to support various workflows such as AI/ML training, AI/ML inference, image processing and visualization. This is helpful because existing applications are implemented in a variety of languages and runtimes many of which have limitations related to concurrent downloads and decompression that prevent them from fully utilizing AHI's performance.

## Proxies

### [DICOMWeb QIDO/WADO-RS Proxy](dicomweb-proxy/) ![Python](https://img.shields.io/badge/Python-python?style=for-the-badge&logo=python&logoColor=white)

This Python service allows to query and fetch data store in AWS HealthImaging
 via QIDO-RS and WADO-RS, allowing integration with DICOMWeb clients such as [Weasis](https://weasis.org/en/index.html) , [Osirix](https://www.osirix-viewer.com/),  [KiteWare Volview](https://volview.kitware.com/), [3DSlicer](https://www.slicer.org/) and more...

### [Tile Level Marker (TLM) Proxy](tile-level-marker-proxy/) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![CDK](https://img.shields.io/badge/cdk-ff9900?style=for-the-badge)

This AWS CDK project allows you to retrieve image frames from AWS HealthImaging by using tile level markers (TLM), a feature of high throughput J2K (HTJ2K). This results in faster retrieval times with lower-resolutioned images. Potential workflows includes generating thumbnails and progressive loading of images.

### [Amazon CloudFront Delivery](amazon-cloudfront-delivery/) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![CDK](https://img.shields.io/badge/cdk-ff9900?style=for-the-badge)

This AWS CDK project allows you to retrieve image frames from [Amazon CloudFront](https://aws.amazon.com/cloudfront), a content delivery network (CDN) service built for high performance, security, and developer convenience. Image frames are delivered from AWS HealthImaging to an Amazon CloudFront Point of Presence (PoP) via the AWS network backbone, then delivered to the user. Subsequent retrievals are delivered directly from the PoP, reducing latency and increasing performance.

## Front-End

### [OHIF Viewer integrated to AWS HealthImaging via OIDC](AHI-OIDC-OHIF-installer/) ![CDK](https://img.shields.io/badge/cdk-ff9900?style=for-the-badge)
This [AWS CDK](https://aws.amazon.com/cdk/) project deploys [OHIF viewer](https://github.com/OHIF/Viewers) on [Amazon CloudFront](https://aws.amazon.com/cloudfront). The viewer is integrated to an AWS HealthImaging datastore as DICOMWeb data source, and with [Amazon Cognito](https://aws.amazon.com/pm/cognito/) as the identity provider for authentication via OIDC.


### [AWS HealthImaging Viewer UI](imaging-viewer-ui/) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Amplify](https://img.shields.io/badge/Amplify-ff9900?style=for-the-badge&logo=awsamplify&logoColor=FFFFFF)

This [AWS Amplify](https://aws.amazon.com/amplify/) project deploys a frontend UI with backend authentication that allows you to view imageset metadata and image frames stored in AWS HealthImaging using progressive decoding. You can optionally integrate the [Tile Level Marker (TLM) Proxy](tile-level-marker-proxy/) and/or [Amazon CloudFront Delivery](amazon-cloudfront-delivery/) projects above to load image frames using an alternative method.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

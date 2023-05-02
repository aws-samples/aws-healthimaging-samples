# Amazon HealthLake Imaging Samples

This monorepo provides examples on working with the [Amazon HealthLake Imaging](https://aws.amazon.com/healthlake/imaging) service.

Amazon HealthLake Imaging is a new HIPAA-eligible capability that enables healthcare providers and their software partners to easily store, access, and analyze medical images at petabyte scale.

## Projects

### [Tile Level Marker (TLM) Proxy](tile-level-marker-proxy/)

This [AWS CDK](https://aws.amazon.com/cdk/) project allows you to retrieve image frames from Amazon HealthLake Imaging by using tile level markers (TLM), a feature of high throughput J2K (HTJ2K). This results in faster retrieval times with lower-resolutioned images. Potential workflows includes generating thumbnails and progressive loading of images.

### [Amazon CloudFront Image Frame Delivery](amazon-cloudfront-image-frame-delivery/)

This AWS CDK project allows you to retrieve image frames from [Amazon CloudFront](https://aws.amazon.com/cloudfront), a content delivery network (CDN) service built for high performance, security, and developer convenience. Image frames are delivered from Amazon HealthLake Imaging to an Amazon CloudFront Point of Presence (PoP) via the AWS network backbone, then delivered to the user. Subsequent retrievals are delivered directly from the PoP, reducing latency and increasing performance.

### [Amazon HealthLake Imaging Viewer UI](imaging-viewer-ui/)

This [AWS Amplify](https://aws.amazon.com/amplify/) project deploys a frontend UI with backend authentication that allows you to view imageset metadata and image frames stored in Amazon HealthLake Imaging using progressive decoding. You can optionally integrate the [Tile Level Marker (TLM) Proxy](tile-level-marker-proxy/) and/or [Amazon CloudFront Image Frame Delivery](amazon-cloudfront-image-frame-delivery/) projects above to load image frames using an alternative method.

### [Pixel Data Verification](pixel-data-verification/)

This example demonstrates how to use the Amazon HealthLake Imaging Pixel Data Verification feature to ensure the image you decoded matches the original DICOM P10 Image.

### [S3 StoreSCP](s3-storescp)

This AWS CDK project implements a DICOM [StoreSCP](https://dicom.nema.org/medical/dicom/current/output/html/part04.html#sect_B.2.2) listener capable of receiving DIMSE messages and storing the received SOP instances as DICOM Part10 files on Amazon S3. The listener is deployed as service on [AWS ECS Fargate](https://aws.amazon.com/fargate/). DICOM Part10 files stored on S3 can be then imported into [Amazon HealthLake Imaging](https://aws.amazon.com/healthlake/imaging/).

### [DICOM ingestion from on-prem to Amazon HealthLake Imaging](dicom-ingestion-to-s3-healthlake-imaging/)

This [AWS CDK](https://aws.amazon.com/cdk/) project allows to host a DICOM Service to receive data via DICOM-DIMSE and ingest it to S3 and HealthLake Imaging. The on-prem service is hosted as part of [AWS Greengrass IOT service](https://aws.amazon.com/greengrass/). The project also demonstrates how to profile DICOM data, index it into a database and manage a queue of import jobs into Amazon HealthLake Imaging. 

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

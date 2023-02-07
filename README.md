# Amazon HealthLake Imaging Samples

This monorepo provides examples on working with the [Amazon HealthLake Imaging](https://aws.amazon.com/healthlake/imaging) service.

Amazon HealthLake Imaging is a new HIPAA-eligible capability that enables healthcare providers and their software partners to easily store, access, and analyze medical images at petabyte scale.

## Security Considerations

### Tile Level Maker Proxy

The proxy uses AWS JS SDK v2 in order to import the `medical-imaging` service JSON. Ideally we would use the latest SDK version, v3. This will be available after the service is generally available.

This is an example of what you will find if you run Grype or a similiar CVE scanner:
```
NAME    INSTALLED  FIXED-IN  TYPE  VULNERABILITY   SEVERITY 
events  1.1.1                npm   CVE-2018-25076  Critical  
```

Additionally, traffic between the Application Load Balancer (ALB) and the ECS Fargate containers is not encrypted. This means the requests to the containers and the image frame responses are sent in clear text.

This is demo code that is used to show the art of the possible. This code, with the vulnerabilities above, should not be used in a production system, due to the critical severity of the findings.

## Projects

### [Tile Level Marker (TLM) Proxy](tile-level-marker-proxy/)

This [AWS CDK](https://aws.amazon.com/cdk/) project allows you to retrieve image frames from Amazon HealthLake Imaging by using tile level markers (TLM), a feature of high throughput J2K (HTJ2K). This results in faster retrieval times with lower-resolutioned images. Potential workflows includes generating thumbnails and progressive loading of images.

### [Amazon CloudFront Image Frame Delivery](amazon-cloudfront-image-frame-delivery/)

This AWS CDK project allows you to retrieve image frames from [Amazon CloudFront](https://aws.amazon.com/cloudfront), a content delivery network (CDN) service built for high performance, security, and developer convenience. Image frames are delivered from Amazon HealthLake Imaging to an Amazon CloudFront Point of Presence (PoP) via the AWS network backbone, then delivered to the user. Subsequent retrievals are delivered directly from the PoP, reducing latency and increasing performance.

### [Amazon HealthLake Imaging Viewer UI](imaging-viewer-ui/)

This [AWS Amplify](https://aws.amazon.com/amplify/) project deploys a frontend UI with backend authentication that allows you to view imageset metadata and image frames stored in Amazon HealthLake Imaging using progressive decoding. You can optionally integrate the [Tile Level Marker (TLM) Proxy](tile-level-marker-proxy/) and/or [Amazon CloudFront Image Frame Delivery](amazon-cloudfront-image-frame-delivery/) projects above to load image frames using an alternative method.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

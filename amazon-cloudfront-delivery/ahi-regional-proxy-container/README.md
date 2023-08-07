# Amazon HealthLake Imaging Proxy Container

This container proxies calls to Amazon HealthLake Imaging.

All POST requests are passed on as-is.

GET requests for GetImageSet, GetImageSetMetadata, and GetImageFrame are converted to POST requests. The body of the POST request is generated from the GET request's query parameters. For example, a GET URL with `?imageFrameId=abc` will result in a POST request with a body of `{ "imageFrameId": "abc" }`.

The request is authenticated by a JWT from Cognito. This can be passed in as a Bearer token the in `authorization` or `token` headers, or as a query string with a key of `token`. The container uses its runtime credentials to call HealthLake Imaging.

const DEFAULT_SETTINGS = {
    'app.region': { label: 'US East (N. Virginia)', value: 'us-east-1' },
    'app.controlPlaneEndpointOverride': '',
    'app.dataPlaneEndpointOverride': '',
    'app.apiTiming': { label: 'Off', value: false },
    'cloudfront.posttoget': { label: 'Yes', value: true },
    'viewer.tlmProxyUrl': '',
    'viewer.tlmProxyAuth': {
        label: 'Cognito JWT',
        value: 'cognito_jwt',
    },
    'cloudfront.endpointUrl': '',
    'cloudfront.endpointUrlAuth': {
        label: 'Cognito JWT',
        value: 'cognito_jwt',
    },
};

export { DEFAULT_SETTINGS };

const DEFAULT_SETTINGS = {
    'app.region': { label: 'US East (N. Virginia)', value: 'us-east-1' },
    'app.serviceEndpointOverride': '',
    'app.apiTiming': { label: 'Off', value: false },
    'viewer.tlmProxyUrl': '',
    'viewer.tlmProxyAuth': {
        label: 'Cognito JWT',
        value: 'cognito_jwt',
    },
    'viewer.imageFrameOverrideUrl': '',
    'viewer.imageFrameOverrideAuth': {
        label: 'Cognito JWT',
        value: 'cognito_jwt',
    },
};

export { DEFAULT_SETTINGS };

const appRegionOptions = [
    { label: 'US East (N. Virginia)', value: 'us-east-1' },
    { label: 'US East (Ohio)', value: 'us-east-2', disabled: true },
    { label: 'US West (N. California)', value: 'us-west-1', disabled: true },
    { label: 'US West (Oregon)', value: 'us-west-2', disabled: true },
];

const tlmAuthOptions = [
    { label: 'Cognito JWT', value: 'cognito_jwt' },
    { label: 'None', value: 'none' },
];

const imageFrameOverrideAuthOptions = [
    { label: 'Cognito JWT', value: 'cognito_jwt' },
    { label: 'None', value: 'none' },
];

const onOffOptions = [
    { label: 'On', value: true },
    { label: 'Off', value: false },
];

export { appRegionOptions, tlmAuthOptions, imageFrameOverrideAuthOptions, onOffOptions };

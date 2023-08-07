const appRegionOptions = [
    { label: 'US East (N. Virginia)', value: 'us-east-1' },
    { label: 'US West (Oregon)', value: 'us-west-2', disabled: false },
    { label: 'Europe (Ireland)', value: 'eu-west-1', disabled: false },
    { label: 'Asia Pacific (Sydney)', value: 'ap-southeast-2', disabled: false },
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

const yesNoOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
];

export { appRegionOptions, tlmAuthOptions, imageFrameOverrideAuthOptions, onOffOptions, yesNoOptions };

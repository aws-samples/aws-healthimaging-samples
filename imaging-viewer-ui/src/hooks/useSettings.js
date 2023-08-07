import { useEffect } from 'react';

import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_SETTINGS } from '../consts/defaultSettings';
import { updateConfig } from '../utils/AwsHealthImagingApi';

export function useSettings() {
    const [appSettings, setAppSettings] = useLocalStorage('App-Settings', DEFAULT_SETTINGS);

    // update API config with app settings
    useEffect(() => {
        const region = appSettings['app.region']?.value || 'us-east-1';
        const controlPlaneEndpoint =
            appSettings['app.controlPlaneEndpointOverride'] || `https://medical-imaging.${region}.amazonaws.com`;
        const dataPlaneEndpoint =
            appSettings['app.dataPlaneEndpointOverride'] || `https://runtime-medical-imaging.${region}.amazonaws.com`;
        const cfEndpoint = appSettings['cloudfront.endpointUrl'] || null;
        const cfEndpointAuth = appSettings['cloudfront.endpointUrlAuth']?.value || null;
        const apiTiming = appSettings['app.apiTiming']?.value || false;
        const cfPostToGet =
            typeof appSettings['cloudfront.posttoget']?.value === 'undefined'
                ? false
                : appSettings['cloudfront.posttoget']?.value;

        updateConfig({
            region: region,
            controlPlaneEndpoint: controlPlaneEndpoint,
            dataPlaneEndpoint: dataPlaneEndpoint,
            cfEndpoint: cfEndpoint,
            cfEndpointAuth: cfEndpointAuth,
            cfPostToGet: cfPostToGet,
            apiTiming: apiTiming,
        });
    }, [appSettings]);

    return [appSettings, setAppSettings];
}

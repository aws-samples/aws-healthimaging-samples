import { useState, useEffect, useContext } from 'react';

// Context
import { AppContext } from '../App';

// Router
import { useLocation } from 'react-router-dom';

// Cloudscape
import {
    Button,
    Container,
    ExpandableSection,
    Form,
    Header,
    Link,
    SpaceBetween,
    Spinner,
} from '@cloudscape-design/components';

// App
import { DEFAULT_SETTINGS } from '../../consts/defaultSettings';
import {
    appRegionOptions,
    tlmAuthOptions,
    imageFrameOverrideAuthOptions,
    onOffOptions,
    yesNoOptions,
} from './selectOptions';
import { SettingsSelect, SettingsInput } from './FormComponents';

export default function Settings({ setAppSettings }) {
    const { appSettings, buildCrumb } = useContext(AppContext);
    const location = useLocation();

    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState(appSettings); // make a copy of appSettings, write back it after form validation

    function updateSettings(settingKey, value) {
        setSettings((prevSettings) => ({
            ...prevSettings,
            ...{
                [settingKey]: value,
            },
        }));
    }

    // Set crumbs
    useEffect(() => {
        buildCrumb(location.pathname, ['Settings']);
    }, [buildCrumb, location]);

    function handleResetToDefaults() {
        setSettings(DEFAULT_SETTINGS);
    }

    // reset settings back to appSettings from appContext
    function handleReload() {
        setSettings(appSettings);
    }
    function handleSave() {
        setIsSaving(true);
        setTimeout(() => {
            setAppSettings(settings);
            setIsSaving(false);
            window.location.reload();
        }, 900);
    }

    return (
        <Container
            header={
                <Header variant="h2" description="Settings are saved locally to the browser">
                    Settings
                </Header>
            }
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                }}
            >
                <Form
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button disabled={isSaving} formAction="none" onClick={() => handleReload()}>
                                Reload
                            </Button>
                            <Button disabled={isSaving} variant="primary">
                                {isSaving ? <Spinner /> : 'Save'}
                            </Button>
                        </SpaceBetween>
                    }
                    secondaryActions={
                        <Button disabled={isSaving} formAction="none" onClick={() => handleResetToDefaults()}>
                            Reset to Defaults
                        </Button>
                    }
                >
                    <SpaceBetween direction="vertical" size="m">
                        <SettingsSelect
                            label="AWS HealthImaging Region"
                            options={appRegionOptions}
                            settingKey="app.region"
                            settings={settings}
                            updateSettings={updateSettings}
                        />
                        <ExpandableSection
                            headerText="Global Content Delivery"
                            headerDescription={
                                <>
                                    Use Amazon CloudFront, a content delivery network (CDN) to securely and rapidly
                                    deliver image metadata and frames to anywhere in the world. Refer to the{' '}
                                    <Link
                                        variant="info"
                                        target="_blank"
                                        href="https://github.com/aws-samples/aws-healthimaging-samples/tree/main/amazon-cloudfront-delivery"
                                    >
                                        Amazon CloudFront Delivery
                                    </Link>{' '}
                                    project in the AWS HealthImaging Samples repo on GitHub.
                                </>
                            }
                        >
                            <SpaceBetween direction="vertical" size="m">
                                <SettingsInput
                                    label="Amazon CloudFront Distribution Endpoint Override"
                                    description="This endpoint should proxy AWS HealthImaging calls."
                                    placeholder="https://image-frame-endpoint-override-url"
                                    settingKey="cloudfront.endpointUrl"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    inputArgs={{ inputMode: 'url', type: 'url' }}
                                />
                                <SettingsSelect
                                    label="Amazon CloudFront Distribution Endpoint Override Authentication"
                                    options={imageFrameOverrideAuthOptions}
                                    settingKey="cloudfront.endpointUrlAuth"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    selectArgs={{ disabled: !settings['cloudfront.endpointUrl'] }}
                                />
                                <SettingsSelect
                                    label="Convert POST to GET for GetImageSet, GetImageSetMetadata, and GetImageFrame"
                                    description="Allow CloudFront to cache imageset and imageset metadata along with image frames."
                                    options={yesNoOptions}
                                    settingKey="cloudfront.posttoget"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    selectArgs={{ disabled: !settings['cloudfront.endpointUrl'] }}
                                />
                            </SpaceBetween>
                        </ExpandableSection>
                        <ExpandableSection
                            headerText="Resolution Level Access"
                            headerDescription={
                                <>
                                    Retrieve image frames at discrete, sub-resolutions. Potential use cases include
                                    thumbnails and AI/ML training. Refer to the{' '}
                                    <Link
                                        variant="info"
                                        target="_blank"
                                        href="https://github.com/aws-samples/aws-healthimaging-samples/tree/main/tile-level-marker-proxy"
                                    >
                                        Tile Level Marker
                                    </Link>{' '}
                                    project in the AWS HealthImaging Samples repo on GitHub.
                                </>
                            }
                        >
                            <SpaceBetween direction="vertical" size="m">
                                <SettingsInput
                                    label="Tile Level Marker (TLM) Proxy URL"
                                    description="This endpoint should accept an image frame retrieval URL along with startLevel and endLevel query parameters."
                                    placeholder="https://tlm-proxy-url"
                                    settingKey="viewer.tlmProxyUrl"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    inputArgs={{ inputMode: 'url', type: 'url' }}
                                />
                                <SettingsSelect
                                    label="TLM Proxy Authentication"
                                    options={tlmAuthOptions}
                                    settingKey="viewer.tlmProxyAuth"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    selectArgs={{ disabled: !settings['viewer.tlmProxyUrl'] }}
                                />
                            </SpaceBetween>
                        </ExpandableSection>
                        <ExpandableSection headerText="Advanced">
                            <SpaceBetween direction="vertical" size="m">
                                <SettingsInput
                                    label="Control Plane Endpoint Override"
                                    description="Override the default control plane endpoint URL (https://medical-imaging.<region>.amazonaws.com)."
                                    placeholder="https://medical-imaging.us-east-1.amazonaws.com"
                                    settingKey="app.controlPlaneEndpointOverride"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    inputArgs={{ inputMode: 'url', type: 'url' }}
                                />
                                <SettingsInput
                                    label="Data Plane Endpoint Override"
                                    description="Override the default data plane endpoint URL (https://runtime-medical-imaging.<region>.amazonaws.com)."
                                    placeholder="https://runtime-medical-imaging.us-east-1.amazonaws.com"
                                    settingKey="app.dataPlaneEndpointOverride"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    inputArgs={{ inputMode: 'url', type: 'url' }}
                                />
                                <SettingsSelect
                                    label="API Timing"
                                    description="Print API timing information in the browser console."
                                    options={onOffOptions}
                                    settingKey="app.apiTiming"
                                    settings={settings}
                                    updateSettings={updateSettings}
                                />
                            </SpaceBetween>
                        </ExpandableSection>
                    </SpaceBetween>
                </Form>
            </form>
        </Container>
    );
}

// Cloudscape
import { FormField, Input, Select } from '@cloudscape-design/components';

export function SettingsInput({
    label,
    description,
    placeholder,
    settingKey,
    settings,
    updateSettings,
    inputArgs = {},
}) {
    return (
        <FormField label={label} description={description}>
            <Input
                placeholder={placeholder}
                value={settings[settingKey]}
                onChange={({ detail }) => updateSettings(settingKey, detail.value)}
                {...inputArgs}
            />
        </FormField>
    );
}

export function SettingsSelect({
    label,
    description = '',
    options,
    settingKey,
    settings,
    updateSettings,
    selectArgs = {},
}) {
    return (
        <FormField label={label} description={description}>
            <Select
                selectedOption={settings[settingKey]}
                onChange={({ detail }) => updateSettings(settingKey, detail.selectedOption)}
                options={options}
                {...selectArgs}
            />
        </FormField>
    );
}

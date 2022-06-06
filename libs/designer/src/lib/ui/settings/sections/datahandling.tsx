import { SettingLabel } from './security';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';

export const DataHandling = (): JSX.Element => {
  const requestSchemaValidationLabel = (
    <SettingLabel
      labelText="Schema Validation"
      infoTooltipText="Validate request body against the schema provided. In case there is a mismatch, HTTP 400 will be returned."
      isChild={false}
    />
  );
  const automaticDecompressionLabel = (
    <SettingLabel labelText="Automatic Decompression" infoTooltipText="Automatically decompress gzip response." isChild={false} />
  );

  const dataHandlingSectionProps: SettingSectionProps = {
    id: 'dataHandling',
    title: 'Data Handling',
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly: false,
          defaultChecked: false,
          onToggleInputChange: () => console.log('Automatic Decompression Clicked'),
          label: automaticDecompressionLabel,
          visible: true,
        },
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly: false,
          defaultChecked: false,
          onToggleInputChange: () => console.log(`Schema Validation Clicked`),
          label: requestSchemaValidationLabel,
          visible: true,
        },
      },
    ],
  };

  return <SettingsSection {...dataHandlingSectionProps} />;
};

import type { SectionProps } from '..';
import { SettingLabel, SettingsSection } from '@microsoft/designer-ui';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { useState } from 'react';

export const DataHandling = ({
  requestSchemaValidation,
  disableAutomaticDecompression,
  readOnly /*nodeId*/,
}: SectionProps): JSX.Element => {
  const [automaticDecompression, setAutomaticDecompression] = useState(disableAutomaticDecompression?.value ?? false);
  const [schemaValidation, setSchemaValidation] = useState(requestSchemaValidation?.value ?? false);
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

  const onAutomaticDecompressionChange = (checked: boolean): void => {
    setAutomaticDecompression(checked);
    // validate
    // write to store
  };
  const onSchemaValidationChange = (checked: boolean): void => {
    setSchemaValidation(checked);
    // validate
    // write to store
  };

  const dataHandlingSectionProps: SettingSectionProps = {
    id: 'dataHandling',
    title: 'Data Handling',
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: automaticDecompression,
          onToggleInputChange: (_, checked) => onAutomaticDecompressionChange(!!checked),
          customLabel: () => automaticDecompressionLabel,
          onText: 'On',
          offText: 'Off',
        },
        visible: disableAutomaticDecompression?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: schemaValidation,
          onToggleInputChange: (_, checked) => onSchemaValidationChange(!!checked),
          customLabel: () => requestSchemaValidationLabel,
          onText: 'On',
          offText: 'Off',
        },
        visible: requestSchemaValidation?.isSupported,
      },
    ],
  };

  return <SettingsSection {...dataHandlingSectionProps} />;
};

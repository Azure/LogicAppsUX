import type { SectionProps } from '..';
import { SettingLabel } from './security';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';
import { useState } from 'react';

export const DataHandling = ({
  requestSchemaValidation,
  disableAutomaticDecompression,
  readOnly /*nodeId*/,
}: SectionProps): JSX.Element => {
  const [automaticDecompression, setAutomaticDecompression] = useState(disableAutomaticDecompression);
  const [schemaValidation, setSchemaValidation] = useState(requestSchemaValidation);
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
    // write to store
  };
  const onSchemaValidationChange = (checked: boolean): void => {
    setSchemaValidation(checked);
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
          onToggleInputChange: (_, checked) => onAutomaticDecompressionChange(!!checked), //createHandler
          label: automaticDecompressionLabel,
          visible: disableAutomaticDecompression !== undefined,
        },
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: schemaValidation,
          onToggleInputChange: (_, checked) => onSchemaValidationChange(!!checked),
          customLabel: () => requestSchemaValidationLabel,
          visible: requestSchemaValidation !== undefined,
        },
      },
    ],
  };

  return <SettingsSection {...dataHandlingSectionProps} />;
};

import type { SectionProps } from '..';
import { SettingLabel, SettingsSection } from './';
import type { SettingSectionProps } from './';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const DataHandling = ({ requestSchemaValidation, disableAutomaticDecompression, readOnly }: SectionProps): JSX.Element => {
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
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };
  const onSchemaValidationChange = (checked: boolean): void => {
    setSchemaValidation(checked);
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const intl = useIntl();

  const dataHandlingTitle = intl.formatMessage({
    defaultMessage: 'Data Handling',
    description: 'title for data handling setting section',
  });
  const onText = intl.formatMessage({
    defaultMessage: 'On',
    description: 'label when setting is on',
  });
  const offText = intl.formatMessage({
    defaultMessage: 'Off',
    description: 'label when setting is off',
  });

  const dataHandlingSectionProps: SettingSectionProps = {
    id: 'dataHandling',
    title: dataHandlingTitle,
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: automaticDecompression,
          onToggleInputChange: (_, checked) => onAutomaticDecompressionChange(!!checked),
          customLabel: () => automaticDecompressionLabel,
          onText,
          offText,
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
          onText,
          offText,
        },
        visible: requestSchemaValidation?.isSupported,
      },
    ],
  };

  return <SettingsSection {...dataHandlingSectionProps} />;
};

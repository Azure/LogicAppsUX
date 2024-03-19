import { SettingSectionName, type SectionProps, type ToggleHandler } from '..';
import { SettingsSection } from '../settingsection';
import type { SettingsSectionProps } from '../settingsection';
import { getSettingLabel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface DataHandlingSectionProps extends SectionProps {
  onAutomaticDecompressionChange: ToggleHandler;
  onSchemaValidationChange: ToggleHandler;
}

export const DataHandling = ({
  readOnly,
  expanded,
  requestSchemaValidation,
  disableAutomaticDecompression,
  onSchemaValidationChange,
  onAutomaticDecompressionChange,
  onHeaderClick,
}: DataHandlingSectionProps): JSX.Element => {
  const intl = useIntl();
  const dataHandlingTitle = intl.formatMessage({
    defaultMessage: 'Data Handling',
    id: 'aK4iLW',
    description: 'title for data handling setting section',
  });
  const requestSchemaValidationLabelText = intl.formatMessage({
    defaultMessage: 'Schema Validation',
    id: '7S2wtE',
    description: 'A label for the schema validation setting',
  });
  const requestSchemaValidationLabelTooltip = intl.formatMessage({
    defaultMessage: 'Validate request body against the schema provided. In case there is a mismatch, HTTP 400 will be returned',
    id: 'lsH37F',
    description: 'tool tip explaining what schema validation setting does',
  });
  const automaticDecompressionLabelText = intl.formatMessage({
    defaultMessage: 'Automatic Decompression',
    id: 'BeqBP7',
    description: 'A label for the automatic decompression setting',
  });
  const automaticDecompressionLabelTooltip = intl.formatMessage({
    defaultMessage:
      'Decompress the request body if it is compressed using GZip or Deflate. This setting is only applicable for HTTP trigger',
    id: 'PqUAbF',
    description: 'tool tip explaining what automatic decompression setting does',
  });

  const dataHandlingSectionProps: SettingsSectionProps = {
    id: 'dataHandling',
    title: dataHandlingTitle,
    expanded,
    isReadOnly: readOnly,
    sectionName: SettingSectionName.DATAHANDLING,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: !disableAutomaticDecompression?.value,
          onToggleInputChange: (_, checked) => onAutomaticDecompressionChange(!checked),
          customLabel: getSettingLabel(automaticDecompressionLabelText, automaticDecompressionLabelTooltip),
          inlineLabel: true,
          ariaLabel: automaticDecompressionLabelText,
        },
        visible: disableAutomaticDecompression?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: requestSchemaValidation?.value,
          onToggleInputChange: (_, checked) => onSchemaValidationChange(!!checked),
          customLabel: getSettingLabel(requestSchemaValidationLabelText, requestSchemaValidationLabelTooltip),
          ariaLabel: requestSchemaValidationLabelText,
        },
        visible: requestSchemaValidation?.isSupported,
      },
    ],
  };

  return <SettingsSection {...dataHandlingSectionProps} />;
};

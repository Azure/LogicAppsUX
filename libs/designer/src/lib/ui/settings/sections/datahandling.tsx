import type { SectionProps, ToggleHandler } from '..';
import constants from '../../../common/constants';
import { SettingLabel, SettingsSection } from '../settingsection';
import type { SettingsSectionProps } from '../settingsection';
import { useIntl } from 'react-intl';

export interface DataHandlingSectionProps extends SectionProps {
  onAutomaticDecompressionChange: ToggleHandler;
  onSchemaValidationChange: ToggleHandler;
}

export const DataHandling = ({
  requestSchemaValidation,
  disableAutomaticDecompression,
  readOnly,
  onSchemaValidationChange,
  onAutomaticDecompressionChange,
  expanded,
  onHeaderClick,
}: DataHandlingSectionProps): JSX.Element => {
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

  const requestSchemaValidationLabelText = intl.formatMessage({
    defaultMessage: 'Schema Validation',
    description: 'A label for the schema validation setting',
  });
  const automaticDecompressionLabelText = intl.formatMessage({
    defaultMessage: 'Automatic Decompression',
    description: 'A label for the automatic decompression setting',
  });
  const requestSchemaValidationLabel = (
    <SettingLabel
      labelText={requestSchemaValidationLabelText}
      infoTooltipText={intl.formatMessage({
        defaultMessage: 'Validate request body against the schema provided. In case there is a mismatch, HTTP 400 will be returned.',
        description: 'tool tip explaining what schema validation setting does',
      })}
      isChild={false}
    />
  );
  const automaticDecompressionLabel = (
    <SettingLabel
      labelText={automaticDecompressionLabelText}
      infoTooltipText={intl.formatMessage({
        defaultMessage:
          'Decompress the request body if it is compressed using GZip or Deflate. This setting is only applicable for HTTP trigger.',
        description: 'tool tip explaining what automatic decompression setting does',
      })}
      isChild={false}
    />
  );
  const dataHandlingSectionProps: SettingsSectionProps = {
    id: 'dataHandling',
    title: dataHandlingTitle,
    expanded,
    isReadOnly: readOnly,
    sectionName: constants.SETTINGSECTIONS.DATAHANDLING,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: !disableAutomaticDecompression?.value,
          onToggleInputChange: (_, checked) => onAutomaticDecompressionChange(!checked),
          customLabel: () => automaticDecompressionLabel,
          inlineLabel: true,
          onText,
          offText,
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
          customLabel: () => requestSchemaValidationLabel,
          onText,
          offText,
          ariaLabel: requestSchemaValidationLabelText,
        },
        visible: requestSchemaValidation?.isSupported,
      },
    ],
  };

  return <SettingsSection {...dataHandlingSectionProps} />;
};

import type { SectionProps, ToggleHandler } from '..';
import constants from '../../../common/constants';
import { SettingLabel, SettingsSection } from '../settingsection';
import type { SettingSectionProps } from '../settingsection';
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
    expanded,
    sectionName: constants.SETTINGSECTIONS.DATAHANDLING,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: !disableAutomaticDecompression?.value,
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
          checked: requestSchemaValidation?.value,
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

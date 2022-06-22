import type { SectionProps, ToggleHandler } from '..';
import type { SettingSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { useIntl } from 'react-intl';

export interface SecuritySectionProps extends SectionProps {
  onSecureInputsChange: ToggleHandler;
  onSecureOutputsChange: ToggleHandler;
}

export const Security = ({
  secureInputs,
  secureOutputs,
  readOnly,
  onSecureInputsChange,
  onSecureOutputsChange,
}: SecuritySectionProps): JSX.Element | null => {
  const intl = useIntl();
  const onText = intl.formatMessage({
    defaultMessage: 'On',
    description: 'label when setting is on',
  });
  const offText = intl.formatMessage({
    defaultMessage: 'Off',
    description: 'label when setting is off',
  });
  const secureInputsTitle = intl.formatMessage({
    defaultMessage: 'Secure Inputs',
    description: 'title for the secure inputs setting',
  });
  const secureInputsTooltipText = intl.formatMessage({
    defaultMessage: 'Secure inputs of the operation.',
    description: 'description of the secure inputs setting',
  });
  const secureOutputsTitle = intl.formatMessage({
    defaultMessage: 'Secure Outputs',
    description: 'title for secure outputs setting',
  });
  const secureOutputsTooltipText = intl.formatMessage({
    defaultMessage: 'Secure outputs of the operation and references of output properties.',
    description: 'description of secure outputs setting',
  });
  const securityTitle = intl.formatMessage({
    defaultMessage: 'Security',
    description: 'title of security setting section',
  });

  const secureInputsLabel = <SettingLabel labelText={secureInputsTitle} infoTooltipText={secureInputsTooltipText} isChild={false} />;
  const secureOutputsLabel = <SettingLabel labelText={secureOutputsTitle} infoTooltipText={secureOutputsTooltipText} isChild={false} />;

  const securitySectionProps: SettingSectionProps = {
    id: 'security',
    title: securityTitle,
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: secureInputs?.value,
          onToggleInputChange: (_, checked) => onSecureInputsChange(!!checked),
          customLabel: () => secureInputsLabel,
          onText,
          offText,
        },
        visible: secureInputs?.isSupported, //isSupported fn here
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: secureOutputs?.value,
          onToggleInputChange: (_, checked) => onSecureOutputsChange(!!checked),
          customLabel: () => secureOutputsLabel,
          onText,
          offText,
        },
        visible: secureOutputs?.isSupported, // IsSupported fn here
      },
    ],
  };

  return <SettingsSection {...securitySectionProps} />;
};

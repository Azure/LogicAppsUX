import type { SectionProps } from '..';
import type { SettingSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { useBoolean } from '@fluentui/react-hooks';
import { useIntl } from 'react-intl';

// TODO (andrewfowose): replace hard-set settingProps in Security to data from operationMetadataSlice
export const Security = ({ secureInputs, secureOutputs, readOnly }: SectionProps): JSX.Element | null => {
  const [secureInputsFromState, setSecureInputs] = useBoolean(!!secureInputs?.value);
  const [secureOutputsFromState, setSecureOutputs] = useBoolean(!!secureOutputs?.value);

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

  const onSecureInputsChange = (): void => {
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
    setSecureInputs.toggle();
  };

  const onSecureOutputsChange = (): void => {
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
    setSecureOutputs.toggle();
  };

  const securitySectionProps: SettingSectionProps = {
    id: 'security',
    title: securityTitle,
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: secureInputsFromState,
          onToggleInputChange: () => onSecureInputsChange(),
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
          checked: secureOutputsFromState,
          onToggleInputChange: () => onSecureOutputsChange(),
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

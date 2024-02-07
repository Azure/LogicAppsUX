import type { SectionProps, ToggleHandler } from '..';
import { SettingSectionName } from '..';
import { useOperationInfo } from '../../../core';
import { isSecureOutputsLinkedToInputs } from '../../../core/utils/setting';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { getSettingLabel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface SecuritySectionProps extends SectionProps {
  onSecureInputsChange: ToggleHandler;
  onSecureOutputsChange: ToggleHandler;
}

export const Security = ({
  nodeId,
  expanded,
  readOnly,
  secureInputs,
  secureOutputs,
  onSecureInputsChange,
  onSecureOutputsChange,
  onHeaderClick,
}: SecuritySectionProps): JSX.Element | null => {
  const intl = useIntl();
  const operationInfo = useOperationInfo(nodeId);
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
  const secureInputsDescription = intl.formatMessage({
    defaultMessage: 'Enabling secure inputs will automatically secure outputs.',
    description: 'description of the secure inputs setting',
  });
  const secureInputsTooltipText = intl.formatMessage({
    defaultMessage: 'Secure inputs of the operation',
    description: 'description of the secure inputs setting',
  });
  const secureOutputsTitle = intl.formatMessage({
    defaultMessage: 'Secure Outputs',
    description: 'title for secure outputs setting',
  });
  const secureOutputsTooltipText = intl.formatMessage({
    defaultMessage: 'Secure outputs of the operation and references of output properties',
    description: 'description of secure outputs setting',
  });
  const securityTitle = intl.formatMessage({
    defaultMessage: 'Security',
    description: 'title of security setting section',
  });

  const securitySectionProps: SettingsSectionProps = {
    id: 'security',
    title: securityTitle,
    sectionName: SettingSectionName.SECURITY,
    isReadOnly: readOnly,
    expanded,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: secureInputs?.value,
          onToggleInputChange: (_, checked) => onSecureInputsChange(!!checked),
          customLabel: getSettingLabel(
            secureInputsTitle,
            secureInputsTooltipText,
            isSecureOutputsLinkedToInputs(operationInfo?.type) ? secureInputsDescription : undefined
          ),
          onText,
          offText,
          ariaLabel: secureInputsTitle,
        },
        visible: secureInputs?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: secureOutputs?.value,
          onToggleInputChange: (_, checked) => onSecureOutputsChange(!!checked),
          customLabel: getSettingLabel(secureOutputsTitle, secureOutputsTooltipText),
          onText,
          offText,
          ariaLabel: secureOutputsTitle,
        },
        visible: secureOutputs?.isSupported,
      },
    ],
  };

  return <SettingsSection {...securitySectionProps} />;
};

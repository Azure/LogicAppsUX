import type { SectionProps } from '..';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection, SettingLabel } from '@microsoft/designer-ui';

// TODO (andrewfowose): replace hard-set settingProps in Security to data from operationMetadataSlice
export const Security = ({ secureInputs, secureOutputs, readOnly, nodeId }: SectionProps): JSX.Element | null => {
  const secureInputsLabel = <SettingLabel labelText="Secure Inputs" infoTooltipText="Secure inputs of the operation." isChild={false} />;
  const secureOutputsLabel = (
    <SettingLabel
      labelText="Secure Outputs"
      infoTooltipText="Secure outputs of the operation and references of output properties."
      isChild={false}
    />
  );

  const onSecureInputsChange = (checked: boolean): void => {
    // write to store
    console.log(`Secure Inputs: ${checked}`);
  };

  const onSecureOutputsChange = (checked: boolean): void => {
    if (checked === undefined) return;
    // write to store
    console.log(`secure outputs changed to ${checked} for ${nodeId}`);
  };

  const securitySectionProps: SettingSectionProps = {
    id: 'security',
    title: 'Security',
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          visible: secureInputs?.isSupported, //isSupported fn here
          readOnly,
          checked: secureInputs?.value,
          onToggleInputChange: (_, checked) => onSecureInputsChange(!!checked),
          customLabel: () => secureInputsLabel,
        },
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          visible: secureOutputs?.isSupported, // IsSupported fn here
          readOnly,
          checked: secureOutputs?.value,
          onToggleInputChange: (_, checked) => onSecureOutputsChange(!!checked),
          customLabel: () => secureOutputsLabel,
        },
      },
    ],
  };

  return <SettingsSection {...securitySectionProps} />;
};

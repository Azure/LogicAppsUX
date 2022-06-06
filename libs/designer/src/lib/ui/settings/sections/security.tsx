import { IconButton, TooltipHost } from '@fluentui/react';
import type { IIconProps, IIconStyles } from '@fluentui/react';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface SettingLabelProps {
  labelText: string;
  infoTooltipText?: string;
  isChild: boolean;
}

const infoIconProps: IIconProps = {
  iconName: 'Info',
};

const infoIconStyles: IIconStyles = {
  root: {
    color: '#8d8686',
  },
};

export function SettingLabel({ labelText, infoTooltipText, isChild }: SettingLabelProps): JSX.Element {
  const className = isChild ? 'msla-setting-section-row-child-label' : 'msla-setting-section-row-label';
  if (infoTooltipText) {
    return (
      <div className={className}>
        <div className="msla-setting-section-row-text">{labelText}</div>
        <TooltipHost hostClassName="msla-setting-section-row-info" content={infoTooltipText}>
          <IconButton iconProps={infoIconProps} styles={infoIconStyles} />
        </TooltipHost>
      </div>
    );
  }
  return <div className={className}>{labelText}</div>;
}

// TODO (andrewfowose): replace hard-set settingProps in Security to data from operationMetadataSlice
export const Security = (): JSX.Element => {
  const secureInputsLabel = <SettingLabel labelText="Secure Inputs" infoTooltipText="Secure inputs of the operation." isChild={false} />;
  const secureOutputsLabel = (
    <SettingLabel
      labelText="Secure Outputs"
      infoTooltipText="Secure outputs of the operation and references of output properties."
      isChild={false}
    />
  );

  const securitySectionProps: SettingSectionProps = {
    id: 'security',
    title: 'Security',
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          visible: true,
          readOnly: false, //pull from context
          defaultChecked: false, // pull from context
          onToggleInputChange: () => console.log('checked!'),
          customLabel: () => secureInputsLabel,
        },
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          visible: true,
          readOnly: false,
          defaultChecked: false,
          onToggleInputChange: () => console.log('checked!'),
          customLabel: () => secureOutputsLabel,
        },
      },
    ],
  };

  return <SettingsSection {...securitySectionProps} />;
};

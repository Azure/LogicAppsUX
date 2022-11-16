import type { ICommandBarItemProps } from '@fluentui/react';
import { CommandBar } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface DesignerCommandBarProps {
  onSave(): void;
  onParameters(): void;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({ onSave, onParameters }) => {
  const intl = useIntl();

  const Resources = {
    DESIGNER_SAVE: intl.formatMessage({
      defaultMessage: 'Save',
      description: 'Button text for save',
    }),
    DESIGNER_PARAMETERS: intl.formatMessage({
      defaultMessage: 'Parameters',
      description: 'Button text for parameters',
    }),
  };

  const items: ICommandBarItemProps[] = [
    {
      ariaLabel: Resources.DESIGNER_SAVE,
      iconProps: { iconName: 'Refresh' },
      key: 'Refresh',
      name: Resources.DESIGNER_SAVE,
      onClick: onSave,
    },
    {
      ariaLabel: Resources.DESIGNER_PARAMETERS,
      iconProps: { iconName: 'Parameter' },
      key: 'Parameter',
      name: Resources.DESIGNER_PARAMETERS,
      onClick: onParameters,
    },
  ];

  return <CommandBar items={items} />;
};

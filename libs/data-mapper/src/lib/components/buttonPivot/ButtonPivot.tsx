import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Tab, TabList, tokens, Tooltip } from '@fluentui/react-components';
import { bundleIcon } from '@fluentui/react-icons';
import type { IconType } from 'react-icons/lib';

export interface ButtonPivotProps {
  xPos: string;
  yPos: string;
  buttons: ButtonPivotButtonProps[];
  horizontal: boolean;
  selectedValue: string;
  onTabSelect?: (_event: SelectTabEvent, data: SelectTabData) => void;
}

export interface ButtonPivotButtonProps {
  regularIcon: IconType;
  filledIcon: IconType;
  tooltip: string;
  value: string;
  onClick?: () => void;
}

export const ButtonPivot: React.FC<ButtonPivotProps> = ({
  buttons,
  horizontal,
  xPos,
  yPos,
  selectedValue,
  onTabSelect,
}: ButtonPivotProps) => {
  const stackItems = buttons.map((buttonProps, index) => {
    const BundledIcon = bundleIcon(buttonProps.filledIcon, buttonProps.regularIcon);

    // TODO - Theme buttons on hover
    return (
      <Tooltip key={index} content={buttonProps.tooltip} appearance="inverted" positioning="above-start" relationship="label">
        <Tab icon={<BundledIcon />} {...buttonProps} />
      </Tooltip>
    );
  });

  const tabListStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    backgroundColor: tokens.colorNeutralBackground1,
    top: yPos,
    left: xPos,
  };

  return (
    <TabList
      vertical={!horizontal}
      style={tabListStyle}
      appearance="subtle"
      size="medium"
      onTabSelect={onTabSelect}
      selectedValue={selectedValue}
    >
      {stackItems}
    </TabList>
  );
};

import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Tab, TabList, tokens, Tooltip } from '@fluentui/react-components';
import { bundleIcon } from '@fluentui/react-icons';
import type { IconType } from 'react-icons/lib';

export interface ButtonPivotProps {
  xPos: string;
  yPos: string;
  buttons: ButtonPivotButtonProps[];
  horizontal: boolean;
  selectedValue: string | undefined;
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

    // TODO (refortie) - Theme buttons on hover
    return (
      <Tooltip key={index} content={buttonProps.tooltip} appearance="inverted" positioning="above-start" relationship="label">
        <Tab style={{ border: '0px', borderRadius: tokens.borderRadiusNone }} icon={<BundledIcon />} {...buttonProps} />
      </Tooltip>
    );
  });

  const divContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: 0,
    height: 0,
  };

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
    // Placeholder div so that we can move the stack locally to the spot it's been inserted
    <div style={divContainerStyle}>
      <TabList
        vertical={!horizontal}
        style={tabListStyle}
        appearance="subtle"
        size="small"
        onTabSelect={onTabSelect}
        selectedValue={selectedValue}
      >
        {stackItems}
      </TabList>
    </div>
  );
};

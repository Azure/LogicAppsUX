import { Stack, StackItem } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import { bundleIcon } from '@fluentui/react-icons';
import type { IconType } from 'react-icons/lib';

export interface ButtonContainerProps {
  xPos: string;
  yPos: string;
  buttons: ButtonContainerButtonProps[];
  horizontal: boolean;
}

export interface ButtonContainerButtonProps {
  regularIcon: IconType;
  filledIcon: IconType;
  tooltip: string;
  filled?: boolean;
  onClick: () => void;
}

export const ButtonContainer: React.FC<ButtonContainerProps> = ({ buttons, horizontal, xPos, yPos }: ButtonContainerProps) => {
  const stackItems = buttons.map((buttonProps, index) => {
    const BundledIcon = bundleIcon(buttonProps.filledIcon, buttonProps.regularIcon);

    // TODO (refortie) - Theme buttons on hover
    return (
      <StackItem key={index}>
        <Tooltip content={buttonProps.tooltip} relationship="label" appearance="inverted">
          <Button
            appearance="subtle"
            size="medium"
            style={{ border: '0px', borderRadius: '0px' }}
            icon={<BundledIcon filled={buttonProps.filled} />}
            {...buttonProps}
          />
        </Tooltip>
      </StackItem>
    );
  });

  const stackStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.14), 0px 0px 2px rgba(0, 0, 0, 0.12)',
    borderRadius: '4px',
    top: yPos,
    left: xPos,
  };

  return (
    // Placeholder div so that we can move the stack locally to the spot it's been inserted
    <div style={{ position: 'relative', width: 0, height: 0 }}>
      <Stack horizontal={horizontal} style={stackStyle}>
        {stackItems}
      </Stack>
    </div>
  );
};

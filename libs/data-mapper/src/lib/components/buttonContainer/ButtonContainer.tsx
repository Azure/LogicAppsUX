import { Stack, StackItem } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import { bundleIcon } from '@fluentui/react-icons';
import type { IconType } from 'react-icons/lib';

export interface ButtonContainerProps {
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

export const ButtonContainer: React.FC<ButtonContainerProps> = ({ buttons, horizontal }: ButtonContainerProps) => {
  const stackItems = buttons.map((buttonProps, index) => {
    const BundledIcon = bundleIcon(buttonProps.filledIcon, buttonProps.regularIcon);

    // TODO (refortie) - Theme buttons on hover
    return (
      <StackItem key={index}>
        <Tooltip content={buttonProps.tooltip} relationship="label">
          <Button style={{ border: '0px', borderRadius: '0px' }} icon={<BundledIcon filled={buttonProps.filled} />} {...buttonProps} />
        </Tooltip>
      </StackItem>
    );
  });

  const stackStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 5,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.14), 0px 0px 2px rgba(0, 0, 0, 0.12)',
    borderRadius: '4px',
    bottom: '16px',
    left: '16px',
  };

  return (
    <Stack horizontal={horizontal} style={stackStyle}>
      {stackItems}
    </Stack>
  );
};

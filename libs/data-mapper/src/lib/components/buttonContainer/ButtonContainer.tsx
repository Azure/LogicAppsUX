import { Stack, StackItem } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import { bundleIcon } from '@fluentui/react-icons';
import { useMemo } from 'react';
import type { IconType } from 'react-icons/lib';

export interface ButtonContainerProps {
  buttons: ButtonContainerButtonProps[];
  horizontal: boolean;
  xPos: string;
  yPos: string;
  anchorToBottom?: boolean;
}

export interface ButtonContainerButtonProps {
  regularIcon: IconType;
  filledIcon: IconType;
  tooltip: string;
  filled?: boolean;
  onClick: () => void;
}

export const ButtonContainer: React.FC<ButtonContainerProps> = ({
  buttons,
  horizontal,
  xPos,
  yPos,
  anchorToBottom,
}: ButtonContainerProps) => {
  const stackItems = useMemo(() => {
    return buttons.map((buttonProps, index) => {
      const BundledIcon = bundleIcon(buttonProps.filledIcon, buttonProps.regularIcon);

      // TODO - Theme buttons on hover
      return (
        <StackItem key={index}>
          <Tooltip content={buttonProps.tooltip} relationship="label">
            <Button
              style={{ border: '0px', borderRadius: '0px' }}
              // True/undefined below to stop errors about native elements having boolean values until FluentUI fixes
              icon={<BundledIcon filled={buttonProps.filled ? true : undefined} />}
              onClick={buttonProps.onClick}
            />
          </Tooltip>
        </StackItem>
      );
    });
  }, [buttons]);

  const stackStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 5,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.14), 0px 0px 2px rgba(0, 0, 0, 0.12)',
    borderRadius: '4px',
    left: xPos,
  };

  if (anchorToBottom) {
    stackStyle.bottom = yPos;
  } else {
    stackStyle.top = yPos;
  }

  return (
    <Stack horizontal={horizontal} style={stackStyle}>
      {stackItems}
    </Stack>
  );
};

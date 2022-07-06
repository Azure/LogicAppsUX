import type { IButtonProps } from '@fluentui/react';
import { IconButton, Stack, StackItem } from '@fluentui/react';

export interface ButtonContainerProps {
  xPos: string;
  yPos: string;
  buttons: IButtonProps[];
  horizontal: boolean;
}

export const ButtonContainer: React.FC<ButtonContainerProps> = ({ buttons, horizontal, xPos, yPos }: ButtonContainerProps) => {
  const stackItems = buttons.map((buttonProps, index) => {
    return (
      <StackItem key={index}>
        <IconButton {...buttonProps} style={{ color: '#000', background: '#fff' }} />
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

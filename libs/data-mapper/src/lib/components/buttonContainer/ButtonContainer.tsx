import type { IButtonProps } from '@fluentui/react';
import { IconButton, Stack, StackItem } from '@fluentui/react';
import { makeStyles } from '@fluentui/react-components';

export interface ButtonContainerProps {
  xPos: string;
  yPos: string;
  buttons: IButtonProps[];
  horizontal: boolean;
}

const styling = makeStyles({
  root: {
    color: '#000',
    backgroundColor: '#fff',
    '&:hover': {
      backgroundColor: '#F5F5F5',
    },
    '&:active': {
      backgroundColor: '#E0E0E0',
    },
  },
});

export const ButtonContainer: React.FC<ButtonContainerProps> = ({ buttons, horizontal, xPos, yPos }: ButtonContainerProps) => {
  const stackItems = buttons.map((buttonProps, index) => {
    const mergedProps = {
      ...buttonProps,
      className: styling().root,
    };

    return (
      <StackItem key={index}>
        <IconButton {...mergedProps} />
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

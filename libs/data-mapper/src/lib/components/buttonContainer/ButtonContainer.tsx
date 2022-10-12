import { Stack, StackItem } from '@fluentui/react';
import { Button, makeStyles, shorthands, tokens, Tooltip } from '@fluentui/react-components';
import { bundleIcon } from '@fluentui/react-icons';
import { useMemo } from 'react';
import type { IconType } from 'react-icons/lib';

const useStyles = makeStyles({
  btnContainer: {
    position: 'absolute',
    zIndex: 5,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow4,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

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

export const ButtonContainer = (props: ButtonContainerProps) => {
  const { buttons, horizontal, xPos, yPos, anchorToBottom } = props;
  const styles = useStyles();

  const stackItems = useMemo(() => {
    return buttons.map((buttonProps, index) => {
      const BundledIcon = bundleIcon(buttonProps.filledIcon, buttonProps.regularIcon);

      // TODO - Theme buttons on hover
      return (
        <StackItem key={index}>
          <Tooltip content={buttonProps.tooltip} relationship="label">
            <Button
              style={{ border: '0px', borderRadius: '0px', color: buttonProps.filled ? tokens.colorBrandForeground1 : undefined }}
              // True/undefined below to stop errors about native elements having boolean values until FluentUI fixes
              icon={<BundledIcon filled={buttonProps.filled ? true : undefined} />}
              onClick={buttonProps.onClick}
              appearance="subtle"
            />
          </Tooltip>
        </StackItem>
      );
    });
  }, [buttons]);

  const stackStyle: React.CSSProperties = {
    left: xPos,
    bottom: anchorToBottom ? yPos : undefined,
    top: anchorToBottom ? undefined : yPos,
  };

  return (
    <Stack horizontal={horizontal} className={styles.btnContainer} style={stackStyle}>
      {stackItems}
    </Stack>
  );
};

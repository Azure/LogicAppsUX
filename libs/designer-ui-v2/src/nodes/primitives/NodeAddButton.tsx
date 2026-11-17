import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { AddCircle20Regular } from '@fluentui/react-icons';
import { nodeMetrics } from '../metrics';
import { defaultNodeStrings } from '../strings';

const useStyles = makeStyles({
  button: {
    minWidth: 0,
    width: `${nodeMetrics.actionAdd.buttonWidth}px`,
    height: `${nodeMetrics.actionAdd.buttonHeight}px`,
    paddingInline: 0,
    color: tokens.colorNeutralForeground4,
  },
});

export interface NodeAddButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  label?: string;
}

/** Canonical standalone ActionAdd button; the host supplies any routed terminal path. */
export const NodeAddButton = forwardRef<HTMLButtonElement, NodeAddButtonProps>(function NodeAddButton(
  { label = defaultNodeStrings.addAction, onClick, disabled, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <Button
      {...rest}
      ref={ref}
      type="button"
      shape="circular"
      className={mergeClasses(styles.button, className)}
      appearance="subtle"
      icon={<AddCircle20Regular />}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      disabled={disabled || !onClick}
    />
  );
});

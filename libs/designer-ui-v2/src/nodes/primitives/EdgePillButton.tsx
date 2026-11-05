import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens, Tooltip } from '@fluentui/react-components';
import { nodeMetrics } from '../metrics';

const useStyles = makeStyles({
  button: {
    width: `${nodeMetrics.edgeControl.pillSize}px`,
    height: `${nodeMetrics.edgeControl.pillSize}px`,
    minWidth: `${nodeMetrics.edgeControl.pillSize}px`,
    padding: 0,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'opacity, transform',
    transitionDuration: tokens.durationFast,
    transitionTimingFunction: tokens.curveEasyEase,
    cursor: 'pointer',
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
    '@media (forced-colors: active)': { ...shorthands.borderColor('ButtonText'), backgroundColor: 'Canvas', color: 'ButtonText' },
    ':focus-visible': { opacity: 1, transform: 'scale(1)', pointerEvents: 'auto' },
  },
  hidden: { opacity: 0, transform: 'scale(0.8)', pointerEvents: 'none' },
  visible: { opacity: 1, transform: 'scale(1)' },
});

export interface EdgePillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  icon: ReactElement;
  tooltip: string;
  ariaLabel: string;
  /** Hidden controls remain in the tab order and reveal on keyboard focus. */
  isRevealed: boolean;
  /** Unavailable callbacks retain a disabled affordance rather than an inert button. */
  onActivate?: () => void;
}

/** Canonical Otto edge hover-reveal pill. Host owns placement, enlarged hit area and reveal state. */
export const EdgePillButton = forwardRef<HTMLButtonElement, EdgePillButtonProps>(function EdgePillButton(
  { icon, tooltip, ariaLabel, isRevealed, onActivate, disabled, className, onKeyDown, onKeyUp, onMouseDown, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <Tooltip content={tooltip} relationship="label">
      <Button
        {...rest}
        ref={ref}
        type="button"
        shape="circular"
        className={mergeClasses(styles.button, isRevealed ? styles.visible : styles.hidden, className)}
        icon={icon}
        onClick={(event) => {
          event.stopPropagation();
          onActivate?.();
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
          onMouseDown?.(event);
        }}
        onKeyDown={(event) => {
          // Native Button activation synthesizes one click for Enter/Space; don't invoke twice.
          if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
          }
          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
          }
          onKeyUp?.(event);
        }}
        aria-label={ariaLabel}
        appearance="subtle"
        size="small"
        disabled={disabled || !onActivate}
      />
    </Tooltip>
  );
});

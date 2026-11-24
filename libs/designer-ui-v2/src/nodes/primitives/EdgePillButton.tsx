import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactElement } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens, Tooltip } from '@fluentui/react-components';
import type { PositioningShorthand } from '@fluentui/react-components';
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
  // Resting-visible mode: a neutral affordance that is always discoverable. Emphasis only changes color, never
  // geometry, so the control does not shift under the pointer between rest and hover.
  resting: {
    color: tokens.colorNeutralForeground2,
    ':hover': { ...shorthands.borderColor(tokens.colorBrandStroke1), color: tokens.colorBrandForeground1 },
    ':hover:active': { ...shorthands.borderColor(tokens.colorBrandStroke1), color: tokens.colorBrandForeground1 },
    ':focus-visible': { ...shorthands.borderColor(tokens.colorBrandStroke1), color: tokens.colorBrandForeground1 },
  },
  emphasized: { ...shorthands.borderColor(tokens.colorBrandStroke1), color: tokens.colorBrandForeground1 },
  masked: {
    backgroundColor: 'var(--node-edge-mask-color)',
    ':hover': { backgroundColor: 'var(--node-edge-mask-color)' },
    ':active': { backgroundColor: 'var(--node-edge-mask-color)' },
    // Keep the mask in CSS rather than inline background paint so system colors win in every state.
    '@media (forced-colors: active)': {
      backgroundColor: 'Canvas',
      ':hover': { backgroundColor: 'Canvas' },
      ':active': { backgroundColor: 'Canvas' },
    },
  },
});

export interface EdgePillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  icon: ReactElement;
  tooltip: string;
  ariaLabel: string;
  /** Hidden controls remain in the tab order and reveal on keyboard focus. */
  isRevealed: boolean;
  /** Unavailable callbacks retain a disabled affordance rather than an inert button. */
  onActivate?: () => void;
  /** Optional canvas-colored mask for the line behind the pill. System colors remain authoritative. */
  maskColor?: string;
  /**
   * Appearance while not revealed. `hidden` (default) is the Otto hover-reveal pill. `visible` keeps a neutral pill
   * on screen at rest and uses `isRevealed` (or hover/focus) only for brand emphasis.
   */
  restingVisibility?: 'hidden' | 'visible';
  /** Tooltip placement. `side` anchors beside the pill (flipping when blocked) so it does not cover the upstream node. */
  tooltipPlacement?: 'above' | 'side';
}

// Side placement keeps the label off the vertical edge axis where the upstream and downstream nodes sit.
const sideTooltipPositioning: PositioningShorthand = { position: 'after', fallbackPositions: ['before', 'below', 'above'] };

/** Canonical Otto edge hover-reveal pill. Host owns placement, enlarged hit area and reveal state. */
export const EdgePillButton = forwardRef<HTMLButtonElement, EdgePillButtonProps>(function EdgePillButton(
  {
    icon,
    tooltip,
    ariaLabel,
    isRevealed,
    onActivate,
    maskColor,
    restingVisibility = 'hidden',
    tooltipPlacement = 'above',
    disabled,
    className,
    style,
    onKeyDown,
    onKeyUp,
    onMouseDown,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const restingVisible = restingVisibility === 'visible';
  return (
    <Tooltip content={tooltip} relationship="label" positioning={tooltipPlacement === 'side' ? sideTooltipPositioning : undefined}>
      <Button
        {...rest}
        ref={ref}
        type="button"
        shape="circular"
        data-resting-visibility={restingVisibility}
        className={mergeClasses(
          styles.button,
          isRevealed || restingVisible ? styles.visible : styles.hidden,
          restingVisible && styles.resting,
          restingVisible && isRevealed && styles.emphasized,
          maskColor !== undefined && styles.masked,
          className
        )}
        style={{ '--node-edge-mask-color': maskColor, ...style } as CSSProperties}
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

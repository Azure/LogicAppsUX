import { forwardRef, useContext } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { nodeMetrics } from '../metrics';
import { defaultBranchTakenString, defaultNodeStrings } from '../strings';
import type { NodeLabeledHandleBranch } from '../types';
import { NodeInactiveContext, useNodeHandleAxis } from './NodeHandle';

const useStyles = makeStyles({
  outputs: {
    position: 'absolute',
    top: '50%',
    left: `calc(100% + ${tokens.strokeWidthThin} + ${tokens.spacingHorizontalXXS})`,
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  outputsVertical: {
    position: 'absolute',
    top: `calc(100% + ${tokens.strokeWidthThin} + ${tokens.spacingVerticalXXS})`,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'row',
    gap: tokens.spacingHorizontalL,
  },
  output: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    height: `${nodeMetrics.handle.labeledHeight}px`,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  outputVertical: { flexDirection: 'column', gap: tokens.spacingVerticalXS, height: 'auto' },
  inactive: { opacity: nodeMetrics.inactiveOpacity },
  // Visually hidden but announced; avoids a new visible caption on the tight output rail.
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  tick: {
    flexShrink: 0,
    width: tokens.strokeWidthThick,
    height: `${nodeMetrics.handle.size}px`,
    borderRadius: tokens.borderRadiusCircular,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  tickVertical: { width: `${nodeMetrics.handle.size}px`, height: tokens.strokeWidthThick },
  tickTrue: { backgroundColor: tokens.colorStatusSuccessBorder2 },
  tickFalse: { backgroundColor: tokens.colorStatusDangerBorder2 },
  slot: {
    position: 'relative',
    display: 'block',
    flexShrink: 0,
    width: `${nodeMetrics.handle.size}px`,
    height: `${nodeMetrics.handle.size}px`,
    marginInlineStart: `calc(-1 * ${tokens.spacingHorizontalXS})`,
  },
  slotVertical: { marginInlineStart: '0', marginTop: `calc(-1 * ${tokens.spacingVerticalXXS})` },
});

export interface NodeBranchOutputsProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Display order: top to bottom, or left to right on the vertical axis. */
  branches: readonly NodeLabeledHandleBranch[];
  /** Literal captions by index; omitted entries use the default branch strings. */
  labels?: readonly string[];
  /** Host-owned real-handle content placed after each caption, matched by index. */
  slots?: readonly ReactNode[];
  /** Index of the branch that ran; omission leaves every branch undimmed. */
  activeIndex?: number;
  /** Formats the announced phrase for the taken branch; defaults to English "<label>, branch taken". */
  takenLabel?: (label: string) => string;
}

/** If outputs in display order; hosts own real handles passed through slots. */
export const NodeBranchOutputs = forwardRef<HTMLSpanElement, NodeBranchOutputsProps>(function NodeBranchOutputs(
  { branches, labels, slots, activeIndex, takenLabel = defaultBranchTakenString, className, ...rest },
  ref
) {
  const styles = useStyles();
  const axis = useNodeHandleAxis();
  const isVertical = axis === 'vertical';
  // An inactive card already dims everything inside it; dimming untaken outputs again would compound.
  const ancestorInactive = useContext(NodeInactiveContext);
  return (
    <span {...rest} ref={ref} className={mergeClasses(isVertical ? styles.outputsVertical : styles.outputs, className)} data-axis={axis}>
      {branches.map((branch, index) => {
        const inactive = activeIndex !== undefined && index !== activeIndex;
        const taken = activeIndex !== undefined && index === activeIndex;
        const label = labels?.[index] ?? defaultNodeStrings.branch[branch];
        return (
          <span
            key={`${branch}-${index}`}
            className={mergeClasses(styles.output, isVertical && styles.outputVertical, inactive && !ancestorInactive && styles.inactive)}
            data-branch={branch}
            data-inactive={inactive || undefined}
            data-taken={taken || undefined}
          >
            <span
              className={mergeClasses(
                styles.tick,
                isVertical && styles.tickVertical,
                branch === 'true' ? styles.tickTrue : styles.tickFalse
              )}
              aria-hidden="true"
            />
            {/* One caption child keeps the tick -> caption -> slot anatomy; the taken phrase is one localizable string. */}
            <span>
              {taken ? (
                <>
                  <span aria-hidden="true">{label}</span>
                  <span className={styles.srOnly}>{takenLabel(label)}</span>
                </>
              ) : (
                label
              )}
            </span>
            <span className={mergeClasses(styles.slot, isVertical && styles.slotVertical)}>{slots?.[index]}</span>
          </span>
        );
      })}
    </span>
  );
});

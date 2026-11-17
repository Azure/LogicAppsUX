import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { NodeRunAfterStatus, NodeRunAfterStrings } from '../strings';
import { defaultNodeRunAfterStrings } from '../strings';

/** Fixed visual order (matches the legacy traffic light) so dot position alone conveys the status. */
const runAfterOrder: readonly NodeRunAfterStatus[] = ['succeeded', 'timedOut', 'skipped', 'failed'];

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  dot: {
    boxSizing: 'border-box',
    width: '6px',
    height: '6px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke1),
    backgroundColor: 'transparent',
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  // Filled vs. hollow carries the meaning; color is reinforcement and forced-colors keeps the fill.
  succeeded: { backgroundColor: tokens.colorStatusSuccessBackground3, ...shorthands.borderColor(tokens.colorStatusSuccessBorder2) },
  timedOut: { backgroundColor: tokens.colorStatusWarningBackground3, ...shorthands.borderColor(tokens.colorStatusWarningBorder2) },
  skipped: { backgroundColor: tokens.colorNeutralForeground3, ...shorthands.borderColor(tokens.colorNeutralStroke1) },
  failed: { backgroundColor: tokens.colorStatusDangerBackground3, ...shorthands.borderColor(tokens.colorStatusDangerBorder2) },
  // Without forcedColorAdjust the UA repaints the fill as Canvas, erasing filled vs. hollow.
  filledForced: { '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'CanvasText' } },
  collapsed: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '1',
    color: tokens.colorNeutralForeground2,
  },
});

export interface NodeRunAfterIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Statuses the downstream action runs after; duplicates and unknown values are ignored. */
  statuses: readonly NodeRunAfterStatus[];
  /** When set, renders a compact `×N` summary instead of dots (host decides the collapse threshold). */
  collapsedCount?: number;
  strings?: NodeRunAfterStrings;
}

/**
 * Run-after summary for an edge. Pure presentation: the host supplies statuses and positions it;
 * the accessible name is the full localized summary so no host-specific tooltip is required.
 */
export const NodeRunAfterIndicator = forwardRef<HTMLSpanElement, NodeRunAfterIndicatorProps>(function NodeRunAfterIndicator(
  { statuses, collapsedCount, strings = defaultNodeRunAfterStrings, className, ...rest },
  ref
) {
  const styles = useStyles();
  const included = new Set(statuses);

  if (collapsedCount !== undefined && Number.isFinite(collapsedCount) && collapsedCount > 0) {
    const total = Math.trunc(collapsedCount);
    return (
      <span
        {...rest}
        ref={ref}
        role="img"
        aria-label={strings.collapsed(total)}
        className={mergeClasses(styles.root, className)}
        data-run-after="collapsed"
      >
        <span className={styles.collapsed} aria-hidden="true">{`×${total}`}</span>
      </span>
    );
  }

  const labels = runAfterOrder.filter((status) => included.has(status)).map((status) => strings.status[status]);
  return (
    <span
      {...rest}
      ref={ref}
      role="img"
      aria-label={strings.summary(labels)}
      className={mergeClasses(styles.root, className)}
      data-run-after=""
    >
      {runAfterOrder.map((status) => {
        const filled = included.has(status);
        return (
          <span
            key={status}
            aria-hidden="true"
            className={mergeClasses(styles.dot, filled && styles[status], filled && styles.filledForced)}
            data-run-after-status={status}
            data-filled={filled || undefined}
          />
        );
      })}
    </span>
  );
});

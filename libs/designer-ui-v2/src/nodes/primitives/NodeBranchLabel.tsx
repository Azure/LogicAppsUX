import { forwardRef, useContext } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { nodeMetrics } from '../metrics';
import { defaultBranchTakenString } from '../strings';
import { NodeInactiveContext } from './NodeHandle';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  inactive: { opacity: nodeMetrics.inactiveOpacity },
  tick: {
    flexShrink: 0,
    height: `${nodeMetrics.handle.size}px`,
    borderRadius: tokens.borderRadiusCircular,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  tickNeutral: { width: tokens.strokeWidthThin, backgroundColor: tokens.colorNeutralStroke1 },
  tickSuccess: { width: tokens.strokeWidthThick, backgroundColor: tokens.colorStatusSuccessBorder2 },
  tickDanger: { width: tokens.strokeWidthThick, backgroundColor: tokens.colorStatusDangerBorder2 },
  action: { display: 'inline-flex', marginInlineStart: tokens.spacingHorizontalXS },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});

export interface NodeBranchLabelStrings {
  /** Defaults to English "<label>, branch taken". */
  taken?: (label: string) => string;
}

export interface NodeBranchLabelProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  label: string;
  tone?: 'success' | 'danger' | 'neutral';
  state?: 'taken' | 'notTaken';
  action?: ReactNode;
  strings?: NodeBranchLabelStrings;
}

/** Host-owned branch caption chip; this primitive never positions path geometry or commands. */
export const NodeBranchLabel = forwardRef<HTMLSpanElement, NodeBranchLabelProps>(function NodeBranchLabel(
  { label, tone = 'neutral', state, action, strings, className, ...rest },
  ref
) {
  const styles = useStyles();
  const ancestorInactive = useContext(NodeInactiveContext);
  const takenLabel = strings?.taken ?? defaultBranchTakenString;
  const notTaken = state === 'notTaken';
  const taken = state === 'taken';
  return (
    <span {...rest} ref={ref} className={mergeClasses(styles.root, notTaken && !ancestorInactive && styles.inactive, className)}>
      <span
        className={mergeClasses(
          styles.tick,
          tone === 'success' ? styles.tickSuccess : tone === 'danger' ? styles.tickDanger : styles.tickNeutral
        )}
        aria-hidden="true"
      />
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
      {action != null && action !== false ? <span className={styles.action}>{action}</span> : null}
    </span>
  );
});

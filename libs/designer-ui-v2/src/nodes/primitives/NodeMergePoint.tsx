import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { NodeMergePointStrings } from '../strings';
import { defaultNodeStrings } from '../strings';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${nodeMetrics.mergePoint.size}px`,
    height: `${nodeMetrics.mergePoint.size}px`,
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.border(`${nodeMetrics.handle.stroke}px`, 'solid', tokens.colorNeutralStroke1),
    backgroundColor: designerUiTokens.nodeHandleBackground,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  dot: {
    width: `${nodeMetrics.mergePoint.dot}px`,
    height: `${nodeMetrics.mergePoint.dot}px`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralForeground3,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  inactive: { opacity: 0.4 },
});
export interface NodeMergePointProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  inactive?: boolean;
  strings?: NodeMergePointStrings;
}

/** Canonical branch junction. Children retain the host's real input/output ports. */
export const NodeMergePoint = forwardRef<HTMLSpanElement, NodeMergePointProps>(function NodeMergePoint(
  { label, inactive = false, children, className, strings = defaultNodeStrings.merge, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <span
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, inactive && styles.inactive, className)}
      role="img"
      aria-label={strings.label(label)}
      data-node-card="merge"
    >
      <span className={styles.dot} />
      {children}
    </span>
  );
});

import { forwardRef, useContext } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { NodeMergePointStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { NodeInactiveContext } from './NodeHandle';

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
  inactive: { opacity: nodeMetrics.inactiveOpacity },
  hiddenCircle: {
    // Preserve the anchor box and children; only its circular paint is suppressed.
    ...shorthands.borderColor('transparent'),
    backgroundColor: 'transparent',
    '@media (forced-colors: active)': { ...shorthands.borderColor('transparent') },
  },
});
export interface NodeMergePointProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  inactive?: boolean;
  /** Hides the visual circle while preserving mounted convergence children passed by the host. */
  showCircle?: boolean;
  strings?: NodeMergePointStrings;
}

/** Canonical branch junction. Children retain the host's real input/output ports. */
export const NodeMergePoint = forwardRef<HTMLSpanElement, NodeMergePointProps>(function NodeMergePoint(
  { label, inactive = false, showCircle = true, children, className, strings = defaultNodeStrings.merge, ...rest },
  ref
) {
  const styles = useStyles();
  // Same single-dim rule as NodeHandle: an inactive ancestor already applied the opacity, and
  // ports rendered as children must not dim a second time inside an inactive junction.
  const ancestorInactive = useContext(NodeInactiveContext);
  const dimmed = inactive && !ancestorInactive;
  return (
    <span
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, !showCircle && styles.hiddenCircle, dimmed && styles.inactive, className)}
      role="img"
      aria-label={strings.label(label)}
      data-node-card="merge"
      data-inactive={inactive || undefined}
    >
      {showCircle ? <span className={styles.dot} /> : null}
      <NodeInactiveContext.Provider value={inactive || ancestorInactive}>{children}</NodeInactiveContext.Provider>
    </span>
  );
});

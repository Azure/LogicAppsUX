import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import { defaultNodeStrings } from '../strings';
import type { NodeLabeledHandleBranch } from '../types';
import { NodeLine } from './NodeLine';
const useStyles = makeStyles({
  root: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS, height: `${nodeMetrics.handle.labeledHeight}px` },
  label: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground4,
  },
  dot: {
    display: 'block',
    boxSizing: 'border-box',
    flexShrink: 0,
    width: `${nodeMetrics.handle.size}px`,
    height: `${nodeMetrics.handle.size}px`,
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth(`${nodeMetrics.handle.stroke}px`),
    backgroundColor: designerUiTokens.nodeHandleBackground,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText'), backgroundColor: 'Canvas' },
  },
  trueDot: { ...shorthands.borderColor(tokens.colorStatusSuccessBorder2) },
  falseDot: { ...shorthands.borderColor(tokens.colorStatusDangerBorder2) },
});
export interface NodeLabeledHandleProps extends HTMLAttributes<HTMLSpanElement> {
  branch: NodeLabeledHandleBranch;
  label?: string;
  lineLength?: number;
}
export const NodeLabeledHandle = forwardRef<HTMLSpanElement, NodeLabeledHandleProps>(function NodeLabeledHandle(
  { branch, label, lineLength = 52, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <span {...rest} ref={ref} className={mergeClasses(styles.root, className)} data-branch={branch}>
      <span className={styles.label}>
        <span className={mergeClasses(styles.dot, branch === 'true' ? styles.trueDot : styles.falseDot)} aria-hidden="true" />
        {label ?? defaultNodeStrings.branch[branch]}
      </span>
      <NodeLine variant={branch === 'true' ? 'dashedSuccess' : 'dashedDanger'} length={lineLength} />
    </span>
  );
});

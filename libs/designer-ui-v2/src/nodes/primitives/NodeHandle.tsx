import { createContext, forwardRef, useContext } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { NodeHandleVariant } from '../types';

const useStyles = makeStyles({
  dot: {
    position: 'relative',
    display: 'block',
    boxSizing: 'border-box',
    flexShrink: 0,
    width: `${nodeMetrics.handle.size}px`,
    height: `${nodeMetrics.handle.size}px`,
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderStyle('solid'),
    backgroundColor: designerUiTokens.nodeHandleBackground,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText'), backgroundColor: 'Canvas' },
  },
  neutral: { ...shorthands.borderWidth(`${nodeMetrics.handle.stroke}px`), ...shorthands.borderColor(tokens.colorNeutralStroke1) },
  success: { ...shorthands.borderWidth(tokens.strokeWidthThick), ...shorthands.borderColor(tokens.colorStatusSuccessForeground1) },
  danger: { ...shorthands.borderWidth(tokens.strokeWidthThick), ...shorthands.borderColor(tokens.colorStatusDangerForeground1) },
  inactive: { opacity: 0.4 },
  input: { position: 'absolute', top: '50%', left: `${nodeMetrics.handle.edgeOffset}px`, transform: 'translateY(-50%)' },
  inputVertical: { position: 'absolute', top: `${nodeMetrics.handle.edgeOffset}px`, left: '50%', transform: 'translateX(-50%)' },
  outputs: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    alignSelf: 'center',
    marginRight: `calc(-1 * ${tokens.spacingHorizontalL} + ${nodeMetrics.handle.edgeOffset}px)`,
  },
  tight: { gap: tokens.spacingVerticalS, marginBlock: `calc(-1 * ${tokens.spacingVerticalL})` },
  loose: { gap: tokens.spacingVerticalL },
  outputsVertical: {
    position: 'absolute',
    bottom: `${nodeMetrics.handle.edgeOffset}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'row',
  },
  tightVertical: { gap: tokens.spacingHorizontalS },
  looseVertical: { gap: tokens.spacingHorizontalL },
});
export type NodeHandleAxis = 'horizontal' | 'vertical';
export const NodeHandleAxisContext = createContext<NodeHandleAxis>('horizontal');
export const useNodeHandleAxis = () => useContext(NodeHandleAxisContext);
export interface NodeHandleProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: NodeHandleVariant;
  inactive?: boolean;
}
export const NodeHandle = forwardRef<HTMLSpanElement, NodeHandleProps>(function NodeHandle(
  { variant = 'neutral', inactive = false, className, children, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <span
      {...rest}
      ref={ref}
      className={mergeClasses(styles.dot, styles[variant], inactive && styles.inactive, className)}
      data-handle={variant}
      data-inactive={inactive || undefined}
      aria-hidden={children == null ? true : undefined}
    >
      {children}
    </span>
  );
});
export const NodeInputHandle = forwardRef<HTMLSpanElement, NodeHandleProps>(function NodeInputHandle({ className, ...rest }, ref) {
  const styles = useStyles();
  const axis = useNodeHandleAxis();
  return <NodeHandle {...rest} ref={ref} className={mergeClasses(axis === 'vertical' ? styles.inputVertical : styles.input, className)} />;
});
export interface NodeOutputHandlesProps extends HTMLAttributes<HTMLSpanElement> {
  handles: readonly NodeHandleVariant[];
  spacing?: 'tight' | 'loose';
  slots?: readonly ReactNode[];
  activeIndex?: number;
}
export const NodeOutputHandles = forwardRef<HTMLSpanElement, NodeOutputHandlesProps>(function NodeOutputHandles(
  { handles, spacing = 'loose', slots, activeIndex, className, ...rest },
  ref
) {
  const styles = useStyles();
  const axis = useNodeHandleAxis();
  return (
    <span
      {...rest}
      ref={ref}
      className={mergeClasses(
        axis === 'vertical' ? styles.outputsVertical : styles.outputs,
        axis === 'vertical' ? (spacing === 'tight' ? styles.tightVertical : styles.looseVertical) : styles[spacing],
        className
      )}
      data-testid="node-output-handles"
      data-axis={axis}
    >
      {handles.map((variant, index) => (
        <NodeHandle key={index} variant={variant} inactive={activeIndex !== undefined && index !== activeIndex}>
          {slots?.[index]}
        </NodeHandle>
      ))}
    </span>
  );
});

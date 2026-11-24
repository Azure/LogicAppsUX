import { forwardRef } from 'react';
import type { CSSProperties, SVGAttributes } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { getNodeLineArrowPath } from '../lineGeometry';
import { nodeMetrics } from '../metrics';
import type { NodeLineVariant } from '../types';
export const nodeLineStrokes = {
  solid: { stroke: tokens.colorNeutralStroke1, strokeWidth: tokens.strokeWidthThin },
  solidSuccess: {
    stroke: tokens.colorStatusSuccessBorder2,
    strokeWidth: tokens.strokeWidthThin,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  solidDanger: {
    stroke: tokens.colorStatusDangerBorder2,
    strokeWidth: tokens.strokeWidthThin,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  dashedNeutral: { stroke: tokens.colorNeutralStroke1, strokeWidth: tokens.strokeWidthThin, strokeDasharray: '5 5' },
  dashedSuccess: { stroke: tokens.colorStatusSuccessBorder2, strokeWidth: tokens.strokeWidthThin, strokeDasharray: '5 5' },
  dashedDanger: { stroke: tokens.colorStatusDangerBorder2, strokeWidth: tokens.strokeWidthThin, strokeDasharray: '5 5' },
} as const satisfies Record<NodeLineVariant, CSSProperties>;
/**
 * Run emphasis layered over a line variant. Hosts derive it from real run evidence only; when no
 * evidence exists the state stays `default` and the line renders exactly as the bare variant.
 */
export type NodeLineState = 'default' | 'taken' | 'notTaken' | 'highlighted' | 'running';

// Static per-state overrides. Animation is not expressible as inline CSS, so `running` here only
// carries its dash pattern; the marching dash is added by `NodeLine`'s class under no-preference.
const nodeLineStateOverrides = {
  default: {},
  taken: { strokeWidth: tokens.strokeWidthThick },
  notTaken: { opacity: nodeMetrics.inactiveOpacity },
  highlighted: { stroke: tokens.colorBrandStroke1, strokeWidth: tokens.strokeWidthThick },
  running: { stroke: tokens.colorBrandStroke1, strokeDasharray: '5 5' },
} as const satisfies Record<NodeLineState, CSSProperties>;

/**
 * Inline stroke for hosts that draw their own edge paths (for example a graph library edge `style`).
 * `nodeLineStrokes` stays the frozen per-variant contract; this composes a state on top of it.
 */
export function getNodeLineStroke(variant: NodeLineVariant, options: { state?: NodeLineState } = {}): CSSProperties {
  const base = nodeLineStrokes[variant] ?? nodeLineStrokes.solid;
  const state = options.state ?? 'default';
  return { ...base, ...(nodeLineStateOverrides[state] ?? {}) };
}

const useNodeLineStateStyles = makeStyles({
  default: {},
  taken: {
    strokeWidth: nodeLineStateOverrides.taken.strokeWidth,
    '@media (forced-colors: active)': { stroke: 'Highlight !important' },
  },
  notTaken: { opacity: nodeLineStateOverrides.notTaken.opacity },
  highlighted: {
    stroke: nodeLineStateOverrides.highlighted.stroke,
    strokeWidth: nodeLineStateOverrides.highlighted.strokeWidth,
    '@media (forced-colors: active)': { stroke: 'Highlight !important' },
  },
  running: {
    stroke: nodeLineStateOverrides.running.stroke,
    strokeDasharray: nodeLineStateOverrides.running.strokeDasharray,
    // Motion is opt-in: reduced-motion users keep the static dashed brand line.
    '@media (prefers-reduced-motion: no-preference)': {
      animationName: { from: { strokeDashoffset: '10' }, to: { strokeDashoffset: '0' } },
      animationDuration: '600ms',
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
    },
  },
});

export const useNodeLineStyles = makeStyles({
  base: {
    fill: 'none',
    strokeWidth: tokens.strokeWidthThin,
    '@media (forced-colors: active)': {
      stroke: 'CanvasText !important',
      '&[data-line-highlighted]': { stroke: 'Highlight !important' },
    },
  },
  solid: { stroke: nodeLineStrokes.solid.stroke },
  solidSuccess: {
    stroke: nodeLineStrokes.solidSuccess.stroke,
    strokeLinecap: nodeLineStrokes.solidSuccess.strokeLinecap,
    strokeLinejoin: nodeLineStrokes.solidSuccess.strokeLinejoin,
  },
  solidDanger: {
    stroke: nodeLineStrokes.solidDanger.stroke,
    strokeLinecap: nodeLineStrokes.solidDanger.strokeLinecap,
    strokeLinejoin: nodeLineStrokes.solidDanger.strokeLinejoin,
  },
  dashedNeutral: { stroke: nodeLineStrokes.dashedNeutral.stroke, strokeDasharray: '5 5' },
  dashedSuccess: { stroke: nodeLineStrokes.dashedSuccess.stroke, strokeDasharray: '5 5' },
  dashedDanger: { stroke: nodeLineStrokes.dashedDanger.stroke, strokeDasharray: '5 5' },
});
const useStyles = makeStyles({ svg: { display: 'block', overflow: 'visible', flexShrink: 0 } });
export interface NodeLineProps extends SVGAttributes<SVGSVGElement> {
  variant?: NodeLineVariant;
  length?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Optional run emphasis; omitted renders the unchanged variant. */
  state?: NodeLineState;
  /**
   * Solid lines draw an arrowhead by default. Pass false when an edge continues the line (for example a loop
   * card joining its body) so the link reads as one unbroken stroke instead of ending at an arrow.
   */
  arrow?: boolean;
}
export const NodeLine = forwardRef<SVGSVGElement, NodeLineProps>(function NodeLine(
  { variant = 'solid', length = 85, orientation = 'horizontal', state = 'default', arrow: showArrow = true, className, ...rest },
  ref
) {
  const vertical = orientation === 'vertical';
  const line = useNodeLineStyles();
  const lineState = useNodeLineStateStyles();
  const styles = useStyles();
  const shaft = vertical ? `M10 0 V${length}` : `M0 10 H${length}`;
  // Only the canonical solid connector owns an arrow; branch-tone and dashed lines keep their joins bare,
  // and `arrow={false}` lets a host draw a bare continuity stroke without changing variant colors.
  const hasArrow = showArrow && variant === 'solid';
  const arrow = hasArrow ? ` ${getNodeLineArrowPath(vertical ? 10 : length, vertical ? length : 10, vertical ? 'down' : 'right')}` : '';
  return (
    <svg
      {...rest}
      ref={ref}
      className={mergeClasses(styles.svg, className)}
      width={vertical ? 20 : length}
      height={vertical ? length : 20}
      viewBox={vertical ? `0 0 20 ${length}` : `0 0 ${length} 20`}
      aria-hidden="true"
      data-line={variant}
      data-state={state === 'default' ? undefined : state}
      data-arrow={variant === 'solid' && !showArrow ? 'false' : undefined}
    >
      <path
        className={mergeClasses(line.base, line[variant], lineState[state])}
        data-line-highlighted={state === 'taken' || state === 'highlighted' ? '' : undefined}
        d={`${shaft}${arrow}`}
      />
    </svg>
  );
});

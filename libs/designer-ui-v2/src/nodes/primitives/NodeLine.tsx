import { forwardRef } from 'react';
import type { CSSProperties, SVGAttributes } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
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
export const useNodeLineStyles = makeStyles({
  base: { fill: 'none', strokeWidth: tokens.strokeWidthThin, '@media (forced-colors: active)': { stroke: 'CanvasText' } },
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
}
export const NodeLine = forwardRef<SVGSVGElement, NodeLineProps>(function NodeLine(
  { variant = 'solid', length = 85, orientation = 'horizontal', className, ...rest },
  ref
) {
  const vertical = orientation === 'vertical';
  const line = useNodeLineStyles();
  const styles = useStyles();
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
    >
      <path className={mergeClasses(line.base, line[variant])} d={vertical ? `M10 0 V${length}` : `M0 10 H${length}`} />
    </svg>
  );
});

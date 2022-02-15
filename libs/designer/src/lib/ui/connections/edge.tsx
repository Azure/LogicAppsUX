import { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import React, { useMemo } from 'react';
import { EdgeProps, getSmoothStepPath } from 'react-flow-renderer';
import { curveBundle, line } from 'd3-shape';

export interface LogicAppsEdgeProps {
  id: string;
  parent: string;
  child: string;
  elkEdge?: ElkExtendedEdge;
}
export const CustomEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) => {
  const d = useMemo(() => {
    const sections = data?.elkEdge?.sections;
    if (!sections?.length) {
      return '';
    }

    if (sections[0].bendPoints) {
      const points: any[] = sections ? [sections[0].startPoint, ...(sections[0].bendPoints || ([] as any)), sections[0].endPoint] : [];

      const pathFn = line()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
        .curve(curveBundle.beta(0));

      return pathFn(points) ?? '';
    } else {
      return getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    }
  }, [data?.elkEdge?.sections, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]);

  return <path id={id} style={style} className="react-flow__edge-path" d={d} />;
};

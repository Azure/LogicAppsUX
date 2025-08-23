import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type React from 'react';
import { useMemo } from 'react';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

export const OnlyEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
}) => {
  const d = useMemo(() => {
    return getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }, [sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]);

  return <path id={id} style={style} className="react-flow__edge-path" d={d as any} />;
};

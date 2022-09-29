import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import React, { useMemo } from 'react';
import { getSmoothStepPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

export interface LogicAppsEdgeProps {
  id: string;
  parent: string;
  child: string;
  elkEdge?: ElkExtendedEdge;
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

  return <path id={id} style={style} className="react-flow__edge-path" d={d} />;
};

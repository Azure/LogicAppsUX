import React from 'react';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { type ConnectionLineComponentProps, getBezierPath } from '@xyflow/react';

export const DraftEdge: React.FC<ConnectionLineComponentProps> = ({
  fromX: sourceX,
  fromY: sourceY,
  fromPosition: sourcePosition,
  toX: targetX,
  toY: targetY,
  toPosition: targetPosition,
  connectionLineStyle,
}: ConnectionLineComponentProps) => {
  const [d] = React.useMemo(
    () =>
      getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }),
    [sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]
  );

  return (
    <g className={'react-flow__edge'}>
      <defs>
        <marker id={'arrow-end-draft'} className={'highlighted'} viewBox="0 0 20 20" refX="6" refY="4" markerWidth="10" markerHeight="10">
          <ArrowCap />
        </marker>
      </defs>
      <path
        id={'draft-connection-path'}
        style={connectionLineStyle}
        className={'react-flow__edge-path highlighted'}
        d={d}
        strokeDasharray={'0'}
        markerEnd={'url("#arrow-end-draft")'}
      />
    </g>
  );
};

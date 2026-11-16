import React from 'react';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { type ConnectionLineComponentProps, getBezierPath, useReactFlow } from '@xyflow/react';
import { useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { getSharedEdgeArrowDirection } from './sharedEdgeRunState';
import { SharedEdgeArrowCap } from './sharedEdgeArrowCap';

export const DraftEdge: React.FC<ConnectionLineComponentProps> = ({
  fromX: sourceX,
  fromY: sourceY,
  fromPosition: sourcePosition,
  fromNode,
  toX: targetX,
  toY: targetY,
  toPosition: targetPosition,
  toNode,
  connectionLineStyle,
}: ConnectionLineComponentProps) => {
  const enabled = useSharedNodeUi();
  const reactFlow = useReactFlow();
  const sourceId = typeof fromNode?.id === 'string' ? fromNode.id : undefined;
  const targetId = typeof toNode?.id === 'string' ? toNode.id : undefined;
  const sourceAccepted = Boolean(
    (sourceId
      ? (reactFlow.getNode(sourceId)?.data as { presentation?: { shared?: boolean } } | undefined)?.presentation?.shared
      : undefined) ?? (fromNode as { data?: { presentation?: { shared?: boolean } } } | undefined)?.data?.presentation?.shared
  );
  const targetAccepted = targetId
    ? Boolean(
        (reactFlow.getNode(targetId)?.data as { presentation?: { shared?: boolean } } | undefined)?.presentation?.shared ??
          (toNode as { data?: { presentation?: { shared?: boolean } } } | undefined)?.data?.presentation?.shared
      )
    : true;
  // Draft arrows can follow a free pointer target, but only after the accepted source (and real target when present) adopts shared mode.
  const shared = enabled && sourceAccepted && targetAccepted;
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
    <g className={'react-flow__edge no-interaction'}>
      {!shared && (
        <defs>
          <marker id={'arrow-end-draft'} className={'highlighted'} viewBox="0 0 20 20" refX="6" refY="4" markerWidth="10" markerHeight="10">
            <ArrowCap />
          </marker>
        </defs>
      )}
      <path
        id={'draft-connection-path'}
        style={connectionLineStyle}
        className={'react-flow__edge-path highlighted'}
        d={d}
        strokeDasharray={'0'}
        markerEnd={shared ? 'url("#arrow-end-draft-shared")' : 'url("#arrow-end-draft")'}
      />
      {shared && (
        // The shared cap is a marker owned by the draft stroke so both always paint as one unit.
        <SharedEdgeArrowCap
          id="arrow-end-draft-shared"
          x={targetX}
          y={targetY}
          direction={getSharedEdgeArrowDirection(targetPosition)}
          style={connectionLineStyle}
          className={'react-flow__edge-path highlighted'}
        />
      )}
    </g>
  );
};

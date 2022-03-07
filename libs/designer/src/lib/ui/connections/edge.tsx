import { useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
import { DropZone } from './dropzone';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import React, { useMemo } from 'react';
import type { EdgeProps } from 'react-flow-renderer';
import { getEdgeCenter, getSmoothStepPath } from 'react-flow-renderer';

export interface LogicAppsEdgeProps {
  id: string;
  parent: string;
  child: string;
  elkEdge?: ElkExtendedEdge;
}
const foreignObjectHeight = 30;
const foreignObjectWidth = 200;
export const CustomEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  sourcePosition,
  targetPosition,
  style = {},
}) => {
  const allChildrenEdges = useEdgesByParent(source);
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
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

  const firstChild = allChildrenEdges[allChildrenEdges.length - 1]?.target === target;
  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={d} />
      {firstChild && (allChildrenEdges.length ?? 0) > 1 && (
        <foreignObject
          width={foreignObjectWidth}
          height={foreignObjectHeight}
          x={sourceX - foreignObjectWidth / 2}
          y={sourceY + 20 - foreignObjectHeight / 2}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div style={{ padding: '4px' }}>
            <DropZone parent={source} />
          </div>
        </foreignObject>
      )}
      <foreignObject
        width={foreignObjectWidth}
        height={foreignObjectHeight}
        x={allChildrenEdges.length === 1 ? edgeCenterX - foreignObjectWidth / 2 : targetX - foreignObjectWidth / 2}
        y={allChildrenEdges.length === 1 ? edgeCenterY - foreignObjectHeight / 2 : targetY - 20 - foreignObjectHeight / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div style={{ padding: '4px' }}>
          <DropZone parent={source} child={target} />
        </div>
      </foreignObject>
    </>
  );
};

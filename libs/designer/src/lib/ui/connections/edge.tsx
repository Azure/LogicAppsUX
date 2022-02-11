/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import { getSmoothStepPath, getEdgeCenter, getMarkerEnd, EdgeProps } from 'react-flow-renderer';
import { useSelector } from 'react-redux';
import { RootState } from '../../core/store';
import { DropZone } from './dropzone';

const foreignObjectHeight = 30;
const foreignObjectWidth = 200;
export interface LogicAppsEdgeProps {
  id: string;
  parent: string;
  child: string;
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
  const edgePath = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  // const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const parentNode = useSelector((state: RootState) => {
    return state.workflow.nodes[data?.parent ?? ''];
  });

  const firstChild = parentNode?.childrenNodes[parentNode.childrenNodes.length - 1] === data?.child;
  //markerEnd={markerEnd}
  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={edgePath} />
      {firstChild && (parentNode?.childrenNodes.length ?? 0) > 1 && (
        <foreignObject
          width={foreignObjectWidth}
          height={foreignObjectHeight}
          x={sourceX - foreignObjectWidth / 2}
          y={sourceY + 20 - foreignObjectHeight / 2}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div style={{ padding: '4px' }}>
            <DropZone parent={data?.parent ?? ''} />
          </div>
        </foreignObject>
      )}
      <foreignObject
        width={foreignObjectWidth}
        height={foreignObjectHeight}
        x={parentNode?.childrenNodes.length === 1 ? edgeCenterX - foreignObjectWidth / 2 : targetX - foreignObjectWidth / 2}
        y={parentNode?.childrenNodes.length === 1 ? edgeCenterY - foreignObjectHeight / 2 : targetY - 20 - foreignObjectHeight / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div style={{ padding: '4px' }}>
          <DropZone parent={data?.parent ?? ''} child={data?.child} />
        </div>
      </foreignObject>
    </>
  );
};

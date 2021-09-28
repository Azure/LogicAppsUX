/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import { getSmoothStepPath, getEdgeCenter, getMarkerEnd } from 'react-flow-renderer';
import { useSelector } from 'react-redux';
import { RootState } from 'src/core/store';
import { ActionButtonV2 } from '..';

const foreignObjectSize = 40;

const onParentBClick = (evt: any, parent: string) => {
  evt.stopPropagation();
  alert(`parent: ${parent}`);
};
const onEdgeEndClick = (evt: any, parent: string, child: string) => {
  evt.stopPropagation();
  alert(`parent: ${parent}\nChild: ${child}`);
};

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  arrowHeadType,
  markerEndId,
}: any) {
  const edgePath = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const parentNode = useSelector((state: RootState) => {
    return state.workflow.nodes.find((x) => x.id === data?.parent);
  });
  const firstChild = parentNode?.childrenNodes.at(-1) === data.child;

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
      {firstChild && (parentNode?.childrenNodes.length ?? 0) > 1 && (
        <foreignObject
          width={foreignObjectSize}
          height={foreignObjectSize}
          x={sourceX - foreignObjectSize / 2}
          y={sourceY + 20 - foreignObjectSize / 2}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml">
          <body>
            <ActionButtonV2 title={'Text'} onClick={(e) => onParentBClick(e, data.parent)} trackEvent={() => {}} />
          </body>
        </foreignObject>
      )}
      <foreignObject
        width={foreignObjectSize}
        height={foreignObjectSize}
        x={parentNode?.childrenNodes.length === 1 ? edgeCenterX - foreignObjectSize / 2 : targetX - foreignObjectSize / 2}
        y={parentNode?.childrenNodes.length === 1 ? edgeCenterY - foreignObjectSize / 2 : targetY - 20 - foreignObjectSize / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml">
        <body>
          <ActionButtonV2 title={'Text'} onClick={(e) => onEdgeEndClick(e, data.parent, data.child)} trackEvent={() => {}} />
        </body>
      </foreignObject>
    </>
  );
}

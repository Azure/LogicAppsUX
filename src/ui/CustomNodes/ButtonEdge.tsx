/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';
import { getSmoothStepPath, getEdgeCenter, getMarkerEnd } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';
import { addNode, setShouldZoomToNode, triggerLayout } from '../../core/state/workflowSlice';
import { RootState } from '../../core/store';
import { ActionButtonV2 } from '..';
import guid from '../../common/utilities/guid';
import { useDrop } from 'react-dnd';

const foreignObjectSize = 40;

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
  const dispatch = useDispatch();
  const onEdgeEndClick = (evt: any, parent: string, child: string) => {
    evt.stopPropagation();
    const newId = guid();
    dispatch(
      addNode({
        id: newId,
        parentId: parent,
        childId: child,
      })
    );
    dispatch(triggerLayout());
    dispatch(setShouldZoomToNode(newId));
  };

  const onParentBClick = (evt: any, parent: string) => {
    const newId = guid();
    evt.stopPropagation();
    dispatch(
      addNode({
        id: newId,
        parentId: parent,
      })
    );
    dispatch(triggerLayout());
    dispatch(setShouldZoomToNode(newId));
  };
  const firstChild = parentNode?.childrenNodes.at(-1) === data.child;

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    // The type (or types) to accept - strings or symbols
    accept: 'BOX',
    drop: () => ({ child: data.child, parent: data.parent }),
    canDrop: (item) => {
      return (item as any).id !== data.child;
    },
    // Props to collect
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

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
          <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
            <ActionButtonV2 title={'Text'} onClick={(e) => onParentBClick(e, data.parent)} trackEvent={() => {}} />
          </div>
        </foreignObject>
      )}
      <foreignObject
        width={foreignObjectSize}
        height={foreignObjectSize}
        x={parentNode?.childrenNodes.length === 1 ? edgeCenterX - foreignObjectSize / 2 : targetX - foreignObjectSize / 2}
        y={parentNode?.childrenNodes.length === 1 ? edgeCenterY - foreignObjectSize / 2 : targetY - 20 - foreignObjectSize / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml">
        <div
          ref={drop}
          style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', opacity: isOver && canDrop ? 0.4 : 1 }}>
          <ActionButtonV2 title={'Text'} onClick={(e) => onEdgeEndClick(e, data.parent, data.child)} trackEvent={() => {}} />
        </div>
      </foreignObject>
    </>
  );
}

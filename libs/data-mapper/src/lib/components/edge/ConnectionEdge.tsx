import React, { useMemo } from 'react';
import { getSmoothStepPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

const foreignObjectSize = 40;

export const ConnectionEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd } = props;

  const [edgePath, labelX, labelY] = useMemo(
    () => getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }),
    [sourcePosition, sourceX, sourceY, targetX, targetY, targetPosition]
  );

  const onEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    console.log(id);
  };

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
      <foreignObject
        width={foreignObjectSize}
        height={foreignObjectSize}
        x={labelX - foreignObjectSize / 2}
        y={labelY - foreignObjectSize / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <body>
          <button className="edgebutton" onClick={onEdgeClick}>
            ×
          </button>
        </body>
      </foreignObject>
    </>
  );
};

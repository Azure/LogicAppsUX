import { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import React, { useMemo } from 'react';
import { EdgeProps, getSmoothStepPath } from 'react-flow-renderer';
import { curveBundle, line } from 'd3-shape';

// const foreignObjectHeight = 30;
// const foreignObjectWidth = 200;
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

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={d} />
      {/* {firstChild && (parentNode?.childrenNodes.length ?? 0) > 1 && (
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
        </div> */}
      {/* </foreignObject> */}
    </>
  );
};

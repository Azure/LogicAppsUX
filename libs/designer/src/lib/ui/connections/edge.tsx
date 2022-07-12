import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNodeMetadata } from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesBySource } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import React, { useMemo } from 'react';
import { getEdgeCenter, getSmoothStepPath } from 'react-flow-renderer';
import type { EdgeProps } from 'react-flow-renderer';

export interface LogicAppsEdgeProps {
  id: string;
  parent: string;
  child: string;
  elkEdge?: ElkExtendedEdge;
}
const foreignObjectHeight = 30;
const foreignObjectWidth = 200;
export const ButtonEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({
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
  const readOnly = useReadOnly();

  // Remove any added id-specifier to get the actual id
  const sourceId = source.split('-#')[0];

  const allChildrenEdges = useEdgesBySource(source);
  const nodeMetadata = useNodeMetadata(source);
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
      {!readOnly ? (
        <>
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
                <DropZone graphId={nodeMetadata?.graphId ?? ''} parent={sourceId} />
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
              <DropZone graphId={nodeMetadata?.graphId ?? ''} parent={sourceId} child={target} />
            </div>
          </foreignObject>
        </>
      ) : null}
    </>
  );
};

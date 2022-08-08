import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { RunAfterIndicator, RUN_AFTER_STATUS } from './runAfterIndicator';
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

const runAfterWidth = 36;
const runAfterHeight = 12;

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
  const edgeTargets = useNodeEdgeTargets(source);
  const operationData = useActionMetadata(target) as LogicAppsV2.ActionDefinition;
  const nodeMetadata = useNodeMetadata(source);
  const sourceId = source.includes('-#') ? source.split('-#')[0] : undefined;
  const graphId = sourceId ?? nodeMetadata?.graphId ?? '';
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const runAfterStatuses = useMemo(() => {
    const ra = operationData?.runAfter ?? ({} as Record<string, string[]>);
    const raNodeEntries = Object.entries(ra);
    const out: Record<string, any> = {};
    // Gets statuses from all sources
    raNodeEntries.forEach(([, conditions]) => conditions.forEach((c) => (out[c] = true)));
    return Object.keys(out);
  }, [operationData?.runAfter]);

  const showRunAfter = useMemo(() => {
    return runAfterStatuses.filter((status) => status.toUpperCase() !== RUN_AFTER_STATUS.SUCCEEDED).length > 0;
  }, [runAfterStatuses]);

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

  const firstChild = edgeTargets[edgeTargets.length - 1] === target; // Gets the last rendered, on top

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={d} strokeDasharray={showRunAfter ? '3' : '0'} />

      {!readOnly ? (
        <>
          {firstChild && edgeTargets.length !== 1 && (
            <foreignObject
              width={foreignObjectWidth}
              height={foreignObjectHeight}
              x={sourceX - foreignObjectWidth / 2}
              y={sourceY + 30 - foreignObjectHeight / 2}
              className="edgebutton-foreignobject"
              requiredExtensions="http://www.w3.org/1999/xhtml"
            >
              <div style={{ padding: '4px' }}>
                <DropZone graphId={graphId} parent={source} />
              </div>
            </foreignObject>
          )}
          <foreignObject
            width={foreignObjectWidth}
            height={foreignObjectHeight}
            x={edgeTargets.length === 1 ? edgeCenterX - foreignObjectWidth / 2 : targetX - foreignObjectWidth / 2}
            y={edgeTargets.length === 1 ? edgeCenterY - foreignObjectHeight / 2 : targetY - 30 - foreignObjectHeight / 2}
            className="edgebutton-foreignobject"
            requiredExtensions="http://www.w3.org/1999/xhtml"
          >
            <div style={{ padding: '4px' }}>
              <DropZone graphId={graphId} parent={source} child={target} />
            </div>
          </foreignObject>

          {/* TODO: riley - will need to alter for allowing multiple input edges */}
          {showRunAfter ? (
            <foreignObject
              id="msla-run-after-traffic-light"
              width={runAfterWidth}
              height={runAfterHeight}
              x={targetX - runAfterWidth / 2}
              y={targetY - runAfterHeight}
            >
              <RunAfterIndicator statuses={runAfterStatuses} />
            </foreignObject>
          ) : null}
        </>
      ) : null}
    </>
  );
};

import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
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

interface EdgeContentProps {
  x: number;
  y: number;
  parent: string | undefined;
  child: string | undefined;
}

const foreignObjectHeight = 32;
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

  const filteredRunAfters: Record<string, string[]> = useMemo(
    () =>
      Object.entries(operationData?.runAfter ?? {}).reduce(
        (pv, [id, cv]) => (cv.some((status) => status.toUpperCase() !== RUN_AFTER_STATUS.SUCCEEDED) ? { ...pv, [id]: cv } : pv),
        {}
      ),
    [operationData?.runAfter]
  );
  const numRunAfters = Object.keys(filteredRunAfters).length;
  const raIndex = Object.entries(filteredRunAfters).findIndex(([key]) => key === source);

  const runAfterStatuses = useMemo(() => filteredRunAfters?.[source] ?? [], [filteredRunAfters, source]);
  const showRunAfter = runAfterStatuses.length;

  const d = useMemo(() => {
    return getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY: (numRunAfters !== 0 ? targetY - runAfterHeight : targetY) - 2, // move up to allow space for run after indicator
      targetPosition,
      borderRadius: 8,
    });
  }, [numRunAfters, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]);

  const showSourceButton = edgeTargets[edgeTargets.length - 1] === target;
  const showTargetButton = Object.keys(operationData?.runAfter ?? {})?.[Object.keys(operationData?.runAfter ?? {}).length - 1] === source;

  const multipleSources = Object.keys(operationData?.runAfter ?? {}).length > 1;
  const multipleTargets = edgeTargets.length > 1;
  const onlyEdge = !multipleSources && !multipleTargets;

  const EdgeContent = (props: EdgeContentProps) => (
    <foreignObject
      width={foreignObjectWidth}
      height={foreignObjectHeight}
      x={props.x}
      y={props.y}
      className="edgebutton-foreignobject"
      requiredExtensions="http://www.w3.org/1999/xhtml"
    >
      <div style={{ padding: '4px' }}>
        <DropZone graphId={graphId} parent={props.parent} child={props.child} />
      </div>
    </foreignObject>
  );

  return (
    <>
      <defs>
        <marker id="arrow-end" viewBox="0 0 20 20" refX="6" refY="4" markerWidth="10" markerHeight="10">
          <ArrowCap />
        </marker>
      </defs>

      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={d}
        strokeDasharray={showRunAfter ? '4' : '0'}
        markerEnd="url(#arrow-end)"
      />

      {!readOnly ? (
        <>
          {/* TOP BUTTON */}
          {((multipleTargets && showSourceButton) || multipleSources) && (
            <EdgeContent
              x={sourceX - foreignObjectWidth / 2}
              y={sourceY + 28 - foreignObjectHeight / 2}
              parent={source}
              child={!multipleTargets ? target : undefined}
            />
          )}

          {/* MIDDLE BUTTON */}
          {onlyEdge && (
            <EdgeContent
              x={edgeCenterX - foreignObjectWidth / 2}
              y={edgeCenterY - foreignObjectHeight / 2 - (numRunAfters !== 0 ? 4 : 0)} // Make a little more room for run after
              parent={source}
              child={target}
            />
          )}

          {/* BOTTOM BUTTOM */}
          {((multipleSources && showTargetButton) || multipleTargets) && (
            <EdgeContent
              x={targetX - foreignObjectWidth / 2}
              y={targetY - 32 - foreignObjectHeight / 2 - (numRunAfters !== 0 ? 4 : 0)} // Make a little more room for run after
              parent={!multipleSources ? source : undefined}
              child={target}
            />
          )}

          {/* RUN AFTER INDICATOR */}
          {showRunAfter ? (
            <foreignObject
              id="msla-run-after-traffic-light"
              width={runAfterWidth}
              height={runAfterHeight}
              x={targetX - runAfterWidth / 2 + (numRunAfters - 1 - raIndex * 2) * (runAfterWidth / 2 + 4)}
              y={targetY - runAfterHeight}
            >
              <RunAfterIndicator statuses={runAfterStatuses} sourceNodeId={source} />
            </foreignObject>
          ) : null}
        </>
      ) : null}
    </>
  );
};

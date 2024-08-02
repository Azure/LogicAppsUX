import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { CollapsedRunAfterIndicator, RunAfterIndicator } from './runAfterIndicator';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { containsIdTag, removeIdTag, getEdgeCenter, RUN_AFTER_STATUS, useEdgeIndex } from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type React from 'react';
import { memo, useMemo } from 'react';
import { getSmoothStepPath, useReactFlow, type EdgeProps } from '@xyflow/react';

interface EdgeContentProps {
  x: number;
  y: number;
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  tabIndex?: number;
}

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
      <DropZone graphId={props.graphId} parentId={props.parentId} childId={props.childId} isLeaf={props.isLeaf} tabIndex={props.tabIndex} />
    </div>
  </foreignObject>
);

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

const foreignObjectHeight = 32;
const foreignObjectWidth = 200;

const runAfterWidth = 36;
const runAfterHeight = 12;

const ButtonEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({
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
  const reactFlow = useReactFlow();
  const operationData = useActionMetadata(target) as LogicAppsV2.ActionDefinition;
  const edgeSources = Object.keys(operationData?.runAfter ?? {});
  const edgeTargets = useNodeEdgeTargets(source);
  const nodeMetadata = useNodeMetadata(source);
  const sourceId = containsIdTag(source) ? removeIdTag(source) : undefined;
  const graphId = sourceId ?? nodeMetadata?.graphId ?? '';
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const filteredRunAfters: Record<string, string[]> = useMemo(
    () =>
      Object.entries(operationData?.runAfter ?? {}).reduce((pv: Record<string, string[]>, [id, cv]) => {
        if ((cv ?? []).some((status) => status.toUpperCase() !== RUN_AFTER_STATUS.SUCCEEDED)) {
          pv[id] = cv;
        }

        return pv;
      }, {}),
    [operationData?.runAfter]
  );
  const numRunAfters = Object.keys(filteredRunAfters).length;
  const raIndex: number = useMemo(() => {
    const sortedRunAfters = Object.keys(filteredRunAfters)
      .slice(0)
      .sort((id1, id2) => (reactFlow.getNode(id2)?.position?.x ?? 0) - (reactFlow.getNode(id1)?.position?.x ?? 0));

    return sortedRunAfters?.findIndex((key) => key === source);
  }, [filteredRunAfters, reactFlow, source]);

  const runAfterStatuses = useMemo(() => filteredRunAfters?.[source] ?? [], [filteredRunAfters, source]);
  const runAfterCount = Object.keys(filteredRunAfters).length;
  const showRunAfter = runAfterStatuses.length && runAfterCount < 6;
  const showCollapsedRunAfter = runAfterStatuses.length && runAfterCount > 5 && Object.keys(filteredRunAfters)[0] === source;

  const showSourceButton = edgeTargets[edgeTargets.length - 1] === target;
  const showTargetButton = edgeSources?.[edgeSources.length - 1] === source;

  const multipleSources = edgeSources.length > 1;
  const multipleTargets = edgeTargets.length > 1;
  const onlyEdge = !multipleSources && !multipleTargets;
  const isLeaf = edgeTargets.length === 0;

  let dynamicMidEdgeY =
    multipleSources && !multipleTargets ? targetY - 64 : multipleTargets && !multipleSources ? sourceY + 64 : edgeCenterY;

  if (numRunAfters !== 0) {
    dynamicMidEdgeY -= 7;
  }

  const [d] = useMemo(() => {
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

  const tabIndex = useEdgeIndex(id);

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

      {/* ADD ACTION / BRANCH BUTTONS */}
      {readOnly ? null : (
        <>
          {/* TOP BUTTON */}
          {((multipleTargets && showSourceButton) || multipleSources) && (
            <EdgeContent
              x={sourceX - foreignObjectWidth / 2}
              y={sourceY + 28 - foreignObjectHeight / 2}
              graphId={graphId}
              parentId={source}
              childId={multipleTargets ? undefined : target}
              tabIndex={tabIndex}
            />
          )}

          {/* MIDDLE BUTTON */}
          {(onlyEdge || (multipleTargets && multipleSources)) && (
            <EdgeContent
              x={edgeCenterX - foreignObjectWidth / 2}
              y={dynamicMidEdgeY - foreignObjectHeight / 2} // Make a little more room for run after
              graphId={graphId}
              parentId={source}
              childId={target}
              tabIndex={tabIndex}
            />
          )}

          {/* BOTTOM BUTTOM */}
          {((multipleSources && showTargetButton) || multipleTargets) && (
            <EdgeContent
              x={targetX - foreignObjectWidth / 2}
              y={targetY - 32 - foreignObjectHeight / 2 - (numRunAfters !== 0 ? 4 : 0)} // Make a little more room for run after
              graphId={graphId}
              parentId={multipleSources ? undefined : source}
              childId={target}
              isLeaf={isLeaf}
              tabIndex={tabIndex}
            />
          )}
        </>
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
      {/* RUN AFTER INDICATOR WHEN COLLAPSED */}
      {showCollapsedRunAfter ? (
        <foreignObject
          id="msla-run-after-traffic-light"
          width={runAfterWidth}
          height={runAfterHeight}
          x={targetX - runAfterWidth / 2}
          y={targetY - runAfterHeight}
        >
          <CollapsedRunAfterIndicator filteredRunAfters={filteredRunAfters} runAfterCount={runAfterCount} />
        </foreignObject>
      ) : null}
    </>
  );
};

export default memo(ButtonEdge);

import type React from 'react';
import { memo, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, getSmoothStepPath, useReactFlow, type EdgeProps } from '@xyflow/react';
import { css } from '@fluentui/utilities';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { containsIdTag, removeIdTag, getEdgeCenter, RUN_AFTER_STATUS, useEdgeIndex } from '@microsoft/logic-apps-shared';

import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { CollapsedRunAfterIndicator, RunAfterIndicator } from './runAfterIndicator';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { removeEdgeFromRunAfterOperation } from '../../core/actions/bjsworkflow/runafter';
import { EdgePathContextMenu, useContextMenu } from './edgePathContextMenu';
import type { AppDispatch } from '../../core';

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
  <EdgeLabelRenderer>
    <div
      style={{
        width: edgeContentWidth,
        height: edgeContentHeight,
        position: 'absolute',
        left: props.x,
        top: props.y,
        pointerEvents: 'all',
        zIndex: 100,
      }}
    >
      <DropZone graphId={props.graphId} parentId={props.parentId} childId={props.childId} isLeaf={props.isLeaf} tabIndex={props.tabIndex} />
    </div>
  </EdgeLabelRenderer>
);

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

const edgeContentHeight = 24;
const edgeContentWidth = 92;

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
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const reactFlow = useReactFlow();
  const operationData = useActionMetadata(target) as LogicAppsV2.ActionDefinition;
  const edgeSources = Object.keys(operationData?.runAfter ?? {});
  const edgeTargets = useNodeEdgeTargets(source);
  const nodeMetadata = useNodeMetadata(source);
  const sourceId = containsIdTag(source) ? removeIdTag(source) : source;
  const targetId = containsIdTag(target) ? removeIdTag(target) : target;
  const graphId = (containsIdTag(source) ? removeIdTag(source) : undefined) ?? nodeMetadata?.graphId ?? '';
  const [centerX, centerY] = getEdgeCenter({
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

  const runAfterX = targetX - runAfterWidth / 2 + (numRunAfters - 1 - raIndex * 2) * (runAfterWidth / 2 + 4);
  const runAfterY = targetY - runAfterHeight;

  const [d] = useMemo(() => {
    return getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY: (numRunAfters !== 0 ? targetY - runAfterHeight : targetY) - 2, // move up to allow space for run after indicator
      targetPosition,
      borderRadius: 8,
      centerY,
    });
  }, [numRunAfters, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY, centerY]);

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);

  const contextMenu = useContextMenu();
  const contextSelected = useMemo(() => contextMenu.isShowing, [contextMenu.isShowing]);

  const highlighted = useMemo(
    () => isSourceSelected || isTargetSelected || contextSelected,
    [isSourceSelected, isTargetSelected, contextSelected]
  );

  const deleteEdge = useCallback(() => {
    dispatch(
      removeEdgeFromRunAfterOperation({
        parentOperationId: sourceId,
        childOperationId: targetId,
      })
    );
  }, [dispatch, sourceId, targetId]);

  return (
    <>
      <defs>
        <marker
          id={`arrow-end-${id}`}
          className={css(highlighted ? 'highlighted' : '')}
          viewBox="0 0 20 20"
          refX="6"
          refY="4"
          markerWidth="10"
          markerHeight="10"
        >
          <ArrowCap />
        </marker>
      </defs>

      <path
        id={id}
        style={style}
        className={css('react-flow__edge-path', highlighted ? 'highlighted' : '')}
        d={d}
        strokeDasharray={showRunAfter ? '4' : '0'}
        markerEnd={`url(#arrow-end-${id})`}
        onClick={contextMenu.handle}
        onContextMenu={contextMenu.handle}
      />

      {contextMenu.isShowing && (
        <EdgePathContextMenu
          contextMenuLocation={contextMenu.location}
          open={contextMenu.isShowing}
          setOpen={contextMenu.setIsShowing}
          onDelete={deleteEdge}
        />
      )}

      {/* ADD ACTION / BRANCH BUTTONS */}
      {readOnly ? null : (
        <>
          {/* TOP BUTTON */}
          {((multipleTargets && showSourceButton) || multipleSources) && (
            <EdgeContent
              x={sourceX - edgeContentWidth / 2}
              y={sourceY + 28 - edgeContentHeight / 2}
              graphId={graphId}
              parentId={source}
              childId={multipleTargets ? undefined : target}
              tabIndex={tabIndex}
            />
          )}

          {/* MIDDLE BUTTON */}
          {(onlyEdge || (multipleTargets && multipleSources)) && (
            <EdgeContent
              x={centerX - edgeContentWidth / 2}
              y={centerY - edgeContentHeight / 2}
              graphId={graphId}
              parentId={source}
              childId={target}
              tabIndex={tabIndex}
            />
          )}

          {/* BOTTOM BUTTOM */}
          {((multipleSources && showTargetButton) || multipleTargets) && (
            <EdgeContent
              x={targetX - edgeContentWidth / 2}
              y={targetY - 32 - edgeContentHeight / 2 - (numRunAfters !== 0 ? 4 : 0)} // Make a little more room for run after
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
        <foreignObject id="msla-run-after-traffic-light" width={runAfterWidth} height={runAfterHeight} x={runAfterX} y={runAfterY}>
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

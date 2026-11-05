import type React from 'react';
import { memo, useMemo, useState } from 'react';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, getBezierPath, getSmoothStepPath, useReactFlow, type EdgeProps } from '@xyflow/react';
import { css } from '@fluentui/utilities';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import {
  containsIdTag,
  removeIdTag,
  getEdgeCenter,
  RUN_AFTER_STATUS,
  SUBGRAPH_TYPES,
  useEdgeIndex,
  useGuid,
} from '@microsoft/logic-apps-shared';

import { useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { nodeLineStrokes, useNodeLineStyles } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { useConnectionStyles } from './connections.styles';
import { useIsNodeSelectedInOperationPanel, useIsNodeInMultiSelection } from '../../core/state/panel/panelSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { CollapsedRunAfterIndicator, RunAfterIndicator } from './runAfterIndicator';
interface EdgeContentProps {
  x: number;
  y: number;
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  tabIndex?: number;
  isRevealed?: boolean;
  sharedPresentation: boolean;
}

const EdgeContent = (props: EdgeContentProps) => (
  <EdgeLabelRenderer>
    <div
      style={{
        width: props.sharedPresentation ? nodeMetrics.edgeControl.hitTargetSize : edgeContentWidth,
        height: props.sharedPresentation ? nodeMetrics.edgeControl.hitTargetSize : edgeContentHeight,
        position: 'absolute',
        left: props.x + (props.sharedPresentation ? (edgeContentWidth - nodeMetrics.edgeControl.hitTargetSize) / 2 : 0),
        top: props.y - (props.sharedPresentation ? (nodeMetrics.edgeControl.hitTargetSize - edgeContentHeight) / 2 : 0),
        pointerEvents: 'all',
        zIndex: 100,
      }}
    >
      <DropZone
        graphId={props.graphId}
        parentId={props.parentId}
        childId={props.childId}
        isLeaf={props.isLeaf}
        tabIndex={props.tabIndex}
        isRevealed={props.isRevealed}
        sharedPresentation={props.sharedPresentation}
      />
    </div>
  </EdgeLabelRenderer>
);

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
  presentation?: { shared: boolean };
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
  sourceHandleId,
  data,
  style = {},
}) => {
  const readOnly = useReadOnly();
  const enabled = useSharedNodeUi();
  const accepted = data as { presentation?: { shared?: boolean } } | undefined;
  const shared = accepted?.presentation?.shared ?? enabled;
  const lineStyles = useNodeLineStyles();
  const styles = useConnectionStyles();
  const [hovered, setHovered] = useState(false);
  const reactFlow = useReactFlow();
  const operationData = useActionMetadata(target) as LogicAppsV2.ActionDefinition;
  const edgeSources = Object.keys(operationData?.runAfter ?? {});
  const edgeTargets = useNodeEdgeTargets(source);
  const nodeMetadata = useNodeMetadata(source);
  const branchMetadata = useNodeMetadata(removeIdTag(sourceHandleId ?? source));
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
    const endpoints = {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY: (numRunAfters !== 0 ? targetY - runAfterHeight : targetY) - (shared ? 0 : 2),
      targetPosition,
    };
    return shared ? getBezierPath(endpoints) : getSmoothStepPath({ ...endpoints, borderRadius: 8, centerY });
  }, [numRunAfters, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY, centerY, shared]);

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);
  const isSourceMultiSelected = useIsNodeInMultiSelection(sourceId);
  const isTargetMultiSelected = useIsNodeInMultiSelection(targetId);
  const highlighted = useMemo(
    () => isSourceSelected || isTargetSelected || isSourceMultiSelected || isTargetMultiSelected,
    [isSourceSelected, isTargetSelected, isSourceMultiSelected, isTargetMultiSelected]
  );

  const capGuid = useGuid();
  const variant =
    branchMetadata?.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_TRUE
      ? 'dashedSuccess'
      : branchMetadata?.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_FALSE
        ? 'dashedDanger'
        : branchMetadata?.subgraphType || runAfterStatuses.length
          ? 'dashedNeutral'
          : 'solid';

  return (
    <>
      {!shared && (
        <defs>
          <marker
            id={capGuid}
            className={css(highlighted ? 'highlighted' : '')}
            viewBox="0 0 20 20"
            refX="6"
            refY="8"
            markerWidth="12"
            markerHeight="10"
          >
            <ArrowCap />
          </marker>
        </defs>
      )}

      <path
        id={id}
        style={shared ? { ...style, ...nodeLineStrokes[variant] } : style}
        className={
          shared
            ? css('msla-shared-edge-path', lineStyles.base, lineStyles[variant])
            : css('react-flow__edge-path', highlighted ? 'highlighted' : '')
        }
        data-line={shared ? variant : undefined}
        d={d}
        strokeDasharray={shared ? undefined : showRunAfter ? '4 6' : '0'}
        strokeWidth={shared ? undefined : 2}
        strokeLinecap={'round'}
        markerEnd={shared ? undefined : `url(#${capGuid})`}
      />
      {shared && (
        <path
          d={d}
          className={styles.hitPath}
          strokeWidth={nodeMetrics.edgeControl.interactionWidth}
          data-edge-hit-target
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
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
              isRevealed={hovered}
              sharedPresentation={shared}
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
              isRevealed={hovered}
              sharedPresentation={shared}
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
              isRevealed={hovered}
              sharedPresentation={shared}
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

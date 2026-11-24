import type React from 'react';
import { memo, useMemo, type HTMLAttributes } from 'react';
import type { ElkExtendedEdge } from '@microsoft/logic-apps-graph-layout';
import { EdgeLabelRenderer, getBezierPath, getSmoothStepPath, Position, useReactFlow, type EdgeProps } from '@xyflow/react';
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
import { getNodeLineStroke, useEdgeActiveState, useNodeLineStyles } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { useConnectionStyles } from './connections.styles';
import { useIsNodeSelectedInOperationPanel, useIsNodeInMultiSelection } from '../../core/state/panel/panelSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { CollapsedRunAfterIndicator, RunAfterIndicator } from './runAfterIndicator';
import { SharedCollapsedRunAfterIndicator, SharedRunAfterIndicator } from './runAfterIndicator/SharedRunAfterIndicator';
import { getSharedEdgeArrowDirection } from './sharedEdgeRunState';
import { getSharedTargetButtonDistance, getSharedTargetInset, offsetFromPort, SharedEdgeArrowCap } from './sharedEdgeArrowCap';
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
  followsMerge?: boolean;
  controlProps?: HTMLAttributes<HTMLDivElement>;
}

const EdgeContent = (props: EdgeContentProps) => (
  <EdgeLabelRenderer>
    <div
      {...props.controlProps}
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
        followsMerge={props.followsMerge}
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
  const reactFlow = useReactFlow();
  const sourceAccepted = Boolean(
    (reactFlow.getNode(source)?.data as { presentation?: { shared?: boolean } } | undefined)?.presentation?.shared
  );
  const targetAccepted = Boolean(
    (reactFlow.getNode(target)?.data as { presentation?: { shared?: boolean } } | undefined)?.presentation?.shared
  );
  // Accepted edge presentation wins in both directions so edges stay atomically aligned with cards/handles until ELK commits.
  const edgeMode = accepted?.presentation?.shared ?? enabled;
  const shared = edgeMode && sourceAccepted && targetAccepted;
  const lineStyles = useNodeLineStyles();
  const styles = useConnectionStyles();
  const activeState = useEdgeActiveState();
  const hovered = shared ? activeState.isActive : false;
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
  const horizontalTarget = targetPosition === Position.Left || targetPosition === Position.Right;
  const raIndex: number = useMemo(() => {
    const crossAxis = horizontalTarget ? 'y' : 'x';
    const sortedRunAfters = Object.keys(filteredRunAfters)
      .slice(0)
      .sort((id1, id2) => (reactFlow.getNode(id2)?.position?.[crossAxis] ?? 0) - (reactFlow.getNode(id1)?.position?.[crossAxis] ?? 0));

    return sortedRunAfters?.findIndex((key) => key === source);
  }, [filteredRunAfters, horizontalTarget, reactFlow, source]);

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
  const runAfterWidth = shared ? nodeMetrics.runAfter.sharedWidth : nodeMetrics.runAfter.legacyWidth;
  const runAfterHeight = shared ? nodeMetrics.runAfter.sharedHeight : nodeMetrics.runAfter.legacyHeight;

  // Keep the indicator upright, reserving its width or height along the target port's normal.
  const indicatorExtent = horizontalTarget ? runAfterWidth : runAfterHeight;
  const indicatorCenter = offsetFromPort(targetX, targetY, targetPosition, indicatorExtent / 2);
  const spreadPerEdge = horizontalTarget ? nodeMetrics.runAfter.spreadHorizontal : nodeMetrics.runAfter.spreadVertical;
  const indicatorSpread = shared
    ? (numRunAfters - 1 - raIndex * 2) * (spreadPerEdge / 2)
    : (numRunAfters - 1 - raIndex * 2) * ((horizontalTarget ? runAfterHeight : runAfterWidth) / 2 + 4);
  const runAfterX = indicatorCenter.x - runAfterWidth / 2 + (horizontalTarget ? 0 : indicatorSpread);
  const runAfterY = indicatorCenter.y - runAfterHeight / 2 + (horizontalTarget ? indicatorSpread : 0);
  const sourceButton = offsetFromPort(sourceX, sourceY, sourcePosition, 28);
  const targetButton = offsetFromPort(
    targetX,
    targetY,
    targetPosition,
    shared ? getSharedTargetButtonDistance(numRunAfters !== 0 ? indicatorExtent : 0) : 32 + (numRunAfters !== 0 ? 4 : 0)
  );

  const { d, endpoint } = useMemo(() => {
    // Shared caps stop short of the target handle so the arrow reads as direction, not as part of the input dot.
    const endpoint = offsetFromPort(
      targetX,
      targetY,
      targetPosition,
      shared ? getSharedTargetInset(numRunAfters !== 0 ? indicatorExtent : 0) : (numRunAfters !== 0 ? indicatorExtent : 0) + 2
    );
    const endpoints = {
      sourceX,
      sourceY,
      sourcePosition,
      targetX: endpoint.x,
      targetY: endpoint.y,
      targetPosition,
    };
    const [path] = shared ? getBezierPath(endpoints) : getSmoothStepPath({ ...endpoints, borderRadius: 8, centerY });
    return { d: path, endpoint };
  }, [numRunAfters, indicatorExtent, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY, centerY, shared]);

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

  // Selection is authoring emphasis, not run evidence; legacy monitoring also highlights selected endpoints.
  const stroke = getNodeLineStroke(variant, { state: highlighted ? 'highlighted' : 'default' });

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
        style={shared ? { ...style, ...stroke } : style}
        className={
          shared
            ? css('msla-shared-edge-path', lineStyles.base, lineStyles[variant])
            : css('react-flow__edge-path', highlighted ? 'highlighted' : '')
        }
        data-line={shared ? variant : undefined}
        data-line-highlighted={shared && highlighted ? '' : undefined}
        d={d}
        strokeDasharray={shared ? undefined : showRunAfter ? '4 6' : '0'}
        strokeWidth={shared ? undefined : 2}
        strokeLinecap={'round'}
        // Both modes reference `capGuid`; only one marker definition is rendered per mode.
        markerEnd={`url(#${capGuid})`}
      />
      {shared && (
        <>
          {/* The cap uses its own class/attribute so `.msla-shared-edge-path` and `data-line` keep naming exactly one
              stroke per edge; as a marker it is painted by that stroke (see SharedEdgeArrowCap). */}
          <SharedEdgeArrowCap
            id={capGuid}
            x={endpoint.x}
            y={endpoint.y}
            direction={getSharedEdgeArrowDirection(targetPosition)}
            variant={variant}
            highlighted={highlighted}
            style={{
              ...style,
              stroke: stroke.stroke,
              strokeWidth: stroke.strokeWidth,
              strokeDasharray: 'none',
            }}
            className={css('msla-shared-edge-cap', lineStyles.base, lineStyles[variant])}
          />
          <path
            d={d}
            className={styles.hitPath}
            strokeWidth={nodeMetrics.edgeControl.interactionWidth}
            data-edge-hit-target
            {...activeState.lineProps}
          />
        </>
      )}

      {/* ADD ACTION / BRANCH BUTTONS */}
      {readOnly ? null : (
        <>
          {/* TOP BUTTON */}
          {((multipleTargets && showSourceButton) || multipleSources) && (
            <EdgeContent
              x={sourceButton.x - edgeContentWidth / 2}
              y={sourceButton.y - edgeContentHeight / 2}
              graphId={graphId}
              parentId={source}
              childId={multipleTargets ? undefined : target}
              tabIndex={tabIndex}
              isRevealed={hovered}
              sharedPresentation={shared}
              followsMerge={!multipleTargets || showSourceButton}
              controlProps={shared ? activeState.wrapperProps : undefined}
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
              followsMerge={onlyEdge}
              controlProps={shared ? activeState.wrapperProps : undefined}
            />
          )}

          {/* BOTTOM BUTTOM */}
          {((multipleSources && showTargetButton) || multipleTargets) && (
            <EdgeContent
              x={targetButton.x - edgeContentWidth / 2}
              y={targetButton.y - edgeContentHeight / 2}
              graphId={graphId}
              parentId={multipleSources ? undefined : source}
              childId={target}
              isLeaf={isLeaf}
              tabIndex={tabIndex}
              isRevealed={hovered}
              sharedPresentation={shared}
              controlProps={shared ? activeState.wrapperProps : undefined}
            />
          )}
        </>
      )}

      {/* RUN AFTER INDICATOR */}
      {showRunAfter ? (
        <foreignObject id="msla-run-after-traffic-light" width={runAfterWidth} height={runAfterHeight} x={runAfterX} y={runAfterY}>
          {/* Same slot, thresholds, and source data in both modes; only the indicator presentation is flag-selected. */}
          {shared ? (
            <SharedRunAfterIndicator statuses={runAfterStatuses} sourceNodeId={source} />
          ) : (
            <RunAfterIndicator statuses={runAfterStatuses} sourceNodeId={source} />
          )}
        </foreignObject>
      ) : null}
      {/* RUN AFTER INDICATOR WHEN COLLAPSED */}
      {showCollapsedRunAfter ? (
        <foreignObject
          id="msla-run-after-traffic-light"
          width={runAfterWidth}
          height={runAfterHeight}
          x={indicatorCenter.x - runAfterWidth / 2}
          y={indicatorCenter.y - runAfterHeight / 2}
        >
          {shared ? (
            <SharedCollapsedRunAfterIndicator filteredRunAfters={filteredRunAfters} runAfterCount={runAfterCount} />
          ) : (
            <CollapsedRunAfterIndicator filteredRunAfters={filteredRunAfters} runAfterCount={runAfterCount} />
          )}
        </foreignObject>
      ) : null}
    </>
  );
};

export default memo(ButtonEdge);

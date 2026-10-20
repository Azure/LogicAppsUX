import type React from 'react';
import { memo, useMemo } from 'react';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, useReactFlow, type EdgeProps } from '@xyflow/react';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { containsIdTag, removeIdTag, getEdgeCenter, useEdgeIndex } from '@microsoft/logic-apps-shared';

import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelectedInOperationPanel, useIsNodeInMultiSelection } from '../../core/state/panel/panelSelectors';
import { useActionMetadata, useNodeEdgeTargets, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { filterRunAfters, WorkflowEdgeView } from './workflowEdgeView';
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
  const sourceId = containsIdTag(source) ? removeIdTag(source) : source;
  const targetId = containsIdTag(target) ? removeIdTag(target) : target;
  const graphId = (containsIdTag(source) ? removeIdTag(source) : undefined) ?? nodeMetadata?.graphId ?? '';
  const [centerX, centerY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const filteredRunAfters: Record<string, string[]> = useMemo(() => filterRunAfters(operationData?.runAfter), [operationData?.runAfter]);
  const numRunAfters = Object.keys(filteredRunAfters).length;
  const raIndex: number = useMemo(() => {
    const sortedRunAfters = Object.keys(filteredRunAfters)
      .slice(0)
      .sort((id1, id2) => (reactFlow.getNode(id2)?.position?.x ?? 0) - (reactFlow.getNode(id1)?.position?.x ?? 0));

    return sortedRunAfters?.findIndex((key) => key === source);
  }, [filteredRunAfters, reactFlow, source]);

  const showSourceButton = edgeTargets[edgeTargets.length - 1] === target;
  const showTargetButton = edgeSources?.[edgeSources.length - 1] === source;

  const multipleSources = edgeSources.length > 1;
  const multipleTargets = edgeTargets.length > 1;
  const onlyEdge = !multipleSources && !multipleTargets;
  const isLeaf = edgeTargets.length === 0;

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);
  const isSourceMultiSelected = useIsNodeInMultiSelection(sourceId);
  const isTargetMultiSelected = useIsNodeInMultiSelection(targetId);
  const highlighted = useMemo(
    () => isSourceSelected || isTargetSelected || isSourceMultiSelected || isTargetMultiSelected,
    [isSourceSelected, isTargetSelected, isSourceMultiSelected, isTargetMultiSelected]
  );

  return (
    <WorkflowEdgeView
      id={id}
      source={source}
      sourceX={sourceX}
      sourceY={sourceY}
      targetX={targetX}
      targetY={targetY}
      sourcePosition={sourcePosition}
      targetPosition={targetPosition}
      style={style}
      filteredRunAfters={filteredRunAfters}
      runAfterIndex={raIndex}
      highlighted={highlighted}
    >
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
    </WorkflowEdgeView>
  );
};

export default memo(ButtonEdge);

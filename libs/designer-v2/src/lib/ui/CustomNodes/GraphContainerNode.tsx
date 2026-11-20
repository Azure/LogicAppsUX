import { useMonitoringView, useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelectedInOperationPanel, useIsNodeInMultiSelection } from '../../core/state/panel/panelSelectors';
import {
  useActionMetadata,
  useIsLeafNode,
  useNodeMetadata,
  useNodeDisplayName,
  useParentNodeId,
  useRunData,
} from '../../core/state/workflow/workflowSelectors';
import { DropZone } from '../connections/dropzone';
import { horizontalTerminalStyle } from '../connections/connections.styles';
import { css } from '@fluentui/react';
import { GraphContainer } from '@microsoft/designer-ui';
import {
  SUBGRAPH_TYPES,
  WORKFLOW_NODE_TYPES,
  useNodeSize,
  useNodeLeafIndex,
  isNullOrUndefined,
  removeIdTag,
} from '@microsoft/logic-apps-shared';
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { EdgeDrawSourceHandle } from './components/handles/EdgeDrawSourceHandle';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { AgentToolsDecoration, NodeFrame, nodeMetrics } from '@microsoft/designer-ui-v2';
import { getNodePresentation, type NodePresentation } from '../../core/utils/graph';
import type { BranchGroupDecoration } from '../../core/graphlayout/helpers';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  group: { position: 'absolute', pointerEvents: 'none', minWidth: 0 },
  convergence: {
    position: 'absolute',
    inset: 0,
    overflow: 'visible',
    pointerEvents: 'none',
    color: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { color: 'CanvasText' },
  },
});

interface AgentToolsPanelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GraphContainerNode = ({ id, data }: NodeProps) => {
  const styles = useStyles();
  const readOnly = useReadOnly();
  const sharedOption = useSharedNodeUi();

  const selected = useIsNodeSelectedInOperationPanel(id);
  const isMultiSelected = useIsNodeInMultiSelection(id);
  const actionMetadata = useActionMetadata(id);
  const nodeMetadata = useNodeMetadata(id);
  const isLeaf = useIsLeafNode(id);
  const isMonitoringView = useMonitoringView();
  const showLeafComponents = !readOnly && actionMetadata?.type && isLeaf;
  const isSubgraphContainer = nodeMetadata?.subgraphType !== undefined;
  const hasFooter = nodeMetadata?.subgraphType === SUBGRAPH_TYPES.UNTIL_DO;
  const graphContainerId = isSubgraphContainer ? removeIdTag(id) : id;
  const label = useNodeDisplayName(graphContainerId);
  const parentNodeId = useParentNodeId(graphContainerId);
  const runData = useRunData(isSubgraphContainer ? (parentNodeId ?? graphContainerId) : graphContainerId);
  const nodeSize = useNodeSize(id);
  const nodeLeafIndex = useNodeLeafIndex(id);
  const presentation =
    (data?.presentation as NodePresentation | undefined) ?? getNodePresentation(WORKFLOW_NODE_TYPES.GRAPH_NODE, sharedOption);
  const shared = presentation.shared;
  const type = actionMetadata?.type?.toLowerCase();
  const kind = type === 'if' ? 'condition' : type === 'switch' ? 'switch' : type === 'foreach' || type === 'until' ? 'loop' : 'scope';
  const merge = shared && (type === 'if' || type === 'switch');
  const bodyFrame = data?.bodyFrame as { y: number; height: number } | undefined;
  const toolsPanel = data?.toolsPanel as AgentToolsPanelBounds | undefined;
  const handleAxis = data?.handleAxis === 'horizontal' ? 'horizontal' : 'vertical';
  const hasAgentDecoration = shared && type === 'agent' && !!toolsPanel && toolsPanel.width > 0 && toolsPanel.height > 0;
  const agentToolsPanel = hasAgentDecoration ? toolsPanel : undefined;
  // Same truth as the legacy GraphContainer `active` prop: in monitoring, a container with no run record was
  // not reached, so the shared frame and its merge junction render at the single inactive opacity level.
  const inactive = isMonitoringView && isNullOrUndefined(runData?.status);
  const branchGroup = merge ? (data?.branchGroup as BranchGroupDecoration | undefined) : undefined;
  const horizontal = handleAxis === 'horizontal';
  const width = nodeSize?.width ?? 0;
  const height = nodeSize?.height ?? 0;
  const mergeX = horizontal ? width : width / 2;
  const mergeY = horizontal ? height / 2 : height;
  const exits = branchGroup?.exits ?? [];
  // Cross lanes only after the longest lane ends. Draw the shared crossbar and stem once.
  const gutter = ((horizontal ? mergeX : mergeY) + Math.max(...exits.map(({ x, y }) => (horizontal ? x : y)))) / 2;
  const crossPositions = [horizontal ? mergeY : mergeX, ...exits.map(({ x, y }) => (horizontal ? y : x))];
  const crossStart = Math.min(...crossPositions);
  const crossEnd = Math.max(...crossPositions);

  return (
    <>
      <div
        className={css('msla-graph-container-wrapper', hasFooter && 'has-footer', isSubgraphContainer && 'is-subgraph')}
        style={{
          width: nodeSize?.width ?? 0,
          height: nodeSize?.height ?? 0,
          ...(shared && { padding: 0 }),
        }}
      >
        {/* Structural targets use the graph boundary; contained positioning is only for a canonical handle dot. */}
        <DefaultHandle axis={handleAxis} type="target" />
        {shared ? (
          merge ? (
            branchGroup && (
              <>
                <NodeFrame
                  kind={kind}
                  selected={selected || isMultiSelected}
                  inactive={inactive}
                  handleAxis={handleAxis}
                  aria-hidden="true"
                  className={styles.group}
                  style={{ inset: horizontal ? `0 0 0 ${branchGroup.start}px` : `${branchGroup.start}px 0 0` }}
                />
                <svg
                  aria-hidden="true"
                  className={styles.convergence}
                  width={width}
                  height={height}
                  opacity={inactive ? nodeMetrics.inactiveOpacity : 1}
                  data-branch-convergence={id}
                >
                  {exits.length > 0 && (
                    <path
                      d={[
                        ...exits.map(({ x, y }) => `M ${x} ${y} ${horizontal ? 'H' : 'V'} ${gutter}`),
                        horizontal
                          ? `M ${gutter} ${crossStart} V ${crossEnd} M ${gutter} ${mergeY} H ${mergeX}`
                          : `M ${crossStart} ${gutter} H ${crossEnd} M ${mergeX} ${gutter} V ${mergeY}`,
                      ].join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="3 2"
                    />
                  )}
                </svg>
              </>
            )
          ) : type === 'agent' ? null : (
            <NodeFrame
              kind={kind}
              selected={selected || isMultiSelected}
              inactive={inactive}
              handleAxis={handleAxis}
              style={{
                width: '100%',
                height: bodyFrame?.height ?? '100%',
                ...(bodyFrame && { position: 'absolute', top: bodyFrame.y }),
              }}
            />
          )
        ) : (
          <GraphContainer id={id} active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true} selected={selected} />
        )}
        {agentToolsPanel ? (
          <AgentToolsDecoration
            aria-hidden="true"
            role="presentation"
            data-agent-tools-decoration={id}
            style={{
              position: 'absolute',
              left: agentToolsPanel.x,
              top: agentToolsPanel.y,
              width: agentToolsPanel.width,
              height: agentToolsPanel.height,
            }}
          />
        ) : null}
        {merge ? (
          <DefaultHandle axis={handleAxis} type="source" presentation="merge" label={label} inactive={inactive} />
        ) : isSubgraphContainer ? (
          <DefaultHandle axis={handleAxis} type="source" />
        ) : (
          <EdgeDrawSourceHandle
            axis={handleAxis}
            highlighted={selected || isMultiSelected}
            {...(shared && type === 'agent' && handleAxis === 'vertical' && { contained: true })}
          />
        )}
      </div>
      {showLeafComponents && (
        <div className="edge-drop-zone-container" style={shared && handleAxis === 'horizontal' ? horizontalTerminalStyle : undefined}>
          <DropZone
            graphId={nodeMetadata?.graphId ?? ''}
            parentId={id}
            isLeaf={isLeaf}
            tabIndex={nodeLeafIndex}
            axis={handleAxis}
            {...(data?.presentation ? { sharedPresentation: shared } : {})}
          />
        </div>
      )}
    </>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);

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
import { NodeFrame } from '@microsoft/designer-ui-v2';
import { getNodePresentation, type NodePresentation } from '../../core/utils/graph';

const GraphContainerNode = ({ id, data }: NodeProps) => {
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
        <DefaultHandle type="target" {...(shared && type === 'agent' && { contained: true })} />
        {shared ? (
          type === 'agent' || type === 'if' || type === 'switch' ? null : (
            <NodeFrame
              kind={kind}
              selected={selected || isMultiSelected}
              handleAxis="vertical"
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
        {merge ? (
          <DefaultHandle type="source" presentation="merge" label={label} />
        ) : isSubgraphContainer ? (
          <DefaultHandle type="source" />
        ) : (
          <EdgeDrawSourceHandle highlighted={selected || isMultiSelected} {...(shared && type === 'agent' && { contained: true })} />
        )}
      </div>
      {showLeafComponents && (
        <div className="edge-drop-zone-container">
          <DropZone
            graphId={nodeMetadata?.graphId ?? ''}
            parentId={id}
            isLeaf={isLeaf}
            tabIndex={nodeLeafIndex}
            {...(data?.presentation ? { sharedPresentation: shared } : {})}
          />
        </div>
      )}
    </>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);

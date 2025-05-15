import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import {
  useActionMetadata,
  useIsLeafNode,
  useNodeMetadata,
  useParentNodeId,
  useRunData,
} from '../../core/state/workflow/workflowSelectors';
import { DropZone } from '../connections/dropzone';
import { css } from '@fluentui/react';
import { GraphContainer } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES, useNodeSize, useNodeLeafIndex, isNullOrUndefined, removeIdTag } from '@microsoft/logic-apps-shared';
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const GraphContainerNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();

  const selected = useIsNodeSelectedInOperationPanel(id);
  const actionMetadata = useActionMetadata(id);
  const nodeMetadata = useNodeMetadata(id);
  const isLeaf = useIsLeafNode(id);
  const isMonitoringView = useMonitoringView();
  const showLeafComponents = !readOnly && actionMetadata?.type && isLeaf;
  const isSubgraphContainer = nodeMetadata?.subgraphType !== undefined;
  const hasFooter = nodeMetadata?.subgraphType === SUBGRAPH_TYPES.UNTIL_DO;
  const graphContainerId = isSubgraphContainer ? removeIdTag(id) : id;
  const parentNodeId = useParentNodeId(graphContainerId);
  const runData = useRunData(isSubgraphContainer ? (parentNodeId ?? graphContainerId) : graphContainerId);
  const nodeSize = useNodeSize(id);
  const nodeLeafIndex = useNodeLeafIndex(id);

  return (
    <>
      <div
        className={css('msla-graph-container-wrapper', hasFooter && 'has-footer', isSubgraphContainer && 'is-subgraph')}
        style={{
          width: nodeSize?.width ?? 0,
          height: nodeSize?.height ?? 0,
        }}
      >
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <GraphContainer
          id={id}
          active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true}
          selected={selected}
          isSubgraph={isSubgraphContainer}
        />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showLeafComponents && (
        <div className="edge-drop-zone-container">
          <DropZone graphId={nodeMetadata?.graphId ?? ''} parentId={id} isLeaf={isLeaf} tabIndex={nodeLeafIndex} />
        </div>
      )}
    </>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);

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
import { SUBGRAPH_TYPES, useNodeLeafIndex, isNullOrUndefined, removeIdTag, useNodeSize } from '@microsoft/logic-apps-shared';
import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { EdgeDrawSourceHandle } from './components/handles/EdgeDrawSourceHandle';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { DEFAULT_NODE_SIZE } from '../../core/utils/graph';


const groupPadding = 20;


const GraphContainerNode = ({ id }: NodeProps) => {
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
  const nodeLeafIndex = useNodeLeafIndex(id);
  const nodeSize = useNodeSize(id);

  const groupSize = useMemo(() => {
    const width = nodeSize?.width ?? DEFAULT_NODE_SIZE.width;
    const height = nodeSize?.height ?? DEFAULT_NODE_SIZE.height;
    return {
      width: width,
      height: height,
    };
  }, [nodeSize]);

  return (
    <>
      <div style={{
        position: 'absolute',
        width: groupSize?.width,
        top: `${groupPadding}px`,
        bottom: `-${groupPadding}px`,
      }}>
        <GraphContainer id={id} active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true} selected={selected} />
        {isSubgraphContainer ? <DefaultHandle type="source" /> : <EdgeDrawSourceHandle />}
        {showLeafComponents && (
          <div className="edge-drop-zone-container">
            <DropZone graphId={nodeMetadata?.graphId ?? ''} parentId={id} isLeaf={isLeaf} tabIndex={nodeLeafIndex} />
          </div>
        )}
      </div>
      <div
        className={css(hasFooter && 'has-footer', isSubgraphContainer && 'is-subgraph')}
        style={{
          width: groupSize?.width,
          height: groupSize?.height,
          border: '1px solid red',
        }}
      >
        <DefaultHandle type="target" />
      </div>
    </>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);

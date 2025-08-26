import type { AppDispatch } from '../../../core';
import { useNodeMetadata, useNodeDisplayName, storeStateToUndoRedoHistory } from '../../../core';
import { deleteOperation, deleteGraphNode } from '../../../core/actions/bjsworkflow/delete';
import { useShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { useWorkflowNode } from '../../../core/state/workflow/workflowSelectors';
import { deleteAgentTool, deleteSwitchCase } from '../../../core/state/workflow/workflowSlice';
import { DeleteNodeModal } from '@microsoft/designer-ui';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

const DeleteModal = () => {
  const dispatch = useDispatch<AppDispatch>();

  const nodeId = useShowDeleteModalNodeId();
  const nodeName = useNodeDisplayName(nodeId);
  const nodeData = useWorkflowNode(nodeId);
  const metadata = useNodeMetadata(nodeId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);

  const isTrigger = useMemo(() => metadata?.isTrigger ?? false, [metadata]);

  const onDismiss = useCallback(() => dispatch(setShowDeleteModalNodeId(undefined)), [dispatch]);

  const handleDelete = useCallback(() => {
    if (!nodeId || !nodeData) {
      return;
    }
    const { type, subGraphLocation } = nodeData;

    if (type === WORKFLOW_NODE_TYPES.OPERATION_NODE) {
      dispatch(storeStateToUndoRedoHistory({ type: deleteOperation.pending }));
      dispatch(deleteOperation({ nodeId, isTrigger }));
    } else if (type === WORKFLOW_NODE_TYPES.GRAPH_NODE) {
      dispatch(storeStateToUndoRedoHistory({ type: deleteGraphNode.pending }));
      dispatch(
        deleteGraphNode({
          graphId: nodeId,
          graphNode: nodeData,
        })
      );
    } else if (type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) {
      dispatch(storeStateToUndoRedoHistory({ type: deleteGraphNode.pending }));
      dispatch(
        deleteGraphNode({
          graphId: nodeId,
          graphNode: nodeData,
        })
      );

      if (subGraphLocation === 'tools') {
        dispatch(
          deleteAgentTool({
            toolId: nodeId,
            agentId: graphId,
          })
        );
      } else if (subGraphLocation === 'cases') {
        dispatch(
          deleteSwitchCase({
            caseId: nodeId,
            nodeId: graphId,
          })
        );
      }
    }

    onDismiss();
  }, [nodeData, dispatch, nodeId, isTrigger, graphId, onDismiss]);

  return (
    <DeleteNodeModal
      nodeId={nodeId ?? ''}
      nodeName={nodeName}
      nodeType={nodeData?.type}
      isOpen={!!nodeId}
      onDismiss={onDismiss}
      onConfirm={handleDelete}
    />
  );
};

export default DeleteModal;

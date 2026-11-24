import type { AppDispatch } from '../../../core';
import { useNodeMetadata, useNodeDisplayName, storeStateToUndoRedoHistory } from '../../../core';
import { deleteOperation, deleteGraphNode } from '../../../core/actions/bjsworkflow/delete';
import { useShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { useMonitoringView, useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata, useWorkflowNode } from '../../../core/state/workflow/workflowSelectors';
import { deleteAgentTool, deleteSwitchCase } from '../../../core/state/workflow/workflowSlice';
import { DeleteNodeModal } from '@microsoft/designer-ui';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

const DeleteModal = () => {
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const monitoring = useMonitoringView();
  const canDelete = !readOnly && !monitoring;

  const nodeId = useShowDeleteModalNodeId();
  const nodeName = useNodeDisplayName(nodeId);
  const nodeData = useWorkflowNode(nodeId);
  const metadata = useNodeMetadata(nodeId);
  const operationMetadata = useActionMetadata(nodeId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);

  const isTrigger = useMemo(() => metadata?.isTrigger ?? false, [metadata]);

  const onDismiss = useCallback(() => dispatch(setShowDeleteModalNodeId(undefined)), [dispatch]);

  // Don't restore a pending authoring confirmation after a trip through a run view.
  useEffect(() => {
    if (!canDelete && nodeId) {
      onDismiss();
    }
  }, [canDelete, nodeId, onDismiss]);

  const handleDelete = useCallback(() => {
    if (!canDelete || !nodeId || !nodeData) {
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
  }, [canDelete, nodeData, dispatch, nodeId, isTrigger, graphId, onDismiss]);

  return (
    <DeleteNodeModal
      nodeId={nodeId ?? ''}
      nodeName={nodeName}
      nodeType={nodeData?.type}
      subgraphType={metadata?.subgraphType}
      operationType={operationMetadata?.type}
      isOpen={!!nodeId && canDelete}
      onDismiss={onDismiss}
      onConfirm={handleDelete}
    />
  );
};

export default DeleteModal;

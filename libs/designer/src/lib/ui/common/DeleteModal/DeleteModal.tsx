import type { AppDispatch } from '../../../core';
import { useSelectedNodeId, useNodeMetadata } from '../../../core';
import { deleteOperation, deleteGraphNode } from '../../../core/actions/bjsworkflow/delete';
import { useShowDeleteModal } from '../../../core/state/designerView/designerViewSelectors';
import { setShowDeleteModal } from '../../../core/state/designerView/designerViewSlice';
import { useWorkflowNode } from '../../../core/state/workflow/workflowSelectors';
import { deleteSwitchCase } from '../../../core/state/workflow/workflowSlice';
import { DeleteNodeModal } from '@microsoft/designer-ui';
import { WORKFLOW_NODE_TYPES, removeIdTag } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

const DeleteModal = () => {
  const dispatch = useDispatch<AppDispatch>();

  const nodeId = useSelectedNodeId();
  const nodeData = useWorkflowNode(nodeId);
  const metadata = useNodeMetadata(nodeId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);

  const isTrigger = useMemo(() => !!(metadata?.graphId === 'root' && metadata?.isRoot), [metadata]);

  const showDeleteModal = useShowDeleteModal();
  const onDismiss = useCallback(() => dispatch(setShowDeleteModal(false)), [dispatch]);

  const handleDelete = useCallback(() => {
    if (!nodeData) return;
    const { type } = nodeData;

    if (type === WORKFLOW_NODE_TYPES.OPERATION_NODE) {
      dispatch(deleteOperation({ nodeId, isTrigger }));
    } else if (type === WORKFLOW_NODE_TYPES.GRAPH_NODE) {
      dispatch(
        deleteGraphNode({
          graphId: removeIdTag(nodeId) ?? '',
          graphNode: nodeData,
        })
      );
    } else if (type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) {
      dispatch(
        deleteGraphNode({
          graphId: removeIdTag(nodeId) ?? '',
          graphNode: nodeData,
        })
      );
      dispatch(
        deleteSwitchCase({
          caseId: removeIdTag(nodeId) ?? '',
          nodeId: graphId,
        })
      );
    }

    onDismiss();
  }, [nodeData, dispatch, nodeId, isTrigger, graphId, onDismiss]);

  return (
    <DeleteNodeModal nodeId={nodeId} nodeType={nodeData?.type} isOpen={showDeleteModal} onDismiss={onDismiss} onConfirm={handleDelete} />
  );
};

export default DeleteModal;

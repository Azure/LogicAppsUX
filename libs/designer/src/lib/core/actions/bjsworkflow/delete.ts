import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_NODE_TYPES } from '../../parsers/models/workflowNode';
import { removeNodeConnectionData } from '../../state/connection/connectionSlice';
import { deinitializeNodes, deinitializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { clearPanel } from '../../state/panel/panelSlice';
import { deinitializeTokensAndVariables } from '../../state/tokensSlice';
import { clearFocusNode, deleteNode } from '../../state/workflow/workflowSlice';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

type DeleteOperationPayload = {
  nodeId: string;
};

export type DeleteGraphPayload = {
  graphId: string;
  graphNode: WorkflowNode;
};

export const deleteOperation = createAsyncThunk('deleteOperation', async (deletePayload: DeleteOperationPayload, { dispatch }) => {
  const { nodeId } = deletePayload;

  dispatch(clearFocusNode());
  dispatch(clearPanel());

  dispatch(deleteNode(deletePayload));
  deleteOperationDetails(nodeId, dispatch);
});

export const deleteOperationDetails = async (nodeId: string, dispatch: Dispatch): Promise<void> => {
  dispatch(removeNodeConnectionData({ nodeId }));
  dispatch(deinitializeNodes([nodeId]));
  dispatch(deinitializeTokensAndVariables({ id: nodeId }));
  dispatch(deinitializeOperationInfo({ id: nodeId }));
};

export const deleteGraphNode = createAsyncThunk('deleteGraph', async (deletePayload: DeleteGraphPayload, { dispatch }) => {
  const { graphId, graphNode } = deletePayload;

  dispatch(clearFocusNode());
  dispatch(clearPanel());

  // DELETE GRAPH
  console.log('delete graph', graphId);

  const recursiveGraphDelete = (graph: WorkflowNode) => {
    graph.children?.forEach((child) => {
      if (child.type === WORKFLOW_NODE_TYPES.GRAPH_NODE) {
        recursiveGraphDelete(child);
      } else {
        dispatch(deleteOperation({ nodeId: child.id }));
      }
    });
    dispatch(deleteOperation({ nodeId: graph.id }));
  };

  recursiveGraphDelete(graphNode);
});

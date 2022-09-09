import { removeNodeConnectionData } from '../../state/connection/connectionSlice';
import { deinitializeNodes, deinitializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { deinitializeTokensAndVariables } from '../../state/tokensSlice';
import { clearFocusNode, deleteNode } from '../../state/workflow/workflowSlice';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

type DeleteOperationPayload = {
  nodeId: string;
  graphId: string;
};

export const deleteOperation = createAsyncThunk('deleteOperation', async (deletePayload: DeleteOperationPayload, { dispatch }) => {
  const { nodeId } = deletePayload;

  dispatch(clearFocusNode());

  // Run through all node data backwards in case details need to reference other parts of the node
  dispatch(deleteNode(deletePayload));
  removeConnectionDataForNode(nodeId, dispatch);
  deleteOperationDetails(nodeId, dispatch);
  dispatch(deinitializeOperationInfo({ id: nodeId }));
});

export const removeConnectionDataForNode = async (nodeId: string, dispatch: Dispatch) => {
  dispatch(removeNodeConnectionData({ nodeId }));
};

export const deleteOperationDetails = async (nodeId: string, dispatch: Dispatch): Promise<void> => {
  dispatch(deinitializeNodes([nodeId]));
  dispatch(deinitializeTokensAndVariables({ id: nodeId }));
};

import type { RootState } from '../../..';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { removeNodeConnectionData } from '../../state/connection/connectionSlice';
import { deinitializeNodes, deinitializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { clearPanel } from '../../state/panel/panelSlice';
import { setValidationError } from '../../state/setting/settingSlice';
import { deinitializeStaticResultProperty } from '../../state/staticresultschema/staticresultsSlice';
import { deinitializeTokensAndVariables } from '../../state/tokens/tokensSlice';
import { clearFocusNode, deleteNode } from '../../state/workflow/workflowSlice';
import { updateAllUpstreamNodes } from './initialize';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

type DeleteOperationPayload = {
  nodeId: string;
  isTrigger: boolean;
};

export type DeleteGraphPayload = {
  graphId: string;
  graphNode: WorkflowNode;
};

export const deleteOperation = createAsyncThunk(
  'deleteOperation',
  async (deletePayload: DeleteOperationPayload, { getState, dispatch }) => {
    batch(() => {
      const { nodeId } = deletePayload;

      dispatch(clearFocusNode());
      dispatch(clearPanel());

      dispatch(deleteNode(deletePayload));
      deleteOperationDetails(nodeId, dispatch);
      updateAllUpstreamNodes(getState() as RootState, dispatch);
    });
  }
);

const deleteOperationDetails = async (nodeId: string, dispatch: Dispatch): Promise<void> => {
  dispatch(removeNodeConnectionData({ nodeId }));
  dispatch(deinitializeNodes([nodeId]));
  dispatch(deinitializeTokensAndVariables({ id: nodeId }));
  dispatch(deinitializeOperationInfo({ id: nodeId }));
  dispatch(setValidationError({ nodeId, errors: [] }));
  dispatch(deinitializeStaticResultProperty({ id: nodeId + 0 }));
};

export const deleteGraphNode = createAsyncThunk('deleteGraph', async (deletePayload: DeleteGraphPayload, { dispatch }) => {
  const { graphNode } = deletePayload;

  dispatch(clearFocusNode());
  dispatch(clearPanel());

  // DELETE GRAPH
  const recursiveGraphDelete = (graph: WorkflowNode) => {
    graph.children?.forEach((child) => {
      if (child.type === WORKFLOW_NODE_TYPES.GRAPH_NODE || child.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) {
        recursiveGraphDelete(child);
      } else {
        dispatch(deleteOperation({ nodeId: child.id, isTrigger: false }));
      }
    });
    dispatch(deleteOperation({ nodeId: graph.id, isTrigger: false }));
  };

  recursiveGraphDelete(graphNode);
  return;
});

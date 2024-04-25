import { isCustomCode } from '@microsoft/designer-ui';
import type { RootState } from '../../..';
import constants from '../../../common/constants';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { removeNodeConnectionData } from '../../state/connection/connectionSlice';
import { deleteCustomCode } from '../../state/customcode/customcodeSlice';
import { deinitializeNodes, deinitializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import { clearPanel } from '../../state/panel/panelSlice';
import { setValidationError } from '../../state/setting/settingSlice';
import { deinitializeStaticResultProperty } from '../../state/staticresultschema/staticresultsSlice';
import { deinitializeTokensAndVariables } from '../../state/tokens/tokensSlice';
import { clearFocusNode, deleteNode } from '../../state/workflow/workflowSlice';
import { getParameterFromName } from '../../utils/parameters/helper';
import { updateAllUpstreamNodes } from './initialize';
import { WORKFLOW_NODE_TYPES, getRecordEntry } from '@microsoft/logic-apps-shared';
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
      deleteCustomCodeInfo(nodeId, dispatch, getState() as RootState);
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

const deleteCustomCodeInfo = (nodeId: string, dispatch: Dispatch, state: RootState): void => {
  const nodeInputs = getRecordEntry(state.operations.inputParameters, nodeId);
  if (nodeInputs) {
    const parameter = getParameterFromName(nodeInputs, constants.DEFAULT_CUSTOM_CODE_INPUT);
    if (isCustomCode(parameter?.editor, parameter?.editorOptions?.language)) {
      const fileName = parameter?.editorViewModel?.customCodeData?.fileName;
      // if the file name is not present, then it is a new custom code and we just need to remove the file data
      dispatch(deleteCustomCode({ nodeId, fileName }));
    }
  }
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

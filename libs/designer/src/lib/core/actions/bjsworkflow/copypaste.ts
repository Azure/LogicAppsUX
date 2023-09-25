import { setFocusNode, type RootState } from '../..';
import { copyNode } from '../../state/clipboard/clipboardSlice';
import type { NodeData } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo, type NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { pasteNode } from '../../state/workflow/workflowSlice';
import { initializeOperationDetails } from './add';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

type CopyOperationPayload = {
  nodeId: string;
};

export const copyOperation = createAsyncThunk('copyOperation', async (payload: CopyOperationPayload, { dispatch, getState }) => {
  batch(() => {
    const { nodeId } = payload;
    if (!nodeId) throw new Error('Node does not exist'); // Just an optional catch, should never happen
    const state = getState() as RootState;
    const newNodeId = `${nodeId}_copy`;

    const nodeOperationInfo = state.operations.operationInfo[nodeId];

    const nodeData: NodeData = {
      id: newNodeId,
      nodeInputs: state.operations.inputParameters[nodeId],
      nodeOutputs: state.operations.outputParameters[nodeId],
      nodeDependencies: state.operations.dependencies[nodeId],
      operationMetadata: state.operations.operationMetadata[nodeId],
      settings: state.operations.settings[nodeId],
      staticResult: state.operations.staticResults[nodeId],
      actionMetadata: state.operations.actionMetadata[nodeId],
      repetitionInfo: state.operations.repetitionInfos[nodeId],
    };

    dispatch(copyNode({ nodeId: newNodeId, operationInfo: nodeOperationInfo, nodeData: nodeData }));
  });
});

type PasteOperationPayload = {
  nodeId: string;
  operationInfo: NodeOperation;
  relationshipIds: RelationshipIds;
  nodeData: NodeData;
};

export const pasteOperation = createAsyncThunk('pasteOperation', async (payload: PasteOperationPayload, { dispatch, getState }) => {
  const { operationInfo, nodeId: actionId, relationshipIds, nodeData } = payload;
  if (!operationInfo) throw new Error('Operation does not exist'); // Just an optional catch, should never happen
  let count = 1;
  let nodeId = actionId;
  while ((getState() as RootState).workflow.nodesMetadata[nodeId]) {
    nodeId = `${actionId}_${count}`;
    count++;
  }
  // paste the node
  dispatch(
    pasteNode({
      nodeId: nodeId,
      relationshipIds: relationshipIds,
      operation: operationInfo,
    })
  );

  dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo }));
  await initializeOperationDetails(nodeId, operationInfo, getState as () => RootState, dispatch);

  // replace new nodeId if there exists a copy of the copied node
  dispatch(initializeNodes([{ ...nodeData, id: nodeId }]));

  // // Update settings for children and parents

  dispatch(setFocusNode(nodeId));
});

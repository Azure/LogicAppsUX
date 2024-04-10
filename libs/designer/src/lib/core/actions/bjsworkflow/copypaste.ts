import type { ReferenceKey } from '../../../common/models/workflow';
import { setFocusNode, type RootState } from '../..';
import { initCopiedConnectionMap } from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import { pasteNode } from '../../state/workflow/workflowSlice';
import { initializeOperationDetails } from './add';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

type CopyOperationPayload = {
  nodeId: string;
};

export const copyOperation = createAsyncThunk('copyOperation', async (payload: CopyOperationPayload, { getState }) => {
  batch(() => {
    const { nodeId } = payload;
    if (!nodeId) throw new Error('Node does not exist'); // Just an optional catch, should never happen
    const state = getState() as RootState;
    const newNodeId = `${nodeId}_copy`;

    const nodeOperationInfo = getRecordEntry(state.operations.operationInfo, nodeId);

    const nodeData = {
      id: newNodeId,
      nodeInputs: getRecordEntry(state.operations.inputParameters, nodeId),
      nodeOutputs: getRecordEntry(state.operations.outputParameters, nodeId),
      nodeDependencies: getRecordEntry(state.operations.dependencies, nodeId),
      operationMetadata: getRecordEntry(state.operations.operationMetadata, nodeId),
      settings: getRecordEntry(state.operations.settings, nodeId),
      staticResult: getRecordEntry(state.operations.staticResults, nodeId),
      actionMetadata: getRecordEntry(state.operations.actionMetadata, nodeId),
      repetitionInfo: getRecordEntry(state.operations.repetitionInfos, nodeId),
    };
    const connectionReference = getRecordEntry(state.connections.connectionsMapping, nodeId);
    window.localStorage.setItem(
      'msla-clipboard',
      JSON.stringify({
        nodeId: newNodeId,
        operationInfo: nodeOperationInfo,
        nodeData,
        connectionData: connectionReference,
      })
    );
  });
});

interface PasteOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  nodeData: NodeData;
  operationInfo: NodeOperation;
  connectionData?: ReferenceKey;
}

export const pasteOperation = createAsyncThunk('pasteOperation', async (payload: PasteOperationPayload, { dispatch, getState }) => {
  const { nodeId: actionId, relationshipIds, nodeData, operationInfo, connectionData } = payload;
  if (!actionId || !relationshipIds || !nodeData) throw new Error('Operation does not exist'); // Just an optional catch, should never happen
  let count = 1;
  let nodeId = actionId;

  const nodesMetadata = (getState() as RootState).workflow.nodesMetadata;
  while (getRecordEntry(nodesMetadata, nodeId)) {
    nodeId = `${actionId}_${count}`;
    count++;
  }

  dispatch(setIsPanelLoading(true));

  // update workflow
  dispatch(
    pasteNode({
      nodeId: nodeId,
      relationshipIds: relationshipIds,
      operation: operationInfo,
    })
  );

  dispatch(setFocusNode(nodeId));

  dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo }));
  await initializeOperationDetails(nodeId, operationInfo, getState as () => RootState, dispatch);

  // replace new nodeId if there exists a copy of the copied node
  dispatch(initializeNodes([{ ...nodeData, id: nodeId }]));

  if (connectionData) {
    dispatch(initCopiedConnectionMap({ nodeId, referenceKey: connectionData }));
  }

  dispatch(setIsPanelLoading(false));
});

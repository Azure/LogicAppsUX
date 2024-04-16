import type { ReferenceKey } from '../../../common/models/workflow';
import { serializeWorkflow, setFocusNode, type RootState } from '../..';
import { initCopiedConnectionMap } from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import { pasteNode, pasteScopeNode } from '../../state/workflow/workflowSlice';
import { getNonDuplicateId, getNonDuplicateNodeId, initializeOperationDetails } from './add';
import { LogicAppsV2, Operations, createIdCopy, getRecordEntry, removeIdTag } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';
import { getNodeOperationData } from '../../state/operation/operationSelector';
import { serializeOperation } from './serializer';
import { PasteScopeParams, buildGraphFromActions, getAllActionNames } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { ActionDefinition } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { initializeOperationMetadata } from './operationdeserializer';
import { getWorkflowNodeFromGraphState } from '../../state/workflow/workflowSelectors';
import { NodesMetadata } from 'lib/core/state/workflow/workflowInterfaces';

type CopyOperationPayload = {
  nodeId: string;
};

export const copyOperation = createAsyncThunk('copyOperation', async (payload: CopyOperationPayload, { getState }) => {
  batch(() => {
    const { nodeId } = payload;
    if (!nodeId) throw new Error('Node does not exist');
    const state = getState() as RootState;
    const newNodeId = createIdCopy(nodeId);

    const nodeData = getNodeOperationData(state.operations, nodeId);
    const nodeOperationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    const nodeConnectionData = getRecordEntry(state.connections.connectionsMapping, nodeId);

    window.localStorage.setItem(
      'msla-clipboard',
      JSON.stringify({
        nodeId: newNodeId,
        nodeData,
        nodeOperationInfo,
        nodeConnectionData,
        isScopeNode: false,
      })
    );
  });
});

export const copyScopeOperation = createAsyncThunk('copyScopeOperation', async (payload: CopyOperationPayload, { getState }) => {
  batch(async () => {
    let { nodeId: scopeNodeId } = payload;
    if (!scopeNodeId) throw new Error('Scope Node does not exist');
    const state = getState() as RootState;
    scopeNodeId = removeIdTag(scopeNodeId);
    const newNodeId = createIdCopy(scopeNodeId);

    const serializedOperation = await serializeOperation(state, scopeNodeId, {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });

    window.localStorage.setItem(
      'msla-clipboard',
      JSON.stringify({
        nodeId: newNodeId,
        serializedOperation,
        isScopeNode: true,
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
  if (!actionId || !relationshipIds || !nodeData) throw new Error('Operation does not exist');

  const nodeId = getNonDuplicateNodeId((getState() as RootState).workflow.nodesMetadata, actionId);

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

interface PasteScopeOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  serializedValue: LogicAppsV2.OperationDefinition | null;
}

export const pasteScopeOperation = createAsyncThunk(
  'pasteScopeOperation',
  async (payload: PasteScopeOperationPayload, { dispatch, getState }) => {
    const { nodeId: actionId, relationshipIds, serializedValue } = payload;
    if (!actionId || !relationshipIds || !serializedValue) throw new Error('Operation does not exist');
    const { graphId, parentId, childId } = relationshipIds;

    const nodesMetadata = (getState() as RootState).workflow.nodesMetadata;
    const nodeId = getNonDuplicateNodeId(nodesMetadata, actionId);

    const workflowActions = { [nodeId]: serializedValue as ActionDefinition };
    const allActionNames = getAllActionNames(workflowActions, [], true);
    const pasteParams = buildScopeParams(nodesMetadata, allActionNames);
    let [nodes, edges, actions, actionNodesMetadata] = buildGraphFromActions(
      workflowActions,
      graphId,
      parentId,
      Object.keys(nodesMetadata),
      pasteParams
    );

    dispatch(
      pasteScopeNode({
        relationshipIds,
        scopeNode: nodes[0],
        operations: actions,
        nodesMetadata: actionNodesMetadata,
        allActions: allActionNames,
      })
    );
    console.log(nodes, edges, actions, actionNodesMetadata);

    dispatch(setIsPanelLoading(true));

    dispatch(setFocusNode(nodeId));

    const graph = getWorkflowNodeFromGraphState((getState() as RootState).workflow, relationshipIds.graphId);

    if (graph) {
      await Promise.all([
        initializeOperationMetadata(
          {
            graph,
            actionData: actions,
            nodesMetadata: nodesMetadata,
          },
          {},
          {},
          {},
          'stateful',
          false,
          dispatch
        ),
      ]);
    }

    // await initializeOperationDetails(nodeId, operationInfo, getState as () => RootState, dispatch);

    // // replace new nodeId if there exists a copy of the copied node
    // dispatch(initializeNodes([{ ...nodeData, id: nodeId }]));

    // if (connectionData) {
    //   dispatch(initCopiedConnectionMap({ nodeId, referenceKey: connectionData }));
    // }

    dispatch(setIsPanelLoading(false));
  }
);

// creates a mapping of nodeIds with a 1:1 mapping of the new NodeIds to the old NodeIds
// TODO: bring in IdReplacements
const buildScopeParams = (existingNodesMetdata: NodesMetadata, newActionNodes: string[]): PasteScopeParams => {
  // temporary mapping to make sure we don't have any repeat nodeIds from both the existing workflow nodes and new paste nodes
  const allActionNames: Record<string, string> = Object.fromEntries(Object.keys(existingNodesMetdata).map((key) => [key, key]));
  const pasteActionNames: string[] = [];
  const renamedNodes: Record<string, string> = {};

  newActionNodes.forEach((nodeId) => {
    const newNodeId = getNonDuplicateId(allActionNames, nodeId);
    renamedNodes[nodeId] = newNodeId;
    allActionNames[newNodeId] = nodeId;
    pasteActionNames.push(newNodeId);
  });

  return { pasteActionNames, renamedNodes };
};

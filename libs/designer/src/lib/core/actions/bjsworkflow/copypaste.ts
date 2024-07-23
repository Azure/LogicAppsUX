import type { ConnectionReference, ReferenceKey } from '../../../common/models/workflow';
import { getTriggerNodeId, setFocusNode, type RootState } from '../..';
import { initCopiedConnectionMap, initScopeCopiedConnections } from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import { pasteNode, pasteScopeNode } from '../../state/workflow/workflowSlice';
import { getNonDuplicateId, getNonDuplicateNodeId, initializeOperationDetails } from './add';
import { createIdCopy, getRecordEntry, removeIdTag, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';
import { getNodeOperationData } from '../../state/operation/operationSelector';
import { serializeOperation } from './serializer';
import { buildGraphFromActions, getAllActionNames } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { ActionDefinition } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { initializeDynamicDataInNodes, initializeOperationMetadata } from './operationdeserializer';
import type { NodesMetadata } from '../../state/workflow/workflowInterfaces';
import { updateAllUpstreamNodes } from './initialize';
import { addDynamicTokens, type NodeTokens } from '../../state/tokens/tokensSlice';
import { getConnectionReferenceForNodeId } from '../../state/connection/connectionSelector';
import { getStaticResultForNodeId } from '../../state/staticresultschema/staitcresultsSelector';
import { initScopeCopiedStaticResultProperties } from '../../state/staticresultschema/staticresultsSlice';

type CopyOperationPayload = {
  nodeId: string;
};

export const copyOperation = createAsyncThunk('copyOperation', async (payload: CopyOperationPayload, { getState }) => {
  batch(() => {
    const { nodeId } = payload;
    if (!nodeId) {
      throw new Error('Node does not exist'); // Just an optional catch, should never happen
    }
    const state = getState() as RootState;
    const newNodeId = createIdCopy(nodeId);

    const nodeData = getNodeOperationData(state.operations, nodeId);
    const nodeOperationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    const nodeConnectionData = getRecordEntry(state.connections.connectionsMapping, nodeId);
    const nodeTokenData = getRecordEntry(state.tokens.outputTokens, nodeId);

    const clipboardItem = JSON.stringify({
      nodeId: newNodeId,
      nodeData,
      nodeTokenData,
      nodeOperationInfo,
      nodeConnectionData,
      isScopeNode: false,
      mslaNode: true,
    });
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      navigator.clipboard.writeText(clipboardItem);
    } else {
      localStorage.setItem('msla-clipboard', clipboardItem);
    }
  });
});

export const copyScopeOperation = createAsyncThunk('copyScopeOperation', async (payload: CopyOperationPayload, { getState }) => {
  batch(async () => {
    let { nodeId: scopeNodeId } = payload;
    if (!scopeNodeId) {
      throw new Error('Scope Node does not exist');
    }
    const state = getState() as RootState;
    scopeNodeId = removeIdTag(scopeNodeId);
    const newNodeId = createIdCopy(scopeNodeId);

    const serializedOperation = await serializeOperation(state, scopeNodeId, {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });

    const allActionNames = getAllActionNames({ [scopeNodeId]: serializedOperation as ActionDefinition });
    const allConnectionData: Record<string, { connectionReference: ConnectionReference; referenceKey: string }> = {};
    const staticResults: Record<string, any> = {};

    allActionNames.forEach((actionName) => {
      const connectionReference = getConnectionReferenceForNodeId(state.connections, actionName);
      if (connectionReference) {
        allConnectionData[actionName] = connectionReference;
      }

      const staticResult = getStaticResultForNodeId(state.staticResults, actionName);
      if (staticResult) {
        staticResults[actionName] = staticResult;
      }
    });
    const clipboardItem = JSON.stringify({
      nodeId: newNodeId,
      serializedOperation,
      allConnectionData,
      staticResults,
      isScopeNode: true,
      mslaNode: true,
    });
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      navigator.clipboard.writeText(clipboardItem);
    } else {
      localStorage.setItem('msla-clipboard', clipboardItem);
    }
  });
});

interface PasteOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  nodeData: NodeData;
  nodeTokenData: NodeTokens;
  operationInfo: NodeOperation;
  connectionData?: ReferenceKey;
}

export const pasteOperation = createAsyncThunk('pasteOperation', async (payload: PasteOperationPayload, { dispatch, getState }) => {
  const { nodeId: actionId, relationshipIds, nodeData, nodeTokenData, operationInfo, connectionData } = payload;
  if (!actionId || !relationshipIds || !nodeData) {
    throw new Error('Operation does not exist');
  }

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

  dispatch(
    addDynamicTokens({
      nodeId,
      tokens: nodeTokenData.tokens,
    })
  );

  if (connectionData) {
    dispatch(initCopiedConnectionMap({ connectionReferences: { [nodeId]: connectionData } }));
  }

  dispatch(setIsPanelLoading(false));
});

interface PasteScopeOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  serializedValue: LogicAppsV2.OperationDefinition | null;
  allConnectionData: Record<string, { connectionReference: ConnectionReference; referenceKey: string }>;
  staticResults: Record<string, any>;
  upstreamNodeIds: string[];
}

export const pasteScopeOperation = createAsyncThunk(
  'pasteScopeOperation',
  async (payload: PasteScopeOperationPayload, { dispatch, getState }) => {
    const { nodeId: actionId, relationshipIds, serializedValue, upstreamNodeIds, allConnectionData, staticResults } = payload;
    if (!actionId || !relationshipIds || !serializedValue) {
      throw new Error('Operation does not exist');
    }
    const { graphId, parentId } = relationshipIds;
    const state = getState() as RootState;
    const idReplacements = state.workflow.idReplacements;
    const existingNodesMetadata = replaceIdsOfExistingNodes(state.workflow.nodesMetadata, idReplacements);
    const nodeId = getNonDuplicateNodeId(existingNodesMetadata, actionId);

    const workflowActions = { [nodeId]: { ...serializedValue } as ActionDefinition };
    const allActionNames = getAllActionNames(workflowActions, [], true);

    const pasteParams = buildScopeParams(existingNodesMetadata, allActionNames);
    const [nodes, _edges, actions, actionNodesMetadata] = buildGraphFromActions(
      workflowActions,
      graphId,
      parentId,
      Object.keys(existingNodesMetadata),
      pasteParams
    );
    actionNodesMetadata[nodeId] = { ...actionNodesMetadata[actionId], isRoot: false, parentNodeId: parentId, graphId };
    if (Object.keys(allConnectionData).length > 0) {
      dispatch(initScopeCopiedConnections(replaceIdsOfExistingNodes(allConnectionData, pasteParams.renamedNodes)));
    }
    if (Object.keys(staticResults).length > 0) {
      dispatch(initScopeCopiedStaticResultProperties(replaceIdsOfExistingNodes(staticResults, pasteParams.renamedNodes)));
    }
    dispatch(
      pasteScopeNode({
        relationshipIds,
        scopeNode: nodes[0],
        operations: actions,
        nodesMetadata: actionNodesMetadata,
        allActions: allActionNames,
      })
    );

    dispatch(setIsPanelLoading(true));

    dispatch(setFocusNode(nodeId));

    const connectionReference = (getState() as RootState).connections.connectionReferences;
    const workflowParameters = state.workflowParameters.definitions;
    const workflowKind = state.workflow.workflowKind;
    const enforceSplitOn = state.designerOptions.hostOptions.forceEnableSplitOn ?? false;
    const operations = state.workflow.operations;
    const nodeMap: Record<string, string> = {};
    for (const id of Object.keys(operations)) {
      nodeMap[id] = id;
    }
    const upstreamOutputTokens = replaceIdsOfExistingNodes(filterRecordByArray(state.tokens.outputTokens, upstreamNodeIds), idReplacements);
    const triggerId = getTriggerNodeId(state.workflow);

    await Promise.all([
      initializeOperationMetadata(
        {
          graph: nodes[0],
          actionData: actions,
          nodesMetadata: actionNodesMetadata,
          staticResults: staticResults,
        },
        connectionReference,
        workflowParameters,
        {},
        workflowKind,
        enforceSplitOn,
        dispatch,
        { ...pasteParams, existingOutputTokens: upstreamOutputTokens, rootTriggerId: triggerId }
      ),
    ]);
    await initializeDynamicDataInNodes(getState as () => RootState, dispatch, pasteParams.pasteActionNames);

    updateAllUpstreamNodes(getState() as RootState, dispatch);
    dispatch(setIsPanelLoading(false));
  }
);

const replaceIdsOfExistingNodes = (nodesMetadata: Record<string, any>, idReplacements: Record<string, string>): Record<string, any> => {
  const newNodesMetadata: NodesMetadata = {};
  Object.keys(nodesMetadata).forEach((key) => {
    const nodeMetadata = nodesMetadata[key];
    const newNodeId = idReplacements[key] ?? key;
    newNodesMetadata[newNodeId] = nodeMetadata;
  });
  return newNodesMetadata;
};

export interface PasteScopeParams {
  pasteActionNames: string[];
  // Mapping of nodes added in paste with oldId as key and newId as value
  renamedNodes: Record<string, string>;
}

// creates a mapping of nodeIds with a 1:1 mapping of the new NodeIds to the old NodeIds
const buildScopeParams = (existingNodesMetdata: NodesMetadata, newActionNodes: string[]): PasteScopeParams => {
  // temporary mapping to make sure we don't have any repeat nodeIds from both the existing workflow nodes and new paste nodes
  const allActionNames: Record<string, string> = Object.fromEntries(
    Object.keys(existingNodesMetdata).map((key) => {
      return [key, key];
    })
  );
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

const filterRecordByArray = (record: Record<string, NodeTokens>, upstreamNodeIds: string[]) => {
  const filteredRecord: Record<string, NodeTokens> = {};
  for (const key of upstreamNodeIds) {
    if (key in record) {
      filteredRecord[key] = record[key];
    }
  }
  return filteredRecord;
};

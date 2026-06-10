import type { ConnectionReference, ReferenceKey } from '../../../common/models/workflow';
import { getTriggerNodeId, setFocusNode, type RootState } from '../..';
import { initCopiedConnectionMap, initScopeCopiedConnections } from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelTypes';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import { pasteNode, pasteScopeNode, setNodeDescription } from '../../state/workflow/workflowSlice';
import { getNonDuplicateId, getNonDuplicateNodeId, initializeOperationDetails } from './add';
import {
  createIdCopy,
  getRecordEntry,
  isScopeOperation,
  LOCAL_STORAGE_KEYS,
  removeIdTag,
  type LogicAppsV2,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';
import { getNodeOperationData } from '../../state/operation/operationSelector';
import { serializeOperation } from './serializer';
import { buildGraphFromActions, getAllActionNames } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { ActionDefinition } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { initializeDynamicDataInNodes, initializeOperationMetadata } from './operationdeserializer';
import type { NodesMetadata } from '../../state/workflow/workflowInterfaces';
import { updateAllUpstreamNodes } from './initialize';
import type { NodeTokens } from '../../state/tokens/tokensSlice';
import { addDynamicTokens } from '../../state/tokens/tokensSlice';
import { getConnectionReferenceForNodeId } from '../../state/connection/connectionSelector';
import { getStaticResultForNodeId } from '../../state/staticresultschema/staitcresultsSelector';
import { initScopeCopiedStaticResultProperties } from '../../state/staticresultschema/staticresultsSlice';
import { storeStateToUndoRedoHistory } from './undoRedo';

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
    const nodeComment = getRecordEntry(state.workflow.operations, nodeId)?.description;
    const nodeConnectionData = getRecordEntry(state.connections.connectionsMapping, nodeId);
    const nodeTokenData = getRecordEntry(state.tokens.outputTokens, nodeId);

    const clipboardItem = JSON.stringify({
      nodeId: newNodeId,
      nodeData,
      nodeTokenData,
      nodeOperationInfo,
      nodeConnectionData,
      nodeComment,
      isScopeNode: false,
      mslaNode: true,
    });
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      navigator.clipboard.writeText(clipboardItem);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, clipboardItem);
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
      localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, clipboardItem);
    }
  });
});

type CopyOperationsPayload = {
  nodeIds: string[];
};

const buildActionClipboardEntry = (state: RootState, nodeId: string) => {
  const newNodeId = createIdCopy(nodeId);
  const nodeData = getNodeOperationData(state.operations, nodeId);
  const nodeOperationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
  const nodeComment = getRecordEntry(state.workflow.operations, nodeId)?.description;
  const nodeConnectionData = getRecordEntry(state.connections.connectionsMapping, nodeId);
  const nodeTokenData = getRecordEntry(state.tokens.outputTokens, nodeId);

  return {
    nodeId: newNodeId,
    nodeData,
    nodeTokenData,
    nodeOperationInfo,
    nodeConnectionData,
    nodeComment,
    isScopeNode: false,
  };
};

const buildScopeClipboardEntry = async (state: RootState, scopeNodeId: string) => {
  const normalizedScopeId = removeIdTag(scopeNodeId);
  const newNodeId = createIdCopy(normalizedScopeId);

  const serializedOperation = await serializeOperation(state, normalizedScopeId, {
    skipValidation: true,
    ignoreNonCriticalErrors: true,
  });

  const allActionNames = getAllActionNames({ [normalizedScopeId]: serializedOperation as ActionDefinition });
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

  return {
    nodeId: newNodeId,
    serializedOperation,
    allConnectionData,
    staticResults,
    isScopeNode: true,
  };
};

const writeClipboardItem = (clipboardItem: string) => {
  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    navigator.clipboard.writeText(clipboardItem);
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, clipboardItem);
  }
};

// Copies multiple selected nodes to the clipboard as a single multi-node payload so they can be
// pasted together. Scope nodes are serialized in full; plain actions copy their operation data.
export const copyOperations = createAsyncThunk('copyOperations', async (payload: CopyOperationsPayload, { getState }) => {
  const { nodeIds } = payload;
  if (!nodeIds || nodeIds.length === 0) {
    return;
  }
  const state = getState() as RootState;

  // First pass: identify scope nodes and collect all action names nested inside them.
  // Children already embedded in a scope's serialized definition should not be copied again.
  const scopeChildIds = new Set<string>();
  for (const nodeId of nodeIds) {
    const operationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    if (isScopeOperation(operationInfo?.type ?? '')) {
      const normalizedId = removeIdTag(nodeId);
      const serialized = await serializeOperation(state, normalizedId, { skipValidation: true, ignoreNonCriticalErrors: true });
      const childNames = getAllActionNames({ [normalizedId]: serialized as ActionDefinition }, [], true);
      for (const name of childNames) {
        if (name !== normalizedId) {
          scopeChildIds.add(name);
        }
      }
    }
  }

  const nodes = [];
  for (const nodeId of nodeIds) {
    const normalizedId = removeIdTag(nodeId);
    if (scopeChildIds.has(normalizedId)) {
      continue;
    }
    const operationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    if (isScopeOperation(operationInfo?.type ?? '')) {
      nodes.push(await buildScopeClipboardEntry(state, nodeId));
    } else {
      nodes.push(buildActionClipboardEntry(state, nodeId));
    }
  }

  // Extract internal edges between selected nodes from their runAfter relationships
  const normalizedIds = nodeIds.map((id) => removeIdTag(id));
  const edges: Array<{ source: string; target: string }> = [];
  for (const nodeId of normalizedIds) {
    const op = getRecordEntry(state.workflow.operations, nodeId) as LogicAppsV2.ActionDefinition | undefined;
    if (op?.runAfter) {
      for (const depId of Object.keys(op.runAfter)) {
        if (normalizedIds.includes(depId)) {
          edges.push({ source: createIdCopy(depId), target: createIdCopy(nodeId) });
        }
      }
    }
  }

  writeClipboardItem(JSON.stringify({ mslaNode: true, isMultiNode: true, nodes, edges }));
});

// Cut = copy to clipboard then delete. Re-uses copyOperations logic, then dispatches deleteOperations.
export const cutOperations = createAsyncThunk('cutOperations', async (payload: CopyOperationsPayload, { dispatch }) => {
  const { nodeIds } = payload;
  if (!nodeIds || nodeIds.length === 0) {
    return;
  }

  // Copy to clipboard first
  await dispatch(copyOperations({ nodeIds }));

  // Then delete — import is inline to avoid circular dependency
  const { deleteOperations } = await import('./delete');
  dispatch(storeStateToUndoRedoHistory({ type: cutOperations.pending } as any));
  await dispatch(deleteOperations({ nodeIds }));
});

interface PasteOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  nodeData: NodeData;
  nodeTokenData: NodeTokens;
  operationInfo: NodeOperation;
  connectionData?: ReferenceKey;
  comment?: string;
  isParallelBranch?: boolean;
}

export const pasteOperation = createAsyncThunk('pasteOperation', async (payload: PasteOperationPayload, { dispatch, getState }) => {
  const { nodeId: actionId, relationshipIds, nodeData, nodeTokenData, operationInfo, connectionData, comment, isParallelBranch } = payload;
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
      isParallelBranch,
    })
  );

  dispatch(setFocusNode(nodeId));
  dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo }));
  await initializeOperationDetails(nodeId, operationInfo, getState as () => RootState, dispatch);

  // replace new nodeId if there exists a copy of the copied node
  dispatch(initializeNodes({ nodes: [{ ...nodeData, id: nodeId }] }));

  const updatedTokens = nodeTokenData.tokens.map((token) => {
    // Modify the actionName to a unique value
    return {
      ...token,
      outputInfo: {
        ...token.outputInfo,
        actionName: nodeId,
      },
    };
  });

  dispatch(
    addDynamicTokens({
      nodeId,
      tokens: updatedTokens,
    })
  );

  if (connectionData) {
    dispatch(initCopiedConnectionMap({ connectionReferences: { [nodeId]: connectionData } }));
  }
  if (comment) {
    dispatch(setNodeDescription({ nodeId, description: comment }));
  }

  dispatch(setIsPanelLoading(false));

  return nodeId;
});

interface PasteScopeOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  serializedValue: LogicAppsV2.OperationDefinition | null;
  allConnectionData: Record<string, { connectionReference: ConnectionReference; referenceKey: string }>;
  staticResults: Record<string, any>;
  upstreamNodeIds: string[];
  isParallelBranch?: boolean;
}

export const pasteScopeOperation = createAsyncThunk(
  'pasteScopeOperation',
  async (payload: PasteScopeOperationPayload, { dispatch, getState }) => {
    const {
      nodeId: actionId,
      relationshipIds,
      serializedValue,
      upstreamNodeIds,
      allConnectionData,
      staticResults,
      isParallelBranch,
    } = payload;
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
      true /* shouldAppendAddCase */,
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
        isParallelBranch,
      })
    );

    dispatch(setIsPanelLoading(true));

    dispatch(setFocusNode(nodeId));

    const connectionReference = (getState() as RootState).connections.connectionReferences;
    const workflowParameters = state.workflowParameters.definitions;
    const workflowKind = state.workflow.workflowKind;
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
        dispatch,
        { ...pasteParams, existingOutputTokens: upstreamOutputTokens, rootTriggerId: triggerId }
      ),
    ]);
    await initializeDynamicDataInNodes(getState as () => RootState, dispatch, pasteParams.pasteActionNames);

    updateAllUpstreamNodes(getState() as RootState, dispatch);
    dispatch(setIsPanelLoading(false));

    return nodeId;
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

type DuplicateOperationsPayload = {
  nodeIds: string[];
};

// Duplicates each selected node, inserting the copy directly below its source node. Reuses the
// copy/paste building blocks but keeps everything in-memory so the user's clipboard is untouched.
export const duplicateOperations = createAsyncThunk(
  'duplicateOperations',
  async (payload: DuplicateOperationsPayload, { dispatch, getState }) => {
    const { nodeIds } = payload;
    if (!nodeIds || nodeIds.length === 0) {
      return;
    }

    dispatch(storeStateToUndoRedoHistory({ type: duplicateOperations.pending } as any));

    for (const nodeId of nodeIds) {
      // Re-read state each iteration because prior pastes mutate the workflow graph.
      const state = getState() as RootState;
      const graphId = getRecordEntry(state.workflow.nodesMetadata, nodeId)?.graphId;
      if (!graphId) {
        continue;
      }

      // parentId set with no childId inserts the duplicate right below the source node.
      const relationshipIds = { graphId, parentId: nodeId, childId: undefined };
      const operationInfo = getRecordEntry(state.operations.operationInfo, nodeId);

      if (isScopeOperation(operationInfo?.type ?? '')) {
        const entry = await buildScopeClipboardEntry(state, nodeId);
        const upstreamNodeIds = getRecordEntry(state.tokens.outputTokens, removeIdTag(nodeId))?.upstreamNodeIds ?? [];
        await dispatch(
          pasteScopeOperation({
            relationshipIds,
            nodeId: entry.nodeId,
            serializedValue: entry.serializedOperation,
            allConnectionData: entry.allConnectionData,
            staticResults: entry.staticResults,
            upstreamNodeIds,
          })
        );
      } else {
        const entry = JSON.parse(JSON.stringify(buildActionClipboardEntry(state, nodeId)));
        await dispatch(
          pasteOperation({
            relationshipIds,
            nodeId: entry.nodeId,
            nodeData: entry.nodeData,
            nodeTokenData: entry.nodeTokenData,
            operationInfo: entry.nodeOperationInfo,
            connectionData: entry.nodeConnectionData,
            comment: entry.nodeComment,
          })
        );
      }
    }
  }
);

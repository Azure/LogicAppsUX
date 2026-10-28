import { isExpressionConnectionMapping, type ConnectionMapping } from '../../../common/models/workflow';
import Constants from '../../../common/constants';
import {
  getServiceProviderConnectionMapping,
  getReferenceNameReplacement,
  remapConnectionExpression,
  remapConnectionExpressionValue,
} from '../../utils/connectors/connectionExpression';
import { getTriggerNodeId, setFocusNode, type RootState } from '../..';
import {
  initCopiedConnectionMap,
  initScopeCopiedConnections,
  setNodeConnectionMapping,
  type CopiedConnectionData,
} from '../../state/connection/connectionSlice';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { DynamicLoadStatus, ErrorLevel, initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelTypes';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import {
  addRunAfter,
  removeRunAfter,
  updateRunAfter,
  pasteNode,
  pasteScopeNode,
  setNodeDescription,
} from '../../state/workflow/workflowSlice';
import { getNonDuplicateId, getNonDuplicateNodeId, initializeOperationDetails } from './add';
import {
  createIdCopy,
  getRecordEntry,
  isScopeOperation,
  LOCAL_STORAGE_KEYS,
  removeIdTag,
  type LogicAppsV2,
  getIntl,
  equals,
} from '@microsoft/logic-apps-shared';
import { configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { getNodeOperationData } from '../../state/operation/operationSelector';
import { serializeOperation } from './serializer';
import { buildGraphFromActions, getAllActionNames } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { ActionDefinition } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { initializeDynamicDataInNodes, initializeOperationMetadata } from './operationdeserializer';
import type { NodesMetadata } from '../../state/workflow/workflowInterfaces';
import { updateAllUpstreamNodes } from './initialize';
import { getUpstreamNodeIds } from '../../utils/graph';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { NodeTokens } from '../../state/tokens/tokensSlice';
import { addDynamicTokens } from '../../state/tokens/tokensSlice';
import { getConnectionReferenceForNodeId } from '../../state/connection/connectionSelector';
import { getStaticResultForNodeId } from '../../state/staticresultschema/staitcresultsSelector';
import { initScopeCopiedStaticResultProperties } from '../../state/staticresultschema/staticresultsSlice';
import { storeStateToUndoRedoHistory } from './undoRedo';
import {
  clipboardError,
  copiedConnectionError,
  getAgentChannelOperations,
  getScopeAgentOperations,
  hasCompleteActionData,
  isClipboardEntry,
  remapClipboardNodeData,
  remapClipboardOperation,
  validateClipboard,
  type ClipboardEntry,
  type ActionClipboardEntry,
  type ScopeClipboardEntry,
  type ClipboardEdge,
} from '../../utils/clipboardData';
import { setStateAfterUndoRedo } from '../../state/global';
import { UNDO_REDO_SLICE_NAMES } from '../../state/undoRedo/undoRedoTypes';
import { getWorkflowNodeFromGraphState } from '../../state/workflow/workflowGraphTraversal';

type CopyOperationPayload = {
  nodeId: string;
};

export const copyOperation = createAsyncThunk('copyOperation', async (payload: CopyOperationPayload, { getState }) => {
  const { nodeId } = payload;
  if (!nodeId) {
    throw new Error('Node does not exist');
  }
  const entry = buildActionClipboardEntry(getState() as RootState, nodeId);
  await writeClipboardItem(JSON.stringify({ ...entry, mslaNode: true }));
});

export const copyScopeOperation = createAsyncThunk('copyScopeOperation', async (payload: CopyOperationPayload, { getState }) => {
  const { nodeId } = payload;
  if (!nodeId) {
    throw new Error('Scope Node does not exist');
  }
  const entry = await buildScopeClipboardEntry(getState() as RootState, nodeId);
  await writeClipboardItem(JSON.stringify({ ...entry, mslaNode: true }));
});

type CopyOperationsPayload = {
  nodeIds: string[];
};

const resolveCopyNodeId = (state: RootState, id: string): string => {
  const normalized = removeIdTag(id);
  const ids = Object.keys(state.workflow.operations);
  const original = ids.includes(normalized)
    ? normalized
    : ids.find((key) => getRecordEntry(state.workflow.idReplacements, key) === normalized);
  if (original) {
    return original;
  }
  const matches = ids.filter(
    (key) =>
      key.toLowerCase() === normalized.toLowerCase() ||
      getRecordEntry(state.workflow.idReplacements, key)?.toLowerCase() === normalized.toLowerCase()
  );
  if (matches.length !== 1) {
    throw clipboardError(true);
  }
  return matches[0];
};

const getScopeOperationNames = (state: RootState, scopeId: string): Map<string, string> => {
  const graph = getWorkflowNodeFromGraphState(state.workflow, scopeId);
  if (!graph) {
    throw clipboardError(true);
  }
  const names = new Map<string, string>();
  const visit = (node: WorkflowNode) => {
    const operation = getRecordEntry(state.workflow.operations, node.id);
    if (operation) {
      const currentName = getRecordEntry(state.workflow.idReplacements, node.id) ?? node.id;
      names.set(node.id, currentName);
      for (const channelId of Object.keys(getAgentChannelOperations(node.id, operation))) {
        names.set(channelId, `${currentName}${channelId.slice(node.id.length)}`);
      }
    }
    node.children?.forEach(visit);
  };
  visit(graph);
  return names;
};

const getCopyReadyData = (state: RootState, nodeId: string): { nodeData: Omit<NodeData, 'id'>; nodeOperationInfo: NodeOperation } => {
  const nodeData = getNodeOperationData(state.operations, nodeId);
  const nodeOperationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
  if (
    !hasCompleteActionData(nodeData) ||
    !nodeOperationInfo ||
    (nodeData.nodeInputs.dynamicLoadStatus !== undefined &&
      nodeData.nodeInputs.dynamicLoadStatus !== 'succeeded' &&
      !nodeData.nodeInputs.preservedConnectionInputs)
  ) {
    throw clipboardError(true);
  }
  return { nodeData, nodeOperationInfo };
};

const buildActionClipboardEntry = (state: RootState, selectedId: string): ActionClipboardEntry => {
  const nodeId = resolveCopyNodeId(state, selectedId);
  const newNodeId = createIdCopy(nodeId);
  const sourceNodeId = getRecordEntry(state.workflow.idReplacements, nodeId);
  const { nodeData, nodeOperationInfo } = getCopyReadyData(state, nodeId);
  const nodeComment = getRecordEntry(state.workflow.operations, nodeId)?.description;
  const mapping = getRecordEntry(state.connections.connectionsMapping, nodeId);
  const nodeConnectionData = isExpressionConnectionMapping(mapping)
    ? { ...mapping, expression: remapConnectionExpression(mapping.expression, state.workflow.idReplacements) }
    : mapping;
  if (isExpressionConnectionMapping(mapping) && nodeData.nodeInputs) {
    nodeData.nodeInputs = {
      ...nodeData.nodeInputs,
      preservedConnectionInputs:
        nodeData.nodeInputs.preservedConnectionInputs ??
        (getRecordEntry(state.workflow.operations, nodeId) as LogicAppsV2.ServiceProvider)?.inputs,
    };
  }
  const nodeTokenData = getRecordEntry(state.tokens.outputTokens, nodeId);

  const entry = {
    nodeId: newNodeId,
    nodeData: remapClipboardNodeData(nodeData, state.workflow.idReplacements),
    nodeTokenData,
    nodeOperationInfo,
    nodeConnectionData,
    nodeComment,
    ...(sourceNodeId ? { sourceNodeId } : {}),
    isScopeNode: false as const,
  };
  if (!isClipboardEntry(entry)) {
    throw clipboardError(true);
  }
  return entry;
};

const buildScopeClipboardEntry = async (state: RootState, scopeNodeId: string): Promise<ScopeClipboardEntry> => {
  const normalizedScopeId = resolveCopyNodeId(state, scopeNodeId);
  const newNodeId = createIdCopy(normalizedScopeId);
  getCopyReadyData(state, normalizedScopeId);
  const operationNames = getScopeOperationNames(state, normalizedScopeId);
  for (const id of operationNames.keys()) {
    getCopyReadyData(state, id);
  }

  const serializedOperation = await serializeOperation(state, normalizedScopeId, {
    skipValidation: true,
    ignoreNonCriticalErrors: true,
  });

  const sourceNodeId = getRecordEntry(state.workflow.idReplacements, normalizedScopeId);
  const allConnectionData: Record<string, CopiedConnectionData> = {};
  const staticResults: Record<string, any> = {};

  operationNames.forEach((actionName, originalId) => {
    const connectionReference = getConnectionReferenceForNodeId(state.connections, originalId);
    if (connectionReference) {
      allConnectionData[actionName] = connectionReference.mapping
        ? {
            ...connectionReference,
            mapping: {
              ...connectionReference.mapping,
              expression: remapConnectionExpression(connectionReference.mapping.expression, state.workflow.idReplacements),
            },
          }
        : connectionReference;
    }

    const staticResult = getStaticResultForNodeId(state.staticResults, originalId);
    if (staticResult) {
      staticResults[actionName] = staticResult;
    }
  });

  const entry = {
    nodeId: newNodeId,
    serializedOperation: serializedOperation as ActionDefinition,
    allConnectionData,
    staticResults,
    ...(sourceNodeId ? { sourceNodeId } : {}),
    isScopeNode: true as const,
  };
  if (!isClipboardEntry(entry)) {
    throw clipboardError(true);
  }
  return entry;
};

const writeClipboardItem = async (clipboardItem: string) => {
  const intl = getIntl();
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      await navigator.clipboard.writeText(clipboardItem);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, clipboardItem);
    }
  } catch {
    throw new Error(
      intl.formatMessage({
        defaultMessage: 'The actions could not be written to the clipboard. Allow clipboard access and try again. No actions were cut.',
        id: '21wfZu',
        description: 'Error when clipboard writing fails during copy or cut',
      })
    );
  }
};

// Copies multiple selected nodes to the clipboard as a single multi-node payload so they can be
// pasted together. Scope nodes are serialized in full; plain actions copy their operation data.
const buildOperationsClipboard = async (state: RootState, nodeIds: string[]) => {
  const sourceIds = [...new Set(nodeIds.map((id) => resolveCopyNodeId(state, id)))];
  sourceIds.forEach((id) => getCopyReadyData(state, id));

  // First pass: identify scope nodes and collect all action names nested inside them.
  // Children already embedded in a scope's serialized definition should not be copied again.
  const scopeChildIds = new Set<string>();
  const scopes = new Map<string, ScopeClipboardEntry>();
  for (const nodeId of sourceIds) {
    const operationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    if (isScopeOperation(operationInfo?.type ?? '')) {
      const normalizedId = removeIdTag(nodeId);
      const entry = await buildScopeClipboardEntry(state, normalizedId);
      scopes.set(nodeId, entry);
      for (const id of getScopeOperationNames(state, normalizedId).keys()) {
        if (id !== normalizedId) {
          scopeChildIds.add(id);
        }
      }
    }
  }

  const nodes = [];
  for (const nodeId of sourceIds) {
    const normalizedId = removeIdTag(nodeId);
    if (scopeChildIds.has(normalizedId)) {
      continue;
    }
    const operationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    if (isScopeOperation(operationInfo?.type ?? '')) {
      nodes.push(scopes.get(nodeId)!);
    } else {
      nodes.push(buildActionClipboardEntry(state, nodeId));
    }
  }

  // Extract internal edges between selected nodes from their runAfter relationships
  const normalizedIds = nodes.map((node) => removeIdTag(node.nodeId).replace(/-copy$/, ''));
  const edges: ClipboardEdge[] = [];
  for (const nodeId of normalizedIds) {
    const op = getRecordEntry(state.workflow.operations, nodeId) as LogicAppsV2.ActionDefinition | undefined;
    if (op?.runAfter) {
      for (const depId of Object.keys(op.runAfter)) {
        if (normalizedIds.includes(depId)) {
          edges.push({ source: createIdCopy(depId), target: createIdCopy(nodeId), statuses: op.runAfter[depId] });
        }
      }
    }
  }

  return { mslaNode: true, isMultiNode: true, nodes, edges };
};

export const copyOperations = createAsyncThunk('copyOperations', async ({ nodeIds }: CopyOperationsPayload, { getState }) => {
  if (!nodeIds?.length) {
    return [];
  }
  const clipboard = await buildOperationsClipboard(getState() as RootState, nodeIds);
  await writeClipboardItem(JSON.stringify(clipboard));
  return clipboard.nodes.map((node) => node.nodeId.replace(/-copy$/, ''));
});

// Cut = copy to clipboard then delete. Re-uses copyOperations logic, then dispatches deleteOperations.
export const cutOperations = createAsyncThunk('cutOperations', async (payload: CopyOperationsPayload, { dispatch, getState }) => {
  const { nodeIds } = payload;
  if (!nodeIds || nodeIds.length === 0) {
    return;
  }

  // Copy to clipboard first
  const before = getState() as RootState;
  const canonicalIds = [...new Set(nodeIds.map((id) => resolveCopyNodeId(before, id)))];
  const copiedIds = await dispatch(copyOperations({ nodeIds: canonicalIds })).unwrap();
  // Resolve the deletion code before checking for interleaved edits.
  const { deleteOperations } = await import('./delete');
  const live = getState() as RootState;
  if (
    UNDO_REDO_SLICE_NAMES.some((name) => live[name] !== before[name]) ||
    live.designerOptions.readOnly ||
    live.designerOptions.isMonitoringView ||
    live.designerView.workflowExtractionBusy
  ) {
    throw clipboardError(true);
  }

  dispatch(storeStateToUndoRedoHistory({ type: cutOperations.pending.type }));
  await dispatch(deleteOperations({ nodeIds: copiedIds })).unwrap();
});

interface PasteOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  nodeData: Omit<NodeData, 'id'>;
  nodeTokenData?: NodeTokens;
  operationInfo: NodeOperation;
  connectionData?: ConnectionMapping[string];
  comment?: string;
  isParallelBranch?: boolean;
}

const pasteActionInDraft = createAsyncThunk('pasteActionInDraft', async (payload: PasteOperationPayload, { dispatch, getState }) => {
  const { nodeId: actionId, relationshipIds, nodeData, nodeTokenData, operationInfo, connectionData, comment, isParallelBranch } = payload;
  if (
    !actionId ||
    !relationshipIds ||
    !isClipboardEntry({ nodeId: actionId, nodeData, nodeTokenData, nodeOperationInfo: operationInfo, isScopeNode: false })
  ) {
    throw clipboardError();
  }

  const state = getState() as RootState;
  const nodeId = getNonDuplicateNodeId(state.workflow.nodesMetadata, actionId, state.workflow.idReplacements);

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
  const updatedTokens = (nodeTokenData?.tokens ?? []).map((token) => {
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
  if (isExpressionConnectionMapping(connectionData)) {
    dispatch(initializeNodes({ nodes: [{ ...nodeData, id: nodeId }] }));
  } else {
    await initializeOperationDetails(
      nodeId,
      operationInfo,
      getState as () => RootState,
      dispatch,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      nodeData
    );
  }
  if (comment) {
    dispatch(setNodeDescription({ nodeId, description: comment }));
  }

  updateAllUpstreamNodes(getState() as RootState, dispatch);
  dispatch(setIsPanelLoading(false));

  return nodeId;
});

interface PasteScopeOperationPayload {
  relationshipIds: RelationshipIds;
  nodeId: string;
  serializedValue: LogicAppsV2.OperationDefinition | null;
  allConnectionData: Record<string, CopiedConnectionData>;
  staticResults: Record<string, any>;
  upstreamNodeIds: string[];
  isParallelBranch?: boolean;
}

interface PasteScopeInDraftPayload extends PasteScopeOperationPayload {
  pasteParams: PasteScopeParams;
  actionReplacements: Record<string, string>;
  remappedActionIds: string[];
}

const pasteScopeInDraft = createAsyncThunk('pasteScopeInDraft', async (payload: PasteScopeInDraftPayload, { dispatch, getState }) => {
  const {
    nodeId: actionId,
    relationshipIds,
    serializedValue,
    upstreamNodeIds,
    allConnectionData,
    staticResults,
    isParallelBranch,
    pasteParams,
    actionReplacements,
    remappedActionIds,
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

  // Case/tool collisions must honor planned renames against roots that have not been inserted yet.
  const reservedActionNames = [
    ...Object.keys(existingNodesMetadata),
    ...Object.keys(pasteParams.renamedNodes).filter((id) => pasteParams.renamedNodes[id] !== id),
  ];
  const [nodes, _edges, actions, actionNodesMetadata] = buildGraphFromActions(
    workflowActions,
    graphId,
    parentId,
    reservedActionNames,
    true /* shouldAppendAddCase */,
    pasteParams
  );
  if (Object.keys(actions).some((id) => Object.hasOwn(state.workflow.operations, id))) {
    throw clipboardError();
  }
  // parentNodeId must reference a nodesMetadata key (the containing graph/scope) so the
  // parent-chain walk in getUpstreamNodeIds can climb to ancestor scopes. `parentId` from
  // relationshipIds is an edge-placement node (e.g. a `<scope>-#subgraph` card) and is not a
  // valid metadata key, so use `graphId` (the containing graph) instead, matching how
  // pasteScopeInWorkflow finalizes this node's metadata.
  const scopeParentNodeId = graphId && graphId !== 'root' ? graphId : undefined;
  actionNodesMetadata[nodeId] = { ...actionNodesMetadata[actionId], isRoot: false, parentNodeId: scopeParentNodeId, graphId };
  if (Object.keys(allConnectionData).length > 0) {
    for (const { referenceKey, connectionReference, mapping } of Object.values(allConnectionData)) {
      const existing = referenceKey ? getRecordEntry(state.connections.connectionReferences, referenceKey) : undefined;
      if (
        !isExpressionConnectionMapping(mapping) &&
        existing &&
        connectionReference &&
        !equals(existing.api?.id, connectionReference.api?.id)
      ) {
        throw copiedConnectionError();
      }
    }
    dispatch(initScopeCopiedConnections(replaceIdsOfExistingNodes(allConnectionData, actionReplacements)));
  }
  for (const [id, action] of Object.entries(actions)) {
    const connectionName = (action as LogicAppsV2.ServiceProvider).inputs?.serviceProviderConfiguration?.connectionName;
    if (
      action.type.toLowerCase() === 'serviceprovider' &&
      typeof connectionName === 'string' &&
      !(getState() as RootState).connections.connectionsMapping[id]
    ) {
      const mapping = getServiceProviderConnectionMapping(connectionName);
      if (isExpressionConnectionMapping(mapping)) {
        dispatch(
          setNodeConnectionMapping({
            nodeId: id,
            mapping,
          })
        );
      }
    }
  }
  if (Object.keys(staticResults).length > 0) {
    dispatch(initScopeCopiedStaticResultProperties(replaceIdsOfExistingNodes(staticResults, actionReplacements)));
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
  const extendedIds = extendUpstreamNodeIdsForScopePaste(upstreamNodeIds, graphId, parentId, state, nodeMap);
  const upstreamOutputTokens = filterRecordByArray(state.tokens.outputTokens, extendedIds);
  const triggerId = getTriggerNodeId(state.workflow);

  await initializeOperationMetadata(
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
    {
      ...pasteParams,
      // Definitions already reference final IDs. Keep scope-token binding without renaming
      // those references a second time when old and new action names overlap.
      renamedNodes: Object.fromEntries(remappedActionIds.map((id) => [id, id])),
      existingOutputTokens: upstreamOutputTokens,
      rootTriggerId: triggerId,
    },
    true /* awaitResultSchemas */
  );
  await initializeDynamicDataInNodes(getState as () => RootState, dispatch, [
    ...new Set([...pasteParams.pasteActionNames, ...Object.keys(actions)]),
  ]);

  updateAllUpstreamNodes(getState() as RootState, dispatch);
  dispatch(setIsPanelLoading(false));

  return { nodeId, renamedNodes: pasteParams.renamedNodes };
});

interface PasteClipboardPayload {
  clipboard: unknown;
  relationshipIds: RelationshipIds;
  upstreamNodeIds: string[];
  isParallelBranch?: boolean;
  duplicateSources?: string[];
}

// Build the entire paste off-screen. No partially initialized nodes, connection mappings,
// focus changes, or undo entries are observable in the live designer.
export const pasteClipboard = createAsyncThunk(
  'pasteClipboard',
  async (
    { clipboard, relationshipIds, upstreamNodeIds, isParallelBranch = false, duplicateSources }: PasteClipboardPayload,
    { dispatch, getState }
  ) => {
    const { nodes, edges } = validateClipboard(clipboard);
    const before = getState() as RootState;
    if (
      before.designerOptions.readOnly ||
      before.designerOptions.isMonitoringView ||
      before.designerView.workflowExtractionBusy ||
      !before.workflow.graph ||
      !relationshipIds?.graphId
    ) {
      throw clipboardError();
    }
    const { designerReducer } = await import('../../store');
    const draft = configureStore({
      reducer: designerReducer,
      preloadedState: before,
      middleware: (defaults) => defaults({ serializableCheck: false, immutableCheck: false }),
    });
    const rootReplacements: Record<string, string> = {};
    const plannedIds = new Map<string, string>();
    const reservedMetadata = { ...before.workflow.nodesMetadata };
    for (const entry of nodes) {
      const id = getNonDuplicateNodeId(reservedMetadata, entry.nodeId, before.workflow.idReplacements);
      reservedMetadata[id] = { graphId: relationshipIds.graphId };
      plannedIds.set(entry.nodeId, id);
      rootReplacements[entry.sourceNodeId ?? entry.nodeId.replace(/-copy$/, '')] = id;
    }
    const replacements: Record<string, string> = { ...rootReplacements };
    const scopePlans = new Map<string, PasteScopeParams>();
    // Reserve every descendant before parsing scope inputs, so all references are rewritten
    // from their original identities exactly once, including references across copied roots.
    for (const entry of nodes) {
      if (!entry.isScopeNode) {
        continue;
      }
      const id = plannedIds.get(entry.nodeId)!;
      const actions = { [id]: entry.serializedOperation };
      // Pending renames do not free the original Redux storage keys.
      const metadata = { ...reservedMetadata, ...replaceIdsOfExistingNodes(reservedMetadata, before.workflow.idReplacements) };
      delete metadata[id];
      const plan = buildScopeParams(metadata, getAllActionNames(actions, [], true));
      const actionNames = new Set(getAllActionNames(actions, [], false /* includeCase */, true /* includeMcpTools */));
      const actionReplacements = Object.fromEntries(Object.entries(plan.renamedNodes).filter(([sourceId]) => actionNames.has(sourceId)));
      const sourceRootId = entry.sourceNodeId ?? entry.nodeId.replace(/-copy$/, '');
      const existingRootTarget = getReferenceNameReplacement(actionReplacements, sourceRootId);
      if (existingRootTarget !== undefined && existingRootTarget !== id) {
        throw clipboardError();
      }
      scopePlans.set(entry.nodeId, plan);
      for (const reservedId of plan.pasteActionNames) {
        reservedMetadata[reservedId] = { graphId: relationshipIds.graphId };
      }
      for (const [sourceId, targetId] of Object.entries(actionReplacements)) {
        if (sourceId !== id) {
          replacements[sourceId] = targetId;
        }
      }
    }
    // Channel IDs derive from allocated Agent IDs, but are absent from graph metadata.
    const occupiedIds = {
      ...reservedMetadata,
      ...Object.fromEntries(Object.keys(before.workflow.operations).map((id) => [id, { graphId: relationshipIds.graphId }])),
    };
    for (const entry of nodes) {
      if (!entry.isScopeNode) {
        continue;
      }
      const sourceRootId = entry.sourceNodeId ?? entry.nodeId.replace(/-copy$/, '');
      for (const [ownerId, agent] of getScopeAgentOperations({ [sourceRootId]: entry.serializedOperation })) {
        const targetOwnerId = getReferenceNameReplacement(replacements, ownerId);
        if (!targetOwnerId) {
          throw clipboardError();
        }
        for (const channelId of Object.keys(getAgentChannelOperations(ownerId, agent))) {
          const targetChannelId = `${targetOwnerId}${channelId.slice(ownerId.length)}`;
          if (
            getReferenceNameReplacement(replacements, channelId) !== undefined ||
            getNonDuplicateNodeId(occupiedIds, targetChannelId, before.workflow.idReplacements) !== targetChannelId
          ) {
            throw clipboardError();
          }
          occupiedIds[targetChannelId] = { graphId: relationshipIds.graphId };
          replacements[channelId] = targetChannelId;
        }
      }
    }
    // Clipboard expressions use current serialized names; editor tokens use internal IDs.
    // Copied producers override external bindings, and this conversion must happen only once.
    const clipboardReferences = {
      ...Object.fromEntries(
        Object.entries(before.workflow.idReplacements)
          .filter(([, currentName]) => getReferenceNameReplacement(replacements, currentName) === undefined)
          .map(([internalId, currentName]) => [currentName, internalId])
      ),
      ...replacements,
    };
    const pasteEntry = async (entry: ClipboardEntry, ids: RelationshipIds, parallel: boolean) => {
      let id: string;
      if (entry.isScopeNode) {
        const result = await draft
          .dispatch(
            pasteScopeInDraft({
              nodeId: plannedIds.get(entry.nodeId)!,
              relationshipIds: ids,
              isParallelBranch: parallel,
              serializedValue: remapClipboardOperation(entry.serializedOperation, clipboardReferences),
              allConnectionData: remapConnectionExpressionValue(entry.allConnectionData, clipboardReferences),
              staticResults: entry.staticResults,
              upstreamNodeIds,
              pasteParams: scopePlans.get(entry.nodeId)!,
              actionReplacements: replacements,
              remappedActionIds: Object.values(replacements),
            })
          )
          .unwrap();
        id = result.nodeId;
      } else {
        id = await draft
          .dispatch(
            pasteActionInDraft({
              nodeId: plannedIds.get(entry.nodeId)!,
              relationshipIds: ids,
              isParallelBranch: parallel,
              nodeData: remapClipboardNodeData(entry.nodeData, clipboardReferences),
              nodeTokenData: entry.nodeTokenData,
              operationInfo: entry.nodeOperationInfo,
              connectionData: remapConnectionExpressionValue(entry.nodeConnectionData, clipboardReferences),
              comment: entry.nodeComment,
            })
          )
          .unwrap();
      }
      if (
        !id ||
        id !== plannedIds.get(entry.nodeId) ||
        !draft.getState().workflow.operations[id] ||
        !getWorkflowNodeFromGraphState(draft.getState().workflow, id)
      ) {
        throw clipboardError();
      }
      return id;
    };
    const { graphId, parentId, childId } = relationshipIds;
    const pasted = new Map<string, string>();
    if (duplicateSources) {
      for (const [index, entry] of nodes.entries()) {
        const source = duplicateSources[index];
        const sourceGraph = before.workflow.nodesMetadata[source]?.graphId;
        if (!sourceGraph) {
          throw clipboardError(true);
        }
        pasted.set(entry.nodeId, await pasteEntry(entry, { graphId: sourceGraph, parentId: source }, false));
      }
    } else if (edges.length) {
      // The first root rewires this boundary; later roots must inherit the original bindings.
      const originalChild = childId ? getRecordEntry(before.workflow.operations, childId) : undefined;
      const originalRunAfter = originalChild && 'runAfter' in originalChild ? originalChild.runAfter : undefined;
      const insertionRunAfter =
        childId && !isParallelBranch
          ? Object.fromEntries(Object.entries(originalRunAfter ?? {}).filter(([id]) => !parentId || id === parentId))
          : undefined;
      const firstIncomingSource = getWorkflowNodeFromGraphState(before.workflow, graphId)?.edges?.find(
        (edge) => edge.target === childId
      )?.source;
      const predecessorUsed = new Set<string>();
      let firstRoot: string | undefined;
      for (const entry of nodes) {
        const predecessors = edges.filter((edge) => edge.target === entry.nodeId).map((edge) => edge.source);
        const firstPredecessor = predecessors[0];
        const predecessorId = firstPredecessor ? pasted.get(firstPredecessor) : undefined;
        const ids = firstPredecessor
          ? { graphId, parentId: predecessorId }
          : firstRoot
            ? { graphId, parentId: parentId ?? (isParallelBranch ? undefined : firstIncomingSource) }
            : relationshipIds;
        const parallel = firstPredecessor ? predecessorUsed.has(firstPredecessor) : !!firstRoot || isParallelBranch;
        const id = await pasteEntry(entry, ids, parallel);
        pasted.set(entry.nodeId, id);
        if (!firstPredecessor && firstRoot && insertionRunAfter) {
          for (const [parentOperation, statuses] of Object.entries(insertionRunAfter)) {
            draft.dispatch(addRunAfter({ childOperationId: id, parentOperationId: parentOperation }));
            draft.dispatch(updateRunAfter({ childOperation: id, parentOperation, statuses }));
          }
          const root = draft.getState().workflow.operations[id];
          for (const parentOperationId of Object.keys(('runAfter' in root ? root.runAfter : undefined) ?? {})) {
            if (!Object.hasOwn(insertionRunAfter, parentOperationId)) {
              draft.dispatch(removeRunAfter({ childOperationId: id, parentOperationId }));
            }
          }
        }
        if (firstPredecessor) {
          predecessorUsed.add(firstPredecessor);
          for (const predecessor of predecessors.slice(1)) {
            draft.dispatch(addRunAfter({ childOperationId: id, parentOperationId: pasted.get(predecessor)! }));
            predecessorUsed.add(predecessor);
          }
        } else {
          firstRoot ??= id;
        }
      }
      for (const edge of edges) {
        if (edge.statuses) {
          draft.dispatch(
            updateRunAfter({ childOperation: pasted.get(edge.target)!, parentOperation: pasted.get(edge.source)!, statuses: edge.statuses })
          );
        }
      }
      if (!isParallelBranch && childId) {
        // Reconnect every terminal branch, including additional independent roots.
        if (firstRoot && edges.some((edge) => pasted.get(edge.source) === firstRoot)) {
          draft.dispatch(removeRunAfter({ childOperationId: childId, parentOperationId: firstRoot }));
        }
        for (const entry of nodes.filter((node) => !edges.some((edge) => edge.source === node.nodeId))) {
          draft.dispatch(addRunAfter({ childOperationId: childId, parentOperationId: pasted.get(entry.nodeId)! }));
        }
      }
    } else if (isParallelBranch) {
      let previous = parentId;
      for (const entry of nodes) {
        const id = await pasteEntry(entry, { graphId, parentId: previous }, previous === parentId);
        pasted.set(entry.nodeId, id);
        previous = id;
      }
    } else {
      for (const entry of [...nodes].reverse()) {
        pasted.set(entry.nodeId, await pasteEntry(entry, relationshipIds, false));
      }
    }
    const addedIds = Object.keys(draft.getState().workflow.operations).filter((id) => !Object.hasOwn(before.workflow.operations, id));
    for (const id of addedIds) {
      const state = draft.getState();
      const errors = getRecordEntry(state.operations.errors, id);
      for (const level of [ErrorLevel.Critical, ErrorLevel.Connection, ErrorLevel.DynamicInputs, ErrorLevel.DynamicOutputs]) {
        if (errors?.[level]) {
          throw new Error(errors[level].message);
        }
      }
      const data = getNodeOperationData(state.operations, id);
      if (
        !hasCompleteActionData(data) ||
        data.nodeInputs.dynamicLoadStatus === DynamicLoadStatus.FAILED ||
        data.nodeOutputs.dynamicLoadStatus === DynamicLoadStatus.FAILED
      ) {
        throw clipboardError();
      }
    }
    const after = draft.getState();
    const channelIds = new Set(
      addedIds.flatMap((ownerId) => {
        if (!getWorkflowNodeFromGraphState(after.workflow, ownerId)) {
          return [];
        }
        const operation = after.workflow.operations[ownerId];
        return Object.entries(getAgentChannelOperations(ownerId, operation))
          .filter(([channelId, channel]) => {
            const stored = getRecordEntry(after.workflow.operations, channelId);
            const direction = channelId.startsWith(`${ownerId}${Constants.CHANNELS.INPUT}`) ? 'input' : 'output';
            return (
              stored?.type.toLowerCase() === channel.type.toLowerCase() &&
              (stored.kind ?? '').toLowerCase() === (channel.kind ?? '').toLowerCase() &&
              getRecordEntry(after.operations.supportedChannels, ownerId)?.some(
                (supported) =>
                  supported[direction].type.toLowerCase() === channel.type.toLowerCase() &&
                  (!supported[direction].kind || supported[direction].kind.toLowerCase() === channel.kind?.toLowerCase())
              )
            );
          })
          .map(([channelId]) => channelId);
      })
    );
    for (const id of addedIds) {
      if (
        !hasCompleteActionData(getNodeOperationData(after.operations, id)) ||
        !after.operations.operationInfo[id] ||
        (!getWorkflowNodeFromGraphState(after.workflow, id) && !channelIds.has(id))
      ) {
        throw clipboardError();
      }
    }
    const live = getState() as RootState;
    if (
      UNDO_REDO_SLICE_NAMES.some((name) => live[name] !== before[name]) ||
      live.designerView.workflowExtractionBusy ||
      live.designerOptions.readOnly ||
      live.designerOptions.isMonitoringView
    ) {
      const intl = getIntl();
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'The workflow changed while the actions were being prepared. Paste again to use the current workflow.',
          id: 'FWra8X',
          description: 'Error when a paste transaction conflicts with another workflow edit',
        })
      );
    }
    updateAllUpstreamNodes(after, draft.dispatch);
    dispatch(storeStateToUndoRedoHistory({ type: pasteNode.type }));
    dispatch(setStateAfterUndoRedo(draft.getState()));
    return nodes.map((entry) => pasted.get(entry.nodeId)!);
  }
);

export const pasteOperation = createAsyncThunk('pasteOperation', async (payload: PasteOperationPayload, { dispatch }) => {
  const ids = await dispatch(
    pasteClipboard({
      clipboard: {
        mslaNode: true,
        isScopeNode: false,
        nodeId: payload.nodeId,
        nodeData: payload.nodeData,
        nodeTokenData: payload.nodeTokenData,
        nodeOperationInfo: payload.operationInfo,
        nodeConnectionData: payload.connectionData,
        nodeComment: payload.comment,
      },
      relationshipIds: payload.relationshipIds,
      upstreamNodeIds: [],
      isParallelBranch: payload.isParallelBranch,
    })
  ).unwrap();
  return ids[0];
});

export const pasteScopeOperation = createAsyncThunk('pasteScopeOperation', async (payload: PasteScopeOperationPayload, { dispatch }) => {
  const ids = await dispatch(
    pasteClipboard({
      clipboard: {
        mslaNode: true,
        isScopeNode: true,
        nodeId: payload.nodeId,
        serializedOperation: payload.serializedValue,
        allConnectionData: payload.allConnectionData,
        staticResults: payload.staticResults,
      },
      relationshipIds: payload.relationshipIds,
      upstreamNodeIds: payload.upstreamNodeIds,
      isParallelBranch: payload.isParallelBranch,
    })
  ).unwrap();
  return ids[0];
});

const replaceIdsOfExistingNodes = <T>(nodesMetadata: Record<string, T>, idReplacements: Record<string, string>): Record<string, T> => {
  const newNodesMetadata: Record<string, T> = {};
  Object.keys(nodesMetadata).forEach((key) => {
    const nodeMetadata = nodesMetadata[key];
    const newNodeId = getRecordEntry(idReplacements, key) ?? key;
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

/**
 * Extends the upstream node id set used to seed a pasted scope's existing output tokens.
 *
 * When we paste a scope (e.g. a Condition) inside another scope, the `upstreamNodeIds`
 * we receive from the caller only covers upstream nodes of the paste-site child/parent
 * edge. It does not include the enclosing scope container itself or its ancestor chain,
 * so nodes declared alongside (or outside) that container — such as an `InitializeVariable`
 * at the workflow root — are absent from the fragment's initial upstream token slice.
 *
 * We fold in the enclosing scope container (`graphId`) and its full upstream context, plus
 * the paste-site predecessor (`parentId`) when present. Relying on `graphId` is essential:
 * when a scope is pasted as the first/only action inside a container (e.g. a For each body),
 * `parentId` is `undefined` or a non-chaining header node, so extending only via `parentId`
 * would miss the ancestor variables. The enclosing `graphId` always resolves to a node whose
 * parent chain reaches the workflow root, so its upstream reliably surfaces ancestor tokens.
 */
export const extendUpstreamNodeIdsForScopePaste = (
  upstreamNodeIds: string[],
  graphId: string | undefined,
  parentId: string | undefined,
  state: RootState,
  operationMap: Record<string, string>
): string[] => {
  const extended = new Set(upstreamNodeIds);
  const rootGraph = state.workflow.graph as WorkflowNode | null;
  if (!rootGraph) {
    return Array.from(extended);
  }
  for (const containerId of [graphId, parentId]) {
    if (!containerId || containerId === 'root') {
      continue;
    }
    extended.add(containerId);
    for (const id of getUpstreamNodeIds(containerId, rootGraph, state.workflow.nodesMetadata, operationMap)) {
      extended.add(id);
    }
  }
  return Array.from(extended);
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

    const state = getState() as RootState;
    const clipboard = await buildOperationsClipboard(state, nodeIds);
    await dispatch(
      pasteClipboard({
        clipboard: { ...clipboard, edges: [] },
        relationshipIds: { graphId: 'root' },
        upstreamNodeIds: [],
        duplicateSources: clipboard.nodes.map((node) => node.nodeId.slice(0, -'-copy'.length)),
      })
    ).unwrap();
  }
);

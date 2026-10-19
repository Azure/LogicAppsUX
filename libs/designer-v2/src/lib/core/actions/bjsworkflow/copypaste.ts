import { isExpressionConnectionMapping, type ConnectionMapping } from '../../../common/models/workflow';
import {
  getServiceProviderConnectionMapping,
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
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelTypes';
import { setIsPanelLoading } from '../../state/panel/panelSlice';
import {
  addRunAfter,
  removeRunAfter,
  updateRunAfter,
  pasteNode,
  pasteScopeNode,
  setNodeDescription,
  replaceOperationDefinition,
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
  hasCompleteActionData,
  isClipboardEntry,
  remapClipboardNodeData,
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
  const original = ids.includes(normalized) ? normalized : ids.find((key) => state.workflow.idReplacements[key] === normalized);
  if (original) {
    return original;
  }
  const matches = ids.filter(
    (key) =>
      key.toLowerCase() === normalized.toLowerCase() || state.workflow.idReplacements[key]?.toLowerCase() === normalized.toLowerCase()
  );
  if (matches.length !== 1) {
    throw clipboardError(true);
  }
  return matches[0];
};

const assertCopyReady = (state: RootState, nodeId: string): void => {
  const data = getNodeOperationData(state.operations, nodeId);
  if (
    !hasCompleteActionData(data) ||
    !state.operations.operationInfo[nodeId] ||
    (data.nodeInputs.dynamicLoadStatus !== undefined &&
      data.nodeInputs.dynamicLoadStatus !== 'succeeded' &&
      !data.nodeInputs.preservedConnectionInputs)
  ) {
    throw clipboardError(true);
  }
};

const buildActionClipboardEntry = (state: RootState, selectedId: string): ActionClipboardEntry => {
  const nodeId = resolveCopyNodeId(state, selectedId);
  const newNodeId = createIdCopy(nodeId);
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
    ...(state.workflow.idReplacements[nodeId] ? { sourceNodeId: state.workflow.idReplacements[nodeId] } : {}),
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
  assertCopyReady(state, normalizedScopeId);
  const assertDescendantsReady = (node: WorkflowNode): void => {
    if (Object.hasOwn(state.workflow.operations, node.id)) {
      assertCopyReady(state, node.id);
    }
    node.children?.forEach(assertDescendantsReady);
  };
  const graph = getWorkflowNodeFromGraphState(state.workflow, normalizedScopeId);
  if (graph) {
    assertDescendantsReady(graph);
  }

  const serializedOperation = await serializeOperation(state, normalizedScopeId, {
    skipValidation: true,
    ignoreNonCriticalErrors: true,
  });

  const allActionNames = getAllActionNames({ [normalizedScopeId]: serializedOperation as ActionDefinition });
  for (const name of allActionNames) {
    const originalId = resolveCopyNodeId(state, name);
    assertCopyReady(state, originalId);
  }
  const allConnectionData: Record<string, CopiedConnectionData> = {};
  const staticResults: Record<string, any> = {};

  allActionNames.forEach((actionName) => {
    const originalId =
      Object.keys(state.workflow.idReplacements).find((id) => state.workflow.idReplacements[id] === actionName) ?? actionName;
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

    const staticResult = getStaticResultForNodeId(state.staticResults, actionName);
    if (staticResult) {
      staticResults[actionName] = staticResult;
    }
  });

  const entry = {
    nodeId: newNodeId,
    serializedOperation: serializedOperation as ActionDefinition,
    allConnectionData,
    staticResults,
    ...(state.workflow.idReplacements[normalizedScopeId] ? { sourceNodeId: state.workflow.idReplacements[normalizedScopeId] } : {}),
    isScopeNode: true as const,
  };
  if (!isClipboardEntry(entry)) {
    throw clipboardError(true);
  }
  return entry;
};

const writeClipboardItem = async (clipboardItem: string) => {
  const intl = getIntl();
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(clipboardItem);
    } catch {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'The actions could not be written to the clipboard. Allow clipboard access and try again. No actions were cut.',
          id: '21wfZu',
          description: 'Error when clipboard writing fails during copy or cut',
        })
      );
    }
  } else {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, clipboardItem);
    } catch {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'The actions could not be written to the clipboard. Allow clipboard access and try again. No actions were cut.',
          id: '21wfZu',
          description: 'Error when clipboard writing fails during copy or cut',
        })
      );
    }
  }
};

// Copies multiple selected nodes to the clipboard as a single multi-node payload so they can be
// pasted together. Scope nodes are serialized in full; plain actions copy their operation data.
const buildOperationsClipboard = async (state: RootState, nodeIds: string[]) => {
  const sourceIds = [...new Set(nodeIds.map((id) => resolveCopyNodeId(state, id)))];
  sourceIds.forEach((id) => assertCopyReady(state, id));

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
      const childNames = getAllActionNames({ [normalizedId]: entry.serializedOperation }, [], true);
      for (const name of childNames) {
        if (name !== normalizedId) {
          scopeChildIds.add(resolveCopyNodeId(state, name));
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
  if (!isExpressionConnectionMapping(connectionData)) {
    await initializeOperationDetails(nodeId, operationInfo, getState as () => RootState, dispatch);
  }

  // replace new nodeId if there exists a copy of the copied node
  dispatch(initializeNodes({ nodes: [{ ...nodeData, id: nodeId }] }));

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
  reservedIds?: string[];
}

const pasteScopeInDraft = createAsyncThunk('pasteScopeInDraft', async (payload: PasteScopeOperationPayload, { dispatch, getState }) => {
  const {
    nodeId: actionId,
    relationshipIds,
    serializedValue,
    upstreamNodeIds,
    allConnectionData,
    staticResults,
    isParallelBranch,
    reservedIds = [],
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

  const reservedMetadata = { ...existingNodesMetadata };
  for (const id of reservedIds) {
    if (id !== nodeId) {
      reservedMetadata[id] = { graphId: 'root' };
    }
  }
  const pasteParams = buildScopeParams(reservedMetadata, allActionNames);
  const [nodes, _edges, actions, actionNodesMetadata] = buildGraphFromActions(
    workflowActions,
    graphId,
    parentId,
    Object.keys(existingNodesMetadata),
    true /* shouldAppendAddCase */,
    pasteParams
  );
  // parentNodeId must reference a nodesMetadata key (the containing graph/scope) so the
  // parent-chain walk in getUpstreamNodeIds can climb to ancestor scopes. `parentId` from
  // relationshipIds is an edge-placement node (e.g. a `<scope>-#subgraph` card) and is not a
  // valid metadata key, so use `graphId` (the containing graph) instead, matching how
  // pasteScopeInWorkflow finalizes this node's metadata.
  const scopeParentNodeId = graphId && graphId !== 'root' ? graphId : undefined;
  actionNodesMetadata[nodeId] = { ...actionNodesMetadata[actionId], isRoot: false, parentNodeId: scopeParentNodeId, graphId };
  if (Object.keys(allConnectionData).length > 0) {
    const copiedConnections = replaceIdsOfExistingNodes(allConnectionData, pasteParams.renamedNodes);
    for (const [id, data] of Object.entries(copiedConnections)) {
      if (data.mapping) {
        const action = actions[id];
        const inputs = (action as LogicAppsV2.ServiceProvider)?.inputs;
        if (inputs) {
          actions[id] = { ...action, inputs: remapConnectionExpressionValue(inputs, pasteParams.renamedNodes) };
        }
        copiedConnections[id] = {
          ...data,
          mapping: { ...data.mapping, expression: remapConnectionExpression(data.mapping.expression, pasteParams.renamedNodes) },
        };
      }
    }
    dispatch(initScopeCopiedConnections(copiedConnections));
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
            mapping: { ...mapping, expression: remapConnectionExpression(mapping.expression, pasteParams.renamedNodes) },
          })
        );
        actions[id] = {
          ...action,
          inputs: remapConnectionExpressionValue((action as LogicAppsV2.ServiceProvider).inputs, pasteParams.renamedNodes),
        };
      }
    }
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
  const extendedIds = extendUpstreamNodeIdsForScopePaste(upstreamNodeIds, graphId, parentId, state, nodeMap);
  const upstreamOutputTokens = replaceIdsOfExistingNodes(filterRecordByArray(state.tokens.outputTokens, extendedIds), idReplacements);
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
      rootReplacements[entry.nodeId.replace(/-copy$/, '')] = id;
      if (entry.sourceNodeId) {
        rootReplacements[entry.sourceNodeId] = id;
      }
    }
    const replacements: Record<string, string> = { ...rootReplacements };
    const pasteEntry = async (entry: ClipboardEntry, ids: RelationshipIds, parallel: boolean) => {
      let id: string;
      if (entry.isScopeNode) {
        const result = await draft
          .dispatch(
            pasteScopeInDraft({
              nodeId: plannedIds.get(entry.nodeId)!,
              relationshipIds: ids,
              isParallelBranch: parallel,
              serializedValue: remapConnectionExpressionValue(entry.serializedOperation, rootReplacements),
              allConnectionData: remapConnectionExpressionValue(entry.allConnectionData, rootReplacements),
              staticResults: entry.staticResults,
              upstreamNodeIds,
              reservedIds: [...plannedIds.values()],
            })
          )
          .unwrap();
        id = result.nodeId;
        Object.assign(replacements, result.renamedNodes);
      } else {
        id = await draft
          .dispatch(
            pasteActionInDraft({
              nodeId: plannedIds.get(entry.nodeId)!,
              relationshipIds: ids,
              isParallelBranch: parallel,
              nodeData: entry.nodeData,
              nodeTokenData: entry.nodeTokenData,
              operationInfo: entry.nodeOperationInfo,
              connectionData: entry.nodeConnectionData,
              comment: entry.nodeComment,
            })
          )
          .unwrap();
      }
      if (!id || !draft.getState().workflow.operations[id] || !getWorkflowNodeFromGraphState(draft.getState().workflow, id)) {
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
      const predecessorUsed = new Set<string>();
      let firstRoot: string | undefined;
      for (const entry of nodes) {
        const predecessors = edges.filter((edge) => edge.target === entry.nodeId).map((edge) => edge.source);
        const firstPredecessor = predecessors[0];
        const predecessorId = firstPredecessor ? pasted.get(firstPredecessor) : undefined;
        const ids = firstPredecessor ? { graphId, parentId: predecessorId } : firstRoot ? { graphId, parentId } : relationshipIds;
        const parallel = firstPredecessor ? predecessorUsed.has(firstPredecessor) : !!firstRoot || isParallelBranch;
        const id = await pasteEntry(entry, ids, parallel);
        pasted.set(entry.nodeId, id);
        if (firstPredecessor) {
          predecessorUsed.add(firstPredecessor);
          for (const predecessor of predecessors.slice(1)) {
            draft.dispatch(addRunAfter({ childOperationId: id, parentOperationId: pasted.get(predecessor)! }));
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
        if (firstRoot) {
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
    for (const entry of nodes) {
      const id = pasted.get(entry.nodeId)!;
      replacements[entry.nodeId.replace(/-copy$/, '')] = id;
      if (entry.sourceNodeId) {
        replacements[entry.sourceNodeId] = id;
      }
    }
    const addedIds = Object.keys(draft.getState().workflow.operations).filter((id) => !Object.hasOwn(before.workflow.operations, id));
    for (const id of addedIds) {
      const state = draft.getState();
      const data = getNodeOperationData(state.operations, id);
      if (!hasCompleteActionData(data)) {
        throw clipboardError();
      }
      const remapped = remapClipboardNodeData(data, replacements);
      draft.dispatch(initializeNodes({ nodes: [{ ...remapped, id }] }));
      draft.dispatch(
        replaceOperationDefinition({
          nodeId: id,
          operationDefinition: remapConnectionExpressionValue(state.workflow.operations[id], replacements),
        })
      );
      const mapping = state.connections.connectionsMapping[id];
      if (isExpressionConnectionMapping(mapping)) {
        draft.dispatch(
          setNodeConnectionMapping({
            nodeId: id,
            mapping: { ...mapping, expression: remapConnectionExpression(mapping.expression, replacements) },
          })
        );
      }
    }
    const after = draft.getState();
    for (const id of Object.keys(after.workflow.operations)) {
      if (
        !Object.hasOwn(before.workflow.operations, id) &&
        (!hasCompleteActionData(getNodeOperationData(after.operations, id)) ||
          !after.operations.operationInfo[id] ||
          !getWorkflowNodeFromGraphState(after.workflow, id))
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

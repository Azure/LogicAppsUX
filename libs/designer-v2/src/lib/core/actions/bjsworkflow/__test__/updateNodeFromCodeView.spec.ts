import { describe, test, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { InitOperationManifestService, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { updateNodeFromCodeView } from '../updateNodeFromCodeView';
import workflowReducer from '../../../state/workflow/workflowSlice';
import operationsReducer, { initializeNodes } from '../../../state/operation/operationMetadataSlice';
import tokensReducer, { initializeTokensAndVariables } from '../../../state/tokens/tokensSlice';
import panelReducer from '../../../state/panel/panelSlice';
import connectionsReducer from '../../../state/connection/connectionSlice';
import workflowParametersReducer from '../../../state/workflowparameters/workflowparametersSlice';
import type { WorkflowState, NodeMetadata } from '../../../state/workflow/workflowInterfaces';

// Heavy single-node re-initialization helpers are mocked so the test focuses on the thunk's
// orchestration (persisting the definition, reconciling the graph, branch selection, and
// variable lifecycle) rather than the deserializer internals.
import * as operationDeserializer from '../operationdeserializer';
import * as swaggerOperation from '../../../utils/swagger/operation';
import * as agent from '../agent';
import * as initialize from '../initialize';

vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual<typeof import('@microsoft/logic-apps-shared')>('@microsoft/logic-apps-shared');
  return {
    ...actual,
    LoggerService: vi.fn(() => ({ log: vi.fn(), startTrace: vi.fn(), endTrace: vi.fn() })),
  };
});

vi.mock('../operationdeserializer', () => ({
  initializeOperationDetailsForManagedMcpServer: vi.fn(),
  initializeOperationDetailsForManifest: vi.fn(),
  initializeRepetitionInfos: vi.fn(async () => ({})),
  initializeOutputTokensForOperations: vi.fn(() => ({})),
  initializeVariables: vi.fn(() => ({})),
  initializeDynamicDataInNodes: vi.fn(async () => undefined),
  updateTokenMetadataInParameters: vi.fn(),
}));

vi.mock('../../../utils/swagger/operation', () => ({
  initializeOperationDetailsForSwagger: vi.fn(),
}));

vi.mock('../agent', () => ({
  initializeConnectorOperationDetails: vi.fn(),
}));

vi.mock('../initialize', () => ({
  updateAllUpstreamNodes: vi.fn(),
}));

const mockManifest = vi.mocked(operationDeserializer.initializeOperationDetailsForManifest);
const mockManagedMcp = vi.mocked(operationDeserializer.initializeOperationDetailsForManagedMcpServer);
const mockSwagger = vi.mocked(swaggerOperation.initializeOperationDetailsForSwagger);
const mockConnector = vi.mocked(agent.initializeConnectorOperationDetails);
const mockInitializeVariables = vi.mocked(operationDeserializer.initializeVariables);

// Minimal node-data shape consumed by the real initializeNodes reducer. Distinct nodeInputs lets
// us assert that the edited node's metadata was (re)written.
const makeNodeData = (id: string) =>
  ({
    id,
    nodeInputs: { parameterGroups: {}, marker: `inputs-${id}` },
    nodeOutputs: { outputs: {} },
    nodeDependencies: { inputs: {}, outputs: {} },
    settings: {},
    operationMetadata: { iconUri: '', brandColor: '' },
    staticResult: undefined,
    supportedChannels: [],
  }) as any;

// Linear top-level workflow: manual (trigger) -> A -> B -> C
const buildWorkflowState = (): WorkflowState =>
  ({
    graph: {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        { id: 'manual', type: 'OPERATION_NODE' },
        { id: 'A', type: 'OPERATION_NODE' },
        { id: 'B', type: 'OPERATION_NODE' },
        { id: 'C', type: 'OPERATION_NODE' },
      ],
      edges: [
        { id: 'manual-A', source: 'manual', target: 'A', type: 'BUTTON_EDGE' },
        { id: 'A-B', source: 'A', target: 'B', type: 'BUTTON_EDGE' },
        { id: 'B-C', source: 'B', target: 'C', type: 'BUTTON_EDGE' },
      ],
    },
    operations: {
      manual: { type: 'Request', kind: 'Http' },
      A: { type: 'Compose', inputs: {} },
      B: { type: 'Compose', inputs: {}, runAfter: { A: ['Succeeded'] } },
      C: { type: 'Compose', inputs: {}, runAfter: { B: ['Succeeded'] } },
    },
    nodesMetadata: {
      manual: { graphId: 'root', isRoot: true, isTrigger: true } as NodeMetadata,
      A: { graphId: 'root' } as NodeMetadata,
      B: { graphId: 'root' } as NodeMetadata,
      C: { graphId: 'root' } as NodeMetadata,
    },
    collapsedGraphIds: {},
    collapsedActionIds: {},
    idReplacements: {},
    newlyAddedOperations: {},
    runInstance: null,
    isDirty: false,
    workflowKind: 'stateful',
    originalDefinition: {} as LogicAppsV2.WorkflowDefinition,
    hostData: { errorMessages: {} },
    agentsGraph: {},
    timelineRepetitionIndex: 0,
    changeCount: 0,
    timelineRepetitionArray: [],
    flowErrors: {},
  }) as unknown as WorkflowState;

const makeStore = () =>
  configureStore({
    reducer: {
      workflow: workflowReducer,
      operations: operationsReducer,
      tokens: tokensReducer,
      panel: panelReducer,
      connections: connectionsReducer,
      workflowParameters: workflowParametersReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    preloadedState: { workflow: buildWorkflowState() } as any,
  });

type TestStore = ReturnType<typeof makeStore>;

const seedNode = (store: TestStore, id: string) => {
  store.dispatch(initializeNodes({ nodes: [makeNodeData(id)], clearExisting: false }));
};

const composeWithoutRunAfter = { type: 'Compose', inputs: { value: 'edited' } } as unknown as LogicAppsV2.OperationDefinition;

describe('updateNodeFromCodeView', () => {
  let store: TestStore;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default branch helpers return one node-data entry for the edited node.
    mockManifest.mockImplementation(async (nodeId: string) => [makeNodeData(nodeId)]);
    mockManagedMcp.mockImplementation(async (nodeId: string) => [makeNodeData(nodeId)]);
    mockSwagger.mockImplementation(async (nodeId: string) => [makeNodeData(nodeId)]);
    mockConnector.mockImplementation(async (nodeId: string) => [makeNodeData(nodeId)]);
    mockInitializeVariables.mockReturnValue({});

    // Manifest service: supported by default (manifest branch). Individual tests override.
    InitOperationManifestService({
      isSupported: () => true,
      isAliasingSupported: () => false,
      getOperationInfo: async () => ({}) as any,
      getOperationManifest: async () => ({}) as any,
      getOperation: async () => ({}) as any,
      isBuiltInConnector: () => false,
      getBuiltInConnector: () => ({}) as any,
    } as any);

    store = makeStore();
  });

  test('persists the edited definition and reconciles the graph (removing runAfter re-attaches to trigger)', async () => {
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: composeWithoutRunAfter }));

    const { workflow } = store.getState();
    // Definition persisted.
    expect((workflow.operations as any).C.inputs).toEqual({ value: 'edited' });
    // B->C edge removed and a trigger->C edge created.
    const edgeIds = (workflow.graph?.edges ?? []).map((edge) => edge.id).sort();
    expect(edgeIds).toEqual(['A-B', 'manual-A', 'manual-C']);
  });

  test('re-initializes only the edited node and preserves other nodes', async () => {
    seedNode(store, 'A'); // simulate another node with existing (unsaved) metadata

    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: composeWithoutRunAfter }));

    const { operations } = store.getState();
    // Only the edited node was passed to the deserializer.
    expect(mockManifest).toHaveBeenCalledTimes(1);
    expect(mockManifest).toHaveBeenCalledWith('C', expect.anything(), expect.anything(), false, 'stateful', expect.anything());
    // Edited node metadata (re)written...
    expect((operations.inputParameters as any).C.marker).toBe('inputs-C');
    // ...and the other node's metadata is untouched.
    expect((operations.inputParameters as any).A.marker).toBe('inputs-A');
  });

  test('clears stale node variables when an edit removes them', async () => {
    // Edited node previously declared a variable...
    store.dispatch(initializeTokensAndVariables({ outputTokens: {}, variables: { C: [{ name: 'oldVar', type: 'String' }] as any } }));
    // ...but the new definition declares none.
    mockInitializeVariables.mockReturnValue({});

    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: composeWithoutRunAfter }));

    expect((store.getState().tokens.variables as any).C).toBeUndefined();
  });

  test('re-initializes node variables when the edit declares them', async () => {
    const newVars = [{ name: 'newVar', type: 'Integer' }];
    mockInitializeVariables.mockReturnValue({ C: newVars } as any);

    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: composeWithoutRunAfter }));

    expect((store.getState().tokens.variables as any).C).toEqual(newVars);
  });

  test('uses the manifest branch when the operation is supported', async () => {
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: composeWithoutRunAfter }));

    expect(mockManifest).toHaveBeenCalledTimes(1);
    expect(mockSwagger).not.toHaveBeenCalled();
    expect(mockConnector).not.toHaveBeenCalled();
    expect(mockManagedMcp).not.toHaveBeenCalled();
  });

  test('falls back to the swagger branch when the operation is not supported', async () => {
    InitOperationManifestService({
      isSupported: () => false,
      isAliasingSupported: () => false,
      getOperationInfo: async () => ({}) as any,
      getOperationManifest: async () => ({}) as any,
      getOperation: async () => ({}) as any,
      isBuiltInConnector: () => false,
      getBuiltInConnector: () => ({}) as any,
    } as any);

    const apiConnection = { type: 'ApiConnection', inputs: {} } as unknown as LogicAppsV2.OperationDefinition;
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: apiConnection }));

    expect(mockSwagger).toHaveBeenCalledTimes(1);
    expect(mockManifest).not.toHaveBeenCalled();
  });

  test('uses the connector branch for connector-typed operations', async () => {
    const connectorOp = { type: 'connector', inputs: {} } as unknown as LogicAppsV2.OperationDefinition;
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: connectorOp }));

    expect(mockConnector).toHaveBeenCalledTimes(1);
    expect(mockManifest).not.toHaveBeenCalled();
    expect(mockManagedMcp).not.toHaveBeenCalled();
  });

  test('uses the managed-MCP branch for managed MCP operations', async () => {
    const managedMcpOp = { type: 'mcpclienttool', kind: 'managed', inputs: {} } as unknown as LogicAppsV2.OperationDefinition;
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: managedMcpOp }));

    expect(mockManagedMcp).toHaveBeenCalledTimes(1);
    expect(mockManifest).not.toHaveBeenCalled();
    expect(mockConnector).not.toHaveBeenCalled();
  });

  test('no-ops when the node is not present in workflow.operations', async () => {
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'does-not-exist', serializedOperation: composeWithoutRunAfter }));

    expect(mockManifest).not.toHaveBeenCalled();
    expect(mockSwagger).not.toHaveBeenCalled();
    expect(mockConnector).not.toHaveBeenCalled();
    expect(mockManagedMcp).not.toHaveBeenCalled();
  });

  test('toggles the panel loading flag around the mutation', async () => {
    await store.dispatch(updateNodeFromCodeView({ nodeId: 'C', serializedOperation: composeWithoutRunAfter }));

    // The finally block resets it back to false once the mutation completes.
    expect(store.getState().panel.isLoading).toBe(false);
  });
});

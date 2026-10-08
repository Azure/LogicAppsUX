// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { copyOperations, extendUpstreamNodeIdsForScopePaste } from '../copypaste';
import * as serializer from '../serializer';
import type { RootState } from '../../..';
import { createWorkflowEdge, createWorkflowNode } from '../../../utils/graph';
import { clone, LOCAL_STORAGE_KEYS, type LogicAppsV2, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';

// Graph shape:
//   root
//     manual (trigger)
//     Init_Variable          (source node at root, before the parallel split)
//     Init_Parallel          (parallel branch A — NOT upstream of branches B/C)
//     Condition_outer        (parallel branch B; scope with a True subgraph — paste site)
//        └── Condition_outer-actions (subgraph paste site inside the condition)
//     For_each               (parallel branch C; loop with an empty body — paste site)
const buildState = (): RootState => {
  const rootGraph = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('Init_Variable'),
      createWorkflowNode('Init_Parallel'),
      {
        id: 'Condition_outer',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode('Condition_outer-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
          {
            id: 'Condition_outer-actions',
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            children: [createWorkflowNode('Condition_outer-actions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE)],
            edges: [],
          },
        ],
        edges: [createWorkflowEdge('Condition_outer-#scope', 'Condition_outer-actions')],
      },
      {
        id: 'For_each',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [createWorkflowNode('For_each-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
        edges: [],
      },
    ],
    edges: [
      createWorkflowEdge('manual', 'Init_Variable'),
      createWorkflowEdge('Init_Variable', 'Init_Parallel'),
      createWorkflowEdge('Init_Variable', 'Condition_outer'),
      createWorkflowEdge('Init_Variable', 'For_each'),
    ],
  } as any;

  return {
    workflow: {
      graph: rootGraph,
      nodesMetadata: {
        manual: { graphId: 'root', isRoot: true, isTrigger: true },
        Init_Variable: { graphId: 'root' },
        Init_Parallel: { graphId: 'root' },
        Condition_outer: { graphId: 'root' },
        'Condition_outer-actions': { graphId: 'Condition_outer', parentNodeId: 'Condition_outer', subgraphType: 'CONDITIONAL_TRUE' },
        For_each: { graphId: 'root' },
      },
    },
    tokens: {
      outputTokens: {},
    },
  } as unknown as RootState;
};

const nodeMap: Record<string, string> = {
  manual: 'manual',
  Init_Variable: 'Init_Variable',
  Init_Parallel: 'Init_Parallel',
  Condition_outer: 'Condition_outer',
  'Condition_outer-actions': 'Condition_outer-actions',
  For_each: 'For_each',
};

describe('extendUpstreamNodeIdsForScopePaste', () => {
  it('returns only the caller ids when there is no enclosing graph or parent', () => {
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste(['Init_Variable'], undefined, undefined, state, nodeMap);
    expect(result).toEqual(['Init_Variable']);
  });

  it('surfaces the ancestor variable when pasting into a Condition subgraph', () => {
    // Pasting a scope into the True branch of Condition_outer. graphId is the subgraph node.
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste([], 'Condition_outer-actions', 'Condition_outer', state, nodeMap);
    expect(result).toContain('Init_Variable');
    expect(result).not.toContain('Init_Parallel');
  });

  it('surfaces the ancestor variable when pasting into a For each body even if parentId is undefined', () => {
    // Regression: pasting a Condition as the first/only action inside a For each. There is no
    // predecessor action, so parentId is undefined. The enclosing graphId (For_each) must still
    // surface the upstream Init_Variable while excluding the parallel-branch Init_Parallel.
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste([], 'For_each', undefined, state, nodeMap);
    expect(result).toContain('Init_Variable');
    expect(result).not.toContain('Init_Parallel');
  });

  it('deduplicates ids that already appear in the caller-provided upstream list', () => {
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste(['Init_Variable'], 'For_each', undefined, state, nodeMap);
    expect(result.filter((id) => id === 'Init_Variable')).toHaveLength(1);
  });
});

describe('copyOperations clipboard payload', () => {
  const createState = () => {
    const state = clone(getMockedInitialRootState());
    state.workflow.idReplacements = { Resolve: 'Resolve_Renamed' };
    state.workflow.operations = {
      Query: {
        type: 'ServiceProvider',
        description: 'Keep the authored query',
        inputs: {
          serviceProviderConfiguration: {
            serviceProviderId: '/serviceProviders/sql',
            operationId: 'executeQuery',
            connectionName: "@outputs('Resolve')",
          },
          parameters: { query: 'select 1' },
        },
        runAfter: { Outside: ['Succeeded'] },
      },
      Follow: { type: 'Compose', inputs: 'next', runAfter: { Query: ['Succeeded'], Outside: ['Succeeded'] } },
    };
    state.operations.operationInfo = {
      Query: { type: 'ServiceProvider', connectorId: '/serviceProviders/sql', operationId: 'executeQuery' },
      Follow: { type: 'Compose', connectorId: 'connectionless', operationId: 'compose' },
    };
    state.operations.inputParameters = { Query: { parameterGroups: {} }, Follow: { parameterGroups: {} } };
    state.connections.connectionsMapping = {
      Query: { kind: 'expression', expression: "@outputs('Resolve')", designTimeReferenceKey: 'SqlDesign' },
      Follow: null,
    };
    state.connections.connectionReferences = {
      SqlDesign: { api: { id: '/serviceProviders/sql' }, connection: { id: '/connections/SqlDesign' } },
    };
    state.tokens.outputTokens = { Query: { tokens: [], upstreamNodeIds: [] }, Follow: { tokens: [], upstreamNodeIds: ['Query'] } };
    return state;
  };
  const createStore = (state: RootState) => configureStore({ reducer: () => state });
  const readClipboard = () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD) ?? '{}');

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CLIPBOARD);
  });

  it('copies each selected action once, preserving runtime inputs and only the internal runAfter edge', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    const state = createState();
    const original = clone(state);

    await createStore(state)
      .dispatch(copyOperations({ nodeIds: ['Query', 'Follow'] }))
      .unwrap();

    const copied = readClipboard();
    expect(copied).toMatchObject({
      mslaNode: true,
      isMultiNode: true,
      edges: [{ source: 'Query-copy', target: 'Follow-copy' }],
    });
    expect(copied.nodes).toHaveLength(2);
    expect(copied.nodes[0]).toMatchObject({
      nodeId: 'Query-copy',
      isScopeNode: false,
      nodeComment: 'Keep the authored query',
      nodeConnectionData: {
        kind: 'expression',
        expression: "@outputs('Resolve_Renamed')",
        designTimeReferenceKey: 'SqlDesign',
      },
      nodeData: { nodeInputs: { preservedConnectionInputs: (state.workflow.operations.Query as LogicAppsV2.ServiceProvider).inputs } },
    });
    expect(copied.nodes[1]).toMatchObject({ nodeId: 'Follow-copy', isScopeNode: false, nodeConnectionData: null });
    expect(state).toEqual(original);
  });

  it('embeds selected scope children only once and retains their connection binding and static result', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    const state = createState();
    const scope = {
      type: 'Scope',
      actions: { Query: state.workflow.operations.Query },
      runAfter: {},
    } as LogicAppsV2.ScopeAction;
    state.workflow.operations.Container = scope;
    state.operations.operationInfo.Container = { type: 'Scope', connectorId: 'connectionless', operationId: 'scope' };
    const staticResult = { outputs: { body: 'mocked SQL result' } };
    state.staticResults.properties.Query0 = staticResult;
    const serialize = vi.spyOn(serializer, 'serializeOperation').mockResolvedValue(scope);
    const store = createStore(state);

    await store.dispatch(copyOperations({ nodeIds: ['Container', 'Query', 'Follow'] })).unwrap();

    const copied = readClipboard();
    expect(copied.nodes.map((node: { nodeId: string }) => node.nodeId)).toEqual(['Container-copy', 'Follow-copy']);
    expect(copied.nodes[0]).toEqual({
      nodeId: 'Container-copy',
      serializedOperation: scope,
      isScopeNode: true,
      allConnectionData: {
        Query: {
          mapping: { kind: 'expression', expression: "@outputs('Resolve_Renamed')", designTimeReferenceKey: 'SqlDesign' },
          referenceKey: 'SqlDesign',
          connectionReference: state.connections.connectionReferences.SqlDesign,
        },
      },
      staticResults: { Query: staticResult },
    });
    expect(serialize).toHaveBeenCalledTimes(2);
    expect(serialize).toHaveBeenNthCalledWith(1, store.getState(), 'Container', {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });
    expect(serialize).toHaveBeenNthCalledWith(2, store.getState(), 'Container', {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });
  });

  it('leaves the clipboard untouched for an empty selection', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, 'previous clipboard');

    await createStore(createState())
      .dispatch(copyOperations({ nodeIds: [] }))
      .unwrap();

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD)).toBe('previous clipboard');
  });

  it('writes the same multi-node envelope to the native clipboard when that API is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn(), writeText } });
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, 'local fallback');

    await createStore(createState())
      .dispatch(copyOperations({ nodeIds: ['Follow'] }))
      .unwrap();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({
      mslaNode: true,
      isMultiNode: true,
      nodes: [{ nodeId: 'Follow-copy', isScopeNode: false }],
      edges: [],
    });
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD)).toBe('local fallback');
  });
});

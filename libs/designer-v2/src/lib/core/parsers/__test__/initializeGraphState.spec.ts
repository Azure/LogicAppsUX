import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clone, LOCAL_STORAGE_KEYS, LoggerService, Status } from '@microsoft/logic-apps-shared';
import { getMockedInitialRootState } from '../../../__test__/mock-root-state';
import type { Workflow } from '../../../common/models/workflow';
import { designerReducer } from '../../store';
import * as connectionQueries from '../../queries/connections';
import * as connectionActions from '../../actions/bjsworkflow/connections';
import * as metadata from '../../actions/bjsworkflow/operationdeserializer';
import { closeCombineVariableModal } from '../../state/modal/modalSlice';
import { initializeGraphState } from '../ParseReduxAction';
import { getWorkflowNodeFromGraphState } from '../../state/workflow/workflowGraphTraversal';
import { initialWorkflowState } from '../../state/workflow/workflowSlice';

const workflow: Workflow = {
  kind: 'Stateful',
  connectionReferences: {},
  definition: {
    ...initialWorkflowState.originalDefinition,
    triggers: { manual: { type: 'Request', kind: 'Http', inputs: {} } },
    actions: {
      Scope: { type: 'Scope', actions: { Nested: { type: 'Compose', inputs: 'inside' } } },
      Agent: { type: 'Agent', inputs: {}, tools: {}, runAfter: { Scope: ['Succeeded'] } },
    },
  },
};
const variables: Workflow = {
  kind: 'Stateful',
  connectionReferences: {},
  definition: {
    ...initialWorkflowState.originalDefinition,
    actions: {
      First: { type: 'InitializeVariable', inputs: { variables: [{ name: 'first', type: 'string', value: 'one' }] } },
      Second: {
        type: 'InitializeVariable',
        inputs: { variables: [{ name: 'second', type: 'string', value: 'two' }] },
        runAfter: { First: ['Succeeded'] },
      },
    },
  },
};
const setup = () => {
  const state = clone(getMockedInitialRootState());
  return { state, createStore: () => configureStore({ reducer: designerReducer, preloadedState: state }) };
};
const settleInitialization = async () => {
  await vi.waitFor(() => expect(LoggerService().endTrace).toHaveBeenCalledWith(expect.anything(), { status: Status.Success }));
};

describe('graph initialization orchestration', () => {
  beforeEach(() => {
    vi.spyOn(connectionQueries, 'getConnectionsQuery').mockResolvedValue(undefined);
    vi.spyOn(metadata, 'initializeOperationMetadata').mockResolvedValue(undefined);
    vi.spyOn(metadata, 'initializeDynamicDataInNodes').mockResolvedValue(undefined);
    vi.spyOn(connectionActions, 'getConnectionsApiAndMapping').mockResolvedValue(undefined);
    vi.spyOn(LoggerService(), 'endTrace');
    localStorage.removeItem(LOCAL_STORAGE_KEYS.COMBINE_INITIALIZE_VARIABLES);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(LOCAL_STORAGE_KEYS.COMBINE_INITIALIZE_VARIABLES);
  });

  it('hydrates authored state, preserved native dimensions and consumption connection references', async () => {
    const { state, createStore } = setup();
    state.workflow.graph = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [{ id: 'Nested', type: 'OPERATION_NODE', width: 200, height: 68, dimensionsObserved: true }],
    };
    const store = createStore();
    const result = await store
      .dispatch(
        initializeGraphState({
          workflowDefinition: {
            ...workflow,
            parameters: {
              $connections: { type: 'Object', value: { actual: { id: '/managedApis/actual', connectionId: '/connections/actual' } } },
            },
            notes: {
              note: { content: 'authored note', color: '#fff', metadata: { position: { x: 0, y: 0 }, width: 200, height: 100 } },
            },
          },
          runInstance: null,
        })
      )
      .unwrap();
    expect(result.originalDefinition).toEqual(workflow.definition);
    expect(store.getState().connections.connectionReferences.actual).toMatchObject({
      api: { id: '/managedApis/actual' },
      connection: { id: '/connections/actual' },
    });
    expect(store.getState().notes.notes.note).toMatchObject({ content: 'authored note' });
    expect(getWorkflowNodeFromGraphState(store.getState().workflow, 'Nested')).toMatchObject({
      width: 200,
      height: 68,
      dimensionsObserved: true,
    });
    await settleInitialization();
    expect(metadata.initializeDynamicDataInNodes).toHaveBeenCalledOnce();
    expect(connectionActions.getConnectionsApiAndMapping).toHaveBeenCalledOnce();
    expect(connectionQueries.getConnectionsQuery).toHaveBeenCalledOnce();
  });

  it('collapses host-requested nested graphs but leaves Agent loops expanded', async () => {
    const { state, createStore } = setup();
    state.designerOptions.hostOptions = { ...state.designerOptions.hostOptions, collapseGraphsByDefault: true };
    const store = createStore();
    await store.dispatch(initializeGraphState({ workflowDefinition: workflow, runInstance: null })).unwrap();
    expect(store.getState().workflow.collapsedGraphIds).toMatchObject({ root: true, Scope: true });
    expect(store.getState().workflow.collapsedGraphIds.Agent).toBeUndefined();
    await settleInitialization();
  });

  it.each([undefined, 'CNCF'] as const)('rejects unsupported workflow specification %s without initializing services', async (spec) => {
    const { state, createStore } = setup();
    state.workflow.workflowSpec = spec;
    await expect(
      createStore()
        .dispatch(initializeGraphState({ workflowDefinition: workflow, runInstance: null }))
        .unwrap()
    ).rejects.toMatchObject({
      message: spec === undefined ? 'Trying to import workflow without specifying the workflow type' : 'Spec not implemented.',
    });
    expect(metadata.initializeOperationMetadata).not.toHaveBeenCalled();
  });

  it.each([true, false])('honors persisted variable-combination choice=%s without modifying the original definition', async (combine) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMBINE_INITIALIZE_VARIABLES, JSON.stringify(combine));
    const input = clone(variables);
    const originalDefinition = clone(input.definition);
    const { createStore } = setup();
    const store = createStore();
    const result = await store
      .dispatch(
        initializeGraphState({
          workflowDefinition: input,
          runInstance: null,
          isMultiVariableEnabled: true,
        })
      )
      .unwrap();
    expect(Object.keys(result.deserializedWorkflow.actionData)).toHaveLength(combine ? 2 : 3);
    expect(result.originalDefinition).toEqual(originalDefinition);
    expect(input.definition).toEqual(originalDefinition);
    expect(store.getState().modal.isCombineVariableOpen).toBe(false);
    await settleInitialization();
  });

  it('waits for the actual combine-variable modal decision when no preference exists', async () => {
    const { createStore } = setup();
    const store = createStore();
    const input = clone(variables);
    const originalDefinition = clone(input.definition);
    const pending = store.dispatch(
      initializeGraphState({
        workflowDefinition: input,
        runInstance: null,
        isMultiVariableEnabled: true,
      })
    );
    expect(store.getState().modal.isCombineVariableOpen).toBe(true);
    store.dispatch(closeCombineVariableModal(true));
    const result = await pending.unwrap();
    expect(Object.keys(result.deserializedWorkflow.actionData)).toHaveLength(2);
    expect(input.definition).toEqual(originalDefinition);
    expect(store.getState().modal.isCombineVariableOpen).toBe(false);
    await settleInitialization();
  });

  it('reports asynchronous metadata failure without losing the successfully deserialized graph', async () => {
    const failure = new Error('metadata lookup failed');
    vi.mocked(metadata.initializeOperationMetadata).mockRejectedValue(failure);
    const trace = vi.spyOn(LoggerService(), 'endTrace');
    const { createStore } = setup();
    const store = createStore();
    await store.dispatch(initializeGraphState({ workflowDefinition: workflow, runInstance: null })).unwrap();
    await vi.waitFor(() => expect(trace).toHaveBeenCalledWith(expect.anything(), { status: Status.Failure, data: failure }));
    expect(store.getState().workflow.operations.Nested).toEqual({ type: 'Compose', inputs: 'inside' });
    expect(metadata.initializeDynamicDataInNodes).not.toHaveBeenCalled();
  });
});

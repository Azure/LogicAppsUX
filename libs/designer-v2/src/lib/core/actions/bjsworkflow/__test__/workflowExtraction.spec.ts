// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitLoggerService } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import type { Workflow } from '../../../../common/models/workflow';
import type {
  WorkflowExtractionRequest,
  WorkflowExtractionResult,
  WorkflowExtractionService,
} from '../../../../common/models/workflowExtraction';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import { initializeGraphState } from '../../../parsers/ParseReduxAction';
import { initializeConnectionReferences } from '../../../state/connection/connectionSlice';
import { setWorkflowExtractionBusy } from '../../../state/designerView/designerViewSlice';
import { resetWorkflowState } from '../../../state/global';
import { initializeNotes } from '../../../state/notes/notesSlice';
import {
  DynamicLoadStatus,
  ErrorLevel,
  deinitializeOperationInfo,
  initializeNodeOperationInputsData,
  updateDynamicDataLoadStatus,
  updateErrorDetails,
  updateNodeDynamicInputLoadStatus,
  updateOutputs,
} from '../../../state/operation/operationMetadataSlice';
import { setNodeSelection } from '../../../state/panel/panelSlice';
import { UNDO_REDO_SLICE_NAMES } from '../../../state/undoRedo/undoRedoTypes';
import { initWorkflowSpec, setIsWorkflowDirty, setWorkflowKind } from '../../../state/workflow/workflowSlice';
import { createDesignerStore, type RootState } from '../../../store';
import { getRootStateFromCompressedSlices } from '../../../utils/undoredo';
import { getConnectionsApiAndMapping } from '../connections';
import * as connectionActions from '../connections';
import { updateWorkflowParameters } from '../initialize';
import { initializeDynamicDataInNodes, initializeOperationMetadata } from '../operationdeserializer';
import * as operationDeserializer from '../operationdeserializer';
import { serializeWorkflow } from '../serializer';
import * as serializer from '../serializer';
import { onRedoClick, onUndoClick } from '../undoRedo';
import {
  commitWorkflowExtraction,
  getExtractionSelectedIds,
  prepareExtractedWorkflow,
  workflowExtractionFingerprint,
} from '../workflowExtraction';

// Keep deserialization, Redux reducers/middleware and history compression real.
// Only manifest/network work and the final serialization boundary are substituted.

const original: Workflow = {
  kind: 'Stateful',
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
    contentVersion: '1.0.0.0',
    triggers: { Request: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
    actions: {
      A: { type: 'Compose', inputs: 'first', runAfter: {} },
      B: { type: 'Compose', inputs: "@outputs('A')", runAfter: { A: ['Succeeded'] } },
      Following: { type: 'Compose', inputs: "@outputs('B')", runAfter: { B: ['Succeeded'] } },
    },
    outputs: {},
  },
  connectionReferences: {},
  parameters: { greeting: { type: 'String', value: 'hello' } },
};

const source: Workflow = {
  ...original,
  definition: {
    ...original.definition,
    actions: {
      Invoke_child: {
        type: 'Workflow',
        inputs: { host: { workflow: { id: 'child' } }, body: {} },
        runAfter: {},
      },
      Following: { type: 'Compose', inputs: "@body('Invoke_child')", runAfter: { Invoke_child: ['Succeeded'] } },
    },
  },
};
const child: Workflow = {
  ...original,
  definition: {
    ...original.definition,
    actions: {
      A: original.definition.actions.A,
      B: original.definition.actions.B,
      Response: { type: 'Response', inputs: { statusCode: 200, body: "@outputs('B')" }, runAfter: { B: ['Succeeded'] } },
    },
  },
  parameters: {},
};
const completed: WorkflowExtractionResult = { status: 'completed', child: { name: 'child', href: '#child' } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function initializeMetadata(workflow: ReturnType<typeof Deserialize>, dispatch: Dispatch) {
  dispatch(
    initializeNodeOperationInputsData(
      Object.entries(workflow.actionData).map(([id, action]) => ({
        id,
        operationInfo: { type: action.type, operationId: action.type, connectorId: 'built-in' },
        nodeInputs: { parameterGroups: {}, dynamicLoadStatus: DynamicLoadStatus.SUCCEEDED },
        nodeOutputs: { outputs: {}, dynamicLoadStatus: DynamicLoadStatus.SUCCEEDED },
        nodeDependencies: { inputs: {}, outputs: {} },
      }))
    )
  );
}

function createLiveStore() {
  const store = createDesignerStore();
  const deserializedWorkflow = Deserialize(original.definition, null, true, original.kind);
  store.dispatch(initWorkflowSpec('BJS'));
  store.dispatch(setWorkflowKind('stateful'));
  store.dispatch(
    initializeGraphState.fulfilled({ deserializedWorkflow, originalDefinition: original.definition }, 'initial', {
      workflowDefinition: original,
      runInstance: null,
    })
  );
  initializeMetadata(deserializedWorkflow, store.dispatch);
  store.dispatch(updateDynamicDataLoadStatus(true));
  store.dispatch(initializeConnectionReferences(original.connectionReferences));
  updateWorkflowParameters(original.parameters ?? {}, store.dispatch);
  store.dispatch(setNodeSelection(['A', 'B']));
  store.dispatch(setIsWorkflowDirty(true));
  return store;
}

function expectAuthoringUnchanged(current: RootState, before: RootState) {
  for (const key of [...UNDO_REDO_SLICE_NAMES, 'undoRedo'] as const) {
    expect(current[key], `${key} must not change before durable host success`).toBe(before[key]);
  }
}

describe('workflow extraction transaction', () => {
  let live: ReturnType<typeof createLiveStore>;
  let request: WorkflowExtractionRequest;
  let service: WorkflowExtractionService;
  let release: ReturnType<typeof vi.fn>;
  let stages: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    InitLoggerService([]);
    vi.spyOn(operationDeserializer, 'initializeOperationMetadata');
    vi.spyOn(operationDeserializer, 'initializeDynamicDataInNodes');
    vi.spyOn(connectionActions, 'getConnectionsApiAndMapping');
    vi.spyOn(serializer, 'serializeWorkflow');
    vi.mocked(serializeWorkflow)
      .mockReset()
      .mockImplementation(async (state) => ({
        kind: state.workflow.workflowKind === 'stateless' ? 'Stateless' : 'Stateful',
        definition: state.workflow.originalDefinition,
        connectionReferences: state.connections.connectionReferences,
        parameters: Object.fromEntries(
          Object.values(state.workflowParameters.definitions).map(({ name, type, value }) => [name, { type, value }])
        ),
      }));
    vi.mocked(initializeOperationMetadata)
      .mockReset()
      .mockImplementation(async (workflow, _connections, _parameters, _options, _kind, dispatch) => {
        initializeMetadata(workflow, dispatch);
      });
    vi.mocked(initializeDynamicDataInNodes)
      .mockReset()
      .mockImplementation(async (_getState, dispatch) => {
        dispatch(updateDynamicDataLoadStatus(true));
      });
    vi.mocked(getConnectionsApiAndMapping).mockReset().mockResolvedValue(undefined);
    live = createLiveStore();
    release = vi.fn();
    stages = vi.fn();
    request = {
      operationId: 'extraction-1',
      sourceFingerprint: workflowExtractionFingerprint(original),
      plan: { childName: 'child', selectedIds: ['A', 'B'], invocationId: 'Invoke_child', child, source, inputs: [], outputs: [] },
    };
    service = {
      hostingPlan: 'standard',
      persistenceDescription: 'Creates the child and saves the parent.',
      sourceId: 'parent',
      sourceName: 'parent',
      createInvocation: vi.fn(),
      validateName: vi.fn(),
      prepare: vi.fn(() => release),
      commit: vi.fn().mockResolvedValue(completed),
    };
  });

  it.each(['readOnly', 'isMonitoringView'] as const)('refuses %s without locking or host work', async (option) => {
    const state = live.getState();
    live = createDesignerStore({ ...state, designerOptions: { ...state.designerOptions, [option]: true } });
    const before = live.getState();

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('not available');

    expect(live.getState()).toBe(before);
    expect(serializeWorkflow).not.toHaveBeenCalled();
    expect(service.prepare).not.toHaveBeenCalled();
    expect(service.commit).not.toHaveBeenCalled();
  });

  it('refuses an uninitialized workflow before any side effects', async () => {
    live.dispatch(updateDynamicDataLoadStatus(false));
    const before = live.getState();

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('finish loading');

    expect(live.getState()).toBe(before);
    expect(service.commit).not.toHaveBeenCalled();
    expect(service.prepare).not.toHaveBeenCalled();
  });

  it('does not release a lock held by another extraction', async () => {
    live.dispatch(setWorkflowExtractionBusy(true));
    const before = live.getState();

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('not available');

    expect(live.getState()).toBe(before);
    expect(live.getState().designerView.workflowExtractionBusy).toBe(true);
    expect(serializeWorkflow).not.toHaveBeenCalled();
    expect(service.commit).not.toHaveBeenCalled();
  });

  it('rejects stale previews, preserves edits, and clears its own lock', async () => {
    request.sourceFingerprint = workflowExtractionFingerprint({ ...original, kind: 'Stateless' });
    const before = live.getState();

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('workflow changed');

    expectAuthoringUnchanged(live.getState(), before);
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
    expect(service.prepare).not.toHaveBeenCalled();
    expect(service.commit).not.toHaveBeenCalled();
  });

  it('awaits all preparation in isolated stores without resetting the live graph or selection', async () => {
    const dynamic = deferred<void>();
    const dynamicStarted = deferred<RootState>();
    const before = live.getState();
    vi.mocked(initializeDynamicDataInNodes).mockImplementationOnce(async (getState, dispatch) => {
      dynamicStarted.resolve(getState());
      await dynamic.promise;
      dispatch(updateDynamicDataLoadStatus(true));
    });

    const pending = commitWorkflowExtraction(live, service, request, stages);
    const isolated = await dynamicStarted.promise;

    expect(isolated).not.toBe(live.getState());
    expect(isolated.workflow.originalDefinition).toEqual(child.definition);
    expect(isolated.designerView.workflowExtractionBusy).not.toBe(true);
    expect(live.getState().designerView.workflowExtractionBusy).toBe(true);
    expectAuthoringUnchanged(live.getState(), before);
    expect(service.commit).not.toHaveBeenCalled();
    expect(initializeOperationMetadata).toHaveBeenCalledTimes(1);
    dynamic.resolve();
    await pending;
    expect(initializeOperationMetadata).toHaveBeenCalledTimes(2);
    expect(initializeDynamicDataInNodes).toHaveBeenCalledTimes(2);
    expect(getConnectionsApiAndMapping).toHaveBeenCalledTimes(2);
  });

  it('prepares a fully independent candidate including parameters, metadata, and originalDefinition', async () => {
    const before = live.getState();
    const candidate = await prepareExtractedWorkflow(before, source);

    expectAuthoringUnchanged(live.getState(), before);
    expect(candidate.workflow.originalDefinition).toEqual(source.definition);
    expect(Object.keys(candidate.workflow.operations)).toEqual(expect.arrayContaining(['Invoke_child', 'Following']));
    expect(candidate.workflow.operations.A).toBeUndefined();
    expect(candidate.operations.operationInfo.Invoke_child).toMatchObject({ type: 'Workflow' });
    expect(candidate.operations.operationInfo.A).toBeUndefined();
    expect(candidate.operations.loadStatus.nodesAndDynamicDataInitialized).toBe(true);
    expect(Object.values(candidate.workflowParameters.definitions)).toEqual([
      expect.objectContaining({ name: 'greeting', type: 'String', value: 'hello' }),
    ]);
    expect(serializeWorkflow).toHaveBeenCalledWith(candidate);
    expect(service.commit).not.toHaveBeenCalled();
  });

  it('prepares nested generic actions with their connection references and operation settings', async () => {
    const workflow: Workflow = {
      ...structuredClone(child),
      connectionReferences: {
        demo: {
          api: { id: '/apis/demo' },
          connection: { id: '/connections/demo' },
          authentication: { type: 'ManagedServiceIdentity' },
        },
      },
      definition: {
        ...structuredClone(child.definition),
        actions: {
          Processing: {
            type: 'Scope',
            actions: {
              Filter: { type: 'Query', inputs: { from: [1, 2], where: '@greater(item(), 1)' }, runAfter: {} },
              Call_connector: {
                type: 'ApiConnection',
                inputs: {
                  host: { connection: { referenceName: 'demo' } },
                  path: '/items',
                  method: 'post',
                  body: "@body('Filter')",
                  retryPolicy: { type: 'fixed', count: 2, interval: 'PT5S' },
                },
                runAfter: { Filter: ['Succeeded'] },
              },
            },
            runAfter: {},
          },
          Response: {
            type: 'Response',
            kind: 'Http',
            inputs: { statusCode: 200, body: {} },
            runAfter: { Processing: ['Succeeded'] },
          },
        },
      },
    };
    const before = live.getState();
    const candidate = await prepareExtractedWorkflow(before, workflow);

    expectAuthoringUnchanged(live.getState(), before);
    expect(candidate.workflow.originalDefinition).toEqual(workflow.definition);
    expect(candidate.connections.connectionReferences).toEqual(workflow.connectionReferences);
    expect(candidate.operations.operationInfo.Processing).toMatchObject({ type: 'Scope' });
    expect(candidate.operations.operationInfo.Filter).toMatchObject({ type: 'Query' });
    expect(candidate.operations.operationInfo.Call_connector).toMatchObject({ type: 'ApiConnection' });
    expect(candidate.workflow.operations.Call_connector.inputs).toMatchObject({
      host: { connection: { referenceName: 'demo' } },
      retryPolicy: { type: 'fixed', count: 2, interval: 'PT5S' },
    });
    expect(initializeOperationMetadata).toHaveBeenCalledWith(
      expect.any(Object),
      workflow.connectionReferences,
      workflow.parameters,
      {},
      'stateful',
      expect.any(Function)
    );
    expect(service.commit).not.toHaveBeenCalled();
  });

  it('keeps live authoring state untouched until host success, then swaps all slices atomically with one undo entry', async () => {
    const host = deferred<WorkflowExtractionResult>();
    const hostStarted = deferred<void>();
    const before = live.getState();
    vi.mocked(service.commit).mockImplementation(async () => {
      hostStarted.resolve();
      return host.promise;
    });
    const observed: RootState[] = [];
    const unsubscribe = live.subscribe(() => observed.push(live.getState()));

    const pending = commitWorkflowExtraction(live, service, request, stages);
    await hostStarted.promise;
    expectAuthoringUnchanged(live.getState(), before);
    // Late metadata, reset, undo and user edits from the old graph must be dropped.
    live.dispatch(initializeNotes({}));
    live.dispatch(resetWorkflowState());
    live.dispatch(setNodeSelection(['Following']));
    live.dispatch(setIsWorkflowDirty(false));
    await live.dispatch(onUndoClick());
    expectAuthoringUnchanged(live.getState(), before);
    expect(release).not.toHaveBeenCalled();
    host.resolve(completed);
    await expect(pending).resolves.toEqual(completed);
    unsubscribe();

    const after = live.getState();
    expect(after.workflow.originalDefinition).toEqual(source.definition);
    expect(after.workflow.operations.A).toBeUndefined();
    expect(after.operations.operationInfo.A).toBeUndefined();
    expect(after.operations.operationInfo.Invoke_child).toMatchObject({ type: 'Workflow' });
    expect(after.panel.operationContent.selectedNodeIds).toEqual(['Invoke_child']);
    expect(after.workflow.isDirty).toBe(false);
    expect(after.undoRedo.past).toHaveLength(before.undoRedo.past.length + 1);
    expect(after.undoRedo.future).toEqual([]);
    const snapshot = getRootStateFromCompressedSlices(after.undoRedo.past.at(-1)!.compressedSlices, after);
    expect(snapshot.workflow.originalDefinition).toEqual(original.definition);
    expect(snapshot.workflow.operations).toEqual(before.workflow.operations);
    expect(snapshot.panel).toEqual(before.panel);
    for (const state of observed) {
      // No subscriber may observe a source graph paired with the old metadata.
      expect(!!state.workflow.operations.Invoke_child).toBe(!!state.operations.operationInfo.Invoke_child);
    }
    expect(stages.mock.calls.map(([stage]) => stage)).toEqual(['preparing', 'saving', 'refreshing']);
    expect(service.commit).toHaveBeenCalledExactlyOnceWith(request);
    expect(release).toHaveBeenCalledOnce();
    expect(after.designerView.workflowExtractionBusy).toBe(false);
  });

  it('notifies the host only after durable commit and the complete live parent replacement', async () => {
    const order: string[] = [];
    vi.mocked(service.commit).mockImplementation(async () => {
      order.push('commit');
      expect(live.getState().workflow.originalDefinition).toEqual(original.definition);
      return completed;
    });
    service.onApplied = vi.fn((workflow) => {
      order.push('applied');
      expect(workflow).toBe(request.plan.source);
      expect(live.getState().workflow.originalDefinition).toEqual(source.definition);
      expect(live.getState().operations.operationInfo.Invoke_child).toBeDefined();
      expect(live.getState().panel.operationContent.selectedNodeIds).toEqual(['Invoke_child']);
      expect(live.getState().workflow.isDirty).toBe(false);
      expect(live.getState().designerView.workflowExtractionBusy).toBe(true);
    });
    release.mockImplementation(() => order.push('release'));

    await expect(commitWorkflowExtraction(live, service, request, stages)).resolves.toEqual(completed);

    expect(order).toEqual(['commit', 'applied', 'release']);
    expect(service.onApplied).toHaveBeenCalledOnce();
  });

  it('returns a terminal source-saved result if refresh fails before the live swap', async () => {
    const before = live.getState();
    service.onApplied = vi.fn();
    stages.mockImplementation((stage) => {
      if (stage === 'refreshing') {
        throw new Error('Refresh unavailable');
      }
    });

    const result = await commitWorkflowExtraction(live, service, request, stages);

    expect(result).toMatchObject({
      status: 'source-saved',
      child: completed.child,
      message: expect.stringContaining('Refresh unavailable'),
    });
    expectAuthoringUnchanged(live.getState(), before);
    expect(service.commit).toHaveBeenCalledOnce();
    expect(service.onApplied).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledOnce();
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
  });

  it('preserves the applied parent and its single history entry if host onApplied throws', async () => {
    const historySize = live.getState().undoRedo.past.length;
    service.onApplied = vi.fn(() => {
      throw new Error('Host refresh failed');
    });

    const result = await commitWorkflowExtraction(live, service, request, stages);

    expect(result).toMatchObject({
      status: 'source-saved',
      child: completed.child,
      message: expect.stringContaining('Host refresh failed'),
    });
    expect(live.getState().workflow.originalDefinition).toEqual(source.definition);
    expect(live.getState().workflow.isDirty).toBe(false);
    expect(live.getState().undoRedo.past).toHaveLength(historySize + 1);
    expect(live.getState().panel.operationContent.selectedNodeIds).toEqual(['Invoke_child']);
    expect(service.commit).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
  });

  it('undoes and redoes extraction with each originalDefinition, without another host commit', async () => {
    const before = live.getState();
    await commitWorkflowExtraction(live, service, request, stages);

    await live.dispatch(onUndoClick()).unwrap();
    expect(live.getState().workflow.originalDefinition).toEqual(original.definition);
    expect(live.getState().workflow.operations).toEqual(before.workflow.operations);
    expect(live.getState().operations.operationInfo).toEqual(before.operations.operationInfo);
    expect(live.getState().panel.operationContent.selectedNodeIds).toEqual(['A', 'B']);

    await live.dispatch(onRedoClick()).unwrap();
    expect(live.getState().workflow.originalDefinition).toEqual(source.definition);
    expect(live.getState().workflow.operations.Invoke_child).toBeDefined();
    expect(live.getState().operations.operationInfo.Invoke_child).toBeDefined();
    expect(service.commit).toHaveBeenCalledOnce();
  });

  it('marks the restored parent dirty when undoing an extraction of a previously saved workflow', async () => {
    live.dispatch(setIsWorkflowDirty(false));
    await commitWorkflowExtraction(live, service, request, stages);
    expect(live.getState().workflow.isDirty).toBe(false);

    await live.dispatch(onUndoClick()).unwrap();

    expect(live.getState().workflow.originalDefinition).toEqual(original.definition);
    expect(live.getState().workflow.isDirty).toBe(true);
    expect(service.commit).toHaveBeenCalledOnce();
  });

  it('respects a host that disables undo history while still replacing the source', async () => {
    const state = live.getState();
    live = createDesignerStore({
      ...state,
      designerOptions: { ...state.designerOptions, hostOptions: { ...state.designerOptions.hostOptions, maxStateHistorySize: 0 } },
    });

    await commitWorkflowExtraction(live, service, request, stages);

    expect(live.getState().workflow.originalDefinition).toEqual(source.definition);
    expect(live.getState().undoRedo.past).toEqual([]);
    expect(live.getState().undoRedo.future).toEqual([]);
  });

  it('rejects duplicate creates immediately while serialization is still pending', async () => {
    const serialized = deferred<Workflow>();
    vi.mocked(serializeWorkflow).mockImplementationOnce(() => serialized.promise);
    const first = commitWorkflowExtraction(live, service, request, stages);

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('not available');
    expect(service.commit).not.toHaveBeenCalled();
    serialized.resolve(original);
    await first;
    expect(service.commit).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it.each(['throw', 'child-created'] as const)('leaves source untouched on host %s and always releases', async (failure) => {
    const before = live.getState();
    service.onApplied = vi.fn();
    const partial: WorkflowExtractionResult = {
      status: 'child-created',
      child: completed.child,
      message: 'Source save failed; child exists.',
    };
    if (failure === 'throw') {
      vi.mocked(service.commit).mockRejectedValue(new Error('Source write failed'));
      await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('Source write failed');
    } else {
      vi.mocked(service.commit).mockResolvedValue(partial);
      await expect(commitWorkflowExtraction(live, service, request, stages)).resolves.toEqual(partial);
    }

    expectAuthoringUnchanged(live.getState(), before);
    expect(release).toHaveBeenCalledOnce();
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
    expect(stages).not.toHaveBeenCalledWith('refreshing');
    expect(service.onApplied).not.toHaveBeenCalled();
  });

  it.each(['child', 'source'] as const)('never invokes the host if %s preparation rejects', async (target) => {
    const before = live.getState();
    vi.mocked(initializeOperationMetadata).mockImplementation(async (workflow, _connections, _parameters, _options, _kind, dispatch) => {
      if (target === 'child' || workflow.actionData.Invoke_child) {
        throw new Error('Manifest unavailable');
      }
      initializeMetadata(workflow, dispatch);
    });

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('Manifest unavailable');

    expectAuthoringUnchanged(live.getState(), before);
    expect(service.commit).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledOnce();
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
  });

  it.each([
    'metadata',
    'critical',
    'connection',
    'recorded-dynamic-input',
    'recorded-dynamic-output',
    'dynamic-input',
    'dynamic-output',
  ] as const)('fails closed when preparation leaves %s unresolved', async (failure) => {
    const before = live.getState();
    vi.mocked(initializeDynamicDataInNodes).mockImplementationOnce(async (_getState, dispatch) => {
      if (failure === 'metadata') {
        dispatch(deinitializeOperationInfo({ id: 'A' }));
      } else if (
        failure === 'critical' ||
        failure === 'connection' ||
        failure === 'recorded-dynamic-input' ||
        failure === 'recorded-dynamic-output'
      ) {
        const levels = {
          critical: ErrorLevel.Critical,
          connection: ErrorLevel.Connection,
          'recorded-dynamic-input': ErrorLevel.DynamicInputs,
          'recorded-dynamic-output': ErrorLevel.DynamicOutputs,
        };
        const level = levels[failure];
        dispatch(updateErrorDetails({ id: 'A', errorInfo: { level, message: 'Cannot prepare A' } }));
      } else if (failure === 'dynamic-input') {
        dispatch(updateNodeDynamicInputLoadStatus({ nodeId: 'A', status: DynamicLoadStatus.FAILED }));
      } else {
        dispatch(updateOutputs({ id: 'A', nodeOutputs: { outputs: {}, dynamicLoadStatus: DynamicLoadStatus.FAILED } }));
      }
    });

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('operation A');

    expectAuthoringUnchanged(live.getState(), before);
    expect(service.commit).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledOnce();
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
  });

  it('unlocks if initial serialization fails before a prepare lease exists', async () => {
    const before = live.getState();
    vi.mocked(serializeWorkflow).mockRejectedValueOnce(new Error('Invalid source'));

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('Invalid source');

    expectAuthoringUnchanged(live.getState(), before);
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
    expect(service.prepare).not.toHaveBeenCalled();
    expect(service.commit).not.toHaveBeenCalled();
  });

  it('unlocks if the host prepare hook throws before returning a lease', async () => {
    const before = live.getState();
    vi.mocked(service.prepare!).mockImplementation(() => {
      throw new Error('Cannot reserve child');
    });

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow('Cannot reserve child');

    expectAuthoringUnchanged(live.getState(), before);
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
    expect(service.commit).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it.each(['completed', 'child-created', 'source-saved'] as const)(
    'preserves durable %s results if lease cleanup throws',
    async (status) => {
      const before = live.getState();
      const durable: WorkflowExtractionResult =
        status === 'completed' ? completed : { status, child: completed.child, message: 'Original persistence status.' };
      vi.mocked(service.commit).mockResolvedValue(durable);
      release.mockImplementation(() => {
        throw new Error('Release failed');
      });

      const result = await commitWorkflowExtraction(live, service, request, stages);

      expect(result).toMatchObject({
        status: status === 'completed' ? 'source-saved' : status,
        child: completed.child,
        message: expect.stringContaining('Release failed'),
      });
      if (status === 'completed') {
        expect(live.getState().workflow.originalDefinition).toEqual(source.definition);
        expect(live.getState().undoRedo.past).toHaveLength(before.undoRedo.past.length + 1);
      } else {
        expectAuthoringUnchanged(live.getState(), before);
        expect(result).toMatchObject({ message: expect.stringContaining('Original persistence status.') });
      }
      expect(durable).not.toHaveProperty('message', expect.stringContaining('Release failed'));
      expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
      expect(release).toHaveBeenCalledOnce();
      expect(service.commit).toHaveBeenCalledOnce();
    }
  );

  it('preserves both failure details and unlocks when persistence and cleanup fail', async () => {
    const before = live.getState();
    vi.mocked(service.commit).mockRejectedValue(new Error('Source write failed'));
    release.mockImplementation(() => {
      throw new Error('Release failed');
    });

    await expect(commitWorkflowExtraction(live, service, request, stages)).rejects.toThrow(/Source write failed.*Release failed/);

    expectAuthoringUnchanged(live.getState(), before);
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it('supports hosts without a prepare hook', async () => {
    service.prepare = undefined;

    await expect(commitWorkflowExtraction(live, service, request, stages)).resolves.toEqual(completed);

    expect(service.commit).toHaveBeenCalledOnce();
    expect(live.getState().designerView.workflowExtractionBusy).toBe(false);
  });

  it('resolves renamed selected IDs without mutating the stored selection', () => {
    const state = live.getState();
    const renamed = { ...state, workflow: { ...state.workflow, idReplacements: { A: 'Renamed_A' } } };

    expect(getExtractionSelectedIds(renamed)).toEqual(['Renamed_A', 'B']);
    expect(renamed.panel.operationContent.selectedNodeIds).toEqual(['A', 'B']);
  });

  it('moves selected containers once, excluding their selected descendants before resolving renames', () => {
    const state = live.getState();
    const selection = ['Container', 'Nested_action', 'Nested_loop', 'Loop_action', 'B'];
    const snapshot: RootState = {
      ...state,
      panel: { ...state.panel, operationContent: { ...state.panel.operationContent, selectedNodeIds: selection } },
      workflow: {
        ...state.workflow,
        nodesMetadata: {
          ...state.workflow.nodesMetadata,
          Container: { graphId: 'root' },
          Nested_action: { graphId: 'Container' },
          Nested_loop: { graphId: 'Container' },
          Loop_action: { graphId: 'Nested_loop' },
        },
        idReplacements: { Container: 'Renamed_container', Nested_action: 'Renamed_nested' },
      },
    };

    expect(getExtractionSelectedIds(snapshot)).toEqual(['Renamed_container', 'B']);
    expect(snapshot.panel.operationContent.selectedNodeIds).toEqual(selection);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import { initializeGraphState } from '../../../parsers/ParseReduxAction';
import { DynamicLoadStatus, initializeNodeOperationInputsData } from '../../../state/operation/operationMetadataSlice';
import { initWorkflowSpec, replaceId, setWorkflowKind } from '../../../state/workflow/workflowSlice';
import { resetWorkflowState } from '../../../state/global';
import { createDesignerStore, designerReducer } from '../../../store';
import type { Workflow } from '../../../../common/models/workflow';
import type { Operations } from '../../../state/workflow/workflowInterfaces';
import { duplicateOperations, pasteScopeOperation } from '../copypaste';
import { commitWorkflowExtraction } from '../workflowExtraction';
import { deleteOperation } from '../delete';
import * as operationDeserializer from '../operationdeserializer';
import { serializeOperation } from '../serializer';
import { onUndoClick, storeStateToUndoRedoHistory } from '../undoRedo';
import { RUN_AFTER_STATUS, type LogicAppsV2 } from '@microsoft/logic-apps-shared';

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  OperationManifestService: () => ({
    isSupported: () => true,
    getOperationManifest: async (_connector: string, operation: string) => ({
      properties: {
        inputs: {},
        outputs: {},
        ...(operation === 'scope' && { allowChildOperations: true, childOperationsLocation: ['actions'] }),
      },
    }),
  }),
}));

const definition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '1.0.0.0',
  triggers: { manual: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
  actions: {
    Condition: {
      type: 'If',
      expression: '@equals(1,1)',
      actions: {
        Before: { type: 'Compose', inputs: 'before', runAfter: {} },
        GuardScope: {
          type: 'Scope',
          runAfter: { Before: [RUN_AFTER_STATUS.SUCCEEDED] },
          actions: {
            Fallback: { type: 'Compose', inputs: 'fallback', runAfter: {} },
            Escalate: {
              type: 'Compose',
              inputs: 'escalate',
              runAfter: { Fallback: [RUN_AFTER_STATUS.FAILED, RUN_AFTER_STATUS.TIMEDOUT] },
            },
          },
        },
        After: { type: 'Compose', inputs: 'after', runAfter: { GuardScope: [RUN_AFTER_STATUS.FAILED, RUN_AFTER_STATUS.TIMEDOUT] } },
      },
      else: { actions: { OtherBranch: { type: 'Compose', inputs: 'outside', runAfter: {} } } },
    },
  },
  outputs: {},
};

const initializeOperations = (operations: Operations) =>
  initializeNodeOperationInputsData(
    Object.entries(operations).map(([id, action]) => ({
      id,
      operationInfo: { type: action.type, operationId: action.type, connectorId: 'connectionless' },
      nodeInputs: { parameterGroups: {}, dynamicLoadStatus: DynamicLoadStatus.SUCCEEDED },
      nodeOutputs: { outputs: {}, dynamicLoadStatus: DynamicLoadStatus.SUCCEEDED },
      nodeDependencies: { inputs: {}, outputs: {} },
    }))
  );

const initializeStore = (shared: boolean) => {
  const state = designerReducer(undefined, { type: '@@init' });
  const store = createDesignerStore({ ...state, designerOptions: { ...state.designerOptions, useSharedNodeUi: shared } });
  const workflow: Workflow = { kind: 'Stateful', definition, connectionReferences: {}, parameters: {} };
  const deserializedWorkflow = Deserialize(definition, null, true, workflow.kind);

  store.dispatch(initWorkflowSpec('BJS'));
  store.dispatch(setWorkflowKind('stateful'));
  store.dispatch(
    initializeGraphState.fulfilled({ deserializedWorkflow, originalDefinition: definition }, 'probe-init', {
      workflowDefinition: workflow,
      runInstance: null,
    })
  );

  store.dispatch(initializeOperations(deserializedWorkflow.actionData));

  return store;
};

describe('Duplicate scope', () => {
  beforeEach(() => {
    vi.spyOn(operationDeserializer, 'initializeOperationMetadata').mockImplementation(
      async ({ actionData }, _references, _workflowParameters, _customCode, _workflowKind, dispatch) => {
        dispatch(initializeOperations(actionData));
      }
    );
    vi.spyOn(operationDeserializer, 'initializeDynamicDataInNodes').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves scoped serialization statuses, rewires follower runAfter statuses, and supports single-step undo', async () => {
    const store = initializeStore(true);
    const historyBefore = store.getState().undoRedo.past.length;
    const { graph, operations, nodesMetadata } = store.getState().workflow;
    const serializedSource = (await serializeOperation(store.getState(), 'GuardScope')) as LogicAppsV2.ScopeAction;
    expect(serializedSource.actions?.Escalate.runAfter).toEqual({ Fallback: [RUN_AFTER_STATUS.FAILED, RUN_AFTER_STATUS.TIMEDOUT] });

    await store.dispatch(duplicateOperations({ nodeIds: ['GuardScope'] })).unwrap();

    const afterDuplicate = store.getState().workflow.operations as Record<string, LogicAppsV2.ActionDefinition>;
    const duplicatedScopeId = Object.keys(afterDuplicate).find((id) => {
      const operation = afterDuplicate[id] as LogicAppsV2.ScopeAction | undefined;
      return id !== 'GuardScope' && operation?.type === 'Scope' && Object.keys(operation.runAfter ?? {}).includes('GuardScope');
    });

    expect(duplicatedScopeId).toBeDefined();
    const duplicateId = duplicatedScopeId as string;
    expect(store.getState().undoRedo.past.length).toBe(historyBefore + 1);
    expect(store.getState().workflow.nodesMetadata[duplicateId].graphId).toBe(nodesMetadata.GuardScope.graphId);
    expect(afterDuplicate.OtherBranch).toEqual(operations.OtherBranch);
    expect((afterDuplicate[duplicateId] as LogicAppsV2.ScopeAction).runAfter).toEqual({ GuardScope: [RUN_AFTER_STATUS.SUCCEEDED] });
    expect(afterDuplicate.After.runAfter).toEqual({ [duplicateId]: [RUN_AFTER_STATUS.FAILED, RUN_AFTER_STATUS.TIMEDOUT] });

    const serializedDuplicate = (await serializeOperation(store.getState(), duplicateId)) as LogicAppsV2.ScopeAction;
    const nestedIds = Object.keys(serializedDuplicate.actions ?? {});
    const fallbackId = nestedIds.find((id) => id.startsWith('Fallback_'))!;
    const escalateId = nestedIds.find((id) => id.startsWith('Escalate_'))!;
    expect(fallbackId).toMatch(/^Fallback_/);
    expect(escalateId).toMatch(/^Escalate_/);
    expect(serializedDuplicate.actions?.[escalateId].runAfter).toEqual({
      [fallbackId]: [RUN_AFTER_STATUS.FAILED, RUN_AFTER_STATUS.TIMEDOUT],
    });

    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(operations);
    expect(store.getState().workflow.graph).toEqual(graph);
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore);
  });

  it('blocks interleaved Undo while a multi-node Shared Duplicate is in flight and reverts all copies in one Undo', async () => {
    const store = initializeStore(true);
    const { graph, operations } = store.getState().workflow;
    const historyBefore = store.getState().undoRedo.past.length;

    let releaseScopeMetadata!: () => void;
    vi.spyOn(operationDeserializer, 'initializeOperationMetadata').mockImplementationOnce(
      async ({ actionData }, _references, _workflowParameters, _customCode, _workflowKind, dispatch) => {
        await new Promise<void>((resolve) => {
          releaseScopeMetadata = resolve;
        });
        dispatch(initializeOperations(actionData));
      }
    );

    const duplicatePromise = store.dispatch(duplicateOperations({ nodeIds: ['GuardScope', 'After'] })).unwrap();
    await vi.waitFor(() => expect(releaseScopeMetadata).toBeDefined());
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(1);

    // Attempting Undo mid-transaction must be ignored so the batch cannot split history.
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 1);

    releaseScopeMetadata();
    await duplicatePromise;
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 1);
    expect(Object.keys(store.getState().workflow.operations).length).toBeGreaterThan(Object.keys(operations).length + 1);

    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(operations);
    expect(store.getState().workflow.graph).toEqual(graph);
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore);
  });

  it('blocks unrelated undoable edits while scope initialization is paused so Undo never restores a half-duplicated graph', async () => {
    const store = initializeStore(true);
    const { graph, operations } = store.getState().workflow;
    const historyBefore = store.getState().undoRedo.past.length;

    let releaseScopeMetadata!: () => void;
    vi.spyOn(operationDeserializer, 'initializeOperationMetadata').mockImplementationOnce(
      async ({ actionData }, _references, _workflowParameters, _customCode, _workflowKind, dispatch) => {
        await new Promise<void>((resolve) => {
          releaseScopeMetadata = resolve;
        });
        dispatch(initializeOperations(actionData));
      }
    );

    const duplicatePromise = store.dispatch(duplicateOperations({ nodeIds: ['GuardScope', 'After'] })).unwrap();
    await vi.waitFor(() => expect(releaseScopeMetadata).toBeDefined());
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 1);

    // Intervening plain undoable edit and async mutation thunk must be blocked without recording a checkpoint.
    store.dispatch(replaceId({ originalId: 'OtherBranch', newId: 'RenamedBranch' }));
    await store.dispatch(storeStateToUndoRedoHistory({ type: 'unrelated/edit' } as any));
    await store.dispatch(deleteOperation({ nodeId: 'OtherBranch', isTrigger: false }));
    expect(store.getState().workflow.operations.OtherBranch).toEqual(operations.OtherBranch);
    expect(store.getState().workflow.operations.RenamedBranch).toBeUndefined();
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 1);

    releaseScopeMetadata();
    await duplicatePromise;
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 1);
    expect(store.getState().workflow.operations.OtherBranch).toEqual(operations.OtherBranch);
    expect(Object.keys(store.getState().workflow.operations).length).toBeGreaterThan(Object.keys(operations).length + 1);

    // Single Undo restores the exact pre-Duplicate graph and operations.
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(operations);
    expect(store.getState().workflow.graph).toEqual(graph);
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore);

    // Normal edits and undo checkpoints resume once the transaction has settled.
    store.dispatch(replaceId({ originalId: 'OtherBranch', newId: 'RenamedBranch' }));
    expect(store.getState().workflow.idReplacements.OtherBranch).toBe('RenamedBranch');
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 1);
  });

  it('does not push an undo checkpoint when Shared Duplicate finds no valid nodes', async () => {
    const store = initializeStore(true);
    const historyBefore = store.getState().undoRedo.past.length;
    await store.dispatch(duplicateOperations({ nodeIds: ['NonExistentNode'] })).unwrap();
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore);
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);
  });

  it('leaves Legacy Duplicate checkpoints unchanged', async () => {
    const store = initializeStore(false);
    const historyBefore = store.getState().undoRedo.past.length;
    await store.dispatch(duplicateOperations({ nodeIds: ['GuardScope'] })).unwrap();
    expect(store.getState().undoRedo.past).toHaveLength(historyBefore + 2);
  });

  it('refuses workflow extraction while a Shared Duplicate history transaction is in flight', async () => {
    const store = initializeStore(true);
    let releaseScopeMetadata!: () => void;
    const origInitMetadata = operationDeserializer.initializeOperationMetadata;
    vi.spyOn(operationDeserializer, 'initializeOperationMetadata').mockImplementationOnce(async (...args) => {
      await new Promise<void>((resolve) => {
        releaseScopeMetadata = resolve;
      });
      return origInitMetadata(...args);
    });

    const duplicatePromise = store.dispatch(duplicateOperations({ nodeIds: ['GuardScope'] })).unwrap();
    await vi.waitFor(() => expect(releaseScopeMetadata).toBeTypeOf('function'));
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(1);

    await expect(
      commitWorkflowExtraction(
        store,
        { createWorkflow: vi.fn(), getExistingWorkflowNames: vi.fn() } as any,
        { newWorkflowName: 'Extracted', selectedNodeIds: ['OtherBranch'], sourceFingerprint: 'fp' } as any,
        vi.fn()
      )
    ).rejects.toThrow('The designer is not available for extraction.');

    releaseScopeMetadata();
    await duplicatePromise;
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);
  });

  it.each(['resetWorkflowState', 'initWorkflowSpec'] as const)(
    'cancels an in-flight Shared Duplicate transaction on %s and drops its late writes',
    async (boundary) => {
      const store = initializeStore(true);
      let releaseScopeMetadata!: () => void;
      vi.spyOn(operationDeserializer, 'initializeOperationMetadata').mockImplementationOnce(async (_w, _c, _p, _m, _k, dispatch) => {
        await new Promise<void>((resolve) => {
          releaseScopeMetadata = resolve;
        });
        dispatch(replaceId({ originalId: 'OtherBranch', newId: 'StaleLateWrite' }));
        return {};
      });

      const duplicatePromise = store.dispatch(duplicateOperations({ nodeIds: ['GuardScope'] })).unwrap();
      await vi.waitFor(() => expect(releaseScopeMetadata).toBeTypeOf('function'));
      expect(store.getState().undoRedo.activeHistoryTransactions).toBe(1);

      if (boundary === 'resetWorkflowState') {
        store.dispatch(resetWorkflowState());
      } else {
        store.dispatch(initWorkflowSpec('BJS'));
      }
      expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);

      releaseScopeMetadata();
      await duplicatePromise;
      expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);
      expect(store.getState().workflow.idReplacements.OtherBranch).toBeUndefined();
    }
  );

  it('skips Shared Duplicate while a standalone pasteScopeOperation is awaiting metadata', async () => {
    const store = initializeStore(true);
    let releasePaste!: () => void;
    const origInitMetadata = operationDeserializer.initializeOperationMetadata;
    vi.spyOn(operationDeserializer, 'initializeOperationMetadata').mockImplementationOnce(async (...args) => {
      await new Promise<void>((resolve) => {
        releasePaste = resolve;
      });
      return origInitMetadata(...args);
    });

    const beforeCount = Object.keys(store.getState().workflow.operations).length;
    const pastePromise = store
      .dispatch(
        pasteScopeOperation({
          relationshipIds: { graphId: 'root', parentId: 'Condition', childId: undefined },
          nodeId: 'PastedScope',
          serializedValue: { type: 'Scope', actions: { InnerPaste: { type: 'Compose', inputs: 'pasted' } } },
          allConnectionData: {},
          staticResults: {},
          upstreamNodeIds: [],
        })
      )
      .unwrap();

    await vi.waitFor(() => expect(releasePaste).toBeTypeOf('function'));
    await store.dispatch(duplicateOperations({ nodeIds: ['OtherBranch'] })).unwrap();
    expect(store.getState().undoRedo.activeHistoryTransactions).toBe(0);

    releasePaste();
    await pastePromise;
    // Standalone scope paste added PastedScope + InnerPaste; skipped Shared Duplicate did not add OtherBranch_1.
    expect(Object.keys(store.getState().workflow.operations)).toHaveLength(beforeCount + 2);
    expect(store.getState().workflow.operations.OtherBranch_1).toBeUndefined();
  });
});

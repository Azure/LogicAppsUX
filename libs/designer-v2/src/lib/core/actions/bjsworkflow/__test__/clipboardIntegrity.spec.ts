import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  clone,
  InitOperationManifestService,
  InitWorkflowService,
  LOCAL_STORAGE_KEYS,
  type IOperationManifestService,
  type LogicAppsV2,
  type OperationManifest,
} from '@microsoft/logic-apps-shared';
import { composeManifest } from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/consumption/manifests/compose';
import {
  initializeManifest,
  setManifest,
} from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/variables';
import scopeManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/scope';
import conditionManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/condition';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import { createDesignerStore, store as singletonStore } from '../../../store';
import { initializeNodes } from '../../../state/operation/operationMetadataSlice';
import { setNodeConnectionMapping } from '../../../state/connection/connectionSlice';
import { updateTokens } from '../../../state/tokens/tokensSlice';
import { getNodeOperationData } from '../../../state/operation/operationSelector';
import { setNodeSelection } from '../../../state/panel/panelSlice';
import { replaceId, setNodeDescription } from '../../../state/workflow/workflowSlice';
import { UNDO_REDO_SLICE_NAMES } from '../../../state/undoRedo/undoRedoTypes';
import { copyOperation, copyOperations, cutOperations, pasteClipboard, pasteOperation } from '../copypaste';
import { initializeDynamicDataInNodes, initializeOperationMetadata } from '../operationdeserializer';
import { serializeOperation } from '../serializer';
import { onRedoClick, onUndoClick } from '../undoRedo';

const definition: LogicAppsV2.WorkflowDefinition = {
  triggers: {},
  actions: {
    Initialize_variables: {
      type: 'InitializeVariable',
      inputs: { variables: [{ name: 'counter', type: 'integer', value: 7 }] },
      runAfter: {},
    },
    Set_variable: { type: 'SetVariable', inputs: { name: 'counter', value: 11 }, runAfter: { Initialize_variables: ['Succeeded'] } },
    Compose: { type: 'Compose', inputs: { message: 'preserve me', nested: [1, true] }, runAfter: { Set_variable: ['Succeeded'] } },
  },
};
const nodeIds = ['Initialize_variables', 'Compose', 'Set_variable'];
const manifests: Record<string, OperationManifest> = {
  initializevariable: initializeManifest,
  setvariable: setManifest,
  compose: composeManifest,
  scope: scopeManifest,
  if: conditionManifest,
};
const manifestService: IOperationManifestService = {
  isSupported: () => true,
  isAliasingSupported: () => false,
  isBuiltInConnector: () => false,
  getBuiltInConnector: () => {
    throw new Error('Unexpected connector request');
  },
  getOperation: async () => ({}),
  getOperationInfo: async (operation: LogicAppsV2.OperationDefinition) => ({
    connectorId: operation.type === 'Compose' ? 'connectionProviders/dataOperationNew' : 'connectionProviders/variable',
    operationId: operation.type.toLowerCase(),
  }),
  getOperationManifest: async (_connector, operation) => manifests[operation],
};

const createSource = (workflowDefinition = definition) => {
  const state = clone(getMockedInitialRootState());
  const parsed = Deserialize(clone(workflowDefinition), null);
  state.workflow.graph = parsed.graph;
  state.workflow.operations = parsed.actionData;
  state.workflow.nodesMetadata = parsed.nodesMetadata;
  state.workflow.originalDefinition = clone(workflowDefinition);
  state.workflow.workflowKind = 'stateful';
  const store = createDesignerStore(state);
  const initialize = async () => {
    await initializeOperationMetadata(parsed, {}, {}, {}, 'stateful', store.dispatch);
    await initializeDynamicDataInNodes(store.getState, store.dispatch);
  };
  return { store, initialize };
};
const readClipboard = () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD) ?? '{}');
const prepareSource = async (workflowDefinition = definition) => {
  const source = createSource(workflowDefinition);
  await source.initialize();
  expect(source.store.getState().operations.errors).toEqual({});
  return source.store;
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('navigator', { clipboard: undefined });
  localStorage.clear();
  InitOperationManifestService(manifestService);
  InitWorkflowService({
    getCallbackUrl: async () => {
      throw new Error('Unexpected callback URL request in action-only workflow');
    },
  });
  getReactQueryClient().clear();
});

describe('clipboard integrity with real designer initialization and reducers', () => {
  it('reproduces the empty producer data while metadata loads, rejects copy, then copies and pastes all three configured actions', async () => {
    let release!: (manifest: OperationManifest) => void;
    const pendingCompose = new Promise<OperationManifest>((resolve) => {
      release = resolve;
    });
    vi.spyOn(manifestService, 'getOperationManifest').mockImplementation(async (_connector, operation) =>
      operation === 'compose' ? pendingCompose : manifests[operation]
    );
    const { store, initialize } = createSource();
    const loading = initialize();
    await waitFor(() => expect(store.getState().operations.operationInfo.Initialize_variables).toBeDefined());
    store.dispatch(setNodeSelection(nodeIds));
    const selected = store.getState().panel.operationContent.selectedNodeIds!;
    expect(selected.map((id) => JSON.parse(JSON.stringify(getNodeOperationData(store.getState().operations, id))))).toEqual([{}, {}, {}]);
    expect(store.getState().operations.operationInfo.Compose).toBeUndefined();
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, 'prior clipboard');
    await expect(store.dispatch(copyOperations({ nodeIds: selected })).unwrap()).rejects.toThrow('not ready to copy');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD)).toBe('prior clipboard');
    release(composeManifest);
    await loading;
    await store.dispatch(copyOperations({ nodeIds: selected })).unwrap();
    const clipboard = readClipboard();
    expect(clipboard.nodes).toHaveLength(3);
    expect(clipboard.nodes.every((node: { nodeData: unknown }) => Object.keys(node.nodeData!).length > 0)).toBe(true);
    const original = await serializeOperation(store.getState(), 'Compose');
    const history = store.getState().undoRedo.past.length;
    const pastedIds = await store
      .dispatch(
        pasteClipboard({
          clipboard,
          relationshipIds: { graphId: 'root', parentId: 'Compose' },
          upstreamNodeIds: nodeIds,
        })
      )
      .unwrap();
    expect(pastedIds).toEqual(['Initialize_variables-copy', 'Set_variable-copy', 'Compose-copy']);
    for (const id of pastedIds) {
      // This is the previously crashing host selector access, not a mocked getter.
      expect(store.getState().operations.inputParameters[id].parameterGroups).toBeDefined();
    }
    expect(await serializeOperation(store.getState(), 'Compose-copy')).toMatchObject({ inputs: original.inputs });
    expect(store.getState().workflow.operations['Set_variable-copy']).toMatchObject({
      runAfter: { 'Initialize_variables-copy': ['Succeeded'] },
    });
    expect(await serializeOperation(store.getState(), 'Initialize_variables-copy')).toMatchObject({
      inputs: definition.actions.Initialize_variables.inputs,
    });
    expect(await serializeOperation(store.getState(), 'Set_variable-copy')).toMatchObject({
      inputs: definition.actions.Set_variable.inputs,
    });
    expect(store.getState().undoRedo.past).toHaveLength(history + 1);
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations['Compose-copy']).toBeUndefined();
    await store.dispatch(onRedoClick()).unwrap();
    expect(store.getState().operations.inputParameters['Compose-copy'].parameterGroups).toBeDefined();
  });

  it('rejects the reported payload and a later invalid member before any graph, history, focus, or connection mutation', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperations({ nodeIds })).unwrap();
    const complete = readClipboard();
    for (const clipboard of [
      {
        mslaNode: true,
        isMultiNode: true,
        nodes: complete.nodes.map((node: object) => ({ ...node, nodeData: {} })),
        edges: complete.edges,
      },
      { ...complete, nodes: [...complete.nodes.slice(0, 2), { ...complete.nodes[2], nodeData: {} }] },
    ]) {
      const before = store.getState();
      await expect(
        store
          .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Compose' }, upstreamNodeIds: [] }))
          .unwrap()
      ).rejects.toThrow('complete action data');
      for (const name of UNDO_REDO_SLICE_NAMES) {
        expect(store.getState()[name]).toBe(before[name]);
      }
      expect(store.getState().undoRedo).toBe(before.undoRedo);
      expect(store.getState().designerView.clipboardError).toContain('complete action data');
    }
  });

  it('normalizes tagged, renamed, case-varied and duplicate source identities without dropping inputs', async () => {
    const store = await prepareSource();
    store.dispatch(replaceId({ originalId: 'Compose', newId: 'Renamed Compose' }));
    await store.dispatch(copyOperations({ nodeIds: ['Renamed_Compose', 'compose-#scope', 'Compose'] })).unwrap();
    expect(readClipboard().nodes).toHaveLength(1);
    expect(readClipboard().nodes[0]).toMatchObject({
      nodeId: 'Compose-copy',
      nodeData: { nodeInputs: { parameterGroups: expect.any(Object) } },
    });
    await store.dispatch(copyOperation({ nodeId: 'compose' })).unwrap();
    expect(readClipboard().nodeData.nodeInputs).toEqual(store.getState().operations.inputParameters.Compose);
  });

  it('does not cut originals when source data is unavailable or native clipboard writing rejects', async () => {
    const unloaded = createSource().store;
    const original = unloaded.getState();
    await expect(unloaded.dispatch(cutOperations({ nodeIds })).unwrap()).rejects.toThrow('not ready to copy');
    expect(unloaded.getState().workflow).toBe(original.workflow);
    expect(unloaded.getState().undoRedo).toBe(original.undoRedo);
    const loaded = await prepareSource();
    const before = loaded.getState();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')), readText: vi.fn() } });
    await expect(loaded.dispatch(cutOperations({ nodeIds })).unwrap()).rejects.toThrow('No actions were cut');
    expect(loaded.getState().workflow).toBe(before.workflow);
    expect(loaded.getState().undoRedo).toBe(before.undoRedo);
  });

  it('cuts a complete selection only after writing the clipboard and restores it with one undo', async () => {
    const store = await prepareSource();
    const before = store.getState();
    await store.dispatch(cutOperations({ nodeIds })).unwrap();
    expect(readClipboard().nodes).toHaveLength(3);
    expect(store.getState().workflow.operations.Compose).toBeUndefined();
    expect(store.getState().workflow.operations.Initialize_variables).toBeUndefined();
    expect(store.getState().workflow.operations.Set_variable).toBeUndefined();
    expect(store.getState().undoRedo.past).toHaveLength(before.undoRedo.past.length + 1);
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
    expect(await serializeOperation(store.getState(), 'Set_variable')).toMatchObject({ inputs: definition.actions.Set_variable.inputs });
  });

  it('validates direct single-action paste before mutation and tolerates omitted legacy output tokens', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperation({ nodeId: 'Compose' })).unwrap();
    const entry = readClipboard();
    const payload = {
      nodeId: entry.nodeId,
      nodeData: entry.nodeData,
      operationInfo: entry.nodeOperationInfo,
      relationshipIds: { graphId: 'root', parentId: 'Compose' },
    };
    const before = store.getState();
    await expect(store.dispatch(pasteOperation({ ...payload, nodeData: {} as typeof entry.nodeData })).unwrap()).rejects.toThrow(
      'complete action data'
    );
    expect(store.getState().workflow).toBe(before.workflow);
    expect(store.getState().undoRedo).toBe(before.undoRedo);
    await store.dispatch(pasteOperation(payload)).unwrap();
    expect(store.getState().operations.inputParameters['Compose-copy'].parameterGroups).toBeDefined();
  });

  it('rejects cyclic or dangling clipboard edges without dropping an action', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperations({ nodeIds })).unwrap();
    const clipboard = readClipboard();
    const before = store.getState();
    for (const edges of [
      [...clipboard.edges, { source: 'Compose-copy', target: 'Initialize_variables-copy' }],
      [{ source: 'missing', target: 'Compose-copy' }],
    ]) {
      await expect(
        store
          .dispatch(pasteClipboard({ clipboard: { ...clipboard, edges }, relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] }))
          .unwrap()
      ).rejects.toThrow('complete action data');
      expect(store.getState().workflow).toBe(before.workflow);
      expect(store.getState().undoRedo).toBe(before.undoRedo);
    }
  });

  it('rolls back every earlier staged action when a later action cannot initialize', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperations({ nodeIds })).unwrap();
    const clipboard = readClipboard();
    getReactQueryClient().clear();
    getReactQueryClient().setDefaultOptions({ queries: { retry: false } });
    vi.spyOn(manifestService, 'getOperationManifest').mockImplementation(async (_connector, operation) => {
      if (operation === 'compose') {
        throw new Error('The Compose manifest is unavailable');
      }
      return manifests[operation];
    });
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard,
            relationshipIds: { graphId: 'root', parentId: 'Compose' },
            upstreamNodeIds: nodeIds,
          })
        )
        .unwrap()
    ).rejects.toThrow('Compose manifest is unavailable');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
    expect(store.getState().designerView.clipboardError).toContain('Compose manifest is unavailable');
  });

  it('copies nested condition branches exactly once and remaps descendant tokens without rewriting quoted literals', async () => {
    const workflow: LogicAppsV2.WorkflowDefinition = {
      triggers: {},
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: {
            Condition: {
              type: 'If',
              expression: { equals: [1, 1] },
              runAfter: {},
              actions: { First: { type: 'Compose', inputs: 42, runAfter: {} } },
              else: { actions: { Other: { type: 'Compose', inputs: 'other branch', runAfter: {} } } },
            },
            Last: {
              type: 'Compose',
              runAfter: { Condition: ['Succeeded'] },
              inputs: "@concat(string(outputs('First')), 'First')",
            },
          },
        },
      },
    };
    const store = await prepareSource(workflow);
    await store.dispatch(copyOperations({ nodeIds: ['Container-#scope', 'Condition', 'First', 'Other', 'Last'] })).unwrap();
    const clipboard = readClipboard();
    expect(clipboard.nodes).toHaveLength(1);
    const before = store.getState();
    await store
      .dispatch(
        pasteClipboard({
          clipboard,
          relationshipIds: { graphId: 'root', parentId: 'Container' },
          upstreamNodeIds: [],
        })
      )
      .unwrap();
    const copied = await serializeOperation(store.getState(), 'Container-copy');
    expect(copied).toMatchObject({
      type: 'Scope',
      actions: {
        Condition_1: {
          type: 'If',
          actions: { First_1: { inputs: 42 } },
          else: { actions: { Other_1: { inputs: 'other branch' } } },
        },
        Last_1: { inputs: "@concat(string(outputs('First_1')), 'First')" },
      },
    });
    expect(Object.keys(store.getState().workflow.operations).filter((id) => !Object.hasOwn(before.workflow.operations, id))).toHaveLength(
      5
    );
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
    await store.dispatch(onRedoClick()).unwrap();
    expect(await serializeOperation(store.getState(), 'Container-copy')).toEqual(copied);
  });

  it('isolates async preparation and aborts rather than overwriting interleaved live edits to graph, metadata, tokens or connections', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperations({ nodeIds })).unwrap();
    const clipboard = readClipboard();
    getReactQueryClient().clear();
    let release!: (manifest: OperationManifest) => void;
    let preparingCompose = false;
    const deferred = new Promise<OperationManifest>((resolve) => {
      release = resolve;
    });
    vi.spyOn(manifestService, 'getOperationManifest').mockImplementation(async (_connector, operation) => {
      if (operation === 'compose') {
        preparingCompose = true;
        return deferred;
      }
      return manifests[operation];
    });
    const before = store.getState();
    const singletonBefore = singletonStore.getState();
    const paste = store.dispatch(
      pasteClipboard({
        clipboard,
        relationshipIds: { graphId: 'root', parentId: 'Compose' },
        upstreamNodeIds: nodeIds,
      })
    );
    await waitFor(() => expect(preparingCompose).toBe(true));
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
      expect(singletonStore.getState()[name]).toBe(singletonBefore[name]);
    }
    store.dispatch(setNodeDescription({ nodeId: 'Compose', description: 'new live graph edit' }));
    const editedData = getNodeOperationData(store.getState().operations, 'Compose');
    store.dispatch(
      initializeNodes({
        nodes: [
          {
            ...editedData,
            id: 'Compose',
            nodeInputs: editedData.nodeInputs!,
            nodeOutputs: editedData.nodeOutputs!,
            nodeDependencies: editedData.nodeDependencies!,
            operationMetadata: { iconUri: '', brandColor: '#123456' },
          },
        ],
      })
    );
    store.dispatch(updateTokens({ id: 'Compose', tokens: [] }));
    store.dispatch(setNodeConnectionMapping({ nodeId: 'Compose', mapping: 'new-live-connection' }));
    const newer = store.getState();
    release(composeManifest);
    await expect(paste.unwrap()).rejects.toThrow('workflow changed');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(newer[name]);
      expect(singletonStore.getState()[name]).toBe(singletonBefore[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
    expect(store.getState().workflow.operations['Compose-copy']).toBeUndefined();
  });
});

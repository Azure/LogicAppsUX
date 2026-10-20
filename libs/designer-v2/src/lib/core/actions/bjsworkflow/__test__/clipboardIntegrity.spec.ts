import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  clone,
  InitOperationManifestService,
  InitWorkflowService,
  LOCAL_STORAGE_KEYS,
  StaticResultService,
  SwaggerParser,
  type Connector,
  type IOperationManifestService,
  type LogicAppsV2,
  type OperationManifest,
  type OpenApiSchema,
} from '@microsoft/logic-apps-shared';
import { composeManifest } from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/consumption/manifests/compose';
import {
  initializeManifest,
  setManifest,
} from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/variables';
import scopeManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/scope';
import conditionManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/condition';
import switchManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/switch';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import * as connectionQueries from '../../../queries/connections';
import { createDesignerStore, store as singletonStore } from '../../../store';
import {
  DynamicLoadStatus,
  initializeNodes,
  updateNodeDynamicInputLoadStatus,
  updateOutputs,
} from '../../../state/operation/operationMetadataSlice';
import { setNodeConnectionMapping } from '../../../state/connection/connectionSlice';
import { updateTokens } from '../../../state/tokens/tokensSlice';
import { getNodeOperationData } from '../../../state/operation/operationSelector';
import { setNodeSelection } from '../../../state/panel/panelSlice';
import { replaceId, setNodeDescription } from '../../../state/workflow/workflowSlice';
import { UNDO_REDO_SLICE_NAMES } from '../../../state/undoRedo/undoRedoTypes';
import { updateParameterAndDependencies } from '../../../utils/parameters/helper';
import * as parameterHelpers from '../../../utils/parameters/helper';
import * as dynamicData from '../../../utils/parameters/dynamicdata';
import { retrieveClipboardData } from '../../../utils/clipboard';
import {
  copyOperation,
  copyOperations,
  copyScopeOperation,
  cutOperations,
  duplicateOperations,
  pasteClipboard,
  pasteOperation,
} from '../copypaste';
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
  switch: switchManifest,
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

  it.each(['constructor', 'toString'])('copies, duplicates and cuts a prototype-named action: %s', async (name) => {
    const store = await prepareSource({
      triggers: {},
      actions: { [name]: { type: 'Compose', inputs: 'configured action', runAfter: {} } },
    });
    await store.dispatch(copyOperation({ nodeId: name })).unwrap();
    expect(readClipboard().sourceNodeId).toBeUndefined();
    await store.dispatch(copyOperations({ nodeIds: [name.toUpperCase()] })).unwrap();
    expect(readClipboard().nodes).toHaveLength(1);
    await store.dispatch(duplicateOperations({ nodeIds: [name] })).unwrap();
    expect(await serializeOperation(store.getState(), `${name}-copy`)).toMatchObject({ inputs: 'configured action' });
    await store.dispatch(cutOperations({ nodeIds: [name.toUpperCase()] })).unwrap();
    expect(Object.hasOwn(store.getState().workflow.operations, name)).toBe(false);
    await store.dispatch(onUndoClick()).unwrap();
    expect(await serializeOperation(store.getState(), name)).toMatchObject({ inputs: 'configured action' });
  });

  it.each(['constructor', 'toString'])('copies, duplicates and cuts a prototype-named container: %s', async (name) => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        [name]: { type: 'Scope', actions: { Nested: { type: 'Compose', inputs: 'configured child', runAfter: {} } }, runAfter: {} },
      },
    });
    await store.dispatch(copyScopeOperation({ nodeId: name })).unwrap();
    expect(readClipboard().sourceNodeId).toBeUndefined();
    await store.dispatch(copyOperations({ nodeIds: [name.toUpperCase(), 'Nested'] })).unwrap();
    expect(readClipboard().nodes).toHaveLength(1);
    await store.dispatch(duplicateOperations({ nodeIds: [name] })).unwrap();
    expect(await serializeOperation(store.getState(), `${name}-copy`)).toMatchObject({
      actions: { Nested_1: { inputs: 'configured child' } },
    });
    await store.dispatch(cutOperations({ nodeIds: [name.toUpperCase()] })).unwrap();
    expect(Object.hasOwn(store.getState().workflow.operations, name)).toBe(false);
    await store.dispatch(onUndoClick()).unwrap();
    expect(await serializeOperation(store.getState(), name)).toMatchObject({ actions: { Nested: { inputs: 'configured child' } } });
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

  it('uses the readable local backend for a write-only native clipboard, including cut and paste', async () => {
    const store = await prepareSource();
    const nativeWrite = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: nativeWrite } });
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, JSON.stringify({ mslaNode: true, stale: true }));
    await store.dispatch(cutOperations({ nodeIds })).unwrap();
    expect(nativeWrite).not.toHaveBeenCalled();
    const clipboard = await retrieveClipboardData();
    expect(clipboard.nodes).toHaveLength(3);
    await store.dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] })).unwrap();
    expect(await serializeOperation(store.getState(), 'Compose-copy')).toMatchObject({ inputs: definition.actions.Compose.inputs });
  });

  it('rejects a missing native writer when paste uses the native reader, without cutting originals', async () => {
    const store = await prepareSource();
    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn().mockResolvedValue('') } });
    const before = store.getState();
    await expect(store.dispatch(cutOperations({ nodeIds })).unwrap()).rejects.toThrow('No actions were cut');
    expect(store.getState().workflow).toBe(before.workflow);
    expect(store.getState().undoRedo).toBe(before.undoRedo);
  });

  it('awaits copied-input dynamic initialization without dispatching into the live or singleton store', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperation({ nodeId: 'Set_variable' })).unwrap();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const initializeDynamic = parameterHelpers.updateDynamicDataInNode;
    const dynamic = vi.spyOn(parameterHelpers, 'updateDynamicDataInNode').mockImplementation(async (...args) => {
      await pending;
      await initializeDynamic(...args);
    });
    const before = store.getState();
    const singletonBefore = singletonStore.getState();
    let finished = false;
    const paste = store
      .dispatch(
        pasteClipboard({ clipboard: readClipboard(), relationshipIds: { graphId: 'root', parentId: 'Compose' }, upstreamNodeIds: nodeIds })
      )
      .unwrap()
      .then((ids) => {
        finished = true;
        return ids;
      });
    await waitFor(() => expect(dynamic).toHaveBeenCalled());
    expect(finished).toBe(false);
    const [id, , , , , , getDraftState] = dynamic.mock.calls[0];
    expect(getDraftState().operations.inputParameters[id]).toEqual(before.operations.inputParameters.Set_variable);
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
      expect(singletonStore.getState()[name]).toBe(singletonBefore[name]);
    }
    release();
    await paste;
    expect(store.getState().operations.inputParameters['Set_variable-copy'].dynamicLoadStatus).toBe(DynamicLoadStatus.SUCCEEDED);
    expect(await serializeOperation(store.getState(), 'Set_variable-copy')).toMatchObject({
      inputs: definition.actions.Set_variable.inputs,
    });
  });

  it('includes a deferred result schema in the final transaction rather than abandoning its draft update', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperation({ nodeId: 'Compose' })).unwrap();
    let release!: (schema: OpenApiSchema) => void;
    const pending = new Promise<OpenApiSchema>((resolve) => {
      release = resolve;
    });
    const schemaRequest = vi.spyOn(StaticResultService(), 'getOperationResultSchema').mockReturnValue(pending);
    const before = store.getState();
    let finished = false;
    const paste = store
      .dispatch(
        pasteClipboard({ clipboard: readClipboard(), relationshipIds: { graphId: 'root', parentId: 'Compose' }, upstreamNodeIds: nodeIds })
      )
      .unwrap()
      .then((ids) => {
        finished = true;
        return ids;
      });
    await waitFor(() => expect(schemaRequest).toHaveBeenCalled());
    expect(finished).toBe(false);
    expect(store.getState().workflow).toBe(before.workflow);
    expect(store.getState().staticResults).toBe(before.staticResults);
    const schema: OpenApiSchema = { type: 'object', properties: { completed: { type: 'boolean' } } };
    release(schema);
    await paste;
    expect(store.getState().staticResults.schemas['connectionProviders/dataOperationNew-compose']).toEqual(schema);
  });

  it('aborts failed dynamic rehydration without clearing copied configuration or committing partial state', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperation({ nodeId: 'Set_variable' })).unwrap();
    vi.spyOn(dynamicData, 'getDynamicSchema').mockRejectedValue(new Error('Dynamic schema unavailable'));
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: 'Compose' },
            upstreamNodeIds: nodeIds,
          })
        )
        .unwrap()
    ).rejects.toThrow('Dynamic schema unavailable');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
    expect(store.getState().designerView.clipboardError).toContain('Dynamic schema unavailable');
  });

  it('awaits a nested container result schema without mutating live or singleton state, then commits it with history', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: { Nested: { type: 'Compose', inputs: { preserved: 42 }, runAfter: {} } },
        },
      },
    });
    await store.dispatch(copyOperations({ nodeIds: ['Container', 'Nested'] })).unwrap();
    let release!: (schema: OpenApiSchema) => void;
    const pending = new Promise<OpenApiSchema>((resolve) => {
      release = resolve;
    });
    const schemaRequest = vi
      .spyOn(StaticResultService(), 'getOperationResultSchema')
      .mockImplementation(async (_connector, operation) => (operation === 'compose' ? pending : undefined));
    const before = store.getState();
    const singletonBefore = singletonStore.getState();
    let finished = false;
    const paste = store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: 'Container' },
          upstreamNodeIds: [],
        })
      )
      .unwrap()
      .then((ids) => {
        finished = true;
        return ids;
      });
    const schema: OpenApiSchema = { type: 'object', properties: { completed: { type: 'boolean' } } };
    try {
      await waitFor(() => expect(schemaRequest.mock.calls.some(([, operation]) => operation === 'compose')).toBe(true));
      expect(finished).toBe(false);
      for (const name of UNDO_REDO_SLICE_NAMES) {
        expect(store.getState()[name]).toBe(before[name]);
        expect(singletonStore.getState()[name]).toBe(singletonBefore[name]);
      }
      expect(store.getState().undoRedo).toBe(before.undoRedo);
    } finally {
      release(schema);
      await paste;
    }
    expect(store.getState().staticResults.schemas['connectionProviders/dataOperationNew-compose']).toEqual(schema);
    expect(await serializeOperation(store.getState(), 'Container-copy')).toMatchObject({
      actions: { Nested_1: { inputs: { preserved: 42 } } },
    });
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().staticResults.schemas['connectionProviders/dataOperationNew-compose']).toBeUndefined();
    await store.dispatch(onRedoClick()).unwrap();
    expect(store.getState().staticResults.schemas['connectionProviders/dataOperationNew-compose']).toEqual(schema);
  });

  it('awaits Swagger result schemas in transactional container metadata initialization', async () => {
    const connectorId = '/managedApis/test';
    const workflow: LogicAppsV2.WorkflowDefinition = {
      triggers: {},
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: {
            Nested: {
              type: 'ApiConnection',
              inputs: {
                host: { connection: { name: "@parameters('$connections')['test']['connectionId']" } },
                method: 'get',
                path: '/items',
              },
              runAfter: {},
            },
          },
        },
      },
    };
    const parsedSwagger = new SwaggerParser(
      await SwaggerParser.parse({
        swagger: '2.0',
        info: { title: 'Test', version: '1.0' },
        paths: {
          '/items': {
            get: {
              operationId: 'getItems',
              parameters: [],
              responses: { '200': { schema: { type: 'array', items: { type: 'string' } } } },
            },
          },
        },
      })
    );
    const connector: Connector = {
      id: connectorId,
      name: 'test',
      type: 'Microsoft.Web/locations/managedApis',
      properties: { displayName: 'Test', iconUri: '', brandColor: '#000000' },
    };
    vi.spyOn(connectionQueries, 'getConnectorWithSwagger').mockResolvedValue({ connector, parsedSwagger });
    vi.spyOn(connectionQueries, 'getSwaggerForConnector').mockResolvedValue(parsedSwagger);
    vi.spyOn(manifestService, 'isSupported').mockImplementation((type) => type !== 'ApiConnection');
    let release!: (schema: OpenApiSchema) => void;
    const pending = new Promise<OpenApiSchema>((resolve) => {
      release = resolve;
    });
    const schemaRequest = vi
      .spyOn(StaticResultService(), 'getOperationResultSchema')
      .mockImplementation(async (id) => (id === connectorId ? pending : undefined));
    const { store } = createSource(workflow);
    let finished = false;
    const preparation = initializeOperationMetadata(
      Deserialize(clone(workflow), null),
      { test: { api: { id: connectorId }, connection: { id: '/connections/test' } } },
      {},
      {},
      'stateful',
      store.dispatch,
      undefined,
      true
    ).then(() => {
      finished = true;
    });
    const schema: OpenApiSchema = { type: 'object', properties: { completed: { type: 'boolean' } } };
    try {
      await waitFor(() => expect(schemaRequest.mock.calls.some(([id]) => id === connectorId)).toBe(true));
      expect(finished).toBe(false);
      expect(store.getState().operations.inputParameters.Nested).toBeUndefined();
    } finally {
      release(schema);
      await preparation;
    }
    expect(store.getState().operations.errors).toEqual({});
    expect(store.getState().operations.inputParameters.Nested.parameterGroups).toBeDefined();
    expect(store.getState().staticResults.schemas[`${connectorId}-getItems`]).toEqual(schema);
  });

  it.each(['dynamic', 'result'])('aborts a nested %s schema failure without committing any container state', async (failure) => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Initialize_variables: definition.actions.Initialize_variables,
        Container: {
          type: 'Scope',
          runAfter: { Initialize_variables: ['Succeeded'] },
          actions: { Nested: { ...definition.actions.Set_variable, runAfter: {} } },
        },
      },
    });
    await store.dispatch(copyOperations({ nodeIds: ['Container', 'Nested'] })).unwrap();
    if (failure === 'dynamic') {
      vi.spyOn(dynamicData, 'getDynamicSchema').mockRejectedValue(new Error('Nested dynamic schema unavailable'));
    } else {
      vi.spyOn(StaticResultService(), 'getOperationResultSchema').mockImplementation(async (_connector, operation) => {
        if (operation === 'setvariable') {
          throw new Error('Nested result schema unavailable');
        }
        return undefined;
      });
    }
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: 'Container' },
            upstreamNodeIds: ['Initialize_variables', 'Container'],
          })
        )
        .unwrap()
    ).rejects.toThrow(`Nested ${failure} schema unavailable`);
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
    expect(store.getState().designerView.clipboardError).toContain(`Nested ${failure} schema unavailable`);
  });

  it('aborts a rejected result-schema request without installing any prepared state', async () => {
    const store = await prepareSource();
    await store.dispatch(copyOperation({ nodeId: 'Compose' })).unwrap();
    vi.spyOn(StaticResultService(), 'getOperationResultSchema').mockRejectedValue(new Error('Result schema unavailable'));
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: 'Compose' },
            upstreamNodeIds: nodeIds,
          })
        )
        .unwrap()
    ).rejects.toThrow('Result schema unavailable');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
  });

  it.each(['inputs', 'outputs'])('rejects a failed nested %s load status even without recorded error details', async (kind) => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: { Nested: { type: 'Compose', inputs: 42, runAfter: {} } },
        },
      },
    });
    await store.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
    const initializeDynamic = parameterHelpers.updateDynamicDataInNode;
    vi.spyOn(parameterHelpers, 'updateDynamicDataInNode').mockImplementation(async (...args) => {
      await initializeDynamic(...args);
      const [id, , , , , dispatch, getState] = args;
      if (id === 'Nested_1') {
        if (kind === 'inputs') {
          dispatch(updateNodeDynamicInputLoadStatus({ nodeId: id, status: DynamicLoadStatus.FAILED }));
        } else {
          dispatch(
            updateOutputs({
              id,
              nodeOutputs: { ...getState().operations.outputParameters[id], dynamicLoadStatus: DynamicLoadStatus.FAILED },
            })
          );
        }
      }
    });
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: 'Container' },
            upstreamNodeIds: [],
          })
        )
        .unwrap()
    ).rejects.toThrow('complete action data');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
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

  it.each([false, true])(
    'copies, duplicates and cuts named Switch cases without resolving virtual case names (nested: %s)',
    async (nested) => {
      const switchAction: LogicAppsV2.ActionDefinition = {
        type: 'Switch',
        expression: 'one',
        cases: { Named_case: { case: 'one', actions: { First: { type: 'Compose', inputs: 1, runAfter: {} } } } },
        default: { actions: { Other: { type: 'Compose', inputs: 2, runAfter: {} } } },
        runAfter: {},
      };
      const root = nested ? 'Container' : 'Switch';
      const actions = nested ? { Container: { type: 'Scope', actions: { Switch: switchAction }, runAfter: {} } } : { Switch: switchAction };
      const store = await prepareSource({ triggers: {}, actions });
      await store.dispatch(copyOperations({ nodeIds: [root, 'First', 'Other'] })).unwrap();
      expect(readClipboard().nodes).toHaveLength(1);
      const original = await serializeOperation(store.getState(), root);
      await store.dispatch(duplicateOperations({ nodeIds: [root] })).unwrap();
      const duplicate = await serializeOperation(store.getState(), `${root}-copy`);
      expect(JSON.stringify(duplicate)).toContain('"case":"one"');
      expect(JSON.stringify(duplicate)).toContain('"inputs":1');
      await store.dispatch(cutOperations({ nodeIds: [root] })).unwrap();
      expect(store.getState().workflow.operations[root]).toBeUndefined();
      await store.dispatch(onUndoClick()).unwrap();
      expect(await serializeOperation(store.getState(), root)).toEqual(original);
    }
  );

  it('remaps overlapping scope source and destination names once for simple tokens and composite expressions', async () => {
    const source = await prepareSource({
      triggers: {},
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: {
            A: { type: 'Compose', inputs: 'first', runAfter: {} },
            A_1: { type: 'Compose', inputs: 'second', runAfter: { A: ['Succeeded'] } },
            Reader: {
              type: 'Compose',
              inputs: { simple: "@outputs('A')", composite: "@concat(string(outputs('A')), string(outputs('A_1')))" },
              runAfter: { A_1: ['Succeeded'] },
            },
          },
        },
      },
    });
    await source.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({ triggers: {}, actions: { A: { type: 'Compose', inputs: 'existing', runAfter: {} } } });
    await target
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'A' }, upstreamNodeIds: ['A'] }))
      .unwrap();
    expect(await serializeOperation(target.getState(), 'Container-copy')).toMatchObject({
      actions: {
        A_1: { inputs: 'first' },
        A_2: { inputs: 'second' },
        Reader: { inputs: { simple: "@outputs('A_1')", composite: "@concat(string(outputs('A_1')), string(outputs('A_2')))" } },
      },
    });
  });

  it.each([false, true])(
    'resolves serialized descendants after overlapping renames without suppressing a sibling (renamed root: %s)',
    async (renamedRoot) => {
      const source = await prepareSource({
        triggers: {},
        actions: {
          S: { type: 'Scope', actions: { A: { type: 'Compose', inputs: 'inside', runAfter: {} } }, runAfter: {} },
          B: { type: 'Compose', inputs: 'outside', runAfter: { S: ['Succeeded'] } },
        },
      });
      source.dispatch(replaceId({ originalId: 'B', newId: 'C' }));
      if (renamedRoot) {
        source.dispatch(replaceId({ originalId: 'S', newId: 'B' }));
      }
      const childName = renamedRoot ? 'S' : 'B';
      source.dispatch(replaceId({ originalId: 'A', newId: childName }));
      await source.dispatch(copyOperations({ nodeIds: ['S', 'A', 'B'] })).unwrap();
      const clipboard = readClipboard();
      expect(clipboard.nodes.map((entry: { nodeId: string }) => entry.nodeId)).toEqual(['S-copy', 'B-copy']);
      const target = await prepareSource({ triggers: {}, actions: { Anchor: { type: 'Compose', inputs: 'existing', runAfter: {} } } });
      await target
        .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Anchor' }, upstreamNodeIds: ['Anchor'] }))
        .unwrap();
      expect(await serializeOperation(target.getState(), 'S-copy')).toMatchObject({ actions: { [childName]: { inputs: 'inside' } } });
      expect(await serializeOperation(target.getState(), 'B-copy')).toMatchObject({ inputs: 'outside' });
      expect(target.getState().workflow.operations['A-copy']).toBeUndefined();
    }
  );

  it('maps renamed roots by current source identity without overwriting another roots reference', async () => {
    const source = await prepareSource({
      triggers: {},
      actions: {
        A: { type: 'Compose', inputs: 'first', runAfter: {} },
        B: { type: 'Compose', inputs: 'second', runAfter: { A: ['Succeeded'] } },
        Reader: { type: 'Compose', inputs: "@outputs('A')", runAfter: { B: ['Succeeded'] } },
      },
    });
    source.dispatch(replaceId({ originalId: 'B', newId: 'C' }));
    source.dispatch(replaceId({ originalId: 'A', newId: 'B' }));
    await source.dispatch(copyOperations({ nodeIds: ['A', 'B', 'Reader'] })).unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({ triggers: {}, actions: { Anchor: { type: 'Compose', inputs: 'existing', runAfter: {} } } });
    await target
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Anchor' }, upstreamNodeIds: ['Anchor'] }))
      .unwrap();
    expect(await serializeOperation(target.getState(), 'A-copy')).toMatchObject({ inputs: 'first' });
    expect(await serializeOperation(target.getState(), 'B-copy')).toMatchObject({ inputs: 'second' });
    expect(await serializeOperation(target.getState(), 'Reader-copy')).toMatchObject({ inputs: "@outputs('A-copy')" });
  });

  it('honors future root reservations when a Switch case collides with a later pasted action', async () => {
    const source = await prepareSource({
      triggers: {},
      actions: {
        Switch: {
          type: 'Switch',
          expression: 'one',
          cases: { 'B-copy': { case: 'one', actions: { First: { type: 'Compose', inputs: 'inside', runAfter: {} } } } },
          default: { actions: {} },
          runAfter: {},
        },
        B: { type: 'Compose', inputs: 'outside', runAfter: { Switch: ['Succeeded'] } },
      },
    });
    await source.dispatch(copyOperations({ nodeIds: ['Switch', 'B'] })).unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({ triggers: {}, actions: { Anchor: { type: 'Compose', inputs: 'existing', runAfter: {} } } });
    await target
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Anchor' }, upstreamNodeIds: ['Anchor'] }))
      .unwrap();
    const copied = await serializeOperation(target.getState(), 'Switch-copy');
    expect(copied).toMatchObject({
      cases: { 'B-copy_1': { case: 'one', actions: { First: { inputs: 'inside' } } } },
    });
    expect(await serializeOperation(target.getState(), 'B-copy')).toMatchObject({ inputs: 'outside' });
    expect(target.getState().workflow.operations['B-copy_1']).toBeUndefined();
    await target.dispatch(onUndoClick()).unwrap();
    expect(target.getState().workflow.operations['Switch-copy']).toBeUndefined();
    await target.dispatch(onRedoClick()).unwrap();
    expect(await serializeOperation(target.getState(), 'Switch-copy')).toEqual(copied);
  });

  it('preserves escaped interpolation literal editor segments through source renames and multi-paste', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        A: { type: 'Compose', inputs: 'first', runAfter: {} },
        Reader: { type: 'Compose', inputs: "@@{outputs('A')}", runAfter: { A: ['Succeeded'] } },
        Real_reader: { type: 'Compose', inputs: "@outputs('A')", runAfter: { Reader: ['Succeeded'] } },
      },
    });
    const nodeInputs = store.getState().operations.inputParameters.Reader;
    const parameter = nodeInputs.parameterGroups.default.parameters[0];
    await store
      .dispatch(
        updateParameterAndDependencies({
          nodeId: 'Reader',
          groupId: 'default',
          parameterId: parameter.id,
          properties: { value: [{ id: 'edited-literal', type: 'literal', value: "@{outputs('A')}" }], preservedValue: undefined },
          isTrigger: false,
          operationInfo: store.getState().operations.operationInfo.Reader,
          connectionReference: undefined,
          nodeInputs,
          dependencies: store.getState().operations.dependencies.Reader,
        })
      )
      .unwrap();
    store.dispatch(replaceId({ originalId: 'A', newId: 'Renamed_A' }));
    const original = await serializeOperation(store.getState(), 'Reader');
    const literalSegments = store.getState().operations.inputParameters.Reader.parameterGroups.default.parameters[0].value;
    expect(literalSegments).toEqual([expect.objectContaining({ type: 'literal', value: "@{outputs('A')}" })]);
    await store.dispatch(copyOperations({ nodeIds: ['A', 'Reader', 'Real_reader'] })).unwrap();
    const clipboard = readClipboard();
    await store
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Reader' }, upstreamNodeIds: ['A', 'Reader'] }))
      .unwrap();
    expect(store.getState().operations.inputParameters['Reader-copy'].parameterGroups.default.parameters[0].value).toEqual(literalSegments);
    expect(await serializeOperation(store.getState(), 'Reader-copy')).toMatchObject({ inputs: original.inputs });
    expect(await serializeOperation(store.getState(), 'Real_reader-copy')).toMatchObject({ inputs: "@outputs('A-copy')" });
  });

  it('plans descendant identities across copied scope roots before initializing their references', async () => {
    const source = await prepareSource({
      triggers: {},
      actions: {
        Left: { type: 'Scope', actions: { A: { type: 'Compose', inputs: 'first', runAfter: {} } }, runAfter: {} },
        Right: {
          type: 'Scope',
          actions: {
            A_1: { type: 'Compose', inputs: 'second', runAfter: {} },
            Reader: {
              type: 'Compose',
              inputs: { simple: "@outputs('A')", composite: "@concat(string(outputs('A')), string(outputs('A_1')))" },
              runAfter: { A_1: ['Succeeded'] },
            },
          },
          runAfter: { Left: ['Succeeded'] },
        },
      },
    });
    await source.dispatch(copyOperations({ nodeIds: ['Right', 'Left'] })).unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({ triggers: {}, actions: { A: { type: 'Compose', inputs: 'existing', runAfter: {} } } });
    await target
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'A' }, upstreamNodeIds: ['A'] }))
      .unwrap();
    expect(await serializeOperation(target.getState(), 'Left-copy')).toMatchObject({ actions: { A_1: { inputs: 'first' } } });
    expect(await serializeOperation(target.getState(), 'Right-copy')).toMatchObject({
      actions: {
        A_2: { inputs: 'second' },
        Reader: { inputs: { simple: "@outputs('A_1')", composite: "@concat(string(outputs('A_1')), string(outputs('A_2')))" } },
      },
    });
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

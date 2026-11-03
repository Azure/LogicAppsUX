import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  clone,
  InitOperationManifestService,
  InitExperimentationServiceService,
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
import requestManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/request';
import responseManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/response';
import { httpManifest } from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/http';
import agentManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/consumption/manifests/agentloop';
import mcpManifest from '../../../../../../../logic-apps-shared/src/designer-client-services/lib/consumption/manifests/builtinmcpclient';
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
import { initializeConnectionReferences, setNodeConnectionMapping } from '../../../state/connection/connectionSlice';
import { initializeParameters } from '../../../state/workflowparameters/workflowparametersSlice';
import { updateTokens } from '../../../state/tokens/tokensSlice';
import { updateStaticResultProperties } from '../../../state/staticresultschema/staticresultsSlice';
import { getNodeOperationData } from '../../../state/operation/operationSelector';
import { setNodeSelection } from '../../../state/panel/panelSlice';
import { replaceId, setNodeDescription } from '../../../state/workflow/workflowSlice';
import { UNDO_REDO_SLICE_NAMES } from '../../../state/undoRedo/undoRedoTypes';
import { updateParameterAndDependencies } from '../../../utils/parameters/helper';
import * as parameterHelpers from '../../../utils/parameters/helper';
import * as dynamicData from '../../../utils/parameters/dynamicdata';
import { retrieveClipboardData } from '../../../utils/clipboard';
import { remapClipboardNodeData, remapClipboardOperation, validateClipboard } from '../../../utils/clipboardData';
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
import { serializeOperation, serializeWorkflow } from '../serializer';
import { onRedoClick, onUndoClick } from '../undoRedo';
import { buildWorkflowExtractionPlan } from '../../../utils/workflowExtraction';
import { getWorkflowExtractionPreview } from '../../../../ui/panel/multiSelectPanel/workflowExtractionPreview';

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
  request: requestManifest,
  response: responseManifest,
  http: httpManifest,
  agent: agentManifest,
  mcpclienttool: mcpManifest,
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
    await initializeOperationMetadata(parsed, {}, store.getState().workflowParameters.definitions, {}, 'stateful', store.dispatch);
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

const mockStaticSwaggerConnector = async () => {
  const connectorId = '/managedApis/test';
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
  vi.spyOn(connectionQueries, 'getConnection').mockResolvedValue({
    id: '/connections/test',
    name: 'test',
    type: 'Microsoft.Web/connections',
    properties: { api: connector, displayName: 'Test', overallStatus: 'Connected', createdTime: '', statuses: [] },
  });
  vi.spyOn(manifestService, 'isSupported').mockImplementation((type) => type !== 'ApiConnection');
  return connectorId;
};

const prepareSwaggerSource = async (container = false) => {
  const connectorId = await mockStaticSwaggerConnector();
  const actions = {
    Compose: { type: 'Compose', inputs: 'valid earlier action', runAfter: {} },
    Get_items: {
      type: 'ApiConnection',
      inputs: {
        host: { connection: { name: "@parameters('$connections')['test']['connectionId']" } },
        method: 'get',
        path: '/items',
      },
      runAfter: { Compose: ['Succeeded'] },
    },
  };
  const workflow = {
    triggers: {},
    actions: container ? { Container: { type: 'Scope', actions, runAfter: {} } } : actions,
  };
  const { store } = createSource(workflow);
  const references = { test: { api: { id: connectorId }, connection: { id: '/connections/test' } } };
  store.dispatch(initializeConnectionReferences(references));
  store.dispatch(setNodeConnectionMapping({ nodeId: 'Get_items', mapping: 'test' }));
  await initializeOperationMetadata(
    Deserialize(clone(workflow), null),
    references,
    store.getState().workflowParameters.definitions,
    {},
    'stateful',
    store.dispatch
  );
  await initializeDynamicDataInNodes(store.getState, store.dispatch);
  expect(store.getState().operations.errors).toEqual({});
  return { store, references };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('navigator', { clipboard: undefined });
  localStorage.clear();
  InitOperationManifestService(manifestService);
  InitExperimentationServiceService(undefined);
  InitWorkflowService({
    getCallbackUrl: async () => {
      throw new Error('Unexpected callback URL request in action-only workflow');
    },
  });
  getReactQueryClient().clear();
});

describe('clipboard integrity with real designer initialization and reducers', () => {
  it.each(['single', 'multi', 'scope'])('rejects a same-key connection belonging to another connector (%s)', async (mode) => {
    const { store: source } = await prepareSwaggerSource(mode === 'scope');
    await source
      .dispatch(
        mode === 'scope'
          ? copyScopeOperation({ nodeId: 'Container' })
          : copyOperations({ nodeIds: mode === 'multi' ? ['Compose', 'Get_items'] : ['Get_items'] })
      )
      .unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({ triggers: {}, actions: { Existing: { type: 'Compose', inputs: 'keep', runAfter: {} } } });
    target.dispatch(
      initializeConnectionReferences({ test: { api: { id: '/managedApis/other' }, connection: { id: '/connections/other' } } })
    );
    const before = target.getState();
    await expect(
      target
        .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Existing' }, upstreamNodeIds: ['Existing'] }))
        .unwrap()
    ).rejects.toThrow();
    for (const slice of UNDO_REDO_SLICE_NAMES) {
      expect(target.getState()[slice]).toBe(before[slice]);
    }
    expect(target.getState().undoRedo).toBe(before.undoRedo);
  });

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    'remaps channel bindings and static results without changing destination channel state (nested: %s, renamed: %s)',
    async (nested, renamed) => {
      const agent = (body: string) => ({
        type: 'Agent',
        inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
        tools: {},
        channels: { in: {}, out: { response: { action: { type: 'Response', inputs: { statusCode: 200, body } } } } },
        runAfter: {},
      });
      const source = await prepareSource({
        triggers: {},
        actions: nested ? { Container: { type: 'Scope', actions: { Agent: agent('source') }, runAfter: {} } } : { Agent: agent('source') },
      });
      const channelId = 'Agent-outputchannel-Response';
      source.dispatch(initializeConnectionReferences({ source: { api: { id: 'channel' }, connection: { id: 'source' } } }));
      source.dispatch(setNodeConnectionMapping({ nodeId: channelId, mapping: 'source' }));
      source.dispatch(
        updateStaticResultProperties({ name: `${channelId}0`, properties: { status: 'Succeeded', outputs: { body: 'source' } } })
      );
      if (renamed) {
        source.dispatch(replaceId({ originalId: 'Agent', newId: 'Renamed' }));
      }
      await source.dispatch(copyScopeOperation({ nodeId: nested ? 'Container' : 'Agent' })).unwrap();
      const clipboard = readClipboard();
      const target = await prepareSource({ triggers: {}, actions: { Agent: agent('destination') } });
      target.dispatch(initializeConnectionReferences({ destination: { api: { id: 'channel' }, connection: { id: 'destination' } } }));
      target.dispatch(setNodeConnectionMapping({ nodeId: channelId, mapping: 'destination' }));
      target.dispatch(
        updateStaticResultProperties({ name: `${channelId}0`, properties: { status: 'Failed', outputs: { body: 'destination' } } })
      );
      const before = target.getState();
      await target
        .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Agent' }, upstreamNodeIds: ['Agent'] }))
        .unwrap();
      const newChannelId = `${nested ? (renamed ? 'Renamed' : 'Agent_1') : 'Agent-copy'}-outputchannel-Response`;
      const check = () => {
        expect(target.getState().connections.connectionsMapping[channelId]).toBe('destination');
        expect(target.getState().staticResults.properties[`${channelId}0`]).toEqual(before.staticResults.properties[`${channelId}0`]);
        expect(target.getState().connections.connectionsMapping[newChannelId]).toBe('source');
        expect(target.getState().staticResults.properties[`${newChannelId}0`]).toEqual(
          source.getState().staticResults.properties[`${channelId}0`]
        );
      };
      check();
      await serializeWorkflow(target.getState());
      await target.dispatch(onUndoClick()).unwrap();
      expect(target.getState().connections).toEqual(before.connections);
      expect(target.getState().staticResults).toEqual(before.staticResults);
      await target.dispatch(onRedoClick()).unwrap();
      check();
    }
  );

  it.each([false, true])('preserves insertion dependencies on every independent pasted root (join: %s)', async (join) => {
    const source = await prepareSource({
      triggers: {},
      actions: {
        A: { type: 'Compose', inputs: 'A', runAfter: {} },
        B: { type: 'Compose', inputs: 'B', runAfter: {} },
        C: { type: 'Compose', inputs: 'C', runAfter: { B: ['Succeeded'] } },
      },
    });
    await source.dispatch(copyOperations({ nodeIds: ['A', 'B', 'C'] })).unwrap();
    const target = await prepareSource({
      triggers: {},
      actions: {
        X: { type: 'Compose', inputs: 'X', runAfter: {} },
        Y: { type: 'Compose', inputs: 'Y', runAfter: {} },
        Target: { type: 'Compose', inputs: 'target', runAfter: { X: ['Failed'], ...(join ? { Y: ['Skipped'] } : {}) } },
      },
    });
    const before = target.getState();
    await target
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', childId: 'Target', ...(join ? {} : { parentId: 'X' }) },
          upstreamNodeIds: join ? ['X', 'Y'] : ['X'],
        })
      )
      .unwrap();
    const check = async () => {
      for (const id of ['A-copy', 'B-copy']) {
        expect((await serializeOperation(target.getState(), id)).runAfter).toEqual({
          X: ['Failed'],
          ...(join ? { Y: ['Skipped'] } : {}),
        });
        for (const parent of join ? ['X', 'Y'] : ['X']) {
          expect(target.getState().workflow.graph?.edges?.some((edge) => edge.source === parent && edge.target === id)).toBe(true);
        }
      }
      expect((await serializeOperation(target.getState(), 'C-copy')).runAfter).toEqual({ 'B-copy': ['Succeeded'] });
      expect((await serializeOperation(target.getState(), 'Target')).runAfter).toEqual({
        'A-copy': ['SUCCEEDED'],
        'C-copy': ['SUCCEEDED'],
      });
      await serializeWorkflow(target.getState());
    };
    await check();
    await target.dispatch(onUndoClick()).unwrap();
    expect(target.getState().workflow.operations).toEqual(before.workflow.operations);
    await target.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it.each([
    ['allConnectionData', false],
    ['staticResults', false],
    ['allConnectionData', true],
    ['staticResults', true],
  ] as const)('rejects out-of-container %s before changing an unrelated destination action (multi: %s)', async (field, multi) => {
    const source = await prepareSource({
      triggers: {},
      actions: { Container: { type: 'Scope', actions: { Child: { type: 'Compose', inputs: 'child', runAfter: {} } }, runAfter: {} } },
    });
    await source.dispatch(copyScopeOperation({ nodeId: 'Container' })).unwrap();
    const scopeClipboard = readClipboard();
    scopeClipboard[field].Existing =
      field === 'allConnectionData'
        ? { referenceKey: 'other', connectionReference: { api: { id: 'other' }, connection: { id: 'other' } } }
        : { status: 'Failed', outputs: { body: 'overwritten' } };
    let clipboard = scopeClipboard;
    if (multi) {
      await source.dispatch(copyOperation({ nodeId: 'Child' })).unwrap();
      clipboard = { mslaNode: true, isMultiNode: true, nodes: [readClipboard(), scopeClipboard], edges: [] };
    }
    const target = await prepareSource({
      triggers: {},
      actions: { Existing: { type: 'Compose', inputs: 'destination', runAfter: {} } },
    });
    target.dispatch(initializeConnectionReferences({ original: { api: { id: 'original' }, connection: { id: 'original' } } }));
    target.dispatch(setNodeConnectionMapping({ nodeId: 'Existing', mapping: 'original' }));
    target.dispatch(
      updateStaticResultProperties({ name: 'Existing0', properties: { status: 'Succeeded', outputs: { body: 'original' } } })
    );
    const before = target.getState();
    await expect(
      target
        .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'Existing' }, upstreamNodeIds: ['Existing'] }))
        .unwrap()
    ).rejects.toThrow(/complete action data/);
    for (const slice of UNDO_REDO_SLICE_NAMES) {
      expect(target.getState()[slice]).toBe(before[slice]);
    }
    expect(target.getState().undoRedo).toBe(before.undoRedo);
  });

  it('limits scope binding and static-result ownership to real actions and supported Agent channels', () => {
    const clipboard = {
      mslaNode: true,
      nodeId: 'Container-copy',
      isScopeNode: true,
      serializedOperation: {
        type: 'Scope',
        actions: {
          Switch: {
            type: 'Switch',
            cases: { Virtual_case: { case: 'one', actions: { Named: { type: 'Compose', inputs: 'one' } } } },
            default: { actions: { Default: { type: 'Compose', inputs: 'default' } } },
          },
          Agent: {
            type: 'Agent',
            tools: {
              Virtual_tool: { type: 'AgentCondition', actions: { Tool_action: { type: 'Compose', inputs: 'tool' } } },
              Mcp: { type: 'McpClientTool', inputs: {} },
            },
            channels: {
              in: { request: { trigger: { type: 'Request' } } },
              out: { response: { action: { type: 'Response' } } },
            },
          },
        },
      },
      allConnectionData: Object.fromEntries(
        ['Container', 'Named', 'Default', 'Agent', 'Tool_action', 'Mcp', 'Agent-inputchannel-Request', 'Agent-outputchannel-Response'].map(
          (name) => [name, { mapping: null }]
        )
      ),
      staticResults: { Tool_action: { status: 'Succeeded' } },
    };
    expect(() => validateClipboard(clipboard)).not.toThrow();
    for (const field of ['allConnectionData', 'staticResults'] as const) {
      for (const invalidId of ['Virtual_case', 'Virtual_tool', 'Agent-inputchannel-Unknown', 'Existing']) {
        expect(() =>
          validateClipboard({
            ...clipboard,
            [field]: { ...clipboard[field], [invalidId]: field === 'allConnectionData' ? { mapping: null } : {} },
          })
        ).toThrow(/complete action data/);
      }
    }
  });

  it('previews a nested producer renamed to constructor without changing its internal source identity', async () => {
    const source = await prepareSource({
      triggers: { Request: { type: 'Request', kind: 'Http', inputs: {} } },
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: {
            Producer: { type: 'Compose', inputs: 'producer', runAfter: {} },
            Reader: { type: 'Compose', inputs: "@outputs('Producer')", runAfter: { Producer: ['Succeeded'] } },
          },
        },
      },
    });
    source.dispatch(replaceId({ originalId: 'Producer', newId: 'constructor' }));
    const before = source.getState();
    const workflow = await serializeWorkflow(before);
    const plan = buildWorkflowExtractionPlan(workflow, ['Container', 'constructor', 'Reader'], 'Child', (_name, body, runAfter) => ({
      type: 'Workflow',
      inputs: { body },
      runAfter,
    }));
    const preview = await getWorkflowExtractionPreview(plan);
    expect(preview.nodes.find(({ id }) => id === 'constructor')).toMatchObject({ parentId: 'Container' });
    expect(preview.edges.find(({ source, target }) => source === 'constructor' && target === 'Reader')).toBeDefined();
    expect(source.getState()).toBe(before);
    expect(source.getState().workflow.operations.Producer).toBeDefined();
  });

  it('remaps Switch/tools/channels without treating input data shaped like an action as a workflow definition', () => {
    const description = "@outputs('A')";
    const action = { type: 'Compose', description, inputs: { description }, runAfter: {} };
    const operation: LogicAppsV2.ActionDefinition = {
      type: 'Scope',
      description,
      actions: {
        Switch: {
          type: 'Switch',
          description,
          expression: 'one',
          cases: { named: { case: 'one', actions: { Named: action } } },
          default: { actions: { Default: action } },
        },
        Agent: {
          type: 'Agent',
          description,
          tools: {
            Condition: { type: 'AgentCondition', description, actions: { Child: action } },
            Mcp: { type: 'McpClientTool', description, inputs: { description } },
          },
          channels: {
            in: { request: { trigger: { type: 'Request', description }, mapping: { message: "@outputs('A')" } } },
            out: { response: { action: { type: 'Response', description, inputs: { description } } } },
          },
        },
        Data: { type: 'Compose', description, inputs: { actions: { Fake: action }, description } },
      },
    };
    const before = JSON.stringify(operation);
    const remapped = remapClipboardOperation(operation, { A: 'A_1' });
    const copiedAction = { ...action, inputs: { description: "@outputs('A_1')" } };
    expect(remapped).toMatchObject({
      description,
      actions: {
        Switch: {
          description,
          cases: { named: { actions: { Named: copiedAction } } },
          default: { actions: { Default: copiedAction } },
        },
        Agent: {
          description,
          tools: {
            Condition: { description, actions: { Child: copiedAction } },
            Mcp: { description, inputs: { description: "@outputs('A_1')" } },
          },
          channels: {
            in: { request: { trigger: { description }, mapping: { message: "@outputs('A_1')" } } },
            out: { response: { action: { description, inputs: { description: "@outputs('A_1')" } } } },
          },
        },
        Data: {
          description,
          inputs: { description: "@outputs('A_1')", actions: { Fake: { description: "@outputs('A_1')" } } },
        },
      },
    });
    expect(JSON.stringify(operation)).toBe(before);
  });

  it('remaps input dictionary keys without changing structural names, metadata or literal descriptions', () => {
    const expression = "@{outputs('A')}";
    const literal = "@@{outputs('A')}";
    const operation: LogicAppsV2.ActionDefinition = {
      type: 'Scope',
      description: expression,
      metadata: { [expression]: expression },
      actions: {
        [expression]: {
          type: 'Switch',
          expression: 'one',
          cases: {
            [expression]: {
              case: 'one',
              actions: {
                Reader: {
                  type: 'Http',
                  description: expression,
                  inputs: {
                    headers: { [expression]: expression, [literal]: literal },
                    body: [{ nested: { [expression]: expression } }],
                  },
                },
              },
            },
          },
        },
      },
    };
    const before = JSON.stringify(operation);
    const remappedExpression = "@{outputs('A_1')}";
    expect(remapClipboardOperation(operation, { A: 'A_1' })).toMatchObject({
      description: expression,
      metadata: { [expression]: remappedExpression },
      actions: {
        [expression]: {
          cases: {
            [expression]: {
              actions: {
                Reader: {
                  description: expression,
                  inputs: {
                    headers: { [remappedExpression]: remappedExpression, [literal]: literal },
                    body: [{ nested: { [remappedExpression]: remappedExpression } }],
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(JSON.stringify(operation)).toBe(before);
  });

  it.each(['paste', 'duplicate'])('preserves scope HTTP dictionary key/value references through save and Undo/Redo (%s)', async (mode) => {
    const expression = "@{outputs('A')}";
    const store = await prepareSource({
      triggers: {},
      actions: {
        Container: {
          type: 'Scope',
          runAfter: {},
          actions: {
            A: { type: 'Compose', inputs: 'header-name', runAfter: {} },
            Reader: {
              type: 'Http',
              inputs: {
                uri: 'https://example.test',
                method: 'GET',
                headers: { [expression]: expression },
                queries: { [expression]: expression },
              },
              runAfter: { A: ['Succeeded'] },
            },
          },
        },
      },
    });
    const before = store.getState();
    const original = await serializeOperation(before, 'Container');
    if (mode === 'duplicate') {
      await store.dispatch(duplicateOperations({ nodeIds: ['Container'] })).unwrap();
    } else {
      await store.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
      await store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: 'Container' },
            upstreamNodeIds: ['Container'],
          })
        )
        .unwrap();
    }
    const check = async () => {
      const copied = await serializeOperation(store.getState(), 'Container-copy');
      const remappedExpression = "@{outputs('A_1')}";
      expect(copied).toMatchObject({
        actions: {
          A_1: { inputs: 'header-name' },
          Reader_1: {
            inputs: {
              headers: { [remappedExpression]: remappedExpression },
              queries: { [remappedExpression]: remappedExpression },
            },
            runAfter: { A_1: ['Succeeded'] },
          },
        },
      });
      const saved = await serializeWorkflow(store.getState());
      expect(saved.definition.actions['Container-copy']).toEqual(copied);
      expect(saved.definition.actions.Container).toEqual(original);
    };
    await check();
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
    await store.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it('rejects scope input keys that collide after remapping without changing destination state', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: { Container: { type: 'Scope', actions: { A: { type: 'Compose', inputs: 'producer', runAfter: {} } }, runAfter: {} } },
    });
    await store.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
    const clipboard = readClipboard();
    clipboard.nodes[0].serializedOperation.actions.A.inputs = { "@{outputs('A')}": 'first', "@{outputs('a')}": 'second' };
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard,
            relationshipIds: { graphId: 'root', parentId: 'Container' },
            upstreamNodeIds: ['Container'],
          })
        )
        .unwrap()
    ).rejects.toThrow(/complete action data/);
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
  });

  it.each(['paste', 'duplicate'])(
    'preserves literal container/action descriptions while remapping input descriptions (%s)',
    async (mode) => {
      const literalDescription = "@outputs('A')";
      const store = await prepareSource({
        triggers: {},
        actions: {
          Container: {
            type: 'Scope',
            description: literalDescription,
            runAfter: {},
            actions: {
              A: { type: 'Compose', description: literalDescription, inputs: 'producer', runAfter: {} },
              Nested: {
                type: 'If',
                description: literalDescription,
                expression: { equals: [1, 1] },
                actions: {
                  Reader: {
                    type: 'Compose',
                    description: literalDescription,
                    inputs: { description: "@outputs('A')" },
                    runAfter: {},
                  },
                },
                else: { actions: { Other: { type: 'Compose', description: literalDescription, inputs: 'false branch', runAfter: {} } } },
                runAfter: { A: ['Succeeded'] },
              },
            },
          },
        },
      });
      const before = store.getState();
      const original = await serializeOperation(before, 'Container');
      if (mode === 'duplicate') {
        await store.dispatch(duplicateOperations({ nodeIds: ['Container'] })).unwrap();
      } else {
        await store.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
        await store
          .dispatch(
            pasteClipboard({
              clipboard: readClipboard(),
              relationshipIds: { graphId: 'root', parentId: 'Container' },
              upstreamNodeIds: ['Container'],
            })
          )
          .unwrap();
      }
      const check = async () => {
        const copied = await serializeOperation(store.getState(), 'Container-copy');
        expect(copied).toMatchObject({
          description: literalDescription,
          actions: {
            A_1: { description: literalDescription },
            Nested_1: {
              description: literalDescription,
              actions: { Reader_1: { description: literalDescription, inputs: { description: "@outputs('A_1')" } } },
              else: { actions: { Other_1: { description: literalDescription } } },
            },
          },
        });
        const saved = await serializeWorkflow(store.getState());
        expect(saved.definition.actions['Container-copy']).toEqual(copied);
        expect(saved.definition.actions.Container).toEqual(original);
      };
      await check();
      await store.dispatch(onUndoClick()).unwrap();
      expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
      await store.dispatch(onRedoClick()).unwrap();
      await check();
    }
  );

  it.each([
    ['test', false],
    ['test', true],
    ['constructor', false],
  ] as const)('rejects an unavailable destination Swagger connection %s without partial paste (multi: %s)', async (referenceKey, multi) => {
    const { store: source } = await prepareSwaggerSource();
    await source.dispatch(copyOperations({ nodeIds: multi ? ['Compose', 'Get_items'] : ['Get_items'] })).unwrap();
    const clipboard = readClipboard();
    expect(clipboard.nodes.at(-1).nodeConnectionData).toBe('test');
    clipboard.nodes.at(-1).nodeConnectionData = referenceKey;
    const target = await prepareSource({
      triggers: {},
      actions: { Anchor: { type: 'Compose', inputs: 'destination', runAfter: {} } },
    });
    const defaultConnections = vi.spyOn(connectionQueries, 'getConnectionsForConnector');
    const before = target.getState();
    await expect(
      target
        .dispatch(
          pasteClipboard({
            clipboard,
            relationshipIds: { graphId: 'root', parentId: 'Anchor' },
            upstreamNodeIds: ['Anchor'],
          })
        )
        .unwrap()
    ).rejects.toThrow('The copied action requires a connection that is not available in this workflow. No actions were pasted.');
    expect(defaultConnections).not.toHaveBeenCalled();
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(target.getState()[name]).toBe(before[name]);
    }
    expect(target.getState().undoRedo).toBe(before.undoRedo);
    expect(target.getState().designerView).toEqual({
      ...before.designerView,
      clipboardError: 'The copied action requires a connection that is not available in this workflow. No actions were pasted.',
    });
  });

  it.each([false, true])('preserves valid copied Swagger connections through save and Undo/Redo (container: %s)', async (container) => {
    const { store: source, references } = await prepareSwaggerSource(container);
    await source.dispatch(copyOperations({ nodeIds: container ? ['Container'] : ['Get_items'] })).unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({
      triggers: {},
      actions: { Anchor: { type: 'Compose', inputs: 'destination', runAfter: {} } },
    });
    if (!container) {
      target.dispatch(initializeConnectionReferences(references));
    }
    const before = target.getState();
    await target
      .dispatch(
        pasteClipboard({
          clipboard,
          relationshipIds: { graphId: 'root', parentId: 'Anchor' },
          upstreamNodeIds: ['Anchor'],
        })
      )
      .unwrap();
    const copiedId = container ? 'Get_items' : 'Get_items-copy';
    const check = async () => {
      expect(target.getState().connections.connectionsMapping[copiedId]).toBe('test');
      expect(target.getState().connections.connectionReferences).toEqual(references);
      const copied = await serializeOperation(target.getState(), copiedId);
      expect(copied).toMatchObject({
        type: 'ApiConnection',
        inputs: { host: { connection: { referenceName: 'test' } }, method: 'get', path: '/items' },
      });
      const saved = await serializeWorkflow(target.getState());
      expect(container ? saved.definition.actions['Container-copy'].actions[copiedId] : saved.definition.actions[copiedId]).toEqual(copied);
    };
    await check();
    await target.dispatch(onUndoClick()).unwrap();
    expect(target.getState().connections).toEqual(before.connections);
    expect(target.getState().workflow.operations).toEqual(before.workflow.operations);
    await target.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it('keeps renamed Agent root bindings separate from overlapping internal tool IDs', async () => {
    const source = createSource({
      triggers: {},
      actions: {
        A: {
          type: 'Agent',
          inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
          tools: { B: { type: 'McpClientTool', inputs: { parameters: { headers: { 'x-test': 'preserve' } } } } },
          runAfter: {},
        },
      },
    });
    const { store } = source;
    store.dispatch(
      initializeConnectionReferences({
        agentConnection: {
          api: { id: 'connectionProviders/agent' },
          connection: { id: 'connectionProviders/agent/agentConnection' },
        },
        mcpConnection: {
          api: { id: 'connectionProviders/mcpclient' },
          connection: { id: 'connectionProviders/mcpclient/mcpConnection' },
        },
      })
    );
    store.dispatch(setNodeConnectionMapping({ nodeId: 'A', mapping: 'agentConnection' }));
    store.dispatch(setNodeConnectionMapping({ nodeId: 'B', mapping: 'mcpConnection' }));
    await source.initialize();
    expect(store.getState().operations.errors).toEqual({});
    const rootResult = { status: 'Succeeded', outputs: { body: 'root result' } };
    const toolResult = { status: 'Succeeded', outputs: { body: 'tool result' } };
    store.dispatch(updateStaticResultProperties({ name: 'A0', properties: rootResult }));
    store.dispatch(updateStaticResultProperties({ name: 'B0', properties: toolResult }));
    store.dispatch(replaceId({ originalId: 'B', newId: 'C' }));
    store.dispatch(replaceId({ originalId: 'A', newId: 'B' }));
    await store.dispatch(copyScopeOperation({ nodeId: 'A' })).unwrap();
    const clipboard = readClipboard();
    expect(clipboard.sourceNodeId).toBe('B');
    expect(clipboard.allConnectionData.B.referenceKey).toBe('agentConnection');
    expect(clipboard.staticResults.B).toEqual(rootResult);
    const before = store.getState();
    await store
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'A' }, upstreamNodeIds: ['A'] }))
      .unwrap();
    const check = async () => {
      expect(store.getState().connections.connectionsMapping['A-copy']).toBe('agentConnection');
      expect(store.getState().connections.connectionsMapping.B).toBe('mcpConnection');
      expect(store.getState().connections.connectionsMapping.C_1).toBe('mcpConnection');
      expect(store.getState().staticResults.properties['A-copy0']).toEqual(rootResult);
      expect(store.getState().staticResults.properties.B0).toEqual(toolResult);
      expect((await serializeWorkflow(store.getState())).definition.actions['A-copy']).toMatchObject({
        type: 'Agent',
        tools: { C_1: { type: 'McpClientTool' } },
      });
    };
    await check();
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().connections).toEqual(before.connections);
    expect(store.getState().staticResults).toEqual(before.staticResults);
    await store.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it.each([false, true])('remaps differently cased copied producer references (container: %s)', async (container) => {
    const actions = {
      A: { type: 'Compose', inputs: 'producer', runAfter: {} },
      Reader: {
        type: 'Compose',
        inputs: { simple: "@outputs('a')", composite: "@concat(string(outputs('a')), string(outputs('A')))" },
        runAfter: { A: ['Succeeded'] },
      },
    };
    const store = await prepareSource({
      triggers: {},
      actions: container ? { Container: { type: 'Scope', actions, runAfter: {} } } : actions,
    });
    await store.dispatch(copyOperations({ nodeIds: container ? ['Container'] : ['A', 'Reader'] })).unwrap();
    const before = store.getState();
    await store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: container ? 'Container' : 'Reader' },
          upstreamNodeIds: container ? ['Container'] : ['A', 'Reader'],
        })
      )
      .unwrap();
    const check = async () => {
      const copiedId = container ? 'Reader_1' : 'Reader-copy';
      const producerId = container ? 'A_1' : 'A-copy';
      const copied = await serializeOperation(store.getState(), copiedId);
      expect(copied).toMatchObject({
        inputs: {
          simple: `@outputs('${producerId}')`,
          composite: `@concat(string(outputs('${producerId}')), string(outputs('${producerId}')))`,
        },
      });
      const saved = await serializeWorkflow(store.getState());
      expect(container ? saved.definition.actions['Container-copy'].actions[copiedId] : saved.definition.actions[copiedId]).toEqual(copied);
      expect(await serializeOperation(store.getState(), 'Reader')).toMatchObject({ inputs: actions.Reader.inputs });
    };
    await check();
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
    await store.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it.each([false, true])('prefers copied producers over case-varied destination aliases (container: %s)', async (container) => {
    const actions = {
      B: { type: 'Compose', inputs: 'copied producer', runAfter: {} },
      Reader: {
        type: 'Compose',
        inputs: "@concat(string(outputs('b')), string(outputs('B')))",
        runAfter: { B: ['Succeeded'] },
      },
    };
    const source = await prepareSource({
      triggers: {},
      actions: container ? { Container: { type: 'Scope', actions, runAfter: {} } } : actions,
    });
    await source.dispatch(copyOperations({ nodeIds: container ? ['Container'] : ['B', 'Reader'] })).unwrap();
    const clipboard = readClipboard();
    expect(JSON.stringify(clipboard)).toContain("outputs('b')");
    const target = await prepareSource({
      triggers: {},
      actions: { Existing: { type: 'Compose', inputs: 'destination producer', runAfter: {} } },
    });
    target.dispatch(replaceId({ originalId: 'Existing', newId: 'b' }));
    const before = target.getState();
    await target
      .dispatch(
        pasteClipboard({
          clipboard,
          relationshipIds: { graphId: 'root', parentId: 'Existing' },
          upstreamNodeIds: ['Existing'],
        })
      )
      .unwrap();
    const check = async () => {
      const producerId = container ? 'B' : 'B-copy';
      const readerId = container ? 'Reader' : 'Reader-copy';
      const copied = await serializeOperation(target.getState(), readerId);
      expect(copied).toMatchObject({
        inputs: `@concat(string(outputs('${producerId}')), string(outputs('${producerId}')))`,
      });
      const saved = await serializeWorkflow(target.getState());
      expect(container ? saved.definition.actions['Container-copy'].actions[readerId] : saved.definition.actions[readerId]).toEqual(copied);
      expect(saved.definition.actions.b).toMatchObject({ inputs: 'destination producer' });
    };
    await check();
    await target.dispatch(onUndoClick()).unwrap();
    expect(target.getState().workflow.operations).toEqual(before.workflow.operations);
    await target.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it.each([
    [false, 'paste'],
    [false, 'duplicate'],
    [true, 'paste'],
    [true, 'duplicate'],
  ] as const)('keeps virtual Switch case names out of action aliases (nested: %s, mode: %s)', async (nested, mode) => {
    const actions = {
      Switch: {
        type: 'Switch',
        expression: 'one',
        cases: { switch: { case: 'one', actions: { First: { type: 'Compose', inputs: 1, runAfter: {} } } } },
        default: { actions: { Other: { type: 'Compose', inputs: 2, runAfter: {} } } },
        runAfter: {},
      },
      Reader: {
        type: 'Compose',
        inputs: "@concat(string(outputs('switch')), string(outputs('Switch')))",
        runAfter: { Switch: ['Succeeded'] },
      },
    };
    const store = await prepareSource({
      triggers: {},
      actions: nested ? { Container: { type: 'Scope', actions, runAfter: {} } } : actions,
    });
    const roots = nested ? ['Container'] : ['Switch', 'Reader'];
    const before = store.getState();
    if (mode === 'duplicate') {
      await store.dispatch(duplicateOperations({ nodeIds: roots })).unwrap();
    } else {
      await store.dispatch(copyOperations({ nodeIds: roots })).unwrap();
      await store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: nested ? 'Container' : 'Reader' },
            upstreamNodeIds: roots,
          })
        )
        .unwrap();
    }
    const check = async () => {
      const switchId = nested ? 'Switch_1' : 'Switch-copy';
      const readerId = nested ? 'Reader_1' : 'Reader-copy';
      const copiedSwitch = await serializeOperation(store.getState(), switchId);
      expect(copiedSwitch).toMatchObject({
        type: 'Switch',
        cases: { switch_1: { case: 'one', actions: { First_1: { inputs: 1 } } } },
        default: { actions: { Other_1: { inputs: 2 } } },
      });
      const copiedReader = await serializeOperation(store.getState(), readerId);
      expect(copiedReader).toMatchObject({
        inputs: `@concat(string(outputs('${switchId}')), string(outputs('${switchId}')))`,
        runAfter: !nested && mode === 'duplicate' ? { Reader: ['SUCCEEDED'] } : { [switchId]: ['Succeeded'] },
      });
      const saved = await serializeWorkflow(store.getState());
      const savedActions = nested ? saved.definition.actions['Container-copy'].actions : saved.definition.actions;
      expect(savedActions[switchId]).toEqual(copiedSwitch);
      expect(savedActions[readerId]).toEqual(copiedReader);
    };
    await check();
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
    await store.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it('rejects a scope root alias that collides with a descendant without changing persisted state', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Container: { type: 'Scope', actions: { Child: { type: 'Compose', inputs: 'preserve', runAfter: {} } }, runAfter: {} },
      },
    });
    await store.dispatch(copyScopeOperation({ nodeId: 'Container' })).unwrap();
    const before = store.getState();
    await expect(
      store
        .dispatch(
          pasteClipboard({
            clipboard: { ...readClipboard(), sourceNodeId: 'child' },
            relationshipIds: { graphId: 'root', parentId: 'Container' },
            upstreamNodeIds: ['Container'],
          })
        )
        .unwrap()
    ).rejects.toThrow('complete action data');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(store.getState().undoRedo).toBe(before.undoRedo);
  });

  it('remaps case-varied editor action and loop identities without changing literal segments or source data', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        A: { type: 'Compose', inputs: 'producer', runAfter: {} },
        Reader: { type: 'Compose', inputs: "@outputs('a')", runAfter: { A: ['Succeeded'] } },
      },
    });
    const data = clone(getNodeOperationData(store.getState().operations, 'Reader'));
    const parameter = Object.values(data.nodeInputs.parameterGroups).flatMap((group) => group.parameters)[0];
    const segment = parameter.value.find((value) => value.type === 'token');
    if (!segment?.token) {
      throw new Error('Expected initialized output token');
    }
    Object.assign(segment.token, { actionName: 'a', arrayDetails: { loopSource: 'a' } });
    parameter.value.push({ id: 'literal', type: 'literal', value: "@outputs('a')" });
    const before = clone(data);
    const remapped = remapClipboardNodeData(data, { A: 'A-copy' });
    const values = Object.values(remapped.nodeInputs.parameterGroups).flatMap((group) => group.parameters.flatMap((entry) => entry.value));
    expect(values.find((value) => value.type === 'token')).toMatchObject({
      value: "outputs('A-copy')",
      token: { actionName: 'A-copy', arrayDetails: { loopSource: 'A-copy' } },
    });
    expect(values.find((value) => value.id === 'literal')).toEqual({ id: 'literal', type: 'literal', value: "@outputs('a')" });
    expect(data).toEqual(before);
  });

  it('keeps dynamic copied inputs in the internal ID namespace through overlapping renames and Undo/Redo', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Initialize_variables: {
          type: 'InitializeVariable',
          inputs: { variables: [{ name: 'counter', type: 'string', value: '' }] },
          runAfter: {},
        },
        A: { type: 'Compose', inputs: 'first', runAfter: { Initialize_variables: ['Succeeded'] } },
        B: { type: 'Compose', inputs: 'second', runAfter: { A: ['Succeeded'] } },
        Set_variable: { type: 'SetVariable', inputs: { name: 'counter', value: "@outputs('A')" }, runAfter: { B: ['Succeeded'] } },
      },
    });
    store.dispatch(replaceId({ originalId: 'B', newId: 'C' }));
    store.dispatch(replaceId({ originalId: 'A', newId: 'B' }));
    await store.dispatch(copyOperation({ nodeId: 'Set_variable' })).unwrap();
    await store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: 'Set_variable' },
          upstreamNodeIds: ['Initialize_variables', 'A', 'B', 'Set_variable'],
        })
      )
      .unwrap();
    const check = async () => {
      expect(await serializeOperation(store.getState(), 'Set_variable-copy')).toMatchObject({
        inputs: { name: 'counter', value: "@outputs('B')" },
      });
      expect((await serializeWorkflow(store.getState())).definition.actions['Set_variable-copy']).toMatchObject({
        inputs: { name: 'counter', value: "@outputs('B')" },
      });
    };
    await check();
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations['Set_variable-copy']).toBeUndefined();
    await store.dispatch(onRedoClick()).unwrap();
    await check();
  });

  it.each(['literal', 'token'])('remaps raw %s-shaped JSON without treating it as an editor segment', async (type) => {
    const raw = {
      type,
      id: 'record',
      value: "@outputs('A')",
      token: { tokenType: 'outputs', actionName: 'A', value: "outputs('A')" },
    };
    const store = await prepareSource({
      triggers: {},
      actions: {
        A: { type: 'Compose', inputs: 'first', runAfter: {} },
        Reader: { type: 'Compose', inputs: raw, runAfter: { A: ['Succeeded'] } },
      },
    });
    await store.dispatch(copyOperations({ nodeIds: ['A', 'Reader'] })).unwrap();
    await store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: 'Reader' },
          upstreamNodeIds: ['A', 'Reader'],
        })
      )
      .unwrap();
    expect(await serializeOperation(store.getState(), 'Reader-copy')).toMatchObject({
      inputs: { ...raw, value: "@outputs('A-copy')" },
    });
  });

  it.each(['copy', 'duplicate'])('includes a selected real MCP tool exactly once inside its Agent during %s', async (mode) => {
    const source = createSource({
      triggers: {},
      actions: {
        Agent: {
          type: 'Agent',
          inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
          tools: { Mcp_tool: { type: 'McpClientTool', inputs: { parameters: { headers: { 'x-test': 'preserve' } } } } },
          runAfter: {},
        },
      },
    });
    const { store } = source;
    store.dispatch(
      initializeConnectionReferences({
        mcpConnection: {
          api: { id: 'connectionProviders/mcpclient' },
          connection: { id: 'connectionProviders/mcpclient/mcpConnection' },
        },
      })
    );
    store.dispatch(setNodeConnectionMapping({ nodeId: 'Mcp_tool', mapping: 'mcpConnection' }));
    await source.initialize();
    expect(store.getState().operations.errors).toEqual({});
    if (mode === 'copy') {
      await store.dispatch(copyOperations({ nodeIds: ['Agent', 'Mcp_tool'] })).unwrap();
      expect(readClipboard().nodes).toHaveLength(1);
      await store
        .dispatch(pasteClipboard({ clipboard: readClipboard(), relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] }))
        .unwrap();
    } else {
      await store.dispatch(duplicateOperations({ nodeIds: ['Agent', 'Mcp_tool'] })).unwrap();
    }
    const copied = await serializeOperation(store.getState(), 'Agent-copy');
    expect(Object.keys(copied.tools ?? {})).toEqual(['Mcp_tool_1']);
    expect(copied.tools?.Mcp_tool_1).toMatchObject({
      type: 'McpClientTool',
      inputs: { parameters: { headers: { 'x-test': 'preserve' } } },
    });
    expect(Object.keys(store.getState().workflow.operations).filter((id) => id.startsWith('Mcp_tool'))).toEqual(['Mcp_tool', 'Mcp_tool_1']);
    expect(store.getState().connections.connectionsMapping.Mcp_tool_1).toBe('mcpConnection');
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations['Agent-copy']).toBeUndefined();
    await store.dispatch(onRedoClick()).unwrap();
    expect(await serializeOperation(store.getState(), 'Agent-copy')).toEqual(copied);
  });

  it.each(['copy', 'duplicate', 'cut'])('preserves owned noncanvas Agent channel operations during %s', async (mode) => {
    const agent = {
      type: 'Agent',
      inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
      tools: {},
      channels: {
        in: { 'in-channel-1': { trigger: { type: 'Request', kind: 'Http', inputs: { schema: { type: 'object' } } } } },
        out: { 'out-channel-1': { action: { type: 'Response', inputs: { statusCode: 200, body: 'preserve channel' } } } },
      },
      runAfter: {},
    };
    const store = await prepareSource({ triggers: {}, actions: { Agent: agent } });
    if (mode === 'duplicate') {
      await store.dispatch(duplicateOperations({ nodeIds: ['Agent'] })).unwrap();
    } else {
      await store.dispatch((mode === 'cut' ? cutOperations : copyOperations)({ nodeIds: ['Agent'] })).unwrap();
      expect(!!store.getState().workflow.operations.Agent).toBe(mode !== 'cut');
      await store
        .dispatch(pasteClipboard({ clipboard: readClipboard(), relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] }))
        .unwrap();
    }
    const copied = await serializeOperation(store.getState(), 'Agent-copy');
    expect(copied).toMatchObject({ channels: agent.channels });
    expect((await serializeWorkflow(store.getState())).definition.actions['Agent-copy']).toMatchObject({
      channels: agent.channels,
    });
    for (const id of ['Agent-copy-inputchannel-Request', 'Agent-copy-outputchannel-Response']) {
      expect(store.getState().operations.inputParameters[id].parameterGroups).toBeDefined();
      expect(store.getState().operations.operationInfo[id]).toBeDefined();
    }
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations['Agent-copy']).toBeUndefined();
    await store.dispatch(onRedoClick()).unwrap();
    expect(await serializeOperation(store.getState(), 'Agent-copy')).toEqual(copied);
  });

  it('pastes an Agent whose serialized channels contain only an input channel', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Agent: {
          type: 'Agent',
          inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
          tools: {},
          channels: { in: { 'in-channel-1': { trigger: { type: 'Request', kind: 'Http', inputs: {} } } }, out: {} },
          runAfter: {},
        },
      },
    });
    await store.dispatch(copyScopeOperation({ nodeId: 'Agent' })).unwrap();
    expect(readClipboard().serializedOperation.channels.out).toBeUndefined();
    await store
      .dispatch(pasteClipboard({ clipboard: readClipboard(), relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] }))
      .unwrap();
    expect((await serializeWorkflow(store.getState())).definition.actions['Agent-copy']).toMatchObject({
      channels: { in: { 'in-channel-1': { trigger: { type: 'Request', kind: 'Http' } } } },
    });
  });

  it('rejects a derived Agent channel ID collision without replacing an existing canvas action', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Agent: {
          type: 'Agent',
          inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
          tools: {},
          channels: { in: { 'in-channel-1': { trigger: { type: 'Request', kind: 'Http', inputs: {} } } }, out: {} },
          runAfter: {},
        },
        'Agent-copy-inputchannel-Request': { type: 'Compose', inputs: 'keep this canvas action', runAfter: {} },
      },
    });
    await store.dispatch(copyScopeOperation({ nodeId: 'Agent' })).unwrap();
    const before = store.getState();
    await expect(
      store.dispatch(pasteClipboard({ clipboard: readClipboard(), relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] })).unwrap()
    ).rejects.toThrow('complete action data');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
    expect(await serializeOperation(store.getState(), 'Agent-copy-inputchannel-Request')).toMatchObject({
      type: 'Compose',
      inputs: 'keep this canvas action',
    });
  });

  it('rejects noncanvas channel definitions unsupported by their owning Agent without changing the editor', async () => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Agent: { type: 'Agent', inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } }, tools: {}, runAfter: {} },
      },
    });
    await store.dispatch(copyScopeOperation({ nodeId: 'Agent' })).unwrap();
    const clipboard = readClipboard();
    clipboard.serializedOperation.channels = {
      in: { invalid: { trigger: { type: 'Compose', inputs: 'not an Agent input channel' } } },
      out: {},
    };
    const before = store.getState();
    await expect(
      store.dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] })).unwrap()
    ).rejects.toThrow('complete action data');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
  });

  it('does not cut an Agent whose channel configuration failed to initialize', async () => {
    vi.spyOn(manifestService, 'getOperationManifest').mockImplementation(async (_connector, operation) => {
      if (operation === 'request') {
        throw new Error('Channel manifest unavailable');
      }
      return manifests[operation];
    });
    const source = createSource({
      triggers: {},
      actions: {
        Agent: {
          type: 'Agent',
          inputs: { parameters: { agentModelType: 'AzureOpenAI', messages: [] } },
          tools: {},
          channels: { in: { 'in-channel-1': { trigger: { type: 'Request', kind: 'Http', inputs: {} } } }, out: {} },
          runAfter: {},
        },
      },
    });
    await source.initialize();
    const { store } = source;
    expect(getNodeOperationData(store.getState().operations, 'Agent').nodeInputs.parameterGroups).toBeDefined();
    const before = store.getState();
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLIPBOARD, 'prior clipboard');
    await expect(store.dispatch(cutOperations({ nodeIds: ['Agent'] })).unwrap()).rejects.toThrow('not ready to copy');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD)).toBe('prior clipboard');
    for (const name of UNDO_REDO_SLICE_NAMES) {
      expect(store.getState()[name]).toBe(before[name]);
    }
  });

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
    const connectorId = await mockStaticSwaggerConnector();
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

  it.each([false, true])(
    'preserves reader-only external bindings across pending overlapping renames (container: %s)',
    async (container) => {
      const reader = {
        type: 'Compose',
        inputs: { simple: "@outputs('A')", composite: "@concat(string(outputs('A')), string(outputs('B')))" },
        runAfter: {},
      };
      const store = await prepareSource({
        triggers: {},
        actions: {
          A: { type: 'Compose', inputs: 'first', runAfter: {} },
          B: { type: 'Compose', inputs: 'second', runAfter: { A: ['Succeeded'] } },
          ...(container
            ? { Container: { type: 'Scope', actions: { Reader: reader }, runAfter: { B: ['Succeeded'] } } }
            : { Reader: { ...reader, runAfter: { B: ['Succeeded'] } } }),
        },
      });
      store.dispatch(replaceId({ originalId: 'B', newId: 'C' }));
      store.dispatch(replaceId({ originalId: 'A', newId: 'B' }));
      const root = container ? 'Container' : 'Reader';
      await store.dispatch(copyOperations({ nodeIds: [root] })).unwrap();
      const before = store.getState();
      await store
        .dispatch(
          pasteClipboard({
            clipboard: readClipboard(),
            relationshipIds: { graphId: 'root', parentId: root },
            upstreamNodeIds: ['A', 'B'],
          })
        )
        .unwrap();
      const copied = await serializeOperation(store.getState(), `${root}-copy`);
      const expected = { inputs: { simple: "@outputs('B')", composite: "@concat(string(outputs('B')), string(outputs('C')))" } };
      expect(copied).toMatchObject(container ? { actions: { Reader_1: expected } } : expected);
      const copiedReader = store.getState().operations.inputParameters[container ? 'Reader_1' : 'Reader-copy'];
      expect(
        Object.values(copiedReader.parameterGroups).flatMap((group) =>
          group.parameters.flatMap((parameter) => parameter.validationErrors ?? [])
        )
      ).toEqual([]);
      const serialized = await serializeWorkflow(store.getState());
      expect(serialized.definition.actions?.[`${root}-copy`]).toEqual(copied);
      await store.dispatch(onUndoClick()).unwrap();
      expect(store.getState().workflow.operations).toEqual(before.workflow.operations);
      await store.dispatch(onRedoClick()).unwrap();
      expect(await serializeOperation(store.getState(), `${root}-copy`)).toEqual(copied);
      expect(await serializeWorkflow(store.getState())).toEqual(serialized);
    }
  );

  it('preserves non-action expression and workflow-parameter tokens when pasting a container', async () => {
    const inputs = { expression: "@concat('first', 'second')", parameter: "@parameters('workflowValue')" };
    const source = createSource({
      triggers: {},
      actions: { Container: { type: 'Scope', actions: { Reader: { type: 'Compose', inputs, runAfter: {} } }, runAfter: {} } },
    });
    const { store } = source;
    store.dispatch(initializeParameters({ workflowValue: { type: 'String', value: 'parameter value' } }));
    await source.initialize();
    await store.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
    await store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: 'Container' },
          upstreamNodeIds: [],
        })
      )
      .unwrap();
    const serialized = await serializeWorkflow(store.getState());
    expect(serialized.definition.actions?.['Container-copy']).toMatchObject({ actions: { Reader_1: { inputs } } });
    const copiedReader = store.getState().operations.inputParameters.Reader_1;
    expect(
      Object.values(copiedReader.parameterGroups).flatMap((group) =>
        group.parameters.flatMap((parameter) => parameter.validationErrors ?? [])
      )
    ).toEqual([]);
    await store.dispatch(onUndoClick()).unwrap();
    expect(store.getState().workflow.operations['Container-copy']).toBeUndefined();
    await store.dispatch(onRedoClick()).unwrap();
    expect(await serializeWorkflow(store.getState())).toEqual(serialized);
  });

  it('preserves fan-out after a secondary predecessor has already been attached to a join', async () => {
    const sourceActions: LogicAppsV2.Actions = {
      A: { type: 'Compose', inputs: 'A', runAfter: {} },
      B: { type: 'Compose', inputs: 'B', runAfter: { A: ['Succeeded'] } },
      C: { type: 'Compose', inputs: 'C', runAfter: { A: ['Succeeded'] } },
      X: { type: 'Compose', inputs: 'X', runAfter: { B: ['Succeeded'] } },
      D: { type: 'Compose', inputs: 'D', runAfter: { X: ['Succeeded'], C: ['Succeeded'] } },
      E: { type: 'Compose', inputs: 'E', runAfter: { C: ['Succeeded'] } },
    };
    const store = await prepareSource({
      triggers: {},
      actions: {
        Anchor: { type: 'Compose', inputs: 'anchor', runAfter: {} },
        Target: { type: 'Compose', inputs: 'target', runAfter: { Anchor: ['Succeeded'] } },
        ...sourceActions,
      },
    });
    await store.dispatch(copyOperations({ nodeIds: Object.keys(sourceActions) })).unwrap();
    await store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: 'Anchor', childId: 'Target' },
          upstreamNodeIds: ['Anchor'],
        })
      )
      .unwrap();
    for (const [id, operation] of Object.entries(sourceActions)) {
      const expected = Object.fromEntries(
        Object.entries(operation.runAfter ?? {}).map(([parent, statuses]) => [`${parent}-copy`, statuses])
      );
      expect((await serializeOperation(store.getState(), `${id}-copy`)).runAfter).toEqual(
        id === 'A' ? { Anchor: ['Succeeded'] } : expected
      );
    }
    expect((await serializeOperation(store.getState(), 'Target')).runAfter).toEqual({
      'D-copy': ['SUCCEEDED'],
      'E-copy': ['SUCCEEDED'],
    });
  });

  it('reserves existing internal identities as well as pending names when pasting a container from another workflow', async () => {
    const source = await prepareSource({
      triggers: {},
      actions: { Container: { type: 'Scope', actions: { A: { type: 'Compose', inputs: 'copied child', runAfter: {} } }, runAfter: {} } },
    });
    await source.dispatch(copyOperations({ nodeIds: ['Container'] })).unwrap();
    const clipboard = readClipboard();
    const target = await prepareSource({
      triggers: {},
      actions: { A: { type: 'Compose', inputs: 'existing destination action', runAfter: {} } },
    });
    target.dispatch(replaceId({ originalId: 'A', newId: 'B' }));
    const before = target.getState();
    await target
      .dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root', parentId: 'A' }, upstreamNodeIds: ['A'] }))
      .unwrap();
    expect(await serializeOperation(target.getState(), 'A')).toMatchObject({ inputs: 'existing destination action' });
    expect(target.getState().operations.inputParameters.A).toBe(before.operations.inputParameters.A);
    expect(await serializeOperation(target.getState(), 'Container-copy')).toMatchObject({
      actions: { A_1: { inputs: 'copied child' } },
    });
    await target.dispatch(onUndoClick()).unwrap();
    expect(target.getState().workflow.operations).toEqual(before.workflow.operations);
  });

  it('does not inject a trigger dependency when the first pasted independent root is also a leaf', async () => {
    InitWorkflowService({ getCallbackUrl: async () => ({ value: 'https://example.invalid/local-fixture' }) });
    const store = await prepareSource({
      triggers: { Request: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
      actions: {
        Anchor: { type: 'Compose', inputs: 'anchor', runAfter: {} },
        Target: { type: 'Compose', inputs: 'target', runAfter: { Anchor: ['Succeeded'] } },
        A: { type: 'Compose', inputs: 'A', runAfter: {} },
        B: { type: 'Compose', inputs: 'B', runAfter: {} },
        C: { type: 'Compose', inputs: 'C', runAfter: { B: ['Succeeded'] } },
      },
    });
    await store.dispatch(copyOperations({ nodeIds: ['A', 'B', 'C'] })).unwrap();
    await store
      .dispatch(
        pasteClipboard({
          clipboard: readClipboard(),
          relationshipIds: { graphId: 'root', parentId: 'Anchor', childId: 'Target' },
          upstreamNodeIds: ['Request', 'Anchor'],
        })
      )
      .unwrap();
    expect((await serializeOperation(store.getState(), 'Target')).runAfter).toEqual({
      'A-copy': ['SUCCEEDED'],
      'C-copy': ['SUCCEEDED'],
    });
  });

  it.each(['Scope', 'If'])('rejects complete action metadata without serialized descendants for a legacy %s entry', async (type) => {
    const store = await prepareSource({
      triggers: {},
      actions: {
        Before: { type: 'Compose', inputs: 'complete action', runAfter: {} },
        Container: {
          type,
          ...(type === 'If' ? { expression: { equals: [1, 1] }, else: { actions: {} } } : {}),
          actions: { Nested: { type: 'Compose', inputs: 'must not disappear', runAfter: {} } },
          runAfter: { Before: ['Succeeded'] },
        },
      },
    });
    await store.dispatch(copyOperation({ nodeId: 'Before' })).unwrap();
    const complete = readClipboard();
    const legacy = {
      mslaNode: true,
      isScopeNode: false,
      nodeId: 'Container-copy',
      nodeData: getNodeOperationData(store.getState().operations, 'Container'),
      nodeOperationInfo: store.getState().operations.operationInfo.Container,
    };
    const before = store.getState();
    for (const clipboard of [legacy, { mslaNode: true, isMultiNode: true, nodes: [complete, legacy], edges: [] }]) {
      await expect(
        store.dispatch(pasteClipboard({ clipboard, relationshipIds: { graphId: 'root' }, upstreamNodeIds: [] })).unwrap()
      ).rejects.toThrow('complete action data');
      for (const name of UNDO_REDO_SLICE_NAMES) {
        expect(store.getState()[name]).toBe(before[name]);
      }
      expect(store.getState().undoRedo).toBe(before.undoRedo);
    }
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

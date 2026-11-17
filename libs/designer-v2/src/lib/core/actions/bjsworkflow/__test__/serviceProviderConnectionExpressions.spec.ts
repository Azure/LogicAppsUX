import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { isCancelledError } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createElement, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  connectionExpressionEditor,
} from '../../../../../../../designer-ui/__test__/connection-expression-editor-helper';
import { SettingTokenField, type ChangeState } from '@microsoft/designer-ui';
import {
  ConnectionReferenceKeyFormat,
  ConnectionService,
  InitConnectionService,
  InitLoggerService,
  InitExperimentationServiceService,
  InitOperationManifestService,
  InitWorkflowService,
  LOCAL_STORAGE_KEYS,
  LogEntryLevel,
  ManifestParser,
  OperationManifestService,
  SerializationErrorCode,
  type Connection,
  type Connector,
  type LogicAppsV2,
  type OpenAPIV2,
  type OperationManifest,
} from '@microsoft/logic-apps-shared';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import { isExpressionConnectionMapping, type ConnectionMapping, type Workflow } from '../../../../common/models/workflow';
import { BJSWorkflowProvider } from '../../../BJSWorkflowProvider';
import { DesignerProvider } from '../../../DesignerProvider';
import { getReactQueryClient, ReactQueryProvider } from '../../../ReactQueryProvider';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import * as connectionQueries from '../../../queries/connections';
import * as dynamicQueries from '../../../queries/connector';
import connectionsReducer, {
  changeConnectionMapping,
  initializeConnectionReferences,
  initCopiedConnectionMap,
  initScopeCopiedConnections,
  renameConnectionExpressionParameter,
  setNodeConnectionMapping,
} from '../../../state/connection/connectionSlice';
import { getConnectionReferenceForNodeId } from '../../../state/connection/connectionSelector';
import { initializeServices } from '../../../state/designerOptions/designerOptionsSlice';
import operationsReducer, {
  ErrorLevel,
  initializeNodes,
  updateErrorDetails,
  updateNodeParameters,
} from '../../../state/operation/operationMetadataSlice';
import panelReducer from '../../../state/panel/panelSlice';
import tokensReducer from '../../../state/tokens/tokensSlice';
import undoRedoReducer from '../../../state/undoRedo/undoRedoSlice';
import workflowReducer, { setIsWorkflowDirty } from '../../../state/workflow/workflowSlice';
import workflowParametersReducer, { updateParameter } from '../../../state/workflowparameters/workflowparametersSlice';
import { resetWorkflowState } from '../../../state/global';
import { store, type RootState } from '../../../store';
import {
  getServiceProviderConnectionMapping,
  isConnectionExpressionValid,
  remapConnectionExpression,
} from '../../../utils/connectors/connectionExpression';
import { getConnectionId, getConnectionReference, isConnectionReferenceValid } from '../../../utils/connectors/connections';
import { storeStateHistoryMiddleware } from '../../../utils/middleware';
import { canInvokeDynamicConnection, getDynamicSchema, getDynamicValues, getFolderItems } from '../../../utils/parameters/dynamicdata';
import { shouldUseParameterInGroup, updateParameterAndDependencies, validateParameter } from '../../../utils/parameters/helper';
import * as parameterHelpers from '../../../utils/parameters/helper';
import * as operationDeserializer from '../operationdeserializer';
import { getConnectionMappingForNode, updateNodeConnection, updateNodeConnectionExpression } from '../connections';
import { copyOperation, copyScopeOperation, pasteOperation, pasteScopeOperation } from '../copypaste';
import { initializeDynamicDataInNodes, initializeOperationDetailsForManifest } from '../operationdeserializer';
import { updateNodeFromCodeView } from '../updateNodeFromCodeView';
import { serializeOperation, serializeWorkflow } from '../serializer';
import { onRedoClick, onUndoClick } from '../undoRedo';

const connectorId = '/serviceProviders/sql';
const nodeId = 'Query';
const operationInfo = { connectorId, operationId: 'executeQuery', type: 'ServiceProvider' };
const manifest = {
  properties: {
    connection: { required: true, type: 'ServiceProvider' },
    connectionReference: { referenceKeyFormat: ConnectionReferenceKeyFormat.ServiceProvider },
    inputsLocation: ['inputs', 'parameters'],
    inputs: { type: 'object', properties: { query: { type: 'string' } } },
    outputs: { type: 'object', properties: {} },
    iconUri: '',
    brandColor: '#000000',
  },
} as OperationManifest;
const reference = { api: { id: connectorId }, connection: { id: '/serviceProviders/sql/connections/Sql' } };
const dynamicBodyManifest: OperationManifest = {
  ...manifest,
  properties: {
    ...manifest.properties,
    inputs: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        body: {
          type: 'object',
          title: 'Payload',
          'x-ms-dynamic-properties': { operationId: 'getPayloadSchema', parameters: {}, itemValuePath: 'schema' },
        },
      },
      required: ['body'],
    },
  },
};
const bodySchema: OpenAPIV2.SchemaObject = {
  type: 'object',
  properties: {
    message: { type: 'string', title: 'Message' },
    nested: { type: 'object', properties: { enabled: { type: 'boolean' } } },
    rows: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' } } } },
    selection: { type: 'string', title: 'Selection' },
  },
  required: ['message'],
};
const editedManualBody = { message: 'manually edited', nested: { enabled: true }, rows: [{ id: 42 }] };
const originalRangeGeometry = Object.getOwnPropertyDescriptors(Range.prototype);

beforeAll(() => {
  // JSDOM has no range geometry; focused Lexical selection updates need these browser APIs.
  Object.defineProperties(Range.prototype, {
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
    getClientRects: { configurable: true, value: () => [] },
  });
});

afterAll(() => {
  for (const key of ['getBoundingClientRect', 'getClientRects']) {
    if (originalRangeGeometry[key]) {
      Object.defineProperty(Range.prototype, key, originalRangeGeometry[key]);
    } else {
      Reflect.deleteProperty(Range.prototype, key);
    }
  }
});

const buildState = async (connectionName = "@outputs('Resolve_Connection')"): Promise<RootState> => {
  const base = getMockedInitialRootState();
  const action = {
    type: 'ServiceProvider',
    inputs: {
      serviceProviderConfiguration: { serviceProviderId: connectorId, operationId: 'executeQuery', connectionName },
      parameters: { query: 'original', body: { rows: [{ id: 7 }], selection: "@outputs('Resolve_Connection')" } },
    },
    runAfter: {},
  } as unknown as LogicAppsV2.ServiceProvider;
  const definition = { actions: { [nodeId]: action }, triggers: {} } as LogicAppsV2.WorkflowDefinition;
  const parsed = Deserialize(definition, null);
  const mapping = await getConnectionMappingForNode(action, nodeId, false, OperationManifestService());
  return {
    ...base,
    designerOptions: {
      ...base.designerOptions,
      hostOptions: { ...base.designerOptions.hostOptions },
    },
    workflow: {
      ...base.workflow,
      graph: parsed.graph,
      nodesMetadata: parsed.nodesMetadata,
      operations: parsed.actionData,
      originalDefinition: definition,
      workflowKind: 'stateful',
      idReplacements: {},
    },
    connections: {
      ...base.connections,
      connectionsMapping: mapping ?? {},
      connectionReferences: { Sql: reference, sql: { ...reference, connection: { id: '/serviceProviders/sql/connections/sql' } } },
    },
    tokens: { ...base.tokens, outputTokens: { Query: { tokens: [], upstreamNodeIds: [] } } },
    workflowParameters: {
      ...base.workflowParameters,
      definitions: { defaultConnection: { name: 'defaultConnection', type: 'String', value: 'Sql', isEditable: true } },
    },
    operations: {
      ...base.operations,
      operationInfo: { [nodeId]: operationInfo },
      dependencies: { [nodeId]: { inputs: {}, outputs: {} } },
      errors: {},
      outputParameters: { Query: { outputs: {} } },
      operationMetadata: { Query: { iconUri: '', brandColor: '' } },
      settings: { Query: {} },
      inputParameters: {
        [nodeId]: {
          parameterGroups: {
            default: {
              id: 'default',
              description: '',
              rawInputs: [],
              parameters: [
                {
                  id: 'query',
                  parameterKey: 'inputs.$.query',
                  parameterName: 'query',
                  label: 'Query',
                  type: 'string',
                  required: false,
                  info: {},
                  value: [{ id: 'value', type: 'literal', value: 'edited' }],
                },
              ],
            },
          },
        },
      },
    },
  } as RootState;
};

const makeStore = (initial: RootState) =>
  configureStore({
    reducer: (state = initial, action): RootState => ({
      ...state,
      connections: connectionsReducer(state.connections, action),
      workflow: workflowReducer(state.workflow, action),
      operations: operationsReducer(state.operations, action),
      panel: panelReducer(state.panel, action),
      tokens: tokensReducer(state.tokens, action),
      workflowParameters: workflowParametersReducer(state.workflowParameters, action),
      undoRedo: undoRedoReducer(state.undoRedo, action),
    }),
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(storeStateHistoryMiddleware),
  });

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
};

const createConnectionService = (
  connections: Connection[] | Promise<Connection[]>,
  connectionResource: Connection | Promise<Connection> | null = null
) => {
  const getConnections = vi.fn().mockImplementation(() => connections);
  const getConnection = vi.fn().mockImplementation(() => connectionResource);
  return {
    getConnections,
    getConnection,
  } as const;
};

const registerConnectionService = async (store: ReturnType<typeof makeStore>, connectionService: any) => {
  await store.dispatch(
    initializeServices({
      connectionService,
      operationManifestService: OperationManifestService(),
      searchService: {} as any,
      workflowService: {} as any,
      oAuthService: {} as any,
    }) as any
  );
};

const initializeDynamicBodyStore = async (source: 'imported' | 'authored' = 'imported') => {
  vi.spyOn(OperationManifestService(), 'getOperationManifest').mockResolvedValue(dynamicBodyManifest);
  const expression = "@outputs('Resolve_Connection')";
  const state = await buildState(source === 'authored' ? 'Sql' : expression);
  const store = makeStore(state);
  const nodes = await initializeOperationDetailsForManifest(nodeId, state.workflow.operations.Query, {}, false, 'stateful', store.dispatch);
  store.dispatch(initializeNodes({ nodes: nodes! }));
  if (source === 'authored') {
    // A static action without fetched metadata has no expanded children or manual root yet.
    expect(
      Object.values(store.getState().operations.inputParameters.Query.parameterGroups)
        .flatMap((group) => group.parameters)
        .some((parameter) => parameter.parameterKey === 'inputs.$.body')
    ).toBe(false);
    await store.dispatch(updateNodeConnectionExpression({ nodeId, expression })).unwrap();
  }
  await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
  return store;
};

const buildWorkflowForProviderLifecycle = (connectionReference: typeof reference): Workflow => ({
  id: 'provider-workflow',
  kind: 'stateful',
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2019-05-01/workflowdefinition.json#',
    triggers: {
      manual: {
        type: 'Request',
        kind: 'Http',
        inputs: { schema: {} },
      },
    },
    actions: {
      [nodeId]: {
        type: 'ServiceProvider',
        inputs: {
          serviceProviderConfiguration: {
            serviceProviderId: connectorId,
            operationId: 'executeQuery',
            connectionName: 'Sql',
          },
          parameters: { query: 'provider lifecycle query' },
        },
        runAfter: {},
      },
    },
    outputs: {},
  } as any,
  connectionReferences: { Sql: connectionReference },
  parameters: {},
});

const getProviderOptions = (connectionService: any) => {
  const { servicesInitialized: _ignored, ...options } = getMockedInitialRootState().designerOptions;
  return {
    ...options,
    services: {
      ...options.services,
      connectionService,
      operationManifestService: OperationManifestService(),
      workflowService: { getCallbackUrl: async () => undefined } as any,
      searchService: {} as any,
      oAuthService: {} as any,
    },
  };
};

const observeProviderLifecycle = () => {
  const requestConnectorId = '/builtIn/request';
  const requestManifest = {
    ...manifest,
    properties: { ...manifest.properties, connection: undefined, connectionReference: undefined },
  };
  InitOperationManifestService({
    isSupported: () => true,
    isAliasingSupported: () => false,
    getOperationInfo: async (_operation: unknown, isTrigger: boolean) =>
      isTrigger ? { connectorId: requestConnectorId, operationId: 'request', type: 'Request', kind: 'Http' } : operationInfo,
    getOperationManifest: async (id: string) => (id.toLowerCase() === requestConnectorId.toLowerCase() ? requestManifest : manifest),
    isBuiltInConnector: () => false,
  } as any);

  const initialize = operationDeserializer.initializeDynamicDataInNodes;
  const runs: {
    nodeIds: string[] | undefined;
    actions: any[];
    settled: Promise<PromiseSettledResult<void>>;
  }[] = [];
  vi.spyOn(operationDeserializer, 'initializeDynamicDataInNodes').mockImplementation((getState, dispatch, nodeIds) => {
    const actions: any[] = [];
    // Observe real per-initialization dispatches without replacing registration, queries or validation outcomes.
    const observedDispatch = ((action: any) => {
      actions.push(action);
      return dispatch(action);
    }) as typeof store.dispatch;
    const promise = initialize(getState, observedDispatch, nodeIds);
    const settled = promise.then(
      (value): PromiseFulfilledResult<void> => ({ status: 'fulfilled', value }),
      (reason): PromiseRejectedResult => ({ status: 'rejected', reason })
    );
    runs.push({ nodeIds, actions, settled });
    return promise;
  });
  return { runs, refreshes: vi.spyOn(parameterHelpers, 'updateDynamicDataInNode') };
};

const settleProviderRuns = async (observation: ReturnType<typeof observeProviderLifecycle>) => {
  const results = await Promise.all(observation.runs.map((run) => run.settled));
  // Retiring a query may settle its former consumer by cancellation rather than its old transport response.
  expect(results.every((result) => result.status === 'fulfilled' || isCancelledError(result.reason))).toBe(true);
};

const ProviderLifecycleProbe = ({
  connectionService,
  mounts,
}: {
  connectionService: unknown;
  mounts: { mounted: number; unmounted: number };
}) => {
  useEffect(() => {
    mounts.mounted += 1;
    return () => {
      mounts.unmounted += 1;
    };
  }, [mounts]);
  // Observe registration ordering without initiating validation on behalf of production.
  useEffect(() => {
    expect(ConnectionService()).toBe(connectionService);
  }, [connectionService]);
  return null;
};

const renderWithRealProviders = (workflow: Workflow, workflowId: string, providerId: string, connectionService: any, child: any = null) =>
  render(
    createElement(
      ReactQueryProvider,
      {},
      createElement(
        DesignerProvider,
        { id: providerId, options: getProviderOptions(connectionService) },
        createElement(BJSWorkflowProvider, { workflow, workflowId }, child ?? createElement('div', { 'data-testid': 'provider-ready' }))
      )
    )
  );

const editInputThroughEditor = async (store: ReturnType<typeof makeStore>, parameterKey: string, text: string) => {
  const groupEntry = Object.entries(store.getState().operations.inputParameters.Query.parameterGroups).find(([, group]) =>
    group.parameters.some((parameter) => parameter.parameterKey === parameterKey)
  );
  expect(groupEntry, `Expected editable parameter ${parameterKey}`).toBeDefined();
  const [groupId, group] = groupEntry!;
  const parameter = group.parameters.find((candidate) => candidate.parameterKey === parameterKey)!;
  expect(parameter.hideInUI).toBeFalsy();
  expect(shouldUseParameterInGroup(parameter, group.parameters)).toBe(true);

  let pendingUpdate: Promise<void> | undefined;
  const onValueChange = vi.fn(({ value }: ChangeState) => {
    pendingUpdate = store
      .dispatch(
        updateParameterAndDependencies({
          nodeId,
          groupId,
          parameterId: parameter.id,
          // Match ParametersTab's edit callback: edited values supersede the imported value.
          properties: { value, preservedValue: undefined },
          isTrigger: false,
          operationInfo,
          connectionReference: getConnectionReference(store.getState().connections, nodeId),
          nodeInputs: store.getState().operations.inputParameters.Query,
          dependencies: store.getState().operations.dependencies.Query,
        })
      )
      .unwrap();
  });
  connectionExpressionEditor.current = undefined;
  const { unmount } = render(
    createElement(
      IntlProvider,
      { locale: 'en' },
      createElement(SettingTokenField, {
        ...parameter,
        readOnly: parameter.editorOptions?.readOnly || store.getState().designerOptions.readOnly,
        tokenEditor: true,
        tokenMapping: {},
        getTokenPicker: () => null,
        onCastParameter: vi.fn(),
        onValueChange,
      })
    )
  );
  const editor = screen.getByRole('textbox', { name: `${parameter.label}${parameter.required ? ' Required' : ''}` });
  expect(editor).toBeVisible();
  expect(editor).toHaveAttribute('contenteditable', 'true');
  await waitFor(() => expect(connectionExpressionEditor.current).toBeDefined());
  act(() => editor.focus());
  await act(async () => {
    connectionExpressionEditor.current!.update(
      () => {
        const paragraph = $createParagraphNode().append($createTextNode(text));
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      { discrete: true }
    );
  });
  act(() => editor.blur());
  await waitFor(() => expect(onValueChange).toHaveBeenCalled());
  await pendingUpdate;
  expect(onValueChange).toHaveBeenLastCalledWith({
    value: [expect.objectContaining({ type: 'literal', value: text })],
  });
  const updated = store
    .getState()
    .operations.inputParameters.Query.parameterGroups[groupId].parameters.find((candidate) => candidate.id === parameter.id)!;
  expect(updated.value).toEqual([expect.objectContaining({ type: 'literal', value: text })]);
  expect(updated.preservedValue).toBeUndefined();
  unmount();
};

beforeEach(() => {
  vi.restoreAllMocks();
  InitLoggerService([]);
  InitWorkflowService({} as any);
  InitExperimentationServiceService(undefined);
  InitOperationManifestService({
    isSupported: () => true,
    isAliasingSupported: () => false,
    getOperationManifest: async () => manifest,
    getOperationInfo: async () => operationInfo,
    isBuiltInConnector: () => false,
  } as any);
  getReactQueryClient().clear();
});

describe('ServiceProvider runtime connection expressions', () => {
  describe.each(['imported', 'authored'] as const)('%s manual root requiredness', (source) => {
    const initializeRequirednessStore = async (rootRequired: boolean, childRequired: string[], body?: Record<string, unknown>) => {
      const requirednessManifest: OperationManifest = {
        ...dynamicBodyManifest,
        properties: {
          ...dynamicBodyManifest.properties,
          inputs: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              body: {
                type: 'object',
                title: 'Payload',
                required: childRequired,
                'x-ms-dynamic-properties': { operationId: 'getPayloadSchema', parameters: {}, itemValuePath: 'schema' },
              },
            },
            required: rootRequired ? ['body'] : [],
          },
        },
      };
      vi.spyOn(OperationManifestService(), 'getOperationManifest').mockResolvedValue(requirednessManifest);
      const expression = "@outputs('Resolve_Connection')";
      const state = await buildState(source === 'authored' ? 'Sql' : expression);
      const operation = state.workflow.operations.Query as LogicAppsV2.ServiceProvider;
      operation.inputs.parameters = { query: 'original', ...(body === undefined ? {} : { body }) };
      state.workflow.originalDefinition.actions.Query = operation;
      const store = makeStore(state);
      const nodes = await initializeOperationDetailsForManifest(nodeId, operation, {}, false, 'stateful', store.dispatch);
      store.dispatch(initializeNodes({ nodes: nodes! }));
      if (source === 'authored') {
        expect(
          store
            .getState()
            .operations.inputParameters.Query.parameterGroups.default.parameters.some(
              (parameter) => parameter.parameterKey === 'inputs.$.body'
            )
        ).toBe(false);
        await store.dispatch(updateNodeConnectionExpression({ nodeId, expression })).unwrap();
      }
      await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
      return store;
    };

    it.each([
      { rootRequired: false, childRequired: ['message'] },
      { rootRequired: false, childRequired: [] },
      { rootRequired: true, childRequired: ['message'] },
      { rootRequired: true, childRequired: [] },
    ])(
      'keeps root required=$rootRequired independent of child requirements $childRequired when omitted',
      async ({ rootRequired, childRequired }) => {
        const schemaRequest = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties');
        const connectionRequest = vi.spyOn(connectionQueries, 'getConnection');
        const store = await initializeRequirednessStore(rootRequired, childRequired);
        const group = store.getState().operations.inputParameters.Query.parameterGroups.default;
        const root = group.parameters.find((parameter) => parameter.parameterKey === 'inputs.$.body')!;
        expect(root.required).toBe(rootRequired);
        expect(root.schema.required).toEqual(childRequired);
        expect(group.rawInputs.find((parameter) => parameter.key === 'inputs.$.body')?.required).toBe(rootRequired);
        expect(getConnectionReference(store.getState().connections, nodeId)).toBeUndefined();
        await store
          .dispatch(
            updateParameterAndDependencies({
              nodeId,
              groupId: 'default',
              parameterId: root.id,
              properties: { value: root.value, preservedValue: undefined },
              isTrigger: false,
              operationInfo,
              connectionReference: undefined,
              nodeInputs: store.getState().operations.inputParameters.Query,
              dependencies: store.getState().operations.dependencies.Query,
            })
          )
          .unwrap();

        const updated = store
          .getState()
          .operations.inputParameters.Query.parameterGroups.default.parameters.find((parameter) => parameter.id === root.id)!;
        if (rootRequired) {
          expect(updated.validationErrors?.length).toBeGreaterThan(0);
          await expect(serializeWorkflow(store.getState())).rejects.toMatchObject({ code: 'InvalidParameters' });
        } else {
          expect(updated.validationErrors).toEqual([]);
          const saved = (await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider;
          expect(saved.inputs.parameters).toEqual({ query: 'original' });
          expect(saved.inputs.serviceProviderConfiguration.connectionName).toBe("@outputs('Resolve_Connection')");
        }
        expect(schemaRequest).not.toHaveBeenCalled();
        expect(connectionRequest).not.toHaveBeenCalled();
      }
    );

    it('retains required and type validation for children when a present optional object is expanded', async () => {
      const schema: OpenAPIV2.SchemaObject = {
        type: 'object',
        properties: { message: { type: 'string' }, count: { type: 'integer' } },
        required: ['message'],
      };
      const schemaRequest = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties').mockResolvedValue(schema);
      vi.spyOn(connectionQueries, 'getConnection').mockResolvedValue({ id: reference.connection.id, properties: {} } as Connection);
      const store = await initializeRequirednessStore(false, ['message'], { message: 'present', count: 7 });
      const root = store
        .getState()
        .operations.inputParameters.Query.parameterGroups.default.parameters.find(
          (parameter) => parameter.parameterKey === 'inputs.$.body'
        )!;
      expect(root.required).toBe(false);
      expect(root.schema.required).toEqual(['message']);
      expect(validateParameter(root, root.value)).toEqual([]);
      expect(schemaRequest).not.toHaveBeenCalled();
      await store
        .dispatch(
          updateNodeConnectionExpression({
            nodeId,
            expression: "@outputs('Resolve_Connection')",
            designTimeReferenceKey: 'Sql',
          })
        )
        .unwrap();
      expect(schemaRequest).toHaveBeenCalled();
      const updateChild = async (key: string, value: string | undefined) => {
        const inputs = store.getState().operations.inputParameters.Query;
        const child = inputs.parameterGroups.default.parameters.find((parameter) => parameter.parameterKey === key)!;
        await store
          .dispatch(
            updateParameterAndDependencies({
              nodeId,
              groupId: 'default',
              parameterId: child.id,
              properties: { value: value === undefined ? [] : [{ id: 'edited-child', type: 'literal', value }], preservedValue: undefined },
              isTrigger: false,
              operationInfo,
              connectionReference: getConnectionReference(store.getState().connections, nodeId),
              nodeInputs: inputs,
              dependencies: store.getState().operations.dependencies.Query,
            })
          )
          .unwrap();
        return store
          .getState()
          .operations.inputParameters.Query.parameterGroups.default.parameters.find((parameter) => parameter.id === child.id)!;
      };

      const missingChild = await updateChild('inputs.$.body.message', undefined);
      expect(missingChild.required).toBe(true);
      expect(missingChild.validationErrors?.length).toBeGreaterThan(0);
      await expect(serializeWorkflow(store.getState())).rejects.toMatchObject({ code: 'InvalidParameters' });
      await updateChild('inputs.$.body.message', 'updated');
      const invalidChild = await updateChild('inputs.$.body.count', 'not-a-number');
      expect(invalidChild.validationErrors?.length).toBeGreaterThan(0);
      await expect(serializeWorkflow(store.getState())).rejects.toMatchObject({ code: 'InvalidParameters' });
      const validChild = await updateChild('inputs.$.body.count', '42');
      expect(validChild.validationErrors).toEqual([]);
      const saved = (await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider;
      expect(saved.inputs.parameters.body).toEqual({ message: 'updated', count: 42 });
    });
  });

  it('keeps a declared dynamic-schema object visible and manually editable without a design-time connection, then saves it', async () => {
    const dynamicManifest: OperationManifest = {
      ...manifest,
      properties: {
        ...manifest.properties,
        inputs: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            body: {
              type: 'object',
              title: 'Payload',
              'x-ms-dynamic-properties': { operationId: 'getPayloadSchema', parameters: {}, itemValuePath: 'schema' },
            },
          },
          required: ['body'],
        },
      },
    };
    expect(new ManifestParser(dynamicManifest, false).getInputParameters(false, 0)['inputs.$.body'].dynamicSchema).toBeDefined();
    vi.spyOn(OperationManifestService(), 'getOperationManifest').mockResolvedValue(dynamicManifest);
    const schemaRequest = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties');
    const connectionRequest = vi.spyOn(connectionQueries, 'getConnection');
    const state = await buildState();
    const store = makeStore(state);
    const nodes = await initializeOperationDetailsForManifest(
      nodeId,
      state.workflow.operations.Query,
      {},
      false,
      'stateful',
      store.dispatch
    );
    store.dispatch(initializeNodes({ nodes: nodes! }));
    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);

    const nodeInputs = store.getState().operations.inputParameters.Query;
    const groupEntry = Object.entries(nodeInputs.parameterGroups).find(([, group]) =>
      group.parameters.some((parameter) => parameter.parameterName === 'body')
    );
    expect(groupEntry, 'Declared dynamic body must remain available for manual editing without a design-time connection').toBeDefined();
    const [groupId, group] = groupEntry!;
    const parameter = group.parameters.find((candidate) => candidate.parameterName === 'body')!;
    expect(parameter.type).toBe('object');
    expect(parameter.hideInUI).toBeFalsy();
    expect(shouldUseParameterInGroup(parameter, group.parameters)).toBe(true);
    expect(store.getState().operations.dependencies.Query.inputs[parameter.parameterKey]).toBeDefined();
    expect(getConnectionReference(store.getState().connections, nodeId)).toBeUndefined();

    let pendingUpdate: Promise<void> | undefined;
    const onValueChange = vi.fn(({ value }: ChangeState) => {
      pendingUpdate = store
        .dispatch(
          updateParameterAndDependencies({
            nodeId,
            groupId,
            parameterId: parameter.id,
            properties: { value, preservedValue: undefined },
            isTrigger: false,
            operationInfo,
            connectionReference: undefined,
            nodeInputs: store.getState().operations.inputParameters.Query,
            dependencies: store.getState().operations.dependencies.Query,
          })
        )
        .unwrap();
    });
    connectionExpressionEditor.current = undefined;
    render(
      createElement(
        IntlProvider,
        { locale: 'en' },
        createElement(SettingTokenField, {
          ...parameter,
          readOnly: parameter.editorOptions?.readOnly || store.getState().designerOptions.readOnly,
          tokenEditor: true,
          tokenMapping: {},
          getTokenPicker: () => null,
          onCastParameter: vi.fn(),
          onValueChange,
        })
      )
    );
    const editor = screen.getByRole('textbox', { name: `${parameter.label}${parameter.required ? ' Required' : ''}` });
    expect(editor).toBeVisible();
    expect(editor).toHaveAttribute('contenteditable', 'true');
    await waitFor(() => expect(connectionExpressionEditor.current).toBeDefined());
    const manualPayload = { message: 'manually edited', nested: { enabled: true }, rows: [{ id: 42 }] };
    act(() => editor.focus());
    await act(async () => {
      connectionExpressionEditor.current!.update(
        () => {
          const paragraph = $createParagraphNode().append($createTextNode(JSON.stringify(manualPayload)));
          $getRoot().clear().append(paragraph);
          paragraph.selectEnd();
        },
        { discrete: true }
      );
    });
    act(() => editor.blur());
    await waitFor(() => expect(onValueChange).toHaveBeenCalled());
    await pendingUpdate;
    expect(onValueChange).toHaveBeenLastCalledWith({
      value: [expect.objectContaining({ type: 'literal', value: JSON.stringify(manualPayload) })],
    });

    const saved = await serializeWorkflow(store.getState());
    expect((saved.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs.parameters.body).toEqual(manualPayload);
    expect((saved.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toBe(
      "@outputs('Resolve_Connection')"
    );
    expect(schemaRequest).not.toHaveBeenCalled();
    expect(connectionRequest).not.toHaveBeenCalled();
  });

  it('authors a no-reference expression on a dynamic-schema action and exposes an editable manual root', async () => {
    const schemaRequest = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties');
    const connectionRequest = vi.spyOn(connectionQueries, 'getConnection');
    const store = await initializeDynamicBodyStore('authored');
    const parameters = Object.values(store.getState().operations.inputParameters.Query.parameterGroups).flatMap(
      (group) => group.parameters
    );
    const root = parameters.find((parameter) => parameter.parameterKey === 'inputs.$.body');
    expect(root).toMatchObject({ type: 'object', info: { isDynamic: true, dynamicParameterReference: 'inputs.$.body' } });
    expect(getConnectionReference(store.getState().connections, nodeId)).toBeUndefined();

    await editInputThroughEditor(store, 'inputs.$.body', JSON.stringify(editedManualBody));
    const saved = (await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider;
    expect(saved.inputs.parameters).toEqual({ query: 'original', body: editedManualBody });
    expect(saved.inputs.serviceProviderConfiguration.connectionName).toBe("@outputs('Resolve_Connection')");
    expect(schemaRequest).not.toHaveBeenCalled();
    expect(connectionRequest).not.toHaveBeenCalled();
  });

  it.each(['design-time', 'static'] as const)(
    'preserves edited manual body and removed properties when selecting a %s connection',
    async (selection) => {
      const schemaRequest = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties').mockResolvedValue(bodySchema);
      const connection = { id: reference.connection.id, name: 'Sql', properties: {} } as Connection;
      vi.spyOn(connectionQueries, 'getConnection').mockResolvedValue(connection);
      const store = await initializeDynamicBodyStore();
      await editInputThroughEditor(store, 'inputs.$.body', JSON.stringify(editedManualBody));
      expect(schemaRequest).not.toHaveBeenCalled();
      const before = (await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider;
      expect(before.inputs.parameters.body).toEqual(editedManualBody);
      expect(before.inputs.parameters.body).not.toHaveProperty('selection');

      if (selection === 'design-time') {
        await store
          .dispatch(
            updateNodeConnectionExpression({
              nodeId,
              expression: "@outputs('Resolve_Connection')",
              designTimeReferenceKey: 'Sql',
            })
          )
          .unwrap();
      } else {
        await store
          .dispatch(updateNodeConnection({ nodeId, connector: { id: connectorId, properties: {} } as Connector, connection }))
          .unwrap();
      }

      expect(schemaRequest).toHaveBeenCalled();
      expect(
        schemaRequest.mock.calls.every(
          ([connectionId, providerId]) => connectionId === reference.connection.id && providerId === connectorId
        )
      ).toBe(true);
      const parameters = Object.values(store.getState().operations.inputParameters.Query.parameterGroups).flatMap(
        (group) => group.parameters
      );
      expect(parameters.some((parameter) => parameter.parameterKey === 'inputs.$.body')).toBe(false);
      expect(parameters.find((parameter) => parameter.parameterKey === 'inputs.$.body.message')?.value).toEqual([
        expect.objectContaining({ type: 'literal', value: editedManualBody.message }),
      ]);
      const saved = (await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider;
      expect(saved.inputs.parameters).toEqual({ query: 'original', body: editedManualBody });
      expect(saved.inputs.parameters.body).not.toHaveProperty('selection');
      expect(saved.inputs.serviceProviderConfiguration.connectionName).toBe(
        selection === 'static' ? 'Sql' : "@outputs('Resolve_Connection')"
      );
    }
  );

  it('removes a design-time connection while retaining editable expanded fields and manual-body edits', async () => {
    const expression = "@outputs('Resolve_Connection')";
    const schemaRequest = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties').mockResolvedValue(bodySchema);
    const connectionRequest = vi
      .spyOn(connectionQueries, 'getConnection')
      .mockResolvedValue({ id: reference.connection.id, name: 'Sql', properties: {} } as Connection);
    const store = await initializeDynamicBodyStore();
    await editInputThroughEditor(store, 'inputs.$.body', JSON.stringify(editedManualBody));
    await store.dispatch(updateNodeConnectionExpression({ nodeId, expression, designTimeReferenceKey: 'Sql' })).unwrap();
    expect(schemaRequest).toHaveBeenCalled();
    expect(
      ((await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider).inputs.parameters.body
    ).toEqual(editedManualBody);
    schemaRequest.mockClear();
    connectionRequest.mockClear();

    await store.dispatch(updateNodeConnectionExpression({ nodeId, expression })).unwrap();
    expect(store.getState().connections.connectionsMapping.Query).toEqual({ kind: 'expression', expression });
    expect(getConnectionReference(store.getState().connections, nodeId)).toBeUndefined();
    const parameters = Object.values(store.getState().operations.inputParameters.Query.parameterGroups).flatMap(
      (group) => group.parameters
    );
    expect(parameters.some((parameter) => parameter.parameterKey === 'inputs.$.body')).toBe(false);
    await editInputThroughEditor(store, 'inputs.$.body.message', 'edited after removing design-time');

    const saved = (await serializeWorkflow(store.getState())).definition.actions.Query as LogicAppsV2.ServiceProvider;
    expect(saved.inputs.parameters.body).toEqual({ ...editedManualBody, message: 'edited after removing design-time' });
    expect(saved.inputs.parameters.body).not.toHaveProperty('selection');
    expect(saved.inputs.serviceProviderConfiguration.connectionName).toBe(expression);
    expect(schemaRequest).not.toHaveBeenCalled();
    expect(connectionRequest).not.toHaveBeenCalled();
  });

  it('imports through the real manifest deserializer and saves all unmodeled dynamic inputs', async () => {
    const state = await buildState();
    const store = makeStore(state);
    const data = await initializeOperationDetailsForManifest(
      nodeId,
      state.workflow.operations.Query,
      {},
      false,
      'stateful',
      store.dispatch
    );
    expect(data).toHaveLength(1);
    store.dispatch(initializeNodes({ nodes: data! }));
    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    const saved = await serializeWorkflow(store.getState());
    expect((saved.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs).toEqual(
      (state.workflow.operations.Query as LogicAppsV2.ServiceProvider).inputs
    );
  });

  it('round trips Code View expression edits through real deserialization and serialization', async () => {
    const state = await buildState('Sql');
    const store = makeStore(state);
    const operation = state.workflow.operations.Query as LogicAppsV2.ServiceProvider;
    const expression = "@triggerBody()?['connectionName']";
    const edited = {
      ...operation,
      inputs: {
        ...operation.inputs,
        serviceProviderConfiguration: { ...operation.inputs.serviceProviderConfiguration, connectionName: expression },
        parameters: { query: 'code-edited', body: { payload: [1, 2] } },
      },
    };
    await store.dispatch(updateNodeFromCodeView({ nodeId, serializedOperation: edited })).unwrap();
    expect(store.getState().connections.connectionsMapping.Query).toEqual({ kind: 'expression', expression });
    const saved = await serializeWorkflow(store.getState());
    expect((saved.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs).toEqual(edited.inputs);
  });

  it.each([
    "@outputs('Resolve_Connection')",
    "@triggerBody()?['connectionName']",
    "@parameters('defaultConnection')",
    "@if(equals(triggerBody()?['region'], 'west'), 'Sql', 'sql')",
    "sql-@{parameters('defaultConnection')}",
    "@{'Sql'}",
    "@'Sql'",
  ])('imports and serializes %s without a design-time connection', async (expression) => {
    const state = await buildState(expression);
    expect(state.connections.connectionsMapping.Query).toEqual({ kind: 'expression', expression });
    const serialized = await serializeWorkflow(state);
    expect((serialized.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration).toEqual({
      serviceProviderId: connectorId,
      operationId: 'executeQuery',
      connectionName: expression,
    });
    expect(serialized.connectionReferences).toEqual(state.connections.connectionReferences);
    expect((serialized.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs.parameters).toEqual({
      query: 'edited',
      body: { rows: [{ id: 7 }], selection: "@outputs('Resolve_Connection')" },
    });
  });

  it.each([
    ['Sql', 'Sql'],
    ['sql', 'sql'],
    ['@@outputs()', '@outputs()'],
    ['x@@{y}', 'x@{y}'],
  ])('keeps the exact literal key %s', async (runtimeName, key) => {
    const state = await buildState(runtimeName);
    expect(state.connections.connectionsMapping.Query).toBe(key);
    const serialized = await serializeOperation(state, nodeId, { skipValidation: true });
    expect((serialized as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toBe(runtimeName);
  });

  it('preserves malformed input on import but rejects validation-enabled save', async () => {
    const expression = '@if(';
    const state = await buildState(expression);
    expect(state.connections.connectionsMapping.Query).toEqual({ kind: 'expression', expression });
    expect(getConnectionId(state.connections, nodeId)).toBe('');
    expect(isConnectionExpressionValid(expression)).toBe(false);
    await expect(serializeWorkflow(state)).rejects.toThrow();
    const saved = await serializeWorkflow(state, { skipValidation: true });
    expect((saved.definition.actions.Query as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toBe(
      expression
    );
  });

  it('uses only the exact design-time reference and never serializes it as the runtime value', async () => {
    const state = await buildState();
    state.connections.connectionsMapping.Query = { kind: 'expression', expression: '@triggerBody()', designTimeReferenceKey: 'Sql' };
    expect(getConnectionReference(state.connections, nodeId)).toBe(reference);
    const saved = await serializeOperation(state, nodeId);
    expect((saved as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toBe('@triggerBody()');
    state.connections.connectionsMapping.Query.designTimeReferenceKey = 'SQL';
    expect(getConnectionReference(state.connections, nodeId)).toBeUndefined();
    state.connections.connectionsMapping.Query = 'sql';
    expect(getConnectionId(state.connections, nodeId)).toBe('/serviceProviders/sql/connections/sql');
  });

  it('does not make connection, dynamic-list, schema, or tree requests without a design-time selection', async () => {
    const state = await buildState();
    const connectionSpy = vi.spyOn(connectionQueries, 'getConnection');
    const listSpy = vi.spyOn(dynamicQueries, 'getListDynamicValues');
    const schemaSpy = vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties');
    const treeSpy = vi.spyOn(dynamicQueries, 'getDynamicTreeItems');
    const nodeInputs = state.operations.inputParameters.Query;
    const selected = getConnectionReference(state.connections, nodeId);
    expect(await isConnectionReferenceValid(operationInfo, selected)).toBe(false);
    await initializeDynamicDataInNodes(() => state, vi.fn(), [nodeId]);
    expect(await getDynamicValues({} as any, nodeInputs, operationInfo, selected, {}, {})).toEqual([]);
    expect(await getDynamicSchema({} as any, nodeInputs, operationInfo, selected, [], {}, {})).toBeNull();
    expect(await getFolderItems(undefined, {} as any, nodeInputs, operationInfo, selected, {}, {})).toEqual([]);
    for (const spy of [connectionSpy, listSpy, schemaSpy, treeSpy]) {
      expect(spy).not.toHaveBeenCalled();
    }
    expect(canInvokeDynamicConnection({ connectorId: 'builtin', operationId: 'compose' }, undefined)).toBe(true);
    expect(state.operations.inputParameters.Query).toBe(nodeInputs);
  });

  it('keeps case-distinct design-time cache entries separate and refuses direct expression resource requests', async () => {
    expect(connectionQueries.getConnectionQueryKey(reference.connection.id)).not.toBe(
      connectionQueries.getConnectionQueryKey('/serviceProviders/sql/connections/sql')
    );
    expect(await connectionQueries.getConnection("@outputs('Resolve_Connection')", connectorId, true)).toBeNull();
  });

  it('does not send dynamic requests through a wrong-provider design-time reference', async () => {
    const state = await buildState();
    state.connections.connectionReferences.Sql = {
      api: { id: '/serviceProviders/azureblob' },
      connection: { id: '/serviceProviders/azureblob/connections/Sql' },
    };
    state.connections.connectionsMapping.Query = { kind: 'expression', expression: '@triggerBody()', designTimeReferenceKey: 'Sql' };
    const selected = getConnectionReference(state.connections, nodeId);
    const nodeInputs = state.operations.inputParameters.Query;
    const requests = [
      vi.spyOn(connectionQueries, 'getConnection'),
      vi.spyOn(dynamicQueries, 'getListDynamicValues'),
      vi.spyOn(dynamicQueries, 'getDynamicSchemaProperties'),
      vi.spyOn(dynamicQueries, 'getDynamicTreeItems'),
    ];

    expect(selected).toBe(state.connections.connectionReferences.Sql);
    expect(canInvokeDynamicConnection(operationInfo, reference)).toBe(true);
    expect(canInvokeDynamicConnection(operationInfo, selected)).toBe(false);
    expect(await getDynamicValues({} as any, nodeInputs, operationInfo, selected, {}, {})).toEqual([]);
    expect(await getDynamicSchema({} as any, nodeInputs, operationInfo, selected, [], {}, {})).toBeNull();
    expect(await getFolderItems(undefined, {} as any, nodeInputs, operationInfo, selected, {}, {})).toEqual([]);
    for (const request of requests) {
      expect(request).not.toHaveBeenCalled();
    }
  });

  it('resolves exact provider connection IDs without using a resource fallback for a differently cased key', async () => {
    const upperCaseConnection = { id: `${connectorId}/connections/Sql`, name: 'Sql' };
    const lowerCaseConnection = { id: `${connectorId}/connections/sql`, name: 'sql' };
    const resourceFallback = vi.fn().mockResolvedValue(upperCaseConnection);
    InitConnectionService({
      getConnections: vi.fn().mockResolvedValue([upperCaseConnection, lowerCaseConnection]),
      getConnection: resourceFallback,
    } as any);

    expect(await connectionQueries.getConnection(upperCaseConnection.id, connectorId, true)).toEqual(upperCaseConnection);
    expect(await connectionQueries.getConnection(lowerCaseConnection.id, connectorId, true)).toEqual(lowerCaseConnection);
    expect(await connectionQueries.getConnection(`${connectorId}/connections/SQL`, connectorId, true)).toBeNull();
    expect(resourceFallback).not.toHaveBeenCalled();
  });

  it('ignores stale connection errors for a valid expression, not malformed expressions', async () => {
    const state = await buildState();
    state.operations.errors.Query = { [ErrorLevel.Connection]: { message: 'old static connection', level: ErrorLevel.Connection } } as any;
    await expect(serializeWorkflow(state)).resolves.toBeDefined();
    state.connections.connectionsMapping.Query = { kind: 'expression', expression: '@broken(' };
    await expect(serializeWorkflow(state)).rejects.toThrow();
  });

  it('refreshes stale cached connector results after connection service replacement and clears only connection-level errors', async () => {
    const state = await buildState('Sql');
    const store = makeStore(state);
    const emptyService = createConnectionService(Promise.resolve([]));
    await registerConnectionService(store, emptyService);

    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');
    expect(emptyService.getConnections).toHaveBeenCalledTimes(1);

    store.dispatch(
      updateErrorDetails({
        id: nodeId,
        errorInfo: { level: ErrorLevel.Default, message: 'preserve non-connection errors' },
      })
    );
    const validService = createConnectionService(Promise.resolve([{ id: reference.connection.id, properties: {} } as Connection]));
    await registerConnectionService(store, validService);
    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);

    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Default]?.message).toBe('preserve non-connection errors');
    expect(validService.getConnections).toHaveBeenCalledTimes(1);
  });

  it.each(['missing managed identity', 'connection setup denied'])(
    'preserves %s recorded while a valid lookup is pending and keeps static serialization blocked',
    async (message) => {
      const state = await buildState('Sql');
      const deferred = createDeferred<Connection | null>();
      const lookup = vi.spyOn(connectionQueries, 'getConnection').mockReturnValue(deferred.promise);
      const store = makeStore(state);
      const validation = initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
      await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
      const errorInfo = { level: ErrorLevel.Connection, message };
      store.dispatch(
        updateErrorDetails({
          id: nodeId,
          errorInfo,
        })
      );
      deferred.resolve({ id: reference.connection.id, properties: {} } as Connection);
      await validation;
      expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toEqual(errorInfo);
      await expect(serializeWorkflow(store.getState())).rejects.toMatchObject({ code: SerializationErrorCode.INVALID_CONNECTIONS });
    }
  );

  it.each(['missing managed identity', 'connection setup denied'])(
    'preserves %s recorded while an invalid lookup is pending',
    async (message) => {
      const state = await buildState('Sql');
      const deferred = createDeferred<Connection | null>();
      const lookup = vi.spyOn(connectionQueries, 'getConnection').mockReturnValue(deferred.promise);
      const store = makeStore(state);
      const validation = initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
      await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
      const errorInfo = { level: ErrorLevel.Connection, message };
      store.dispatch(
        updateErrorDetails({
          id: nodeId,
          errorInfo,
        })
      );
      deferred.resolve(null);
      await validation;
      expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toEqual(errorInfo);
    }
  );

  it.each([true, false])('uses current service resource validity after a list miss (previous valid=%s)', async (previousValid) => {
    const state = await buildState('Sql');
    const store = makeStore(state);
    const managedConnectorId = '/managedApis/sql';
    const managedConnectionId = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/sql';
    const valid = { id: managedConnectionId, properties: {} } as Connection;
    const invalid = { id: managedConnectionId, properties: { statuses: [{ status: 'Error' }] } } as Connection;
    const previousService = createConnectionService([], previousValid ? valid : invalid);
    const replacementService = createConnectionService([], previousValid ? invalid : valid);
    const managedReference = { api: { id: managedConnectorId }, connection: { id: managedConnectionId } };
    const managedOperation = { ...operationInfo, type: 'ApiConnection', connectorId: managedConnectorId };

    await registerConnectionService(store, previousService);
    expect(await isConnectionReferenceValid(managedOperation, managedReference)).toBe(previousValid);
    expect(previousService.getConnection).toHaveBeenCalledTimes(1);
    getReactQueryClient().setQueryData(['unrelated-query'], { keep: true });
    await registerConnectionService(store, replacementService);
    expect(await isConnectionReferenceValid(managedOperation, managedReference)).toBe(!previousValid);
    expect(replacementService.getConnection).toHaveBeenCalledTimes(1);
    expect(getReactQueryClient().getQueryData(['unrelated-query'])).toEqual({ keep: true });
  });

  it.each(['mapping', 'reference', 'service', 'unchanged'] as const)(
    'keeps deferred schema writes owned by the current connection after a %s transition',
    async (transition) => {
      const currentStore = await initializeDynamicBodyStore();
      currentStore.dispatch(setNodeConnectionMapping({ nodeId, mapping: 'Sql' }));
      vi.spyOn(connectionQueries, 'getConnection').mockResolvedValue({ id: reference.connection.id, properties: {} } as Connection);
      const deferred = createDeferred<OpenAPIV2.SchemaObject>();
      const schemaRequest = vi
        .spyOn(dynamicQueries, 'getDynamicSchemaProperties')
        .mockReturnValueOnce(deferred.promise)
        .mockResolvedValue(bodySchema);
      const oldDispatch = vi.fn(currentStore.dispatch);
      const pendingValidation = initializeDynamicDataInNodes(currentStore.getState, oldDispatch, [nodeId]);
      await waitFor(() => expect(schemaRequest).toHaveBeenCalledTimes(1));
      let selection: Promise<unknown> | undefined;
      if (transition === 'mapping') {
        selection = currentStore
          .dispatch(
            updateNodeConnectionExpression({
              nodeId,
              expression: "@outputs('Resolve_Connection')",
              designTimeReferenceKey: 'Sql',
            })
          )
          .unwrap();
        await waitFor(() => expect(isExpressionConnectionMapping(currentStore.getState().connections.connectionsMapping.Query)).toBe(true));
        expect(getConnectionReference(currentStore.getState().connections, nodeId)).toBe(reference);
      } else if (transition === 'reference') {
        currentStore.dispatch(initializeConnectionReferences({ Sql: { ...reference } }));
      } else if (transition === 'service') {
        InitConnectionService(createConnectionService([]) as any);
      }

      const inputsAfterTransition = currentStore.getState().operations.inputParameters.Query;
      oldDispatch.mockClear();
      deferred.resolve(bodySchema);
      await pendingValidation;
      await selection;
      const nodeWrites = oldDispatch.mock.calls.filter(([action]) => (action as any)?.payload?.nodeId === nodeId);
      if (transition === 'unchanged') {
        expect(nodeWrites.length).toBeGreaterThan(0);
        expect(currentStore.getState().operations.inputParameters.Query).not.toBe(inputsAfterTransition);
        expect(currentStore.getState().operations.inputParameters.Query.parameterGroups.default.parameters).toContainEqual(
          expect.objectContaining({ parameterKey: 'inputs.$.body.message' })
        );
      } else {
        expect(nodeWrites).toEqual([]);
        if (transition !== 'mapping') {
          expect(currentStore.getState().operations.inputParameters.Query).toBe(inputsAfterTransition);
        }
      }
    }
  );

  it.each([true, false])(
    'ignores pending static validation after expression selection with the same reference (old valid=%s)',
    async (oldValid) => {
      const state = await buildState('Sql');
      const deferred = createDeferred<Connection | null>();
      const valid = { id: reference.connection.id, properties: {} } as Connection;
      const lookup = vi.spyOn(connectionQueries, 'getConnection').mockReturnValueOnce(deferred.promise).mockResolvedValue(valid);
      const store = makeStore(state);
      const oldDispatch = vi.fn(store.dispatch);
      const refresh = vi.spyOn(parameterHelpers, 'updateDynamicDataInNode');
      const oldValidation = initializeDynamicDataInNodes(store.getState, oldDispatch, [nodeId]);
      await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));

      await store
        .dispatch(
          updateNodeConnectionExpression({
            nodeId,
            expression: "@outputs('Resolve_Connection')",
            designTimeReferenceKey: 'Sql',
          })
        )
        .unwrap();
      expect(getConnectionReference(store.getState().connections, nodeId)).toBe(reference);
      expect(store.getState().connections.connectionsMapping.Query).toEqual({
        kind: 'expression',
        expression: "@outputs('Resolve_Connection')",
        designTimeReferenceKey: 'Sql',
      });

      const refreshCountAfterSwitch = refresh.mock.calls.length;
      deferred.resolve(oldValid ? valid : null);
      await oldValidation;
      expect(oldDispatch.mock.calls.filter(([action]) => (action as any)?.type === updateErrorDetails.type)).toEqual([]);
      expect(refresh).toHaveBeenCalledTimes(refreshCountAfterSwitch);
      expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
    }
  );

  it('refreshes connector caches when returning to a thunk-registered service after direct service replacement', async () => {
    const state = await buildState('Sql');
    const store = makeStore(state);
    const managedConnectorId = '/managedApis/sql';
    const previousService = createConnectionService(Promise.resolve([]));
    const directReplacementService = createConnectionService(
      Promise.resolve([{ id: '/managedApis/sql/connections/direct' } as Connection])
    );

    await registerConnectionService(store, previousService);
    expect(await connectionQueries.getConnectionsForConnector(managedConnectorId)).toEqual([]);

    InitConnectionService(directReplacementService as any);
    connectionQueries.clearConnectionCaches();
    await connectionQueries.getConnectionsForConnector(managedConnectorId);
    expect(directReplacementService.getConnections).toHaveBeenCalledTimes(1);

    await registerConnectionService(store, previousService);
    expect(await connectionQueries.getConnectionsForConnector(managedConnectorId)).toEqual([]);
    expect(previousService.getConnections).toHaveBeenCalledTimes(2);
  });

  it('keeps the current invalid-connection error when an older valid check resolves after same-alias reference replacement', async () => {
    const firstServiceConnections = createDeferred<Connection[]>();
    const initialValidService = createConnectionService(firstServiceConnections.promise);
    const state = await buildState('Sql');
    const store = makeStore(state);
    await registerConnectionService(store, initialValidService);

    const staleDispatch = vi.fn(store.dispatch);
    const staleValidRun = initializeDynamicDataInNodes(store.getState, staleDispatch as any, [nodeId]);
    await waitFor(() => expect(initialValidService.getConnections).toHaveBeenCalledTimes(1));

    store.dispatch(
      initializeConnectionReferences({
        Sql: {
          ...reference,
          connection: { ...reference.connection },
          connectionRuntimeUrl: 'https://updated-runtime-url',
          connectionProperties: { authType: 'managedIdentity' },
        },
      } as any)
    );
    const replacementInvalidService = createConnectionService(Promise.resolve([]));
    await registerConnectionService(store, replacementInvalidService);

    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');

    firstServiceConnections.resolve([{ id: reference.connection.id, properties: {} } as Connection]);
    await staleValidRun;

    const staleClearedConnectionError = staleDispatch.mock.calls.some(([action]) => {
      const payload = (action as any)?.payload;
      return (
        (action as any)?.type === updateErrorDetails.type &&
        payload?.id === nodeId &&
        Array.isArray(payload?.clearLevels) &&
        payload.clearLevels.includes(ErrorLevel.Connection)
      );
    });

    expect(staleClearedConnectionError).toBe(false);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');
  });

  it('keeps the current invalid-connection error when an older valid check resolves after service replacement with the same selected reference', async () => {
    const firstServiceConnections = createDeferred<Connection[]>();
    const initialValidService = createConnectionService(firstServiceConnections.promise);
    const state = await buildState('Sql');
    const store = makeStore(state);
    store.dispatch(setNodeConnectionMapping({ nodeId, mapping: 'Sql' }));
    await registerConnectionService(store, initialValidService);

    const staleValidRun = initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    await waitFor(() => expect(initialValidService.getConnections).toHaveBeenCalledTimes(1));

    const replacementInvalidService = createConnectionService(Promise.resolve([]));
    await registerConnectionService(store, replacementInvalidService);
    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');

    firstServiceConnections.resolve([{ id: reference.connection.id, properties: {} } as Connection]);
    await staleValidRun;

    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');
  });

  it('does not set a stale invalid-connection error when an older invalid check resolves after a newer valid one', async () => {
    const firstServiceConnections = createDeferred<Connection[]>();
    const initialInvalidService = createConnectionService(firstServiceConnections.promise);
    const state = await buildState('Sql');
    const store = makeStore(state);
    store.dispatch(setNodeConnectionMapping({ nodeId, mapping: 'Sql' }));
    await registerConnectionService(store, initialInvalidService);

    const staleDispatch = vi.fn(store.dispatch);
    const staleInvalidRun = initializeDynamicDataInNodes(store.getState, staleDispatch as any, [nodeId]);
    await waitFor(() => expect(initialInvalidService.getConnections).toHaveBeenCalledTimes(1));

    const secondServiceConnections = createDeferred<Connection[]>();
    const replacementValidService = createConnectionService(secondServiceConnections.promise);
    await registerConnectionService(store, replacementValidService);
    const latestValidRun = initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    await waitFor(() => expect(replacementValidService.getConnections).toHaveBeenCalledTimes(1));
    secondServiceConnections.resolve([{ id: reference.connection.id, properties: {} } as Connection]);
    await latestValidRun;
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();

    firstServiceConnections.resolve([]);
    await staleInvalidRun;

    const staleSetConnectionError = staleDispatch.mock.calls.some(([action]) => {
      const payload = (action as any)?.payload;
      return (
        (action as any)?.type === updateErrorDetails.type && payload?.id === nodeId && payload?.errorInfo?.level === ErrorLevel.Connection
      );
    });

    expect(staleSetConnectionError).toBe(false);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
  });

  it('refreshes cached empty results across real provider transitions for the same alias/reference object without remounting', async () => {
    store.dispatch(resetWorkflowState());
    getReactQueryClient().clear();
    const observation = observeProviderLifecycle();
    const mountStats = { mounted: 0, unmounted: 0 };
    const workflow = buildWorkflowForProviderLifecycle(reference);
    const workflowId = 'provider-lifecycle-workflow';
    const emptyService = createConnectionService(Promise.resolve([]));
    const validService = createConnectionService(Promise.resolve([{ id: reference.connection.id, properties: {} } as Connection]));
    const connectionsQueryKey = ['connections', connectorId.toLowerCase()];

    const { rerender } = renderWithRealProviders(
      workflow,
      workflowId,
      'provider-lifecycle',
      emptyService,
      createElement(ProviderLifecycleProbe, { connectionService: emptyService, mounts: mountStats })
    );
    await waitFor(() => expect(observation.runs).toHaveLength(1));
    await settleProviderRuns(observation);
    expect(getConnectionReference(store.getState().connections, nodeId)).toBe(reference);
    await waitFor(() => expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection'));

    store.dispatch(
      updateErrorDetails({
        id: nodeId,
        errorInfo: { level: ErrorLevel.Default, message: 'preserve non-connection errors' },
      })
    );
    const queryGroup = Object.entries(store.getState().operations.inputParameters.Query.parameterGroups).find(([, group]) =>
      group.parameters.some((parameter) => parameter.parameterName === 'query')
    )!;
    const queryParameter = queryGroup[1].parameters.find((parameter) => parameter.parameterName === 'query')!;
    store.dispatch(
      updateNodeParameters({
        nodeId,
        parameters: [
          {
            groupId: queryGroup[0],
            parameterId: queryParameter.id,
            propertiesToUpdate: { value: [{ id: 'user-edit', type: 'literal', value: 'edited without saving' }] },
          },
        ],
      })
    );
    store.dispatch(setIsWorkflowDirty(true));
    const graphBeforeReplacement = store.getState().workflow.graph;
    getReactQueryClient().setQueryData(['unrelated-query'], { keep: true });

    const renderTransition = () =>
      createElement(
        ReactQueryProvider,
        {},
        createElement(
          DesignerProvider,
          { id: 'provider-lifecycle', options: getProviderOptions(validService) },
          createElement(
            BJSWorkflowProvider,
            { workflow, workflowId },
            createElement(ProviderLifecycleProbe, { connectionService: validService, mounts: mountStats })
          )
        )
      );
    rerender(renderTransition());

    await waitFor(() => expect(observation.runs).toHaveLength(2));
    await waitFor(() => expect(validService.getConnections).toHaveBeenCalled());
    await settleProviderRuns(observation);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
    expect(getConnectionReference(store.getState().connections, nodeId)).toBe(reference);

    expect(store.getState().operations.errors.Query?.[ErrorLevel.Default]?.message).toBe('preserve non-connection errors');
    expect(store.getState().workflow.graph).toBe(graphBeforeReplacement);
    expect(store.getState().workflow.isDirty).toBe(true);
    expect(
      store
        .getState()
        .operations.inputParameters.Query.parameterGroups[queryGroup[0]].parameters.find((parameter) => parameter.id === queryParameter.id)
        ?.value
    ).toEqual([{ id: 'user-edit', type: 'literal', value: 'edited without saving' }]);
    expect(getReactQueryClient().getQueryData(['unrelated-query'])).toEqual({ keep: true });
    expect(getReactQueryClient().getQueryData(connectionsQueryKey)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: reference.connection.id })])
    );
    expect(mountStats).toEqual({ mounted: 1, unmounted: 0 });

    const cachedData = getReactQueryClient().getQueryData(connectionsQueryKey);
    const lookupCount = validService.getConnections.mock.calls.length;
    const connectionActions = observation.runs[1].actions.filter((action) => action.type === updateErrorDetails.type);
    expect(connectionActions).toContainEqual(updateErrorDetails({ id: nodeId, clearLevels: [ErrorLevel.Connection] }));
    expect(observation.refreshes.mock.calls.filter(([id]) => id === nodeId)).toHaveLength(1);
    rerender(renderTransition());
    await settleProviderRuns(observation);
    expect(observation.runs).toHaveLength(2);
    expect(getReactQueryClient().getQueryData(connectionsQueryKey)).toBe(cachedData);
    expect(validService.getConnections).toHaveBeenCalledTimes(lookupCount);
    expect(mountStats).toEqual({ mounted: 1, unmounted: 0 });
  });

  it.each([false, true])('validates a simultaneous workflow/service transition once (host acknowledgement=%s)', async (acknowledgement) => {
    store.dispatch(resetWorkflowState());
    getReactQueryClient().clear();
    const observation = observeProviderLifecycle();
    const oldService = createConnectionService([]);
    const validService = createConnectionService([{ id: reference.connection.id, properties: {} } as Connection]);
    const workflow = buildWorkflowForProviderLifecycle(reference);
    const { rerender } = renderWithRealProviders(workflow, 'single-transition', 'single-transition', oldService);
    await waitFor(() => expect(observation.runs).toHaveLength(1));
    await settleProviderRuns(observation);
    const nextWorkflow = acknowledgement ? workflow : { ...workflow, parameters: { changed: { type: 'String', value: 'new version' } } };

    rerender(
      createElement(
        ReactQueryProvider,
        {},
        createElement(
          DesignerProvider,
          { id: 'single-transition', options: getProviderOptions(validService) },
          createElement(
            BJSWorkflowProvider,
            {
              workflow: nextWorkflow,
              workflowId: 'single-transition',
              ...(acknowledgement ? { externallyAppliedWorkflow: nextWorkflow } : {}),
            },
            createElement('div', { 'data-testid': 'provider-ready' })
          )
        )
      )
    );
    await waitFor(() => expect(validService.getConnections).toHaveBeenCalledTimes(1));
    await settleProviderRuns(observation);
    expect(observation.runs).toHaveLength(2);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
  });

  it('does not revalidate a replacement service for an unsupported multi-trigger workflow', async () => {
    store.dispatch(resetWorkflowState());
    getReactQueryClient().clear();
    const observation = observeProviderLifecycle();
    const initialService = createConnectionService([]);
    const replacementService = createConnectionService([]);
    const workflow = buildWorkflowForProviderLifecycle(reference);
    const { rerender } = renderWithRealProviders(workflow, 'multi-trigger', 'multi-trigger', initialService);
    await waitFor(() => expect(observation.runs).toHaveLength(1));
    await settleProviderRuns(observation);
    const unsupportedWorkflow = {
      ...workflow,
      definition: { ...workflow.definition, triggers: { ...workflow.definition.triggers, second: workflow.definition.triggers!.manual } },
    };
    rerender(
      createElement(
        ReactQueryProvider,
        {},
        createElement(
          DesignerProvider,
          { id: 'multi-trigger', options: getProviderOptions(replacementService) },
          createElement(BJSWorkflowProvider, { workflow: unsupportedWorkflow, workflowId: 'multi-trigger' })
        )
      )
    );
    await waitFor(() => expect(store.getState().workflow.hasUnsupportedMultipleTriggers).toBe(true));
    expect(observation.runs).toHaveLength(1);
    expect(replacementService.getConnections).not.toHaveBeenCalled();
  });

  it('reports service-only validation rejection at the logger boundary', async () => {
    store.dispatch(resetWorkflowState());
    getReactQueryClient().clear();
    const observation = observeProviderLifecycle();
    const initialService = createConnectionService([]);
    const replacementService = createConnectionService([]);
    const workflow = buildWorkflowForProviderLifecycle(reference);
    const { rerender } = renderWithRealProviders(workflow, 'validation-error', 'validation-error', initialService);
    await waitFor(() => expect(observation.runs).toHaveLength(1));
    await settleProviderRuns(observation);
    vi.mocked(operationDeserializer.initializeDynamicDataInNodes).mockRejectedValueOnce(new Error('validation unavailable'));
    const log = vi.fn();
    const options = getProviderOptions(replacementService);
    options.services.loggerService = { log } as any;
    rerender(
      createElement(
        ReactQueryProvider,
        {},
        createElement(
          DesignerProvider,
          { id: 'validation-error', options },
          createElement(BJSWorkflowProvider, { workflow, workflowId: 'validation-error' })
        )
      )
    );
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogEntryLevel.Error,
          area: 'BJSWorkflowProvider:ConnectionValidation',
          message: expect.stringContaining('validation unavailable'),
        })
      )
    );
  });

  it('ignores a deferred stale empty result from an older provider service after a newer valid transition with the same alias/reference object', async () => {
    store.dispatch(resetWorkflowState());
    getReactQueryClient().clear();
    const observation = observeProviderLifecycle();
    const mountStats = { mounted: 0, unmounted: 0 };
    const oldServiceDeferred = createDeferred<Connection[]>();
    const oldService = createConnectionService(oldServiceDeferred.promise);
    const validServiceDeferred = createDeferred<Connection[]>();
    const validService = createConnectionService(validServiceDeferred.promise);
    const workflow = buildWorkflowForProviderLifecycle(reference);
    const workflowId = 'provider-lifecycle-workflow';
    const connectionsQueryKey = ['connections', connectorId.toLowerCase()];

    const { rerender } = renderWithRealProviders(
      workflow,
      workflowId,
      'provider-lifecycle',
      oldService,
      createElement(ProviderLifecycleProbe, { connectionService: oldService, mounts: mountStats })
    );
    await waitFor(() => expect(observation.runs).toHaveLength(1));
    await waitFor(() => expect(oldService.getConnections).toHaveBeenCalledWith(connectorId, getReactQueryClient()));
    expect(getConnectionReference(store.getState().connections, nodeId)).toBe(reference);

    rerender(
      createElement(
        ReactQueryProvider,
        {},
        createElement(
          DesignerProvider,
          { id: 'provider-lifecycle', options: getProviderOptions(validService) },
          createElement(
            BJSWorkflowProvider,
            { workflow, workflowId },
            createElement(ProviderLifecycleProbe, { connectionService: validService, mounts: mountStats })
          )
        )
      )
    );

    await waitFor(() => expect(observation.runs).toHaveLength(2));
    await waitFor(() => expect(validService.getConnections).toHaveBeenCalled());
    validServiceDeferred.resolve([{ id: reference.connection.id, properties: {} } as Connection]);
    await observation.runs[1].settled;
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
    const cacheAfterValidTransition = getReactQueryClient().getQueryData(connectionsQueryKey);
    expect(cacheAfterValidTransition).toEqual(expect.arrayContaining([expect.objectContaining({ id: reference.connection.id })]));
    const operationsAfterValidTransition = store.getState().operations;
    const refreshCountAfterValidTransition = observation.refreshes.mock.calls.length;

    oldServiceDeferred.resolve([]);
    await oldServiceDeferred.promise;
    await settleProviderRuns(observation);
    expect(getConnectionReference(store.getState().connections, nodeId)).toBe(reference);
    expect(store.getState().operations).toBe(operationsAfterValidTransition);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
    expect(getReactQueryClient().getQueryData(connectionsQueryKey)).toBe(cacheAfterValidTransition);
    expect(
      observation.runs[0].actions.filter((action) => action.type === updateErrorDetails.type && action.payload?.id === nodeId)
    ).toEqual([]);
    expect(observation.refreshes).toHaveBeenCalledTimes(refreshCountAfterValidTransition);
    expect(observation.runs[1].actions).toContainEqual(updateErrorDetails({ id: nodeId, clearLevels: [ErrorLevel.Connection] }));
    expect(mountStats).toEqual({ mounted: 1, unmounted: 0 });
  });

  it('reapplies invalid-connection errors across repeated selection changes while preserving unrelated errors', async () => {
    vi.spyOn(connectionQueries, 'getConnection').mockResolvedValue({ id: reference.connection.id, properties: {} } as Connection);
    const state = await buildState('Sql');
    state.connections.connectionReferences = {};
    const store = makeStore(state);

    store.dispatch(
      updateErrorDetails({
        id: nodeId,
        errorInfo: { level: ErrorLevel.Default, message: 'preserve non-connection errors' },
      })
    );

    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Default]?.message).toBe('preserve non-connection errors');

    store.dispatch(initializeConnectionReferences({ Sql: reference }));
    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]).toBeUndefined();
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Default]?.message).toBe('preserve non-connection errors');

    store.dispatch(setNodeConnectionMapping({ nodeId, mapping: 'MissingReference' }));
    await initializeDynamicDataInNodes(store.getState, store.dispatch, [nodeId]);
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Connection]?.message).toContain('Invalid connection');
    expect(store.getState().operations.errors.Query?.[ErrorLevel.Default]?.message).toBe('preserve non-connection errors');
  });

  it.each(['stateful', 'stateless'] as const)(
    'authors expressions for Standard %s with default host options and supports real undo/redo',
    async (workflowKind) => {
      const state = await buildState('Sql');
      state.workflow.workflowKind = workflowKind;
      expect(state.designerOptions.hostOptions).toEqual(getMockedInitialRootState().designerOptions.hostOptions);
      const store = makeStore(state);
      const originalInputs = store.getState().operations.inputParameters.Query;
      await store.dispatch(updateNodeConnectionExpression({ nodeId, expression: "@parameters('defaultConnection')" })).unwrap();
      expect(store.getState().operations.inputParameters.Query).toBe(originalInputs);
      expect(store.getState().workflow.isDirty).toBe(true);
      await store.dispatch(onUndoClick());
      expect(store.getState().connections.connectionsMapping.Query).toBe('Sql');
      await store.dispatch(onRedoClick());
      expect(store.getState().connections.connectionsMapping.Query).toEqual({
        kind: 'expression',
        expression: "@parameters('defaultConnection')",
      });
      await store
        .dispatch(
          updateNodeConnection({
            nodeId,
            connector: { id: connectorId, properties: {} } as Connector,
            connection: { id: reference.connection.id, properties: {} } as Connection,
          })
        )
        .unwrap();
      expect(store.getState().connections.connectionsMapping.Query).toBe('Sql');
      expect(store.getState().operations.inputParameters.Query.parameterGroups.default.parameters[0].value).toEqual(
        originalInputs.parameterGroups.default.parameters[0].value
      );
      await store.dispatch(onUndoClick()).unwrap();
      expect(store.getState().connections.connectionsMapping.Query).toEqual({
        kind: 'expression',
        expression: "@parameters('defaultConnection')",
      });
      await store.dispatch(onRedoClick()).unwrap();
      expect(store.getState().connections.connectionsMapping.Query).toBe('Sql');
    }
  );

  it('rejects invalid authoring and nonexistent or incorrectly cased design-time keys without replacing the mapping', async () => {
    const store = makeStore(await buildState('Sql'));
    await expect(store.dispatch(updateNodeConnectionExpression({ nodeId, expression: '@if(' })).unwrap()).rejects.toThrow();
    await expect(
      store.dispatch(updateNodeConnectionExpression({ nodeId, expression: '@triggerBody()', designTimeReferenceKey: 'SQL' })).unwrap()
    ).rejects.toThrow();
    expect(store.getState().connections.connectionsMapping.Query).toBe('Sql');
  });

  it.each<[string, (state: RootState) => void]>([
    [
      'Consumption workflow',
      (state) => {
        state.workflow.workflowKind = undefined;
      },
    ],
    [
      'trigger',
      (state) => {
        state.workflow.nodesMetadata.Query.isTrigger = true;
      },
    ],
    [
      'managed API action',
      (state) => {
        state.operations.operationInfo.Query = { ...operationInfo, type: 'ApiConnection', connectorId: '/managedApis/sql' };
      },
    ],
    [
      'missing operation metadata',
      (state) => {
        delete state.operations.operationInfo.Query;
      },
    ],
    [
      'read-only mode',
      (state) => {
        state.designerOptions.readOnly = true;
      },
    ],
    [
      'monitoring mode',
      (state) => {
        state.designerOptions.isMonitoringView = true;
      },
    ],
  ])('rejects direct expression authoring with %s without changing the operation', async (_mode, configure) => {
    const state = await buildState('Sql');
    configure(state);
    const store = makeStore(state);
    const originalState = store.getState();

    await expect(store.dispatch(updateNodeConnectionExpression({ nodeId, expression: '@triggerBody()' })).unwrap()).rejects.toThrow(
      _mode === 'read-only mode' || _mode === 'monitoring mode'
        ? 'Connection expression editing is not enabled.'
        : 'Connection expressions are only supported on Standard service provider actions.'
    );

    expect(store.getState().connections).toBe(originalState.connections);
    expect(store.getState().operations.inputParameters).toBe(originalState.operations.inputParameters);
    expect(store.getState().workflow.isDirty).toBe(originalState.workflow.isDirty);
  });

  it('remaps action and parameter references without changing connection-name literals', async () => {
    const expression = "@if(equals(outputs('Resolve_Connection'), 'Resolve_Connection'), parameters('defaultConnection'), 'Sql')";
    expect(remapConnectionExpression(expression, { Resolve_Connection: 'Resolve_Renamed' }, { defaultConnection: 'preferred' })).toBe(
      "@if(equals(outputs('Resolve_Renamed'), 'Resolve_Connection'), parameters('preferred'), 'Sql')"
    );
    const state = await buildState(expression);
    state.workflow.idReplacements = { Resolve_Connection: 'Resolve_Renamed' };
    const store = makeStore(state);
    store.dispatch(updateParameter({ id: 'defaultConnection', newDefinition: { name: 'preferred', type: 'String', value: 'Sql' } } as any));
    const saved = await serializeOperation(store.getState(), nodeId);
    expect((saved as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toContain("parameters('preferred')");
    expect((saved as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toContain(
      "outputs('Resolve_Renamed')"
    );
  });

  it('retains expression mappings through single and scope clipboard state, even without references', async () => {
    const state = await buildState();
    const store = makeStore(state);
    await store.dispatch(copyOperation({ nodeId })).unwrap();
    const copied = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD) ?? '{}');
    expect(copied).toMatchObject({ nodeId: 'Query-copy', mslaNode: true, isScopeNode: false });
    expect(copied.nodeConnectionData).toEqual(state.connections.connectionsMapping.Query);
    expect(copied.nodeData.nodeInputs.preservedConnectionInputs.parameters.body.rows).toEqual([{ id: 7 }]);
    await store
      .dispatch(
        pasteOperation({
          nodeId: copied.nodeId,
          nodeData: copied.nodeData,
          nodeTokenData: copied.nodeTokenData,
          operationInfo: copied.nodeOperationInfo,
          connectionData: copied.nodeConnectionData,
          relationshipIds: { graphId: 'root', parentId: nodeId },
        })
      )
      .unwrap();
    const pastedId = Object.keys(store.getState().connections.connectionsMapping).find((id) => id !== nodeId)!;
    const pasted = await serializeOperation(store.getState(), pastedId);
    expect((pasted as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toBe(
      "@outputs('Resolve_Connection')"
    );
    expect((pasted as LogicAppsV2.ServiceProvider).inputs.parameters.body.rows).toEqual([{ id: 7 }]);
    store.dispatch(initCopiedConnectionMap({ connectionReferences: { Copy: copied.nodeConnectionData } }));
    expect(store.getState().connections.connectionsMapping.Copy).toEqual(copied.nodeConnectionData);
    const scopeData = getConnectionReferenceForNodeId(state.connections, nodeId);
    store.dispatch(initScopeCopiedConnections({ ScopeCopy: scopeData! }));
    expect(store.getState().connections.connectionsMapping.ScopeCopy).toEqual(copied.nodeConnectionData);
    const renamed = connectionsReducer(
      store.getState().connections,
      renameConnectionExpressionParameter({ oldName: 'missing', newName: 'new' })
    );
    expect(renamed.connectionsMapping.Copy).toEqual(copied.nodeConnectionData);
  });

  it('copies a tagged scope with the existing clipboard envelope and runtime mappings', async () => {
    const state = await buildState();
    const scope: LogicAppsV2.ScopeAction = {
      type: 'Scope',
      actions: { Query: state.workflow.operations.Query as LogicAppsV2.ServiceProvider },
    };
    const serialize = vi.spyOn(await import('../serializer'), 'serializeOperation').mockResolvedValue(scope);
    const store = makeStore(state);
    await store.dispatch(copyScopeOperation({ nodeId: 'Container-#scope' })).unwrap();
    expect(serialize).toHaveBeenCalledExactlyOnceWith(store.getState(), 'Container', {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD) ?? '{}')).toEqual({
      nodeId: 'Container-copy',
      mslaNode: true,
      isScopeNode: true,
      serializedOperation: scope,
      allConnectionData: { Query: { mapping: state.connections.connectionsMapping.Query } },
      staticResults: {},
    });
  });

  it.each([
    ['an action', copyOperation, 'Node does not exist'],
    ['a scope', copyScopeOperation, 'Scope Node does not exist'],
  ] as const)('rejects a missing node when copying %s', async (_kind, copy, message) => {
    const store = makeStore(await buildState());
    await expect(store.dispatch(copy({ nodeId: '' })).unwrap()).rejects.toThrow(message);
  });

  it('stores a concrete selection over an expression without losing other references', async () => {
    const state = await buildState();
    const changed = connectionsReducer(
      state.connections,
      changeConnectionMapping({ nodeId, connectorId, connectionId: reference.connection.id })
    );
    expect(changed.connectionsMapping.Query).toBe('Sql');
    expect(changed.connectionReferences).toEqual(state.connections.connectionReferences);
    const mapping: ConnectionMapping[string] = getServiceProviderConnectionMapping('@triggerBody()');
    expect(isExpressionConnectionMapping(mapping)).toBe(true);
    expect(connectionsReducer(changed, setNodeConnectionMapping({ nodeId, mapping })).connectionsMapping.Query).toEqual(mapping);
  });

  it('remaps runtime references during a real scope paste and restores connection state on undo', async () => {
    const state = await buildState();
    const store = makeStore(state);
    const source = state.workflow.operations.Query as LogicAppsV2.ServiceProvider;
    const action = (expression: string) => ({
      ...source,
      inputs: {
        ...source.inputs,
        serviceProviderConfiguration: { ...source.inputs.serviceProviderConfiguration, connectionName: expression },
      },
    });
    await store
      .dispatch(
        pasteScopeOperation({
          nodeId: 'Container',
          serializedValue: {
            type: 'Scope',
            actions: {
              Query: action('@triggerBody()'),
              Follow_Query: { ...action("@outputs('Query')"), runAfter: { Query: ['Succeeded'] } },
            },
            runAfter: {},
          },
          relationshipIds: { graphId: 'root', parentId: nodeId },
          allConnectionData: {},
          staticResults: {},
          upstreamNodeIds: [],
        })
      )
      .unwrap();
    const mappings = store.getState().connections.connectionsMapping;
    const renamedQuery = Object.keys(mappings).find((id) => {
      const mapping = mappings[id];
      return id !== nodeId && isExpressionConnectionMapping(mapping) && mapping.expression === '@triggerBody()';
    })!;
    expect(renamedQuery).toBeTruthy();
    expect(mappings.Follow_Query).toEqual({ kind: 'expression', expression: `@outputs('${renamedQuery}')` });
    const saved = await serializeOperation(store.getState(), 'Follow_Query');
    expect((saved as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName).toBe(`@outputs('${renamedQuery}')`);
    await store.dispatch(onUndoClick());
    expect(store.getState().connections.connectionsMapping).toEqual(state.connections.connectionsMapping);
    await store.dispatch(onRedoClick());
    expect(store.getState().connections.connectionsMapping.Follow_Query).toEqual(mappings.Follow_Query);
  });

  it('does not resurrect a cleared input while retaining unmodeled dynamic input values', async () => {
    const state = await buildState();
    state.operations.inputParameters.Query.parameterGroups.default.parameters[0].value = [];
    state.operations.inputParameters.Query.parameterGroups.default.parameters[0].preservedValue = undefined;
    const saved = await serializeOperation(state, nodeId);
    expect((saved as LogicAppsV2.ServiceProvider).inputs.parameters.query).toBeUndefined();
    expect((saved as LogicAppsV2.ServiceProvider).inputs.parameters.body.rows).toEqual([{ id: 7 }]);
  });

  it.each([
    ['required', 'dynamic', 'imported', 'string', ''],
    ['type', 'dynamic', 'imported', 'integer', 'not-a-number'],
    ['required', 'dynamic', 'authored', 'string', ''],
    ['type', 'dynamic', 'authored', 'integer', 'not-a-number'],
    ['required', 'static', 'imported', 'string', ''],
    ['type', 'static', 'imported', 'integer', 'not-a-number'],
    ['required', 'static', 'authored', 'string', ''],
    ['type', 'static', 'authored', 'integer', 'not-a-number'],
  ])(
    'preserves %s validation for a %s parameter with an %s runtime connection expression',
    async (_validation, parameterKind, source, type, value) => {
      const expression = "@outputs('Resolve_Connection')";
      const state = await buildState(source === 'authored' ? 'Sql' : expression);
      const parameter = state.operations.inputParameters.Query.parameterGroups.default.parameters[0];
      parameter.info.isDynamic = parameterKind === 'dynamic';
      parameter.type = type;
      parameter.required = true;
      parameter.value = value ? [{ id: 'invalid-value', type: 'literal', value }] : [];
      const validationErrors = validateParameter(parameter, parameter.value);
      expect(validationErrors.length).toBeGreaterThan(0);
      parameter.validationErrors = validationErrors;

      const store = makeStore(state);
      if (source === 'authored') {
        await store.dispatch(updateNodeConnectionExpression({ nodeId, expression })).unwrap();
      }

      expect(store.getState().connections.connectionsMapping.Query).toEqual({ kind: 'expression', expression });
      expect(getConnectionReference(store.getState().connections, nodeId)).toBeUndefined();
      expect(store.getState().operations.inputParameters.Query.parameterGroups.default.parameters[0].validationErrors).toEqual(
        validationErrors
      );
      await expect(serializeWorkflow(store.getState())).rejects.toMatchObject({ code: 'InvalidParameters' });
    }
  );
});

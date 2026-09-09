import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
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
  InitConnectionService,
  InitLoggerService,
  InitExperimentationServiceService,
  InitOperationManifestService,
  InitWorkflowService,
  LOCAL_STORAGE_KEYS,
  ManifestParser,
  OperationManifestService,
  type Connection,
  type Connector,
  type LogicAppsV2,
  type OpenAPIV2,
  type OperationManifest,
} from '@microsoft/logic-apps-shared';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import { isExpressionConnectionMapping, type ConnectionMapping } from '../../../../common/models/workflow';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import * as connectionQueries from '../../../queries/connections';
import * as dynamicQueries from '../../../queries/connector';
import connectionsReducer, {
  changeConnectionMapping,
  initCopiedConnectionMap,
  initScopeCopiedConnections,
  renameConnectionExpressionParameter,
  setNodeConnectionMapping,
} from '../../../state/connection/connectionSlice';
import { getConnectionReferenceForNodeId } from '../../../state/connection/connectionSelector';
import operationsReducer, { ErrorLevel, initializeNodes } from '../../../state/operation/operationMetadataSlice';
import panelReducer from '../../../state/panel/panelSlice';
import tokensReducer from '../../../state/tokens/tokensSlice';
import undoRedoReducer from '../../../state/undoRedo/undoRedoSlice';
import workflowReducer from '../../../state/workflow/workflowSlice';
import workflowParametersReducer, { updateParameter } from '../../../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../../../store';
import {
  getServiceProviderConnectionMapping,
  isConnectionExpressionValid,
  remapConnectionExpression,
} from '../../../utils/connectors/connectionExpression';
import { getConnectionId, getConnectionReference, isConnectionReferenceValid } from '../../../utils/connectors/connections';
import { storeStateHistoryMiddleware } from '../../../utils/middleware';
import { canInvokeDynamicConnection, getDynamicSchema, getDynamicValues, getFolderItems } from '../../../utils/parameters/dynamicdata';
import { shouldUseParameterInGroup, updateParameterAndDependencies, validateParameter } from '../../../utils/parameters/helper';
import { getConnectionMappingForNode, updateNodeConnection, updateNodeConnectionExpression } from '../connections';
import { copyOperation, pasteOperation, pasteScopeOperation } from '../copypaste';
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
    await store.dispatch(copyOperation({ nodeId }));
    const copied = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD) ?? '{}');
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

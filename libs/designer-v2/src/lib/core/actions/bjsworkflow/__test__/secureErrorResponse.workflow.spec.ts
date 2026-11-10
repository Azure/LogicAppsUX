import { configureStore } from '@reduxjs/toolkit';
import {
  getBuiltInOperationInfo,
  InitExperimentationServiceService,
  InitOperationManifestService,
  InitWorkflowService,
  supportedBaseManifestObjects,
  type BuiltInOperation,
  type DiscoveryOperation,
  type IWorkflowService,
  type LogicAppsV2,
} from '@microsoft/logic-apps-shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workflow } from '../../../../common/models/workflow';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import { initializeGraphState } from '../../../parsers/ParseReduxAction';
import * as connectionQueries from '../../../queries/connections';
import { initialWorkflowState, setWorkflowKind } from '../../../state/workflow/workflowSlice';
import { designerReducer } from '../../../store';
import { addOperation } from '../add';
import * as connectionActions from '../connections';
import { copyOperation, pasteOperation, pasteScopeOperation } from '../copypaste';
import * as operationDeserializer from '../operationdeserializer';
import { serializeOperation } from '../serializer';
import { updateNodeFromCodeView } from '../updateNodeFromCodeView';

const existingNodeId = 'Existing_HTTP';
const authoredSecureProperties = ['ErrorResponse', 'futureSecureValue', 'inputs', 'outputs'];
const httpDiscovery: DiscoveryOperation<BuiltInOperation> = {
  id: 'connectionProviders/http/httpaction',
  name: 'httpaction',
  type: 'Http',
  properties: {
    api: { id: 'connectionProviders/http', displayName: 'HTTP', iconUri: '' },
    operationType: 'Http',
    description: 'HTTP action',
    summary: 'HTTP',
    brandColor: '',
    visibility: 'important',
    iconUri: '',
  },
};

const httpAction = (properties = authoredSecureProperties): LogicAppsV2.ActionDefinition =>
  ({
    type: 'Http',
    inputs: { method: 'GET', uri: 'https://example.test/' },
    runAfter: {},
    runtimeConfiguration: { secureData: { properties: [...properties] } },
  }) as LogicAppsV2.ActionDefinition;

const workflow = (kind?: string, properties?: string[]): Workflow => ({
  kind,
  connectionReferences: {},
  definition: {
    ...initialWorkflowState.originalDefinition,
    triggers: {},
    actions: { [existingNodeId]: httpAction(properties) },
  },
});

const createStore = () =>
  configureStore({
    reducer: designerReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

type TestStore = ReturnType<typeof createStore>;

const loadWorkflow = async (store: TestStore, kind?: string, properties = authoredSecureProperties) => {
  const pending = store.dispatch(initializeGraphState({ workflowDefinition: workflow(kind, properties), runInstance: null }));

  // The SKU must be available to the metadata work started by the thunk, not just after it finishes.
  expect(store.getState().workflow.isConsumptionWorkflow).toBe(!kind);
  await pending.unwrap();
  await vi.waitFor(() =>
    expect(store.getState().operations.settings[existingNodeId]?.secureErrorResponse).toEqual({
      isSupported: !kind,
      value: properties.some((property) => property.toLowerCase() === 'errorresponse'),
    })
  );
};

const changedKindCases = [
  { name: 'Consumption changed to agent', loadedKind: undefined, changedKind: 'agent', isConsumption: true },
  { name: 'Consumption changed to stateful', loadedKind: undefined, changedKind: 'stateful', isConsumption: true },
  { name: 'Standard changed to agent', loadedKind: 'Stateful', changedKind: 'agent', isConsumption: false },
  { name: 'Standard with no current kind', loadedKind: 'Stateful', changedKind: undefined, isConsumption: false },
] as const;

describe('secure error response workflow SKU', () => {
  beforeEach(() => {
    getReactQueryClient().clear();
    InitExperimentationServiceService(undefined);
    InitWorkflowService({ isSplitOnSupported: () => true } as IWorkflowService);
    InitOperationManifestService({
      isSupported: () => true,
      isAliasingSupported: () => false,
      getOperationInfo: async (definition, isTrigger) => getBuiltInOperationInfo(definition, isTrigger),
      getOperationManifest: async (_connectorId, operationId) => {
        const manifest = supportedBaseManifestObjects.get(operationId.toLowerCase());
        if (!manifest) {
          throw new Error(`Missing built-in manifest for ${operationId}`);
        }
        return manifest;
      },
      getOperation: async () => ({}),
      isBuiltInConnector: () => false,
      getBuiltInConnector: () => {
        throw new Error('Unexpected connector lookup');
      },
    });

    // Keep graph parsing, operation deserialization and settings real; avoid unrelated host lookups.
    vi.spyOn(connectionQueries, 'getConnectionsQuery').mockResolvedValue(undefined);
    vi.spyOn(connectionActions, 'getConnectionsApiAndMapping').mockResolvedValue(undefined);
    vi.spyOn(operationDeserializer, 'initializeDynamicDataInNodes').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    getReactQueryClient().clear();
  });

  it('captures each loaded SKU before deserializing actions, independently of the current kind', async () => {
    const store = createStore();

    store.dispatch(setWorkflowKind('agent'));
    await loadWorkflow(store);
    expect(store.getState().workflow.workflowKind).toBe('agent');

    store.dispatch(setWorkflowKind(undefined));
    await loadWorkflow(store, 'Stateful');
    expect(store.getState().workflow.workflowKind).toBeUndefined();

    store.dispatch(setWorkflowKind('stateful'));
    await loadWorkflow(store);
    expect(store.getState().workflow.workflowKind).toBe('stateful');
  });

  it.each(changedKindCases)('initializes a newly added HTTP action for $name', async ({ loadedKind, changedKind, isConsumption }) => {
    const store = createStore();
    await loadWorkflow(store, loadedKind);
    store.dispatch(setWorkflowKind(changedKind));

    await store
      .dispatch(
        addOperation({
          operation: httpDiscovery,
          nodeId: 'Added_HTTP',
          relationshipIds: { graphId: 'root', parentId: existingNodeId },
        })
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(store.getState().operations.settings.Added_HTTP?.secureErrorResponse).toEqual({
        isSupported: isConsumption,
        value: false,
      });
      expect(store.getState().panel.isLoading).toBe(false);
    });
    expect(store.getState().workflow.isConsumptionWorkflow).toBe(isConsumption);
    expect(store.getState().workflow.nodesMetadata.Added_HTTP.isTrigger).toBe(false);
  });

  it.each([changedKindCases[0], changedKindCases[3]])(
    'reinitializes code-view edits and preserves secure data for $name',
    async ({ loadedKind, changedKind, isConsumption }) => {
      const store = createStore();
      await loadWorkflow(store, loadedKind, ['futureSecureValue', 'inputs', 'outputs']);
      store.dispatch(setWorkflowKind(changedKind));

      await store.dispatch(updateNodeFromCodeView({ nodeId: existingNodeId, serializedOperation: httpAction() })).unwrap();

      const settings = store.getState().operations.settings[existingNodeId];
      expect(settings.secureErrorResponse).toEqual({ isSupported: isConsumption, value: true });
      expect(settings.secureInputs?.value).toBe(true);
      expect(settings.secureOutputs?.value).toBe(true);

      const serialized = await serializeOperation(store.getState(), existingNodeId);
      expect(serialized?.runtimeConfiguration?.secureData?.properties).toEqual(
        isConsumption ? ['futureSecureValue', 'inputs', 'outputs', 'errorResponse'] : authoredSecureProperties
      );
    }
  );

  it.each([changedKindCases[1], changedKindCases[3]])(
    'initializes an HTTP action inside a pasted scope for $name',
    async ({ loadedKind, changedKind, isConsumption }) => {
      const store = createStore();
      await loadWorkflow(store, loadedKind);
      store.dispatch(setWorkflowKind(changedKind));

      await store
        .dispatch(
          pasteScopeOperation({
            nodeId: 'Pasted_scope',
            serializedValue: { type: 'Scope', actions: { Nested_HTTP: httpAction() }, runAfter: {} },
            relationshipIds: { graphId: 'root', parentId: existingNodeId },
            allConnectionData: {},
            staticResults: {},
            upstreamNodeIds: [],
          })
        )
        .unwrap();

      expect(store.getState().workflow.operations.Nested_HTTP.type).toBe('Http');
      expect(store.getState().operations.settings.Nested_HTTP?.secureErrorResponse).toEqual({
        isSupported: isConsumption,
        value: true,
      });
    }
  );

  it.each(
    [
      {
        name: 'Consumption into Standard',
        sourceKind: undefined,
        targetKind: 'Stateful',
        targetWorkflowKind: 'stateful',
        sourceSupported: true,
        targetSupported: false,
      },
      {
        name: 'Standard into Consumption changed to agent',
        sourceKind: 'Stateful',
        targetKind: undefined,
        targetWorkflowKind: 'agent',
        sourceSupported: false,
        targetSupported: true,
      },
      {
        name: 'Standard into Consumption changed to stateful',
        sourceKind: 'Stateful',
        targetKind: undefined,
        targetWorkflowKind: 'stateful',
        sourceSupported: false,
        targetSupported: true,
      },
    ].flatMap((testCase) => [true, false].map((copiedValue) => ({ ...testCase, copiedValue })))
  )(
    'pastes $name with the copied secure error response value $copiedValue',
    async ({ sourceKind, targetKind, targetWorkflowKind, sourceSupported, targetSupported, copiedValue }) => {
      const source = createStore();
      source.dispatch(setWorkflowKind(sourceKind ? 'stateful' : undefined));
      const sourceProperties = copiedValue ? authoredSecureProperties : ['inputs', 'outputs'];
      await loadWorkflow(source, sourceKind, sourceProperties);

      const target = createStore();
      target.dispatch(setWorkflowKind(targetKind ? 'stateful' : undefined));
      await loadWorkflow(target, targetKind, ['inputs', 'outputs']);
      target.dispatch(setWorkflowKind(targetWorkflowKind as 'agent' | 'stateful'));

      // Use the real clipboard payload without writing to the host system clipboard.
      const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { readText: vi.fn(), writeText } });
      await source.dispatch(copyOperation({ nodeId: existingNodeId })).unwrap();
      expect(writeText).toHaveBeenCalledOnce();
      type PastePayload = Parameters<typeof pasteOperation>[0];
      const copied = JSON.parse(writeText.mock.calls[0][0]) as {
        nodeId: PastePayload['nodeId'];
        nodeData: PastePayload['nodeData'];
        nodeTokenData: PastePayload['nodeTokenData'];
        nodeOperationInfo: PastePayload['operationInfo'];
        nodeConnectionData?: PastePayload['connectionData'];
        nodeComment?: PastePayload['comment'];
      };
      expect(copied).toMatchObject({
        isScopeNode: false,
        nodeOperationInfo: { type: 'Http' },
        nodeData: { settings: { secureErrorResponse: { isSupported: sourceSupported, value: copiedValue } } },
      });

      const pastedId = await target
        .dispatch(
          pasteOperation({
            nodeId: copied.nodeId,
            nodeData: copied.nodeData,
            nodeTokenData: copied.nodeTokenData,
            operationInfo: copied.nodeOperationInfo,
            connectionData: copied.nodeConnectionData,
            comment: copied.nodeComment,
            relationshipIds: { graphId: 'root', parentId: existingNodeId },
          })
        )
        .unwrap();

      const targetState = target.getState();
      expect(targetState.workflow.operations[pastedId]?.type).toBe('Http');
      expect(targetState.workflow.isConsumptionWorkflow).toBe(targetSupported);
      expect(targetState.operations.settings[pastedId].secureErrorResponse).toEqual({
        isSupported: targetSupported,
        value: copiedValue,
      });
      expect(targetState.operations.settings[pastedId].secureInputs?.value).toBe(true);
      expect(targetState.operations.settings[pastedId].secureOutputs?.value).toBe(true);

      const serialized = await serializeOperation(targetState, pastedId);
      const savedProperties = serialized?.runtimeConfiguration?.secureData?.properties ?? [];
      expect(savedProperties.some((property) => property.toLowerCase() === 'errorresponse')).toBe(copiedValue);
      expect(savedProperties).toEqual(expect.arrayContaining(['inputs', 'outputs']));
    }
  );
});

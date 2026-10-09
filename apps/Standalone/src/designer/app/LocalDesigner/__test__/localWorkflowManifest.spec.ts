// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InitConnectorService,
  InitOperationManifestService,
  SchemaProcessor,
  StandardOperationManifestService,
  type LogicAppsV2,
  type OpenAPIV2,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../httpClient';
import {
  createLocalWorkflowConnectorService,
  LocalWorkflowManifestService,
  localWorkflowManifest,
  localWorkflowOperation,
} from '../localWorkflowManifest';
import { LocalWorkflowRegistry } from '../localWorkflowRegistry';
import type { Workflow, WorkflowExtractionPlan } from '@microsoft/logic-apps-designer-v2';
import fixture from '../../../../../../../__mocks__/workflows/ExtractSelection.json';
import { getReactQueryClient } from '../../../../../../../libs/designer-v2/src/lib/core/ReactQueryProvider';
import { getOperation, getOperationManifest } from '../../../../../../../libs/designer-v2/src/lib/core/queries/operation';
import { getDynamicSchemaProperties } from '../../../../../../../libs/designer-v2/src/lib/core/queries/connector';

const makeSchemaPlan = (childName: string, type: 'string' | 'number'): WorkflowExtractionPlan => {
  const schema = { type: 'object', additionalProperties: false, properties: { value: { type } } };
  return {
    childName,
    source: {
      ...structuredClone(fixture),
      connectionReferences: {},
      definition: {
        ...structuredClone(fixture.definition),
        actions: {
          Call_child: { type: 'Workflow', inputs: { host: { workflow: { id: childName } }, body: {} }, runAfter: {} },
        },
      },
    },
    child: {
      connectionReferences: {},
      kind: 'Stateful',
      definition: {
        $schema: fixture.definition.$schema,
        contentVersion: '1.0.0.0',
        triggers: { Request: { type: 'Request', kind: 'Http', inputs: { schema } } },
        actions: {
          Response: { type: 'Response', kind: 'Http', inputs: { schema, statusCode: 200, body: { value: 'value' } }, runAfter: {} },
        },
      },
    },
    selectedIds: [],
    invocationId: 'Call_child',
    inputs: [],
    outputs: [],
  };
};

describe('offline Standard workflow manifest', () => {
  beforeEach(() => getReactQueryClient().clear());
  afterEach(() => getReactQueryClient().clear());

  it('recognizes Standard invocations and requires only the workflow name and body', async () => {
    const http = new HttpClient();
    const get = vi.spyOn(http, 'get');
    const registry = new LocalWorkflowRegistry(() => ({ getItem: () => null, setItem: () => undefined }));
    const cleanup = registry.prepare(makeSchemaPlan('Child', 'string'));
    const service = new LocalWorkflowManifestService({ baseUrl: '/url', apiVersion: '2018-11-01', httpClient: http }, registry);
    expect(await service.getOperationInfo({ type: 'Workflow', inputs: { host: { workflow: { id: 'Child' } } } }, false)).toEqual(
      localWorkflowOperation
    );
    expect(await service.getOperationManifest(localWorkflowOperation.connectorId, localWorkflowOperation.operationId)).toBe(
      localWorkflowManifest
    );
    expect(localWorkflowManifest.properties.inputs?.properties?.host.required).toEqual(['workflow']);
    expect(localWorkflowManifest.properties.settings).toEqual({});
    expect(get).not.toHaveBeenCalled();
    cleanup();
  });

  it('delegates non-local Standard workflow invocations to the regular manifest service', async () => {
    const http = new HttpClient();
    vi.spyOn(http, 'get').mockResolvedValue({
      properties: {
        brandColor: '#000000',
        description: 'Standard workflow invocation',
        iconUri: 'standard-workflow.svg',
        api: { properties: { displayName: 'Workflow' } },
      },
    });
    const options = { baseUrl: '/url', apiVersion: '2018-11-01', httpClient: http };
    const registry = new LocalWorkflowRegistry(() => ({ getItem: () => null, setItem: () => undefined }));
    const service = new LocalWorkflowManifestService(options, registry);
    const standard = new StandardOperationManifestService(options);
    const definition = {
      type: 'Workflow',
      inputs: { host: { workflow: { id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Logic/workflows/Child' } } },
    };

    const operationInfo = await service.getOperationInfo(definition, false);
    expect(operationInfo).toEqual(await standard.getOperationInfo(definition, false));
    expect(operationInfo).not.toEqual(localWorkflowOperation);
    expect(await service.getOperationManifest(operationInfo.connectorId, operationInfo.operationId)).toEqual(
      await standard.getOperationManifest(operationInfo.connectorId, operationInfo.operationId)
    );
    expect(await service.getOperationManifest(operationInfo.connectorId, operationInfo.operationId)).not.toEqual(localWorkflowManifest);
    expect(await service.getOperation(operationInfo.connectorId, operationInfo.operationId)).toEqual(
      await standard.getOperation(operationInfo.connectorId, operationInfo.operationId)
    );
    expect(await service.getOperation(operationInfo.connectorId, operationInfo.operationId)).not.toEqual({
      properties: localWorkflowManifest.properties,
    });
  });

  it.each([
    ['connectionproviders/localworkflowextraction', 'invokelocalworkflow'],
    ['CONNECTIONPROVIDERS/LOCALWORKFLOWEXTRACTION', 'INVOKELOCALWORKFLOW'],
    ['connectionProviders/localWorkflowExtraction', 'invokeLocalWorkflow'],
  ])('resolves %s / %s locally through the actual lowercase query helpers', async (connectorId, operationId) => {
    const http = new HttpClient();
    const get = vi.spyOn(http, 'get');
    const service = new LocalWorkflowManifestService({ baseUrl: '/url', apiVersion: '2018-11-01', httpClient: http });
    const manifestCall = vi.spyOn(service, 'getOperationManifest');
    const operationCall = vi.spyOn(service, 'getOperation');
    InitOperationManifestService(service);
    expect(await getOperationManifest({ connectorId, operationId })).toBe(localWorkflowManifest);
    expect(await getOperation({ connectorId, operationId })).toEqual({ properties: localWorkflowManifest.properties });
    expect(manifestCall).toHaveBeenCalledWith(connectorId.toLowerCase(), operationId.toLowerCase());
    expect(operationCall).toHaveBeenCalledWith(connectorId.toLowerCase(), operationId.toLowerCase(), false);
    expect(service.isBuiltInConnector(connectorId)).toBe(true);
    expect(service.getBuiltInConnector(connectorId)).toEqual(localWorkflowManifest.properties.connector);
    expect(get).not.toHaveBeenCalled();
  });

  it('loads distinct Request and Response schemas through the real Standard connector without network access', async () => {
    const registry = new LocalWorkflowRegistry(
      () => ({ getItem: () => null, setItem: () => undefined }),
      [],
      () => undefined
    );
    const workflow: Workflow = { ...structuredClone(fixture), connectionReferences: {} };
    workflow.definition.actions!.Call_child = {
      type: 'Workflow',
      inputs: { host: { workflow: { id: 'Child' } }, body: {} },
      runAfter: {},
    };
    const child = structuredClone(workflow);
    const responseSchema = { type: 'object', properties: { result: { type: 'string' } }, additionalProperties: false };
    const plan = {
      childName: 'Child',
      source: workflow,
      child: {
        ...child,
        definition: {
          ...child.definition,
          actions: { Response: { type: 'Response', kind: 'Http', inputs: { schema: responseSchema }, runAfter: {} } },
        },
      },
      selectedIds: [],
      invocationId: 'Call_child',
      inputs: [],
      outputs: [],
    } as WorkflowExtractionPlan;
    const cleanup = registry.prepare(plan);
    const http = new HttpClient();
    const post = vi.spyOn(http, 'post');
    const service = createLocalWorkflowConnectorService(http, registry);
    for (const isInput of [true, false]) {
      expect(
        await service.getDynamicSchema(
          undefined,
          localWorkflowOperation.connectorId.toUpperCase(),
          localWorkflowOperation.operationId.toUpperCase(),
          { name: 'Child' },
          {
            extension: { operationId: 'getLocalWorkflowSchema' },
            isInput,
          }
        )
      ).toEqual(isInput ? fixture.definition.triggers.Request.inputs.schema : responseSchema);
    }
    expect(post).not.toHaveBeenCalled();
    cleanup();
  });

  it('evicts the actual input/output query keys before prepare and after a failed commit, then reloads changed schemas', async () => {
    let persisted: string | null = null;
    const storage = {
      getItem: () => persisted,
      setItem: vi
        .fn((_key: string, value: string) => {
          persisted = value;
        })
        .mockImplementationOnce(() => {
          throw new Error('quota exceeded');
        }),
    };
    const registry = new LocalWorkflowRegistry(
      () => storage,
      [],
      () => undefined
    );
    const extraction = registry.createService('ExtractSelection.json', 'ExtractSelection');
    InitConnectorService(createLocalWorkflowConnectorService(new HttpClient(), registry));
    const queryClient = getReactQueryClient();
    const fetchSchema = (name: string, isInput: boolean) =>
      getDynamicSchemaProperties(
        undefined,
        localWorkflowOperation.connectorId,
        localWorkflowOperation.operationId,
        { name },
        { extension: { operationId: 'getLocalWorkflowSchema' }, isInput }
      );
    const keys = [true, false].map((isInput) => [
      'dynamicschemaproperties',
      '',
      localWorkflowOperation.connectorId,
      localWorkflowOperation.operationId,
      'getlocalworkflowschema',
      ', name-"Child"',
      `isInput:${isInput}`,
    ]);
    const firstPlan = makeSchemaPlan('Child', 'string');
    const releaseFirst = extraction.prepare!(firstPlan);
    const firstSchemas = await Promise.all([fetchSchema('Child', true), fetchSchema('Child', false)]);
    keys.forEach((key, index) => expect(queryClient.getQueryData(key)).toEqual(firstSchemas[index]));
    await expect(extraction.commit({ operationId: 'first', sourceFingerprint: 'before', plan: firstPlan })).rejects.toThrow(
      'Neither workflow'
    );
    releaseFirst();
    keys.forEach((key) => expect(queryClient.getQueryData(key)).toBeUndefined());

    keys.forEach((key, index) => queryClient.setQueryData(key, firstSchemas[index]));
    const unrelatedKey = [...keys[0]];
    unrelatedKey[5] = ', name-"OtherChild"';
    queryClient.setQueryData(unrelatedKey, firstSchemas[0]);
    const nextPlan = makeSchemaPlan('cHiLd', 'number');
    const releaseNext = extraction.prepare!(nextPlan);
    keys.forEach((key) => expect(queryClient.getQueryData(key)).toBeUndefined());
    expect(queryClient.getQueryData(unrelatedKey)).toEqual(firstSchemas[0]);
    const nextSchemas = await Promise.all([fetchSchema('cHiLd', true), fetchSchema('cHiLd', false)]);
    expect(nextSchemas[0].properties?.value.type).toBe('number');
    expect(nextSchemas[1].properties?.value.type).toBe('number');
    await extraction.commit({ operationId: 'next', sourceFingerprint: 'before', plan: nextPlan });
    releaseNext();
    keys.forEach((key) => {
      const nextKey = [...key];
      nextKey[5] = ', name-"cHiLd"';
      expect(queryClient.getQueryData(nextKey)).toBeUndefined();
    });
    for (const isInput of [true, false]) {
      expect(await fetchSchema('cHiLd', isInput)).toEqual(nextSchemas[isInput ? 0 : 1]);
    }
    expect(registry.list()).toHaveLength(2);
  });

  it.each([true, false])('keeps nullable customer tokens concrete without changing stored schemas (isInput=%s)', async (isInput) => {
    let persisted: string | null = null;
    const registry = new LocalWorkflowRegistry(
      () => ({
        getItem: () => persisted,
        setItem: (_key, value) => {
          persisted = value;
        },
      }),
      [],
      () => undefined
    );
    const schema: OpenAPIV2.SchemaObject = {
      type: 'object',
      properties: {
        output_1: {
          type: 'object',
          properties: {
            customer: {
              type: ['object', 'null'],
              properties: { name: { type: ['string', 'null'] }, id: { type: 'string' } },
            },
            customers: {
              type: ['array', 'null'],
              items: {
                type: ['null', 'object'],
                properties: { name: { type: ['null', 'string'] } },
              },
            },
            tuple: { type: 'array', items: [{ type: ['string', 'null'] }, { type: ['number', 'null'] }] },
            mixed: { type: ['string', 'number', 'null'] },
            onlyNull: { type: 'null' },
            nonNullableUnion: { type: ['string', 'number'] },
          },
        },
      },
    };
    const plan = makeSchemaPlan('NullableCustomer', 'string');
    // The legacy Request schema type cannot represent JSON Schema nullable unions.
    plan.child.definition.triggers = {
      Request: { type: 'Request', kind: 'Http', inputs: { schema: schema as LogicAppsV2.ManualTriggerInputs['schema'] } },
    };
    plan.child.definition.actions = {
      Response: { type: 'Response', kind: 'Http', inputs: { schema, statusCode: 200, body: {} }, runAfter: {} },
    };
    const original = structuredClone(plan);
    const extraction = registry.createService('ExtractSelection.json', 'ExtractSelection');
    const release = extraction.prepare!(plan);
    const connectorService = createLocalWorkflowConnectorService(new HttpClient(), registry);
    const displaySchema = await connectorService.getDynamicSchema(
      undefined,
      localWorkflowOperation.connectorId,
      localWorkflowOperation.operationId,
      { name: plan.childName },
      { extension: { operationId: 'getLocalWorkflowSchema' }, isInput }
    );
    const displayProperties = displaySchema.properties!.output_1.properties!;
    expect(displayProperties.customer).toMatchObject({ type: 'object', 'x-nullable': true });
    expect(displayProperties.customer.properties!.name).toMatchObject({ type: 'string', 'x-nullable': true });
    expect(displayProperties.customers).toMatchObject({
      type: 'array',
      'x-nullable': true,
      items: { type: 'object', 'x-nullable': true, properties: { name: { type: 'string', 'x-nullable': true } } },
    });
    expect(displayProperties.tuple.items).toEqual([
      { type: 'string', 'x-nullable': true },
      { type: 'number', 'x-nullable': true },
    ]);
    expect(displayProperties.mixed.type).toEqual(['string', 'number', 'null']);
    expect(displayProperties.onlyNull.type).toBe('null');
    expect(displayProperties.nonNullableUnion.type).toEqual(['string', 'number']);

    const properties = new SchemaProcessor({ includeParentObject: true, expandArrayOutputs: true }).getSchemaProperties(displaySchema);
    const customerProperties = properties.filter((property) => property.name === 'output_1.customer');
    expect(customerProperties).toHaveLength(1);
    expect(customerProperties[0].type).toBe('object');
    expect(properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'output_1.customer.name', type: 'string' }),
        expect.objectContaining({ name: 'output_1.customer.id', type: 'string' }),
      ])
    );

    expect(plan).toEqual(original);
    expect(registry.schema(plan.childName, isInput)).toEqual(schema);
    await extraction.commit({ operationId: 'nullable', sourceFingerprint: 'before', plan });
    const saved = persisted;
    release();
    expect(registry.schema(plan.childName, isInput)).toEqual(schema);
    expect(registry.get(`local:${plan.childName}`)).toEqual(original.child);
    await connectorService.getDynamicSchema(
      undefined,
      localWorkflowOperation.connectorId,
      localWorkflowOperation.operationId,
      { name: plan.childName },
      { extension: { operationId: 'getLocalWorkflowSchema' }, isInput }
    );
    expect(persisted).toBe(saved);
  });
});

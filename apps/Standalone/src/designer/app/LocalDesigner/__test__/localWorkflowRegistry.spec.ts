import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workflow, WorkflowExtractionPlan } from '@microsoft/logic-apps-designer-v2';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { LocalWorkflowRegistry, localWorkflowRegistryKey } from '../localWorkflowRegistry';
import fixture from '../../../../../../../__mocks__/workflows/ExtractSelection.json';

const workflow: Workflow = { ...fixture, connectionReferences: {} };
const makePlan = (name = 'ExtractedCustomer'): WorkflowExtractionPlan => ({
  source: {
    ...structuredClone(workflow),
    definition: {
      ...structuredClone(workflow.definition),
      actions: {
        Invoke_child: { type: 'Workflow', inputs: { host: { workflow: { id: name } }, body: {} }, runAfter: {} },
      },
    },
  },
  child: {
    ...structuredClone(workflow),
    definition: {
      ...structuredClone(workflow.definition),
      actions: {
        ...structuredClone(workflow.definition.actions),
        Response: {
          type: 'Response',
          kind: 'Http',
          inputs: { statusCode: 200, body: { result: "@outputs('Build_result')" }, schema: { type: 'object', properties: { result: {} } } },
          runAfter: { Consume_result: ['Succeeded'] },
        },
      },
    },
  },
  childName: name,
  invocationId: 'Invoke_child',
  selectedIds: ['Build_message', 'Build_result'],
  inputs: [],
  outputs: [],
});

describe('offline local workflow registry', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
  const changed = vi.fn();
  const createRegistry = () => new LocalWorkflowRegistry(() => storage, ['ExtractSelection', 'Empty'], changed);
  const request = (plan = makePlan(), operationId = 'operation-1') => ({ plan, operationId, sourceFingerprint: 'source-before' });
  const createExclusiveRunner = () => {
    let tail = Promise.resolve();
    return <T>(operation: () => Promise<T>): Promise<T> => {
      const result = tail.then(operation);
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    };
  };

  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
  });

  it('builds a Standard name-based invocation without Consumption host fields', () => {
    const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    const body = { customer: "@outputs('Read_customer')" };
    const runAfter = { Read_customer: ['Succeeded'] };
    const action = service.createInvocation('Child', body, runAfter);
    expect(action).toEqual({ type: 'Workflow', inputs: { host: { workflow: { id: 'Child' } }, body }, runAfter });
    body.customer = 'mutated';
    runAfter.Read_customer.push('Failed');
    expect((action as LogicAppsV2.ComposeAction).inputs.body.customer).toBe("@outputs('Read_customer')");
    expect(action.runAfter).toEqual({ Read_customer: ['Succeeded'] });
  });

  it('persists both documents with one atomic write and reloads detached copies', async () => {
    const registry = createRegistry();
    const service = registry.createService('ExtractSelection.json', 'ExtractSelection');
    const plan = makePlan();
    const result = await service.commit(request(plan));
    expect(result).toEqual({
      status: 'completed',
      child: { name: 'ExtractedCustomer', href: '/v2?extraction=true&local=local%3AExtractedCustomer' },
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(values.get(localWorkflowRegistryKey)!);
    expect(stored.operations[0].planFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(stored.operations[0].planFingerprint).not.toContain('"definition"');
    plan.child.definition.actions = {};
    const reloaded = createRegistry();
    expect(reloaded.get('ExtractSelection.json')).toEqual(plan.source);
    expect(reloaded.get('LOCAL:extractedcustomer')?.definition.actions).toHaveProperty('Response');
    const copy = reloaded.get('local:ExtractedCustomer')!;
    copy.definition.actions = {};
    expect(reloaded.get('local:ExtractedCustomer')?.definition.actions).toHaveProperty('Response');
  });

  it('makes retries idempotent, including a new service after navigation', async () => {
    const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    const args = request();
    const result = await service.commit(args);
    expect(await service.commit(args)).toEqual(result);
    expect(await createRegistry().createService('ExtractSelection.json', 'ExtractSelection').commit(args)).toEqual(result);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    await expect(service.commit(request(makePlan('Different')))).rejects.toThrow('different plan');
  });

  it('rejects fixture, source and stored child collisions case-insensitively', async () => {
    const registry = createRegistry();
    const service = registry.createService('Other.json', 'Other');
    expect(service.validateName('extractselection')).toMatch('already exists');
    expect(service.validateName('OTHER')).toMatch('already exists');
    expect(service.validateName('bad/name')).toMatch('1–80');
    await service.commit(request());
    expect(service.validateName('extractedcustomer')).toMatch('already exists');
    await expect(service.commit(request(makePlan('EXTRACTEDCUSTOMER'), 'another-operation'))).rejects.toThrow('already exists');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('suggests the base name, then _1 and _2 as workflows are saved', async () => {
    const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    for (const name of ['Extracted_workflow', 'Extracted_workflow_1', 'Extracted_workflow_2']) {
      expect(service.getSuggestedName!('Extracted_workflow')).toBe(name);
      expect(service.validateName(name)).toBeUndefined();
      await service.commit(request(makePlan(name), `operation-${name}`));
    }
    expect(createRegistry().createService('ExtractSelection.json', 'ExtractSelection').getSuggestedName!('Extracted_workflow')).toBe(
      'Extracted_workflow_3'
    );
    expect(storage.setItem).toHaveBeenCalledTimes(3);
  });

  it('skips fixture and source name collisions case-insensitively without reserving suggestions', () => {
    const registry = new LocalWorkflowRegistry(() => storage, ['EXTRACTED_WORKFLOW', 'Extracted_workflow_2'], changed);
    const service = registry.createService('source.json', 'extracted_workflow_1');
    expect(service.getSuggestedName!('Extracted_workflow')).toBe('Extracted_workflow_3');
    expect(service.getSuggestedName!('Extracted_workflow')).toBe('Extracted_workflow_3');
    expect(service.validateName('Extracted_workflow_3')).toBeUndefined();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('uses the first available suffix rather than skipping gaps', () => {
    const registry = new LocalWorkflowRegistry(() => storage, ['Extracted_workflow', 'Extracted_workflow_2'], changed);
    expect(registry.createService('source.json', 'Source').getSuggestedName!('Extracted_workflow')).toBe('Extracted_workflow_1');
  });

  it('publishes request and response schemas before commit and cleans preparation up', () => {
    const registry = createRegistry();
    const service = registry.createService('ExtractSelection.json', 'ExtractSelection');
    const plan = makePlan();
    const cleanup = service.prepare!(plan);
    expect(registry.schema(plan.childName, true)).toEqual(fixture.definition.triggers.Request.inputs.schema);
    expect(registry.schema(plan.childName, false)).toEqual(
      (plan.child.definition.actions!.Response as LogicAppsV2.ComposeAction).inputs.schema
    );
    expect(storage.setItem).not.toHaveBeenCalled();
    cleanup();
    expect(() => registry.schema(plan.childName, false)).toThrow('not available');
  });

  it('resolves persisted schemas after reload', async () => {
    const registry = createRegistry();
    await registry.createService('ExtractSelection.json', 'ExtractSelection').commit(request());
    expect(createRegistry().schema('EXTRACTEDCUSTOMER', false)).toEqual({ type: 'object', properties: { result: {} } });
  });

  it('surfaces storage write failures without creating either document', async () => {
    storage.setItem.mockImplementationOnce(() => {
      throw new Error('quota');
    });
    const registry = createRegistry();
    await expect(registry.createService('ExtractSelection.json', 'ExtractSelection').commit(request())).rejects.toThrow('Neither workflow');
    expect(registry.list()).toEqual([]);
    expect(changed).not.toHaveBeenCalled();
  });

  it.each(['{broken', '{}', '{"version":2,"workflows":[],"operations":[]}'])('surfaces malformed storage: %s', async (text) => {
    values.set(localWorkflowRegistryKey, text);
    const registry = createRegistry();
    expect(() => registry.list()).toThrow(/malformed|unsupported/);
    const service = registry.createService('ExtractSelection.json', 'ExtractSelection');
    expect(service.validateName('Child')).toMatch(/malformed|unsupported/);
    expect(() => service.getSuggestedName!('Extracted_workflow')).toThrow(/malformed|unsupported/);
    await expect(service.commit(request())).rejects.toThrow(/malformed|unsupported/);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('surfaces unavailable storage', async () => {
    const registry = new LocalWorkflowRegistry(() => {
      throw new Error('blocked');
    });
    const service = registry.createService('ExtractSelection.json', 'ExtractSelection');
    expect(service.validateName('Child')).toMatch('unavailable');
    expect(() => service.getSuggestedName!('Extracted_workflow')).toThrow('unavailable');
    await expect(service.commit(request())).rejects.toThrow('unavailable');
  });

  it('rejects a source changed by another service instead of overwriting it', async () => {
    const first = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    const second = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    await first.commit(request());
    await expect(second.commit(request(makePlan('OtherChild'), 'operation-2'))).rejects.toThrow('stored source changed');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent registry commits so a stale tab cannot overwrite the first extraction', async () => {
    const runExclusive = createExclusiveRunner();
    const first = new LocalWorkflowRegistry(() => storage, [], changed, runExclusive).createService(
      'ExtractSelection.json',
      'ExtractSelection'
    );
    const second = new LocalWorkflowRegistry(() => storage, [], changed, runExclusive).createService(
      'ExtractSelection.json',
      'ExtractSelection'
    );

    const results = await Promise.allSettled([
      first.commit(request(makePlan('FirstChild'), 'first-operation')),
      second.commit(request(makePlan('SecondChild'), 'second-operation')),
    ]);

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(results[1]).toMatchObject({ reason: expect.objectContaining({ message: expect.stringContaining('stored source changed') }) });
    expect(
      createRegistry()
        .list()
        .map((entry) => entry.name)
    ).toEqual(['ExtractSelection', 'FirstChild']);
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it('supports extraction from another local workflow and from a generated child', async () => {
    const registry = createRegistry();
    await registry.createService('AnotherFixture.json', 'AnotherFixture').commit(request());
    await registry.createService('local:ExtractedCustomer', 'ExtractedCustomer').commit(request(makePlan('Grandchild'), 'operation-2'));
    expect(registry.list().map((entry) => entry.id)).toEqual(['AnotherFixture.json', 'local:ExtractedCustomer', 'local:Grandchild']);
  });

  it.each(['authentication', 'password', 'authorization', 'apiKey', 'x-functions-key', 'Ocp-Apim-Subscription-Key'])(
    'refuses credential fields: %s',
    async (key) => {
      const plan = makePlan();
      (plan.child.definition.actions!.Build_message as LogicAppsV2.ComposeAction).inputs = { [key]: 'do-not-store' };
      const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
      expect(() => service.prepare!(plan)).toThrow('credential');
      await expect(service.commit(request(plan))).rejects.toThrow('credential');
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  );

  it('persists connection metadata, managed identity, settings, and parameter references without resolving them', async () => {
    const plan = makePlan();
    const references = {
      connection: {
        api: { id: '/serviceProviders/sql' },
        connection: { id: 'local-sql-reference' },
        authentication: { type: 'ManagedServiceIdentity' },
        connectionProperties: {
          authentication: { type: 'Raw', value: "@appsetting('ConnectionAuthentication')" },
        },
      },
    };
    plan.source.connectionReferences = structuredClone(references);
    plan.child.connectionReferences = structuredClone(references);
    plan.child.parameters = {
      endpoint: { type: 'String', value: 'https://example.test' },
      AuthHeader: { type: 'String', value: "@appsetting('HttpAuthorization')" },
      FunctionKey: { type: 'String', value: "@appsetting('FunctionKey')" },
    };
    plan.child.definition.actions!.Call_service = {
      type: 'Http',
      inputs: {
        uri: "@parameters('endpoint')",
        method: 'POST',
        authentication: { type: 'Basic', username: 'synthetic-user', password: "@appsetting('HttpPassword')" },
        headers: {
          Authorization: "@parameters('AuthHeader')",
          'x-functions-key': "@parameters('FunctionKey')",
          'Ocp-Apim-Subscription-Key': "@appsetting('ApiManagementSubscriptionKey')",
        },
      },
      runtimeConfiguration: { contentTransfer: { transferMode: 'Chunked' } },
      runAfter: {},
    };
    const before = structuredClone(plan);
    const registry = createRegistry();
    const release = registry.prepare(plan);
    await registry.createService('ExtractSelection.json', 'ExtractSelection').commit(request(plan));
    release();

    expect(plan).toEqual(before);
    expect(createRegistry().get('ExtractSelection.json')).toEqual(plan.source);
    expect(createRegistry().get('local:ExtractedCustomer')).toEqual(plan.child);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('refuses secure parameters', async () => {
    const plan = makePlan();
    const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    plan.child.parameters = { secretValue: { type: 'SecureString', value: 'do-not-store' } };
    await expect(service.commit(request(plan))).rejects.toThrow(/credential|secure/);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(['ParseJson', 'Select', 'Query', 'Join', 'Table', 'ServiceProvider', 'ApiConnection', 'CustomOperation'])(
    'persists action definitions without an operation-type allowlist: %s',
    async (type) => {
      const plan = makePlan();
      plan.child.definition.actions!.Build_message = { type, inputs: {}, runAfter: {} };
      plan.source.definition.triggers = { Schedule: { type: 'Recurrence', recurrence: { frequency: 'Day', interval: 1 } } };
      const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
      const cleanup = service.prepare!(plan);
      await expect(service.commit(request(plan))).resolves.toMatchObject({ status: 'completed' });
      cleanup();
      expect(createRegistry().get('local:ExtractedCustomer')).toEqual(plan.child);
      expect(createRegistry().get('ExtractSelection.json')).toEqual(plan.source);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
    }
  );

  it('preserves nested control-flow definitions and their action settings', async () => {
    const plan = makePlan();
    plan.child.definition.actions!.Build_message = {
      type: 'Scope',
      actions: {
        Filter: { type: 'Query', inputs: { from: [1, 2], where: '@greater(item(), 1)' }, runAfter: {} },
        Loop: {
          type: 'Foreach',
          foreach: "@body('Filter')",
          actions: { Call: { type: 'Http', inputs: { method: 'GET', uri: 'https://example.test' }, runAfter: {} } },
          runAfter: { Filter: ['Succeeded'] },
        },
      },
      runAfter: {},
    };
    await createRegistry().createService('ExtractSelection.json', 'ExtractSelection').commit(request(plan));
    expect(createRegistry().get('local:ExtractedCustomer')).toEqual(plan.child);
  });

  it.each([
    { type: 'Raw', value: 'literal-credential' },
    { type: 'Basic', username: 'synthetic-user', password: 'literal-credential' },
    { type: 'ClientCertificate', pfx: 'literal-certificate' },
    { type: 'ActiveDirectoryOAuth', secret: 'literal-credential' },
    { type: 'ManagedServiceIdentity', accessToken: 'literal-credential' },
  ])('refuses literal authentication data: $type', async (authentication) => {
    const plan = makePlan();
    plan.child.definition.actions!.Call_service = { type: 'Http', inputs: { authentication }, runAfter: {} };
    const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    expect(() => service.prepare!(plan)).toThrow(/credential/);
    await expect(service.commit(request(plan))).rejects.toThrow(/credential/);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(['value', 'default', 'indirect', 'cycle', 'definition'])(
    'refuses credential literals hidden by parameter references: %s',
    async (source) => {
      const plan = makePlan();
      plan.child.definition.actions!.Call_service = {
        type: 'Http',
        inputs: { authentication: { type: 'Basic', username: 'synthetic-user', password: "@parameters('p')" } },
        runAfter: {},
      };
      plan.child.parameters = {
        p: {
          type: 'String',
          value:
            source === 'value'
              ? 'synthetic-literal'
              : source === 'indirect' || source === 'cycle'
                ? "@parameters('q')"
                : "@appsetting('P')",
        },
      };
      if (source === 'default') {
        plan.child.parameters.p.defaultValue = 'synthetic-literal';
      } else if (source === 'definition') {
        plan.child.definition.parameters = { p: { type: 'String', defaultValue: 'synthetic-literal' } };
      } else if (source === 'indirect' || source === 'cycle') {
        plan.child.parameters.q = { type: 'String', value: source === 'cycle' ? "@parameters('p')" : 'synthetic-literal' };
      }
      const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
      expect(() => service.prepare!(plan)).toThrow(/credential/);
      await expect(service.commit(request(plan))).rejects.toThrow(/credential/);
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  );

  it('preserves indirect credential parameters only when all stored values and defaults remain app-setting references', async () => {
    const plan = makePlan();
    plan.child.definition.actions!.Call_service = {
      type: 'Http',
      inputs: { authentication: { type: 'Basic', username: 'synthetic-user', password: "@parameters('p')" } },
      runAfter: {},
    };
    plan.child.parameters = {
      p: { type: 'String', value: "@parameters('q')" },
      q: { type: 'String', value: "@appsetting('HttpPassword')" },
    };
    plan.child.definition.parameters = { p: { type: 'String', defaultValue: "@appsetting('DefaultHttpPassword')" } };
    await createRegistry().createService('ExtractSelection.json', 'ExtractSelection').commit(request(plan));
    expect(createRegistry().get('local:ExtractedCustomer')).toEqual(plan.child);
  });

  it('rejects an invocation pointing to a different child even when the name is valid', async () => {
    const plan = makePlan();
    (plan.source.definition.actions!.Invoke_child as LogicAppsV2.ComposeAction).inputs.host.workflow.id = 'DifferentChild';
    const service = createRegistry().createService('ExtractSelection.json', 'ExtractSelection');
    expect(() => service.prepare!(plan)).toThrow('pointing to the new child');
    await expect(service.commit(request(plan))).rejects.toThrow('pointing to the new child');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('rejects Consumption-style invocation IDs', async () => {
    const plan = makePlan();
    (plan.source.definition.actions!.Invoke_child as LogicAppsV2.ComposeAction).inputs.host.workflow.id =
      '/subscriptions/sub/workflows/child';
    await expect(createRegistry().createService('ExtractSelection.json', 'ExtractSelection').commit(request(plan))).rejects.toThrow(
      'name-based local Standard'
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

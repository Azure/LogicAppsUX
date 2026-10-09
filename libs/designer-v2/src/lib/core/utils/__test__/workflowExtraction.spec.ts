import { convertToStringLiteral, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { describe, expect, it, vi } from 'vitest';
import type { Workflow } from '../../../common/models/workflow';
import type { WorkflowExtractionService } from '../../../common/models/workflowExtraction';
import { buildWorkflowExtractionPlan, WorkflowExtractionError } from '../workflowExtraction';

const compose = (inputs: unknown, parent?: string): LogicAppsV2.ComposeAction => ({
  type: 'Compose',
  inputs,
  runAfter: parent ? { [parent]: ['Succeeded'] } : {},
});

const operation = (
  type: string,
  inputs: Record<string, unknown>,
  parent?: string,
  settings: Record<string, unknown> = {}
): LogicAppsV2.ActionDefinition =>
  ({
    type,
    inputs,
    runAfter: parent ? { [parent]: ['Succeeded'] } : {},
    ...settings,
  }) as LogicAppsV2.ActionDefinition;

const safeSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, count: { type: 'integer' } },
  additionalProperties: false,
};

const fixture = (): Workflow => ({
  kind: 'Stateful',
  id: 'parent-workflow',
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
    contentVersion: '1.0.0.0',
    triggers: { manual: { type: 'Request', kind: 'Http', inputs: { schema: safeSchema } } },
    actions: {
      Before: compose({ name: 'Ada', count: 3 }),
      A: { ...compose("@outputs('Before')", 'Before'), description: 'Keep this description', metadata: { operationMetadataId: 'a-id' } },
      B: compose("@concat(outputs('A')?['name'], '!')", 'A'),
      After: compose("@outputs('B')", 'B'),
      Respond: {
        type: 'Response',
        kind: 'Http',
        inputs: { statusCode: '200', body: "@outputs('After')" },
        runAfter: { After: ['Succeeded'] },
      },
    },
    outputs: {},
    parameters: { label: { type: 'String', defaultValue: 'unchanged' } },
    metadata: { unrelated: 'keep' },
  },
  parameters: { label: { type: 'String', value: 'unchanged' } },
  connectionReferences: {
    unused: { api: { id: 'unused-api' }, connection: { id: 'unused-connection' }, authentication: { type: 'ManagedServiceIdentity' } },
  },
  notes: { general: { content: 'A general note', color: 'blue', metadata: { position: { x: 0, y: 0 }, width: 100, height: 100 } } },
});

const arraySchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: { min: { type: 'integer' }, name: { type: 'string' } },
    required: ['min'],
    additionalProperties: false,
  },
};

const genericFixture = (): Workflow => ({
  ...fixture(),
  definition: {
    triggers: { manual: { type: 'Request', kind: 'Http', inputs: {} } },
    parameters: { Minimum: { type: 'Int', defaultValue: 2 } },
    actions: {
      InitializeVariable: operation('InitializeVariable', {
        variables: [
          {
            name: 'ArrayVariable',
            type: 'array',
            value: [
              { min: 1, name: 'first' },
              { min: 3, name: 'second' },
            ],
          },
        ],
      }),
      ParseJSON: operation('ParseJson', { content: "@variables('ArrayVariable')", schema: arraySchema }, 'InitializeVariable'),
      Query: operation(
        'Query',
        { from: "@body('ParseJSON')", where: "@greaterOrEquals(item()?['min'], parameters('Minimum'))" },
        'ParseJSON'
      ),
      Http: operation(
        'Http',
        {
          uri: 'https://example.invalid/filtered',
          method: 'POST',
          body: {
            original: "@variables('ArrayVariable')",
            filtered: "@body('Query')",
            requestId: "@triggerBody()?['requestId']",
          },
          retryPolicy: { type: 'fixed', count: 2, interval: 'PT10S' },
        },
        'Query',
        { runtimeConfiguration: { contentTransfer: { transferMode: 'Chunked' } } }
      ),
      After: compose({ body: "@body('Http')", status: "@outputs('Http').statusCode", filtered: "@body('Query')" }, 'Http'),
    },
    outputs: {},
  },
  parameters: { Minimum: { type: 'Int', value: 2 } },
});

const invocation: WorkflowExtractionService['createInvocation'] = (name, body, runAfter) => ({
  type: 'Workflow',
  inputs: { host: { workflow: { id: name } }, body },
  runAfter,
});

const actionsOf = (workflow: Workflow) => workflow.definition.actions!;
const inputsOf = (workflow: Workflow, id: string) => (actionsOf(workflow)[id] as LogicAppsV2.ComposeAction).inputs;
const plan = (workflow = fixture(), ids = ['A', 'B'], name = 'Child') => buildWorkflowExtractionPlan(workflow, ids, name, invocation);

function expectCode(action: () => unknown, code: string) {
  expect(action).toThrow(WorkflowExtractionError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code, name: 'WorkflowExtractionError' });
    expect((error as Error).message.length).toBeGreaterThan(15);
  }
}

function freeze(value: unknown) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('buildWorkflowExtractionPlan', () => {
  it('builds an immutable typed request/response plan with a host-provided invocation', () => {
    const workflow = fixture();
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const createInvocation = vi.fn(invocation);
    const result = buildWorkflowExtractionPlan(workflow, ['B', 'A'], 'Child', createInvocation);
    expect(result.selectedIds).toEqual(['A', 'B']);
    expect(result.invocationId).toBe('Invoke_extracted_workflow');
    expect(createInvocation).toHaveBeenCalledExactlyOnceWith('Child', { input_Before: "@outputs('Before')" }, { Before: ['Succeeded'] });
    expect(Object.keys(actionsOf(result.source))).toEqual(['Before', result.invocationId, 'After', 'Respond']);
    expect(actionsOf(result.source).After.runAfter).toEqual({ [result.invocationId]: ['Succeeded'] });
    expect(inputsOf(result.source, 'After')).toBe("@body('Invoke_extracted_workflow')?['output_B']");
    expect(inputsOf(result.child, 'A')).toBe("@triggerBody()?['input_Before']");
    expect(inputsOf(result.child, 'B')).toBe("@concat(outputs('A')?['name'], '!')");
    expect(actionsOf(result.child).A).toMatchObject({
      runAfter: {},
      description: 'Keep this description',
      metadata: { operationMetadataId: 'a-id' },
    });
    expect(actionsOf(result.child).B.runAfter).toEqual({ A: ['Succeeded'] });
    expect(result.inputs).toEqual([
      {
        name: 'input_Before',
        expression: "@outputs('Before')",
        rewrittenExpression: "@triggerBody()?['input_Before']",
        schema: safeSchema,
      },
    ]);
    expect(result.outputs[0].schema).toEqual({});
    expect(result.child.definition.triggers).toEqual({
      Request: {
        type: 'Request',
        kind: 'Http',
        inputs: { schema: { type: 'object', properties: { input_Before: safeSchema }, additionalProperties: false } },
      },
    });
    expect(actionsOf(result.child).Response).toEqual({
      type: 'Response',
      kind: 'Http',
      inputs: {
        statusCode: 200,
        body: { output_B: "@outputs('B')" },
        schema: { type: 'object', properties: { output_B: {} }, additionalProperties: false },
      },
      runAfter: { B: ['Succeeded'] },
    });
    expect(result.source.parameters).toEqual(workflow.parameters);
    expect(result.source.notes).toEqual(workflow.notes);
    expect(result.source.connectionReferences).toEqual(workflow.connectionReferences);
    expect(result.source.definition.metadata).toEqual(workflow.definition.metadata);
    expect(result.source.definition.parameters).toEqual(workflow.definition.parameters);
    expect(result.child).toMatchObject({ kind: 'Stateful', connectionReferences: {} });
    expect(result.child.parameters).toBeUndefined();
    expect(result.child.notes).toBeUndefined();
    expect(result.child.id).toBeUndefined();
    expect(result.child.definition.parameters).toBeUndefined();
    expect(JSON.stringify(workflow)).toBe(original);
    actionsOf(result.child).A.description = 'changed';
    expect(actionsOf(workflow).A.description).toBe('Keep this description');
  });

  it.each(['Stateful', 'Stateless', 'stateful', 'stateless'])('allows literal-only extraction and preserves workflow kind %s', (kind) => {
    const workflow = fixture();
    workflow.kind = kind;
    workflow.definition.actions = { A: compose(3), B: compose(false, 'A') };
    workflow.definition.triggers!.manual = { type: 'Request', kind: 'Http', inputs: {} };
    const result = plan(workflow);
    expect(result.inputs).toEqual([]);
    expect(result.outputs).toEqual([]);
    expect(inputsOf(result.child, 'Response').body).toEqual({});
    expect(result.child.kind).toBe(kind);
    expect(actionsOf(result.source)[result.invocationId].runAfter).toEqual({});
  });

  it('rewrites workflow outputs and Response inputs, deduplicating whole data roots', () => {
    const workflow = fixture();
    (actionsOf(workflow).Respond as LogicAppsV2.ComposeAction).inputs = {
      statusCode: '200',
      body: "Hello @{outputs('A')?['name']} / @{outputs('B')}",
      headers: { 'x-count': "@string(outputs('A')?['count'])" },
    };
    workflow.definition.outputs = { greeting: { type: 'String', value: "@outputs('B')" } };
    const result = plan(workflow);
    expect(result.outputs.map(({ expression }) => expression)).toEqual(["@outputs('B')", "@outputs('A')"]);
    expect(inputsOf(result.source, 'Respond').body).toBe(
      "Hello @{body('Invoke_extracted_workflow')?['output_A']?['name']} / @{body('Invoke_extracted_workflow')?['output_B']}"
    );
    expect(inputsOf(result.source, 'Respond').headers['x-count']).toBe("@string(body('Invoke_extracted_workflow')?['output_A']?['count'])");
    expect(result.source.definition.outputs!.greeting.value).toBe("@body('Invoke_extracted_workflow')?['output_B']");
    expect(result.outputs[1].schema).toEqual(safeSchema);
  });

  it('keeps computations, function case, and dereferences at their evaluation sites', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = {
      first: "@ConCat(Outputs('Before')?['name'], string(add(1, 2)))",
      second: "Hello @{toUpper(outputs('Before')?['name'])}",
    };
    const result = plan(workflow);
    expect(result.inputs.map(({ expression }) => expression)).toEqual(["@outputs('Before')"]);
    expect(inputsOf(result.child, 'A')).toEqual({
      first: "@ConCat(triggerBody()?['input_Before']?['name'], string(add(1, 2)))",
      second: "Hello @{toUpper(triggerBody()?['input_Before']?['name'])}",
    });
  });

  it('visits dependencies inside computed dereferences on both sides of the boundary', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      Before: compose({ name: 'Ada' }),
      Key: compose('name', 'Before'),
      A: compose("@outputs('Before')?[outputs('Key')]", 'Key'),
      B: compose('name', 'A'),
      After: compose("@outputs('A')?[concat('prefix', outputs('B'))]", 'B'),
    };
    const result = plan(workflow);
    expect(result.inputs.map(({ expression }) => expression)).toEqual(["@outputs('Key')", "@outputs('Before')"]);
    expect(inputsOf(result.child, 'A')).toBe("@triggerBody()?['input_Before']?[triggerBody()?['input_Key']]");
    expect(result.outputs.map(({ expression }) => expression)).toEqual(["@outputs('B')", "@outputs('A')"]);
    expect(inputsOf(result.source, 'After')).toBe(
      "@body('Invoke_extracted_workflow')?['output_A']?[concat('prefix', body('Invoke_extracted_workflow')?['output_B'])]"
    );
  });

  it('does not interpret escaped expressions or expression-looking string literal arguments as references', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = {
      escaped: "@@outputs('Missing')",
      interpolated: "literal @@{outputs('Missing')} and @{outputs('Before')?['name']}",
      quoted: "@concat('outputs(''Missing'')', outputs('Before')?['name'])",
    };
    const result = plan(workflow);
    expect(inputsOf(result.child, 'A')).toEqual({
      escaped: "@@outputs('Missing')",
      interpolated: "literal @@{outputs('Missing')} and @{triggerBody()?['input_Before']?['name']}",
      quoted: "@concat('outputs(''Missing'')', triggerBody()?['input_Before']?['name'])",
    });
    expect(result.inputs).toHaveLength(1);
  });

  it('handles safely quoted action names and caller-resolved renames', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      "Before's": compose('input'),
      "Renamed'A": compose("@outputs('Before''s')", "Before's"),
      'Renamed B': compose("@outputs('Renamed''A')", "Renamed'A"),
      After: compose("@outputs('Renamed B')", 'Renamed B'),
    };
    const result = plan(workflow, ['Renamed B', "Renamed'A"]);
    expect(result.selectedIds).toEqual(["Renamed'A", 'Renamed B']);
    expect(result.inputs[0].name).toBe('input_Before_s');
    expect(result.inputs[0].expression).toBe("@outputs('Before''s')");
    expect(result.outputs[0].name).toBe('output_Renamed_B');
    expect(inputsOf(result.child, 'Renamed B')).toBe("@outputs('Renamed''A')");
    expectCode(() => plan(workflow, ['A', 'B']), 'selection-not-top-level');
  });

  it('avoids case-insensitive invocation and child Request/Response name collisions', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      invoke_extracted_workflow: compose('before'),
      Request: compose('a', 'invoke_extracted_workflow'),
      Response: compose('b', 'Request'),
      After: compose("@outputs('Response')", 'Response'),
    };
    const result = plan(workflow, ['Request', 'Response']);
    expect(result.invocationId).toBe('Invoke_extracted_workflow_2');
    expect(Object.keys(result.child.definition.triggers!)).toEqual(['Request_2']);
    expect(actionsOf(result.child).Response_2.runAfter).toEqual({ Response: ['Succeeded'] });
  });

  it.each([
    ['Read customer', 'Read_customer'],
    ["Customer's_data", 'Customer_s_data'],
    ['customer.v2', 'customer_v2'],
    ['\u5ba2\u6237', '\u5ba2\u6237'],
    ['---', 'action'],
  ])('derives a safe binding name from action %j', (sourceId, sourceName) => {
    const workflow = fixture();
    const expression = `@outputs(${convertToStringLiteral(sourceId)})`;
    workflow.definition.actions = {
      [sourceId]: compose('value'),
      A: compose(expression, sourceId),
      B: compose("@outputs('A')", 'A'),
      After: compose("@outputs('B')", 'B'),
    };
    const result = plan(workflow);
    expect(result.inputs[0]).toMatchObject({
      name: `input_${sourceName}`,
      expression,
      rewrittenExpression: `@triggerBody()?['input_${sourceName}']`,
    });
    expect(inputsOf(result.child, 'A')).toBe(result.inputs[0].rewrittenExpression);
    expect(inputsOf(result.source, result.invocationId).body).toEqual({ [`input_${sourceName}`]: expression });
  });

  it('disambiguates normalized input/output names without merging distinct data roots', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      'Read customer': compose({ name: 'Ada' }),
      'read-customer': compose({ name: 'Grace' }, 'Read customer'),
      Read_customer_2: compose('other', 'read-customer'),
      'Build result': compose(
        {
          first: "@outputs('Read customer')?['name']",
          second: "@outputs('read-customer')?['name']",
          third: "@outputs('Read_customer_2')",
          repeated: "@outputs('Read customer')",
        },
        'Read_customer_2'
      ),
      'build-result': compose("@outputs('Build result')", 'Build result'),
      After: compose({ first: "@outputs('Build result')", second: "@outputs('build-result')" }, 'build-result'),
    };
    const result = plan(workflow, ['Build result', 'build-result']);
    expect(result.inputs.map(({ name }) => name)).toEqual(['input_Read_customer', 'input_read_customer_2', 'input_Read_customer_2_2']);
    expect(inputsOf(result.source, result.invocationId).body).toEqual({
      input_Read_customer: "@outputs('Read customer')",
      input_read_customer_2: "@outputs('read-customer')",
      input_Read_customer_2_2: "@outputs('Read_customer_2')",
    });
    expect(inputsOf(result.child, 'Build result')).toEqual({
      first: "@triggerBody()?['input_Read_customer']?['name']",
      second: "@triggerBody()?['input_read_customer_2']?['name']",
      third: "@triggerBody()?['input_Read_customer_2_2']",
      repeated: "@triggerBody()?['input_Read_customer']",
    });
    expect(result.outputs.map(({ name }) => name)).toEqual(['output_Build_result', 'output_build_result_2']);
    expect(inputsOf(result.child, 'Response').body).toEqual({
      output_Build_result: "@outputs('Build result')",
      output_build_result_2: "@outputs('build-result')",
    });
    expect(inputsOf(result.source, 'After')).toEqual({
      first: "@body('Invoke_extracted_workflow')?['output_Build_result']",
      second: "@body('Invoke_extracted_workflow')?['output_build_result_2']",
    });
    expect(result.child.definition.triggers!.Request).toMatchObject({
      inputs: { schema: { properties: Object.fromEntries(result.inputs.map(({ name, schema }) => [name, schema])) } },
    });
    expect(Object.keys(inputsOf(result.child, 'Response').schema.properties)).toEqual(result.outputs.map(({ name }) => name));
  });

  it('uses the original trigger name and keeps noncolliding names stable when references are reordered', () => {
    const workflow = fixture();
    workflow.definition.triggers = { 'Customer request': workflow.definition.triggers!.manual };
    const references = { action: "@outputs('Before')", trigger: '@triggerBody()' };
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = references;
    const first = plan(workflow);
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = { trigger: references.trigger, action: references.action };
    const second = plan(workflow);
    const namesByExpression = (result: ReturnType<typeof plan>) =>
      Object.fromEntries(result.inputs.map(({ expression, name }) => [expression, name]));
    expect(namesByExpression(first)).toEqual({
      "@outputs('Before')": 'input_Before',
      '@triggerBody()': 'input_Customer_request',
    });
    expect(namesByExpression(second)).toEqual(namesByExpression(first));
  });

  it('keeps trigger and action data separate when their normalized binding names collide', () => {
    const workflow = fixture();
    workflow.definition.triggers = { 'Be-fore': workflow.definition.triggers!.manual };
    workflow.definition.actions = {
      'Be fore': compose('value'),
      A: compose({ action: "@outputs('Be fore')", trigger: '@triggerBody()' }, 'Be fore'),
      B: compose("@outputs('A')", 'A'),
    };
    const result = plan(workflow);
    expect(inputsOf(result.source, result.invocationId).body).toEqual({
      input_Be_fore: "@outputs('Be fore')",
      input_Be_fore_2: '@triggerBody()',
    });
    expect(inputsOf(result.child, 'A')).toEqual({
      action: "@triggerBody()?['input_Be_fore']",
      trigger: "@triggerBody()?['input_Be_fore_2']",
    });
  });

  it.each([
    [null, { type: 'null' }],
    [true, { type: 'boolean' }],
    [17, { type: 'integer' }],
    [1.5, { type: 'number' }],
    ['text', { type: 'string' }],
    [[1, 2], { type: 'array', items: { type: 'integer' } }],
    [[1, 'two'], { type: 'array', items: {} }],
    [[], { type: 'array', items: {} }],
    ['@null', { type: 'null' }],
    ['@true', { type: 'boolean' }],
    ['@3.5', { type: 'number' }],
    ['@add(1, 2)', {}],
  ])('preserves a JSON schema for %j without guessing expression output strings', (literal, schema) => {
    const workflow = fixture();
    workflow.definition.actions = { A: compose(literal), B: compose("@outputs('A')", 'A'), After: compose("@outputs('B')", 'B') };
    const result = plan(workflow);
    expect(result.outputs[0].schema).toEqual(schema);
    expect(inputsOf(result.child, 'A')).toEqual(literal);
  });

  it('transports a closed trigger body root once and preserves its typed schema and computations', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@concat(triggerBody()?['name'], string(triggerBody()?['count']))";
    const result = plan(workflow);
    expect(result.inputs).toEqual([
      {
        name: 'input_manual',
        expression: '@triggerBody()',
        rewrittenExpression: "@triggerBody()?['input_manual']",
        schema: safeSchema,
      },
    ]);
    expect(inputsOf(result.child, 'A')).toBe(
      "@concat(triggerBody()?['input_manual']?['name'], string(triggerBody()?['input_manual']?['count']))"
    );
  });

  it('does not turn nullable safe dereferences into non-nullable response schemas', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = '@triggerBody()';
    (actionsOf(workflow).B as LogicAppsV2.ComposeAction).inputs = "@outputs('A')?['name']";
    const result = plan(workflow);
    expect(result.outputs[0].schema).toEqual({ type: ['string', 'null'] });
    expect(inputsOf(result.child, 'Response').schema.properties.output_B).toEqual({ type: ['string', 'null'] });
  });

  it.each(['', '../Child', 'a/b', 'a\\b', ' bad ', 'a.b', '-child', 'x'.repeat(81), 'CON'])('rejects invalid child name %j', (name) => {
    expectCode(() => plan(fixture(), ['A', 'B'], name), 'invalid-name');
  });

  it.each([{ ids: [] }, { ids: ['A'] }, { ids: ['A', 'A'] }])('rejects invalid selection $ids', ({ ids }) => {
    expectCode(() => plan(fixture(), ids), 'invalid-selection');
  });

  it('rejects a selection with a gap', () => {
    expectCode(() => plan(fixture(), ['A', 'After']), 'selection-not-linear');
  });

  it('rejects a side exit from an intermediate selected action', () => {
    const workflow = fixture();
    actionsOf(workflow).Side = compose("@outputs('A')", 'A');
    expectCode(() => plan(workflow), 'intermediate-side-exit');
  });

  it('rejects an extra incoming edge into an interior selected action', () => {
    const workflow = fixture();
    actionsOf(workflow).B.runAfter = { A: ['Succeeded'], Before: ['Succeeded'] };
    expectCode(() => plan(workflow), 'incoming-interior-edge');
  });

  it('rejects multiple entry parents and exit joins', () => {
    const workflow = fixture();
    actionsOf(workflow).Other = compose('other');
    actionsOf(workflow).A.runAfter = { Before: ['Succeeded'], Other: ['Succeeded'] };
    expectCode(() => plan(workflow), 'multiple-entry-parents');
    actionsOf(workflow).A.runAfter = { Before: ['Succeeded'] };
    actionsOf(workflow).After.runAfter = { B: ['Succeeded'], Other: ['Succeeded'] };
    expectCode(() => plan(workflow), 'multiple-exit-parents');
  });

  it('allows successful fan-out from the tail', () => {
    const workflow = fixture();
    actionsOf(workflow).Side = compose("@outputs('B')", 'B');
    const result = plan(workflow);
    expect(actionsOf(result.source).Side.runAfter).toEqual({ [result.invocationId]: ['Succeeded'] });
    expect(result.outputs).toHaveLength(1);
  });

  it.each(['Succeeded', 'SUCCEEDED', 'succeeded', 'sUcCeEdEd'])('accepts success-only dependencies spelled %s', (status) => {
    const workflow = fixture();
    actionsOf(workflow).A.runAfter = { Before: [status] };
    actionsOf(workflow).B.runAfter = { A: [status] };
    actionsOf(workflow).After.runAfter = { B: [status] };
    const original = JSON.stringify(workflow);
    freeze(workflow);

    const result = plan(workflow);

    expect(actionsOf(result.source)[result.invocationId].runAfter).toEqual({ Before: [status] });
    expect(actionsOf(result.child).B.runAfter).toEqual({ A: [status] });
    expect(actionsOf(result.source).After.runAfter).toEqual({ [result.invocationId]: ['Succeeded'] });
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it('extracts Compose and Compose_1 with mixed-casing success dependencies', () => {
    const workflow = fixture();
    workflow.kind = 'stateful';
    workflow.definition.actions = {
      Read_customer: compose("@triggerBody()?['customer']"),
      Consume_result: { ...compose(undefined), runAfter: { Compose_1: ['SUCCEEDED'] } },
      Compose: compose(undefined, 'Read_customer'),
      Compose_1: { ...compose(undefined), runAfter: { Compose: ['SUCCEEDED'] } },
    };

    const result = plan(workflow, ['Compose', 'Compose_1']);

    expect(result.selectedIds).toEqual(['Compose', 'Compose_1']);
    expect(actionsOf(result.child).Compose.runAfter).toEqual({});
    expect(actionsOf(result.child).Compose_1.runAfter).toEqual({ Compose: ['SUCCEEDED'] });
    expect(actionsOf(result.source)[result.invocationId].runAfter).toEqual({ Read_customer: ['Succeeded'] });
    expect(actionsOf(result.source).Consume_result.runAfter).toEqual({ [result.invocationId]: ['Succeeded'] });
    expect(result.inputs).toEqual([]);
    expect(result.outputs).toEqual([]);
  });

  it.each(['A', 'B', 'After'])('rejects non-success and malformed dependencies at %s', (id) => {
    const workflow = fixture();
    const parent = Object.keys(actionsOf(workflow)[id].runAfter!)[0];
    for (const statuses of [
      ['Failed'],
      ['FAILED'],
      ['SKIPPED'],
      ['TIMEDOUT'],
      ['Succeeded', 'Failed'],
      ['SUCCEEDED', 'FAILED'],
      ['SUCCEEDED', 'SUCCEEDED'],
      ['Succeeded '],
      [],
      [null],
      [1],
      null,
      'SUCCEEDED',
    ]) {
      Object.assign(actionsOf(workflow)[id], { runAfter: { [parent]: statuses } });
      expectCode(() => plan(workflow), 'status-sensitive-path');
    }
  });

  it('rejects cycles and unknown dependency names', () => {
    const workflow = fixture();
    actionsOf(workflow).Before.runAfter = { B: ['Succeeded'] };
    expectCode(() => plan(workflow), 'cyclic-dependency');
    actionsOf(workflow).Before.runAfter = { Missing: ['Succeeded'] };
    expectCode(() => plan(workflow), 'invalid-run-after');
  });

  it('moves a whole Scope and preserves unrelated pure code, but rejects a partial nested selection', () => {
    const workflow = fixture();
    actionsOf(workflow).A = { type: 'Scope', actions: { Nested: compose('a') }, runAfter: { Before: ['Succeeded'] } };
    actionsOf(workflow).B = compose('b', 'A');
    expectCode(() => plan(workflow, ['Nested', 'B']), 'selection-not-top-level');
    actionsOf(workflow).Opaque = { type: 'JavaScriptCode', inputs: { code: 'return 1' } } as LogicAppsV2.ActionDefinition;
    const result = plan(workflow);
    expect(actionsOf(result.child).A).toEqual({ ...actionsOf(workflow).A, runAfter: {} });
    expect(actionsOf(result.source).Opaque).toEqual(actionsOf(workflow).Opaque);
  });

  it('requires exactly one source trigger and a Standard workflow kind', () => {
    const workflow = fixture();
    workflow.definition.triggers = {};
    expectCode(() => plan(workflow), 'unsupported-trigger');
    workflow.definition.triggers = { timer: { type: 'Recurrence' } };
    expect(plan(workflow).child.definition.triggers!.Request.type).toBe('Request');
    workflow.definition.triggers.manual = fixture().definition.triggers!.manual;
    expectCode(() => plan(workflow), 'unsupported-trigger');
    workflow.kind = 'Consumption';
    expectCode(() => plan(workflow), 'unsupported-kind');
  });

  it.each([
    "@variables('v')",
    '@item()',
    "@items('Loop')",
    "@iterationIndexes('Loop')",
    '@workflow()',
    '@action()',
    "@actions('A')",
    "@result('Scope')",
    '@trigger()',
    '@mysteryContext()',
    "@binary('abc')",
    "@base64ToBinary('YQ==')",
    "@xml('<x/>')",
  ])('fails closed on unsupported context expression %s', (expression) => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = expression;
    expectCode(() => plan(workflow), 'unsupported-context');
  });

  it('inspects parent outputs and computed dereferences for hidden contextual references', () => {
    const workflow = fixture();
    workflow.definition.outputs = { status: { type: 'String', value: "@actions('A')?['status']" } };
    expectCode(() => plan(workflow), 'unsupported-context');
    workflow.definition.outputs = {};
    (actionsOf(workflow).After as LogicAppsV2.ComposeAction).inputs = "@outputs('B')?[variables('name')]";
    expectCode(() => plan(workflow), 'unsupported-context');
  });

  it('copies referenced nonsecure parameters but rejects transporting app-setting values indirectly', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@parameters('label')";
    const result = plan(workflow);
    expect(result.child.definition.parameters).toEqual(workflow.definition.parameters);
    expect(result.child.parameters).toEqual(workflow.parameters);
    expect(inputsOf(result.child, 'A')).toBe("@parameters('label')");
    expect(result.inputs).toEqual([]);
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@outputs('Before')";
    (actionsOf(workflow).Before as LogicAppsV2.ComposeAction).inputs = "@appsetting('label')";
    expectCode(() => plan(workflow), 'parameter-boundary');
    (actionsOf(workflow).Before as LogicAppsV2.ComposeAction).inputs = 'before';
    (actionsOf(workflow).After as LogicAppsV2.ComposeAction).inputs = "@concat(parameters('label'), outputs('B'))";
    expect(inputsOf(plan(workflow).source, 'After')).toBe("@concat(parameters('label'), body('Invoke_extracted_workflow')?['output_B'])");
  });

  it.each(["@outputs(concat('A', ''))", "@outputs('Missing')", '@outputs()'])('rejects non-static action reference %s', (expression) => {
    const workflow = fixture();
    (actionsOf(workflow).After as LogicAppsV2.ComposeAction).inputs = expression;
    expectCode(() => plan(workflow), 'dynamic-action-reference');
  });

  it('does not conflate body(Compose) with its raw outputs', () => {
    const workflow = fixture();
    (actionsOf(workflow).After as LogicAppsV2.ComposeAction).inputs = "@body('B')";
    expectCode(() => plan(workflow), 'unsupported-action-reference');
  });

  it('rejects unavailable, forward, or parallel data dependencies', () => {
    const workflow = fixture();
    actionsOf(workflow).Parallel = compose('parallel');
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@outputs('Parallel')";
    expectCode(() => plan(workflow), 'unavailable-data');
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@outputs('B')";
    expectCode(() => plan(workflow), 'unavailable-data');
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = 'a';
    (actionsOf(workflow).Parallel as LogicAppsV2.ComposeAction).inputs = "@outputs('A')";
    expectCode(() => plan(workflow), 'unavailable-data');
  });

  it('rejects selected references in workflow settings rather than rewriting their evaluation location', () => {
    const workflow = fixture();
    workflow.definition.metadata = { unexpected: "@outputs('A')" };
    expectCode(() => plan(workflow), 'unsupported-reference-location');
  });

  it('rejects malformed expressions and expression-valued keys without leaking their content', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@concat('unterminated)";
    expectCode(() => plan(workflow), 'invalid-expression');
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = { "@{outputs('Before')}": 'value' };
    expectCode(() => plan(workflow), 'expression-key');
  });

  it.each([
    { type: 'object', properties: { password: { type: 'string' } }, additionalProperties: false },
    { type: 'string', format: 'binary' },
    { type: 'string', format: 'byte' },
    { type: 'string', 'x-ms-secret': true },
    { $ref: '#/definitions/payload' },
    { type: 'array', items: { type: 'string', writeOnly: true } },
    { type: 'object', additionalProperties: { type: 'string', contentEncoding: 'base64' } },
  ])('rejects explicitly unsafe trigger schema %j', (schema) => {
    const workflow = fixture();
    workflow.definition.triggers!.manual = { type: 'Request', kind: 'Http', inputs: { schema } } as LogicAppsV2.ManualTrigger;
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@triggerBody()?['name']";
    expectCode(() => plan(workflow), 'unsafe-trigger-schema');
  });

  it('rejects secret or binary roots even if the accessed property itself is harmless', () => {
    const workflow = fixture();
    (actionsOf(workflow).Before as LogicAppsV2.ComposeAction).inputs = { name: 'Ada', password: 'not-a-real-secret' };
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@outputs('Before')?['name']";
    expectCode(() => plan(workflow), 'unsafe-data');
    (actionsOf(workflow).Before as LogicAppsV2.ComposeAction).inputs = 'safe';
    (actionsOf(workflow).B as LogicAppsV2.ComposeAction).inputs = { '$content-type': 'application/octet-stream', $content: 'YQ==' };
    expectCode(() => plan(workflow), 'unsafe-data');
  });

  it('rejects sensitive selected literals even if no outputs are consumed', () => {
    const workflow = fixture();
    workflow.definition.actions = { A: compose({ password: 'not-a-real-secret' }), B: compose('unused', 'A') };
    expectCode(() => plan(workflow), 'unsafe-data');
  });

  it.each([{ operationOptions: 'DisableAsyncPattern' }, { trackedProperties: { a: 'value' } }])(
    'preserves safe operation settings %j',
    (settings) => {
      const workflow = fixture();
      actionsOf(workflow).A = { ...actionsOf(workflow).A, ...settings };
      expect(actionsOf(plan(workflow).child).A).toMatchObject(settings);
    }
  );

  it('rejects secure action outputs crossing the boundary transitively', () => {
    const workflow = fixture();
    actionsOf(workflow).A.runtimeConfiguration = { secureData: { properties: ['inputs', 'outputs'] } };
    expectCode(() => plan(workflow), 'unsafe-data');
  });

  it('blocks selected anchored notes while preserving unanchored notes', () => {
    const workflow = fixture();
    workflow.notes!.A = workflow.notes!.general;
    expectCode(() => plan(workflow), 'anchored-note');
    delete workflow.notes!.A;
    (workflow.notes!.general.metadata as unknown as Record<string, unknown>).nodeId = 'B';
    expectCode(() => plan(workflow), 'anchored-note');
  });

  it('does not call the host or mutate the source for a rejected plan', () => {
    const workflow = fixture();
    (actionsOf(workflow).A as LogicAppsV2.ComposeAction).inputs = "@workflow()?['run']";
    const original = JSON.stringify(workflow);
    const createInvocation = vi.fn(invocation);
    expectCode(() => buildWorkflowExtractionPlan(workflow, ['A', 'B'], 'Child', createInvocation), 'unsupported-context');
    expect(createInvocation).not.toHaveBeenCalled();
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it.each([
    ['Query', 'Http'],
    ['InitializeVariable', 'ParseJSON', 'Query', 'Http'],
  ])('extracts the sanitized array/filter/HTTP repro selecting %j', (...selectedIds) => {
    const workflow = genericFixture();
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const result = plan(workflow, selectedIds);
    const allActions = selectedIds.includes('InitializeVariable');
    expect(result.selectedIds).toEqual(selectedIds);
    expect(inputsOf(result.source, result.invocationId).body).toEqual(
      allActions
        ? { input_manual: '@triggerBody()' }
        : {
            input_ParseJSON: "@body('ParseJSON')",
            input_ArrayVariable: "@variables('ArrayVariable')",
            input_manual: '@triggerBody()',
          }
    );
    expect(inputsOf(result.child, 'Query')).toEqual({
      from: allActions ? "@body('ParseJSON')" : "@triggerBody()?['input_ParseJSON']",
      where: "@greaterOrEquals(item()?['min'], parameters('Minimum'))",
    });
    expect(inputsOf(result.child, 'Http')).toEqual({
      ...inputsOf(workflow, 'Http'),
      body: {
        original: allActions ? "@variables('ArrayVariable')" : "@triggerBody()?['input_ArrayVariable']",
        filtered: "@body('Query')",
        requestId: "@triggerBody()?['input_manual']?['requestId']",
      },
    });
    expect(actionsOf(result.child).Http.runtimeConfiguration).toEqual({ contentTransfer: { transferMode: 'Chunked' } });
    expect(result.child.parameters).toEqual({ Minimum: { type: 'Int', value: 2 } });
    expect(result.child.definition.parameters).toEqual({ Minimum: { type: 'Int', defaultValue: 2 } });
    expect(result.outputs).toEqual([
      {
        name: 'output_Http',
        expression: "@body('Http')",
        rewrittenExpression: "@body('Invoke_extracted_workflow')?['output_Http']",
        schema: {},
      },
      {
        name: 'output_Http_2',
        expression: "@outputs('Http')",
        rewrittenExpression: "@body('Invoke_extracted_workflow')?['output_Http_2']",
        schema: { type: 'object', properties: { body: {}, statusCode: { type: 'integer' }, headers: { type: 'object' } } },
      },
      {
        name: 'output_Query',
        expression: "@body('Query')",
        rewrittenExpression: "@body('Invoke_extracted_workflow')?['output_Query']",
        schema: { type: 'array', items: arraySchema.items },
      },
    ]);
    expect(inputsOf(result.source, 'After')).toEqual({
      body: "@body('Invoke_extracted_workflow')?['output_Http']",
      status: "@body('Invoke_extracted_workflow')?['output_Http_2']['statusCode']",
      filtered: "@body('Invoke_extracted_workflow')?['output_Query']",
    });
    expect(actionsOf(result.source).After.runAfter).toEqual({ [result.invocationId]: ['Succeeded'] });
    expect(actionsOf(result.source)[result.invocationId].runAfter).toEqual(allActions ? {} : { ParseJSON: ['Succeeded'] });
    expect(actionsOf(result.child)[selectedIds[0]].runAfter).toEqual({});
    if (allActions) {
      expect(actionsOf(result.child).InitializeVariable).toEqual(actionsOf(workflow).InitializeVariable);
      expect(actionsOf(result.child).ParseJSON).toEqual(actionsOf(workflow).ParseJSON);
    } else {
      expect(actionsOf(result.source).InitializeVariable).toEqual(actionsOf(workflow).InitializeVariable);
      expect(actionsOf(result.source).ParseJSON).toEqual(actionsOf(workflow).ParseJSON);
      expect(result.inputs.find(({ name }) => name === 'input_ParseJSON')!.schema).toEqual(arraySchema);
      expect(result.inputs.find(({ name }) => name === 'input_ArrayVariable')!.schema).toEqual({ type: 'array', items: {} });
    }
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it.each(['Response', 'Terminate'])('rejects moving %s because it changes caller/source lifecycle semantics', (type) => {
    const workflow = fixture();
    actionsOf(workflow).B = operation(type, type === 'Response' ? { statusCode: 200 } : { runStatus: 'Succeeded' }, 'A');
    expectCode(() => plan(workflow), 'workflow-lifecycle');
    expect(() => plan(workflow)).toThrow(/original workflow|caller/i);
    expect(() => plan(workflow)).toThrow(/moving|change/i);
  });

  it.each(['Response', 'Terminate'])('rejects a %s hidden inside a moved Scope', (type) => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Scope',
      actions: { Nested: operation(type, type === 'Response' ? { statusCode: 200 } : { runStatus: 'Succeeded' }) },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    expectCode(() => plan(workflow), 'workflow-lifecycle');
  });

  it('keeps external HTTP body and outputs roots separate from each other and trigger body/outputs', () => {
    const workflow = fixture();
    actionsOf(workflow).Before = operation('Http', { uri: 'https://example.invalid', method: 'GET' });
    actionsOf(workflow).A = compose(
      {
        body: "@body('Before')?['name']",
        status: "@outputs('Before').statusCode",
        bodyAgain: "@body('Before')",
        triggerBody: '@triggerBody()',
        triggerHeader: "@triggerOutputs()?['headers']?['x-request-id']",
      },
      'Before'
    );
    const result = plan(workflow);
    expect(result.inputs.map(({ name, expression }) => ({ name, expression }))).toEqual([
      { name: 'input_Before', expression: "@body('Before')" },
      { name: 'input_Before_2', expression: "@outputs('Before')" },
      { name: 'input_manual', expression: '@triggerBody()' },
      { name: 'input_manual_2', expression: '@triggerOutputs()' },
    ]);
    expect(inputsOf(result.child, 'A')).toEqual({
      body: "@triggerBody()?['input_Before']?['name']",
      status: "@triggerBody()?['input_Before_2']['statusCode']",
      bodyAgain: "@triggerBody()?['input_Before']",
      triggerBody: "@triggerBody()?['input_manual']",
      triggerHeader: "@triggerBody()?['input_manual_2']?['headers']?['x-request-id']",
    });
    expect(result.inputs[3].schema).toEqual({ type: 'object', properties: { body: safeSchema, headers: { type: 'object' } } });
  });

  it.each([
    {},
    { type: 'object', properties: { name: { type: 'string' } } },
    { type: 'array', items: {} },
    { type: 'object', properties: {}, additionalProperties: true },
    undefined,
  ])('accepts an open or absent trigger schema %j without fabricating body types', (schema) => {
    const workflow = fixture();
    workflow.definition.triggers!.manual = {
      type: 'Request',
      kind: 'Http',
      inputs: schema === undefined ? {} : { schema },
    } as LogicAppsV2.ManualTrigger;
    actionsOf(workflow).A = compose('@triggerBody()', 'Before');
    const result = plan(workflow);
    expect(result.inputs[0].schema).toEqual(schema ?? {});
    expect(inputsOf(result.child, 'A')).toBe("@triggerBody()?['input_manual']");
  });

  it.each(['Http', 'Workflow', 'ApiConnection', 'ServiceProvider', 'Custom.Operation'])(
    'supports generic %s leaves and preserves metadata without guessing a body schema',
    (type) => {
      const workflow = fixture();
      actionsOf(workflow).A = operation(type, { body: "@outputs('Before')", customOption: { keep: true } }, 'Before', {
        description: 'Sanitized custom operation',
        metadata: { operationMetadataId: 'custom-id', custom: ['preserve'] },
        trackedProperties: { name: "@outputs('Before')?['name']" },
      });
      actionsOf(workflow).B = compose('done', 'A');
      actionsOf(workflow).After = compose({ body: "@body('A')", envelope: "@outputs('A')" }, 'B');
      const result = plan(workflow);
      expect(actionsOf(result.child).A).toEqual({
        ...actionsOf(workflow).A,
        inputs: { body: "@triggerBody()?['input_Before']", customOption: { keep: true } },
        trackedProperties: { name: "@triggerBody()?['input_Before']?['name']" },
        runAfter: {},
      });
      expect(result.outputs.map(({ schema }) => schema)).toEqual([
        {},
        ['ServiceProvider', 'Custom.Operation'].includes(type)
          ? {}
          : {
              type: 'object',
              properties: {
                body: {},
                ...(['Http', 'Workflow'].includes(type) ? { statusCode: { type: 'integer' }, headers: { type: 'object' } } : {}),
              },
            },
      ]);
    }
  );

  it('does not impose an object envelope on unknown primitive-returning operation outputs', () => {
    const workflow = fixture();
    actionsOf(workflow).A = operation('JavaScriptCode', { code: 'return 42;' }, 'Before');
    actionsOf(workflow).B = compose('done', 'A');
    actionsOf(workflow).After = compose("@outputs('A')", 'B');
    const result = plan(workflow);
    expect(result.outputs).toMatchObject([{ expression: "@outputs('A')", schema: {} }]);
    expect(inputsOf(result.child, 'Response').schema.properties.output_A).toEqual({});
  });

  it('infers ParseJson body schemas and Select arrays while retaining the Select-local item context', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      A: operation('ParseJson', { content: [{ min: 2 }], schema: arraySchema }),
      B: operation('Select', { from: "@body('A')", select: { min: "@item()?['min']", literal: 'kept' } }, 'A'),
      After: compose({ parsed: "@body('A')", selected: "@body('B')" }, 'B'),
    };
    const result = plan(workflow);
    expect(inputsOf(result.child, 'B')).toEqual(inputsOf(workflow, 'B'));
    expect(result.outputs.map(({ schema }) => schema)).toEqual([
      arraySchema,
      { type: 'array', items: { type: 'object', properties: { min: {}, literal: { type: 'string' } }, additionalProperties: false } },
    ]);
  });

  it('preserves an authorable Filter interpolation suffix without repairing it during extraction', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      Parse_JSON: operation('ParseJson', { content: [{ min: 2 }], schema: arraySchema }),
      Filter: operation('Query', { from: "@{body('Parse_JSON')}test", where: "@greaterOrEquals(item()?['min'], 1)" }, 'Parse_JSON'),
      Http: operation('Http', { uri: 'https://example.invalid', method: 'POST', body: "@body('Filter')" }, 'Filter'),
      After: compose("@body('Http')", 'Http'),
    };
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const result = plan(workflow, ['Filter', 'Http']);
    expect(inputsOf(result.child, 'Filter')).toEqual({
      from: "@{triggerBody()?['input_Parse_JSON']}test",
      where: "@greaterOrEquals(item()?['min'], 1)",
    });
    expect(result.inputs).toEqual([
      {
        name: 'input_Parse_JSON',
        expression: "@body('Parse_JSON')",
        rewrittenExpression: "@triggerBody()?['input_Parse_JSON']",
        schema: arraySchema,
      },
    ]);
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it('moves Scope descendants with nested HTTP dependencies and rewrites consumers at their own sites', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      Before: operation('Http', { uri: 'https://example.invalid/source', method: 'GET' }),
      A: {
        type: 'Scope',
        actions: {
          NestedHttp: operation('Http', {
            uri: 'https://example.invalid/nested',
            method: 'POST',
            body: { source: "@body('Before')", trigger: '@triggerBody()' },
          }),
          NestedCompose: compose("@body('NestedHttp')", 'NestedHttp'),
        },
        runAfter: { Before: ['Succeeded'] },
      },
      B: compose({ body: "@body('NestedHttp')", status: "@outputs('NestedHttp').statusCode", value: "@outputs('NestedCompose')" }, 'A'),
      After: compose({ nested: "@body('NestedHttp')", selected: "@outputs('B')" }, 'B'),
    };
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const result = plan(workflow);
    const scope = actionsOf(result.child).A as LogicAppsV2.ScopeAction;
    expect(scope.runAfter).toEqual({});
    expect(scope.actions!.NestedHttp).toEqual({
      ...(actionsOf(workflow).A as LogicAppsV2.ScopeAction).actions!.NestedHttp,
      inputs: {
        uri: 'https://example.invalid/nested',
        method: 'POST',
        body: { source: "@triggerBody()?['input_Before']", trigger: "@triggerBody()?['input_manual']" },
      },
    });
    expect(scope.actions!.NestedCompose).toEqual(compose("@body('NestedHttp')", 'NestedHttp'));
    expect(inputsOf(result.child, 'B')).toEqual(inputsOf(workflow, 'B'));
    expect(inputsOf(result.source, 'After')).toEqual({
      nested: "@body('Invoke_extracted_workflow')?['output_NestedHttp']",
      selected: "@body('Invoke_extracted_workflow')?['output_B']",
    });
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it.each(['If', 'Switch'])('preserves complete %s branches and rewrites their nested contexts independently', (type) => {
    const workflow = fixture();
    const firstBranch = { BranchHttp: operation('Http', { uri: 'https://example.invalid', method: 'POST', body: '@triggerBody()' }) };
    const secondBranch = { OtherBranch: compose("@outputs('Before')") };
    actionsOf(workflow).A = {
      type,
      expression: type === 'If' ? "@equals(outputs('Before')?['count'], 3)" : "@outputs('Before')?['count']",
      ...(type === 'If'
        ? { actions: firstBranch, else: { actions: secondBranch } }
        : { cases: { Three: { case: 3, actions: firstBranch } }, default: { actions: secondBranch } }),
      runAfter: { Before: ['Succeeded'] },
    } as LogicAppsV2.ActionDefinition;
    actionsOf(workflow).B = compose('finished branches', 'A');
    const result = plan(workflow);
    const expected = {
      ...actionsOf(workflow).A,
      expression: type === 'If' ? "@equals(triggerBody()?['input_Before']?['count'], 3)" : "@triggerBody()?['input_Before']?['count']",
      ...(type === 'If'
        ? {
            actions: {
              BranchHttp: operation('Http', { uri: 'https://example.invalid', method: 'POST', body: "@triggerBody()?['input_manual']" }),
            },
            else: { actions: { OtherBranch: compose("@triggerBody()?['input_Before']") } },
          }
        : {
            cases: {
              Three: {
                case: 3,
                actions: {
                  BranchHttp: operation('Http', {
                    uri: 'https://example.invalid',
                    method: 'POST',
                    body: "@triggerBody()?['input_manual']",
                  }),
                },
              },
            },
            default: { actions: { OtherBranch: compose("@triggerBody()?['input_Before']") } },
          }),
      runAfter: {},
    };
    expect(actionsOf(result.child).A).toEqual(expected);
    expectCode(() => plan(workflow, ['BranchHttp', 'B']), 'selection-not-top-level');
    actionsOf(workflow).After = compose("@body('BranchHttp')", 'B');
    expectCode(() => plan(workflow), 'conditional-output');
  });

  it('preserves a whole Foreach, its item/items scope, and nested Query/Select item scopes', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Foreach',
      foreach: "@outputs('Before')",
      actions: {
        ReadItem: compose({ local: '@item()', named: "@items('A')" }),
        Filter: operation('Query', { from: "@items('A')?['values']", where: '@greater(item(), 2)' }, 'ReadItem'),
        Map: operation('Select', { from: "@body('Filter')", select: { value: '@item()', parent: "@items('A')" } }, 'Filter'),
      },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    const result = plan(workflow);
    expect(actionsOf(result.child).A).toEqual({
      ...actionsOf(workflow).A,
      foreach: "@triggerBody()?['input_Before']",
      runAfter: {},
    });
    expect(result.inputs.map(({ expression }) => expression)).toEqual(["@outputs('Before')"]);
    actionsOf(workflow).After = compose("@body('Filter')", 'B');
    expectCode(() => plan(workflow), 'conditional-output');
  });

  it('preserves a complete Until and its iterationIndexes and body references in the loop condition', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Until',
      expression: "@or(equals(outputs('Probe'), 'done'), greater(iterationIndexes('A'), 2))",
      limit: { count: 10, timeout: 'PT1M' },
      actions: { Probe: compose("@concat(string(iterationIndexes('A')), triggerBody()?['name'])") },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('loop finished', 'A');
    const result = plan(workflow);
    expect(actionsOf(result.child).A).toEqual({
      ...actionsOf(workflow).A,
      actions: { Probe: compose("@concat(string(iterationIndexes('A')), triggerBody()?['input_manual']?['name'])") },
      runAfter: {},
    });
  });

  it.each([
    ['Query', { from: '@item()', where: '@true' }],
    ['Select', { from: '@item()', select: { value: '@item()' } }],
    ['Query', { from: [], where: '@true', whereMetadata: '@item()' }],
    ['Select', { from: [], select: { value: '@item()' }, selectMetadata: '@item()' }],
    ['Query', { from: [], where: "@equals(items('OtherLoop'), 1)" }],
    ['Select', { from: [], select: "@iterationIndexes('OtherLoop')" }],
  ])('rejects unavailable item context in %s inputs %j', (type, inputs) => {
    const workflow = fixture();
    actionsOf(workflow).A = operation(type, inputs, 'Before');
    expectCode(() => plan(workflow), 'unsupported-context');
  });

  it('preserves unrelated non-Compose actions, source contexts, and non-success dependencies', () => {
    const workflow = fixture();
    actionsOf(workflow).Before = operation('Http', { uri: 'https://example.invalid', method: 'GET' });
    actionsOf(workflow).A = compose("@body('Before')", 'Before');
    actionsOf(workflow).B = compose('done', 'A');
    actionsOf(workflow).Unrelated = operation('JavaScriptCode', { code: 'return { result: 3 };' });
    actionsOf(workflow).Recovery = operation(
      'CustomRecovery',
      { context: "@workflow()?['run']?['name']", status: "@actions('Unrelated')?['status']", unknown: '@customSourceContext()' },
      undefined,
      { runAfter: { Unrelated: ['Failed', 'Skipped', 'TimedOut'] } }
    );
    actionsOf(workflow).SourceScope = {
      type: 'Scope',
      actions: { Nested: operation('Wait', { interval: { count: 1, unit: 'Second' } }) },
      runAfter: {},
    };
    actionsOf(workflow).After = operation(
      'Http',
      {
        uri: 'https://example.invalid/result',
        method: 'POST',
        body: { result: "@outputs('B')", run: "@workflow()?['run']?['name']" },
      },
      'B'
    );
    const result = plan(workflow);
    for (const id of ['Before', 'Unrelated', 'Recovery', 'SourceScope', 'Respond']) {
      expect(actionsOf(result.source)[id]).toEqual(actionsOf(workflow)[id]);
    }
    expect(inputsOf(result.source, 'After').body).toEqual({
      result: "@body('Invoke_extracted_workflow')?['output_B']",
      run: "@workflow()?['run']?['name']",
    });
  });

  it('rewrites selected references inside an unselected downstream Scope without flattening it', () => {
    const workflow = fixture();
    actionsOf(workflow).After = {
      type: 'Scope',
      actions: { Send: operation('Http', { uri: 'https://example.invalid', method: 'POST', body: "@outputs('B')" }) },
      runAfter: { B: ['Succeeded'] },
    };
    const result = plan(workflow);
    expect(actionsOf(result.source).After).toEqual({
      type: 'Scope',
      actions: {
        Send: operation('Http', {
          uri: 'https://example.invalid',
          method: 'POST',
          body: "@body('Invoke_extracted_workflow')?['output_B']",
        }),
      },
      runAfter: { [result.invocationId]: ['Succeeded'] },
    });
  });

  it.each([
    ['SetVariable', 'array', [], { name: 'Local', value: [1] }],
    ['AppendToArrayVariable', 'array', [], { name: 'Local', value: 1 }],
    ['AppendToStringVariable', 'string', '', { name: 'Local', value: 'next' }],
    ['IncrementVariable', 'integer', 0, { name: 'Local', value: 1 }],
    ['DecrementVariable', 'integer', 2, { name: 'Local', value: 1 }],
  ])('moves a wholly contained variable initialization and %s mutation', (type, variableType, value, inputs) => {
    const workflow = fixture();
    workflow.definition.actions = {
      A: operation('InitializeVariable', { variables: [{ name: 'Local', type: variableType, value }] }),
      B: operation(type, inputs, 'A'),
      Read: compose("@variables('Local')", 'B'),
      After: compose("@outputs('Read')", 'Read'),
    };
    const result = plan(workflow, ['A', 'B', 'Read']);
    expect(actionsOf(result.child).A).toEqual(actionsOf(workflow).A);
    expect(actionsOf(result.child).B).toEqual(actionsOf(workflow).B);
    expect(inputsOf(result.child, 'Read')).toBe("@variables('Local')");
    expect(result.inputs).toEqual([]);
    expect(inputsOf(result.source, 'After')).toBe("@body('Invoke_extracted_workflow')?['output_Read']");
    expect(result.outputs[0].schema).toEqual(variableType === 'array' ? { type: 'array', items: {} } : { type: variableType });
  });

  it('binds a source variable after prior writes at invocation and leaves later writes in the source', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      Init: operation('InitializeVariable', { variables: [{ name: 'ArrayVariable', type: 'array', value: [] }] }),
      Before: operation('AppendToArrayVariable', { name: 'ArrayVariable', value: { min: 2 } }, 'Init'),
      A: operation('Query', { from: "@variables('ArrayVariable')", where: '@greater(item(), 0)' }, 'Before'),
      B: compose("@variables('ArrayVariable')", 'A'),
      After: operation('AppendToArrayVariable', { name: 'ArrayVariable', value: { min: 3 } }, 'B'),
    };
    const result = plan(workflow);
    expect(result.inputs).toEqual([
      {
        name: 'input_ArrayVariable',
        expression: "@variables('ArrayVariable')",
        rewrittenExpression: "@triggerBody()?['input_ArrayVariable']",
        schema: { type: 'array', items: {} },
      },
    ]);
    expect(inputsOf(result.child, 'A').from).toBe("@triggerBody()?['input_ArrayVariable']");
    expect(inputsOf(result.child, 'B')).toBe("@triggerBody()?['input_ArrayVariable']");
    expect(actionsOf(result.source)[result.invocationId].runAfter).toEqual({ Before: ['Succeeded'] });
    expect(actionsOf(result.source).After).toEqual({ ...actionsOf(workflow).After, runAfter: { [result.invocationId]: ['Succeeded'] } });
  });

  it('rejects source reads or writes of a child-local variable', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      A: operation('InitializeVariable', { variables: [{ name: 'Local', type: 'array', value: [] }] }),
      B: operation('AppendToArrayVariable', { name: 'Local', value: 1 }, 'A'),
      After: compose("@variables('Local')", 'B'),
    };
    expectCode(() => plan(workflow), 'escaping-variable');
    actionsOf(workflow).After = operation('SetVariable', { name: 'Local', value: [2] }, 'B');
    expectCode(() => plan(workflow), 'escaping-variable');
    actionsOf(workflow).After = compose('no variable reference', 'B');
    workflow.definition.outputs = { local: { type: 'Array', value: "@variables('Local')" } };
    expectCode(() => plan(workflow), 'escaping-variable');
  });

  it('rejects selected mutation of a source variable and concurrent source writes to a bound variable', () => {
    const workflow = fixture();
    workflow.definition.actions = {
      Init: operation('InitializeVariable', { variables: [{ name: 'Local', type: 'array', value: [] }] }),
      A: operation('AppendToArrayVariable', { name: 'Local', value: 1 }, 'Init'),
      B: compose('done', 'A'),
    };
    expectCode(() => plan(workflow), 'shared-variable-write');
    actionsOf(workflow).A = compose("@variables('Local')", 'Init');
    actionsOf(workflow).ParallelWrite = operation('AppendToArrayVariable', { name: 'Local', value: 2 }, 'Init');
    expectCode(() => plan(workflow), 'shared-variable-write');
  });

  it('rejects a variable whose initialization is unavailable or whose bound writes contain secrets', () => {
    const workflow = fixture();
    actionsOf(workflow).Init = operation('InitializeVariable', { variables: [{ name: 'Local', type: 'array', value: [] }] });
    actionsOf(workflow).A = compose("@variables('Local')", 'Before');
    expectCode(() => plan(workflow), 'unavailable-data');
    actionsOf(workflow).Before = operation('AppendToArrayVariable', { name: 'Local', value: { password: 'sanitized' } }, 'Init');
    expectCode(() => plan(workflow), 'unsafe-data');
  });

  it('copies transitive parameter dependencies and leaves same-app appsetting expressions unresolved', () => {
    const workflow = fixture();
    workflow.parameters = {
      Root: { type: 'String', value: "@concat(parameters('Suffix'), appsetting('ENDPOINT'))" },
      Suffix: { type: 'String', value: 'path' },
      Unused: { type: 'String', value: 'keep only in source' },
    };
    workflow.definition.parameters = {
      Root: { type: 'String', defaultValue: "@parameters('Suffix')" },
      Suffix: { type: 'String', defaultValue: 'path' },
      Unused: { type: 'String', defaultValue: 'keep only in source' },
    };
    actionsOf(workflow).A = operation(
      'Http',
      {
        uri: "@concat(appsetting('BASE_URL'), parameters('Root'))",
        method: 'GET',
        authentication: { type: 'Basic', username: 'sanitized', password: "@appsetting('PASSWORD')" },
      },
      'Before'
    );
    actionsOf(workflow).B = compose('done', 'A');
    const result = plan(workflow);
    expect(inputsOf(result.child, 'A')).toEqual(inputsOf(workflow, 'A'));
    expect(result.child.parameters).toEqual({ Root: workflow.parameters.Root, Suffix: workflow.parameters.Suffix });
    expect(result.child.definition.parameters).toEqual({
      Root: workflow.definition.parameters.Root,
      Suffix: workflow.definition.parameters.Suffix,
    });
    expect(result.source.parameters).toEqual(workflow.parameters);
    expect(result.inputs).toEqual([]);
  });

  it('collects dependencies from both definition and supplied parameter values that are copied', () => {
    const workflow = fixture();
    workflow.parameters = { Root: { type: 'String', value: 'overridden' }, DefaultDependency: { type: 'String', value: 'fallback' } };
    workflow.definition.parameters = {
      Root: { type: 'String', defaultValue: "@parameters('DefaultDependency')" },
      DefaultDependency: { type: 'String', defaultValue: 'fallback' },
    };
    actionsOf(workflow).A = operation('Http', { uri: "@parameters('Root')", method: 'GET' }, 'Before');
    actionsOf(workflow).B = compose('done', 'A');
    const result = plan(workflow);
    expect(result.child.parameters).toEqual(workflow.parameters);
    expect(result.child.definition.parameters).toEqual(workflow.definition.parameters);
  });

  it.each(['supplied', 'default'])('allows ParseJson content from recursively resolved ordinary parameter %s values', (source) => {
    const workflow = genericFixture();
    const records = [{ min: 3, name: 'sanitized' }];
    workflow.definition.parameters!.Records = { type: 'Array', defaultValue: "@parameters('RecordValues')" };
    workflow.definition.parameters!.RecordValues = { type: 'Array', defaultValue: records };
    if (source === 'supplied') {
      workflow.parameters!.Records = { type: 'Array', value: "@parameters('RecordValues')" };
      workflow.parameters!.RecordValues = { type: 'Array', value: records };
    }
    (actionsOf(workflow).ParseJSON as LogicAppsV2.ParseJsonAction).inputs.content = "@parameters('Records')";
    const result = plan(workflow, ['Query', 'Http']);
    expect(result.inputs.find(({ expression }) => expression === "@body('ParseJSON')")).toEqual({
      name: 'input_ParseJSON',
      expression: "@body('ParseJSON')",
      rewrittenExpression: "@triggerBody()?['input_ParseJSON']",
      schema: arraySchema,
    });
    expect(inputsOf(result.child, 'Query').from).toBe("@triggerBody()?['input_ParseJSON']");
    expect(result.child.parameters).toEqual({ Minimum: { type: 'Int', value: 2 } });
    expect(result.child.definition.parameters).toEqual({ Minimum: { type: 'Int', defaultValue: 2 } });
    expect(inputsOf(result.source, 'ParseJSON').content).toBe("@parameters('Records')");
  });

  it.each([
    { type: 'Object', value: { password: 'sanitized' }, code: 'unsafe-data' },
    { type: 'String', value: "@appsetting('RECORD_VALUES')", code: 'parameter-boundary' },
    { type: 'SecureObject', value: { min: 3 }, code: 'parameter-boundary' },
  ])('rejects unsafe values behind an ordinary parameter alias: $type/$code', ({ type, value, code }) => {
    const workflow = genericFixture();
    workflow.parameters!.Records = { type: 'Array', value: "@parameters('RecordValues')" };
    workflow.parameters!.RecordValues = { type, value };
    (actionsOf(workflow).ParseJSON as LogicAppsV2.ParseJsonAction).inputs.content = "@parameters('Records')";
    expectCode(() => plan(workflow, ['Query', 'Http']), code);
  });

  it.each([
    { select: { password: 'sanitized' }, code: 'unsafe-data' },
    { select: { value: "@appsetting('VALUE')" }, code: 'parameter-boundary' },
  ])('inspects a transported Select mapping as well as its safe from array: $code', ({ select, code }) => {
    const workflow = fixture();
    actionsOf(workflow).Before = operation('Select', { from: [1, 2], select });
    actionsOf(workflow).A = compose("@body('Before')", 'Before');
    expectCode(() => plan(workflow), code);
  });

  it.each([
    { expression: "@parameters('Missing')", parameters: {}, code: 'missing-parameter' },
    {
      expression: "@parameters('Secret')",
      parameters: { Secret: { type: 'SecureString', value: 'sanitized' } },
      code: 'parameter-boundary',
    },
    { expression: "@parameters(concat('la', 'bel'))", parameters: {}, code: 'parameter-boundary' },
  ])('rejects missing, secure, or dynamic parameter reference $expression', ({ expression, parameters, code }) => {
    const workflow = fixture();
    workflow.parameters = parameters;
    actionsOf(workflow).A = operation('Http', { uri: expression, method: 'GET' }, 'Before');
    expectCode(() => plan(workflow), code);
  });

  it.each(["@parameters('Password')", "@appsetting('PUBLIC_SETTING')"])(
    'does not transport credential parameter or app-setting values as ordinary JSON: %s',
    (expression) => {
      const workflow = fixture();
      workflow.parameters = { Password: { type: 'String', value: 'sanitized' } };
      actionsOf(workflow).A = compose(expression, 'Before');
      actionsOf(workflow).B = compose("@outputs('A')", 'A');
      expectCode(() => plan(workflow), 'parameter-boundary');
    }
  );

  it.each([
    { host: { connection: { referenceName: 'used' } } },
    { serviceProviderConfiguration: { connectionName: 'used', operationId: 'read', serviceProviderId: '/serviceProviders/example' } },
  ])('copies only an actual connection reference and its required parameter dependencies: %j', (connectionInputs) => {
    const workflow = fixture();
    const reference = {
      api: { id: 'sanitized-api' },
      connection: { id: "@parameters('ConnectionId')" },
      authentication: { type: 'ManagedServiceIdentity' },
    };
    workflow.connectionReferences.used = reference;
    workflow.parameters = {
      ConnectionId: { type: 'String', value: "@parameters('ResourcePrefix')" },
      ResourcePrefix: { type: 'String', value: 'sanitized-connection' },
      Unused: { type: 'String', value: 'not needed' },
    };
    workflow.definition.parameters = {
      ConnectionId: { type: 'String', defaultValue: 'sanitized-connection' },
      ResourcePrefix: { type: 'String', defaultValue: 'sanitized-connection' },
      Unused: { type: 'String', defaultValue: 'not needed' },
    };
    actionsOf(workflow).A = operation(
      'ApiConnection',
      {
        ...connectionInputs,
        method: 'GET',
        path: '/items',
        body: { referenceName: 'not-a-connection', connectionName: 'also-not-a-connection' },
      },
      'Before',
      { metadata: { referenceName: 'unused' } }
    );
    actionsOf(workflow).B = compose('done', 'A');
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const result = plan(workflow);
    expect(result.child.connectionReferences).toEqual({ used: reference });
    expect(result.child.parameters).toEqual({
      ConnectionId: workflow.parameters.ConnectionId,
      ResourcePrefix: workflow.parameters.ResourcePrefix,
    });
    expect(result.child.definition.parameters).toEqual({
      ConnectionId: workflow.definition.parameters.ConnectionId,
      ResourcePrefix: workflow.definition.parameters.ResourcePrefix,
    });
    expect(actionsOf(result.child).A).toEqual({ ...actionsOf(workflow).A, runAfter: {} });
    expect(result.source.connectionReferences).toEqual(workflow.connectionReferences);
    expect(JSON.stringify(workflow)).toBe(original);
    result.child.connectionReferences.used.connection.id = 'changed';
    expect(workflow.connectionReferences.used.connection.id).toBe("@parameters('ConnectionId')");
  });

  it('collects actual connections referenced inside moved nested actions', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Scope',
      actions: {
        Connected: operation('ApiConnection', { host: { connection: { referenceName: 'unused' } }, method: 'GET', path: '/items' }),
      },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    expect(plan(workflow).child.connectionReferences).toEqual(workflow.connectionReferences);
  });

  it('copies a literal __proto__ connection reference as an own property without changing object prototypes', () => {
    const workflow = fixture();
    const reference = workflow.connectionReferences.unused;
    workflow.connectionReferences = Object.fromEntries([['__proto__', reference]]);
    actionsOf(workflow).A = operation('ApiConnection', { host: { connection: { referenceName: '__proto__' } } }, 'Before');
    actionsOf(workflow).B = compose('done', 'A');
    const result = plan(workflow);
    expect(Object.keys(result.child.connectionReferences)).toEqual(['__proto__']);
    expect(Object.prototype.hasOwnProperty.call(result.child.connectionReferences, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result.child.connectionReferences)).toBe(Object.prototype);
    expect(result.child.connectionReferences['__proto__']).toEqual(reference);
    expect(result.source.connectionReferences).toEqual(workflow.connectionReferences);
    expect(Object.getPrototypeOf(result.source.connectionReferences)).toBe(Object.prototype);
  });

  it.each([
    ['missing', 'missing-connection'],
    ["@parameters('label')", 'dynamic-connection'],
  ])('rejects unavailable or dynamic connection reference %s', (referenceName, code) => {
    const workflow = fixture();
    actionsOf(workflow).A = operation('ApiConnection', { host: { connection: { referenceName } } }, 'Before');
    expectCode(() => plan(workflow), code);
  });

  it('does not treat similarly named arbitrary payload or metadata properties as connection references', () => {
    const workflow = fixture();
    actionsOf(workflow).A = operation(
      'Custom.Action',
      {
        referenceName: 'missing',
        connectionName: 'missing',
        body: { host: { connection: { referenceName: 'missing' } } },
      },
      'Before',
      { metadata: { connectionName: 'missing' } }
    );
    actionsOf(workflow).B = compose('done', 'A');
    expect(plan(workflow).child.connectionReferences).toEqual({});
  });

  it('copies safe retry/chunking/operation configuration and only the selected static result', () => {
    const workflow = fixture();
    workflow.definition.staticResults = {
      ChosenResult: { status: 'Succeeded', outputs: { statusCode: 200, body: { min: 2 } } },
      UnusedResult: { status: 'Succeeded', outputs: { body: 'unused' } },
    };
    actionsOf(workflow).A = operation(
      'Http',
      {
        uri: 'https://example.invalid',
        method: 'POST',
        body: "@outputs('Before')",
        retryPolicy: { type: 'fixed', count: 2, interval: 'PT5S' },
      },
      'Before',
      {
        runtimeConfiguration: {
          contentTransfer: { transferMode: 'Chunked' },
          staticResult: { name: 'ChosenResult', staticResultOptions: 'Enabled' },
        },
        operationOptions: 'DisableAsyncPattern',
      }
    );
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const result = plan(workflow);
    expect(actionsOf(result.child).A).toEqual({
      ...actionsOf(workflow).A,
      inputs: { ...inputsOf(workflow, 'A'), body: "@triggerBody()?['input_Before']" },
      runAfter: {},
    });
    expect(result.child.definition.staticResults).toEqual({ ChosenResult: workflow.definition.staticResults.ChosenResult });
    expect(result.source.definition.staticResults).toEqual(workflow.definition.staticResults);
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it('rejects a moved action that references a missing static result', () => {
    const workflow = fixture();
    actionsOf(workflow).A.runtimeConfiguration = { staticResult: { name: 'Missing', staticResultOptions: 'Enabled' } };
    expectCode(() => plan(workflow), 'missing-static-result');
  });

  it('allows secure output settings when no secure action values cross the boundary', () => {
    const workflow = fixture();
    actionsOf(workflow).A = operation(
      'Http',
      {
        uri: 'https://example.invalid',
        method: 'GET',
      },
      'Before',
      { runtimeConfiguration: { secureData: { properties: ['outputs'] } } }
    );
    actionsOf(workflow).B = compose('done', 'A');
    expect(actionsOf(plan(workflow).child).A.runtimeConfiguration).toEqual({ secureData: { properties: ['outputs'] } });
    actionsOf(workflow).After = compose("@body('A')", 'B');
    expectCode(() => plan(workflow), 'unsafe-data');
  });

  it.each(["@outputs('A').statusCode", "@body('A')?['status']"])(
    'preserves an HTTP tracked-properties self-reference evaluated after the action completes: %s',
    (expression) => {
      const workflow = fixture();
      actionsOf(workflow).A = operation('Http', { uri: 'https://example.invalid', method: 'GET' }, 'Before', {
        trackedProperties: { statusCode: expression },
      });
      actionsOf(workflow).B = compose('done', 'A');
      const result = plan(workflow);
      expect(actionsOf(result.child).A).toEqual({ ...actionsOf(workflow).A, runAfter: {} });
      expect(result.inputs).toEqual([]);
      actionsOf(workflow).A = operation('Http', { uri: 'https://example.invalid', method: 'POST', body: "@outputs('A')" }, 'Before');
      expectCode(() => plan(workflow), 'unavailable-data');
    }
  );

  it.each(['@triggerBody()', '@triggerOutputs()'])('rejects exposing a secure trigger through %s', (expression) => {
    const workflow = fixture();
    workflow.definition.triggers!.manual.runtimeConfiguration = { secureData: { properties: ['outputs'] } };
    actionsOf(workflow).A = compose(expression, 'Before');
    expectCode(() => plan(workflow), 'unsafe-data');
  });

  it.each([
    ['JavaScriptCode', 'return { value: 2 + 3 };'],
    ['CustomCode', 'return "pure";'],
  ])('allows pure %s operations without workflow dependencies', (type, code) => {
    const workflow = fixture();
    actionsOf(workflow).A = operation(type, { code }, 'Before');
    actionsOf(workflow).B = compose('done', 'A');
    expect(actionsOf(plan(workflow).child).A).toEqual({ ...actionsOf(workflow).A, runAfter: {} });
  });

  it.each([
    'return workflowContext.actions.Before.outputs;',
    "return workflowContext['actions']['Before'];",
    'return workflowContext.trigger.outputs.body;',
    'return triggerContext.body;',
  ])('rejects selected code with opaque execution dependencies: %s', (code) => {
    const workflow = fixture();
    actionsOf(workflow).A = operation('JavaScriptCode', { code }, 'Before');
    expectCode(() => plan(workflow), 'opaque-context');
  });

  it('rejects unselected code that can secretly read moved action results through workflowContext', () => {
    const workflow = fixture();
    actionsOf(workflow).After = operation('JavaScriptCode', { code: 'return workflowContext.actions.B.outputs;' }, 'B');
    expectCode(() => plan(workflow), 'opaque-context');
  });

  it.each(['return workflowContext["actions"]["A"].outputs;', 'const context = workflowContext; return context.actions.A.outputs;'])(
    'rejects unselected code with bracketed or aliased moved action dependencies: %s',
    (code) => {
      const workflow = fixture();
      actionsOf(workflow).After = operation('JavaScriptCode', { code }, 'B');
      expectCode(() => plan(workflow), 'opaque-context');
    }
  );

  it('rejects forward or parallel nested data dependencies rather than assuming a whole Scope makes them available', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Scope',
      actions: {
        Read: compose("@body('NestedHttp')"),
        NestedHttp: operation('Http', { uri: 'https://example.invalid', method: 'GET' }, 'Read'),
      },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    expectCode(() => plan(workflow), 'unavailable-data');
    (actionsOf(workflow).A as LogicAppsV2.ScopeAction).actions!.NestedHttp.runAfter = {};
    expectCode(() => plan(workflow), 'unavailable-data');
  });

  it('allows an Until condition to read its completed nested HTTP body without exposing that per-iteration result outside', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Until',
      expression: "@or(equals(body('Poll')?['state'], 'done'), greater(iterationIndexes('A'), 2))",
      limit: { count: 10, timeout: 'PT1M' },
      actions: {
        Poll: operation('Http', {
          uri: 'https://example.invalid/status',
          method: 'POST',
          body: { iteration: "@iterationIndexes('A')", name: "@triggerBody()?['name']" },
        }),
      },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    const result = plan(workflow);
    expect(actionsOf(result.child).A).toEqual({
      ...actionsOf(workflow).A,
      actions: {
        Poll: operation('Http', {
          uri: 'https://example.invalid/status',
          method: 'POST',
          body: { iteration: "@iterationIndexes('A')", name: "@triggerBody()?['input_manual']?['name']" },
        }),
      },
      runAfter: {},
    });
    actionsOf(workflow).After = compose("@body('Poll')", 'B');
    expectCode(() => plan(workflow), 'conditional-output');
  });

  it.each(['Failed', 'Skipped', 'TimedOut'])(
    'conservatively requires successful ancestors for eager inputs across a %s recovery edge',
    (status) => {
      const workflow = fixture();
      actionsOf(workflow).Original = operation('Http', { uri: 'https://example.invalid', method: 'GET' });
      actionsOf(workflow).Before = { ...compose('recovered'), runAfter: { Original: [status] } };
      actionsOf(workflow).A = compose("@body('Original')", 'Before');
      expectCode(() => plan(workflow), 'unavailable-data');
      actionsOf(workflow).A = compose('no unavailable input', 'Before');
      expect(actionsOf(plan(workflow).source).Before).toEqual(actionsOf(workflow).Before);
    }
  );

  it.each(['If', 'Foreach'])('does not eagerly bind a skipped variable initializer used only inside a moved %s body', (type) => {
    const workflow = fixture();
    workflow.definition.actions = {
      Gate: operation('Http', { uri: 'https://example.invalid', method: 'GET' }),
      Init: operation('InitializeVariable', { variables: [{ name: 'Local', type: 'string', value: 'value' }] }, 'Gate'),
      Recover: { ...compose('recovered'), runAfter: { Init: ['Skipped'] } },
      A: {
        type,
        ...(type === 'If' ? { expression: '@equals(1, 2)', else: { actions: {} } } : { foreach: [] }),
        actions: { ReadLocal: compose("@variables('Local')") },
        runAfter: { Recover: ['Succeeded'] },
      } as LogicAppsV2.ActionDefinition,
      B: compose('done', 'A'),
    };
    const original = JSON.stringify(workflow);
    freeze(workflow);
    const createInvocation = vi.fn(invocation);
    expectCode(() => buildWorkflowExtractionPlan(workflow, ['A', 'B'], 'Child', createInvocation), 'shared-variable-write');
    expect(createInvocation).not.toHaveBeenCalled();
    expect(JSON.stringify(workflow)).toBe(original);
  });

  it.each(['CSV', 'HTML'])('preserves Table %s row-local item expressions in custom column values', (format) => {
    const workflow = fixture();
    actionsOf(workflow).A = operation(
      'Table',
      {
        format,
        from: '@triggerBody()',
        columns: [
          { header: 'Name', value: "@item()?['name']" },
          { header: 'Label', value: "@concat(item()?['name'], parameters('label'))" },
        ],
      },
      'Before'
    );
    actionsOf(workflow).B = compose("@body('A')", 'A');
    const result = plan(workflow);
    expect(inputsOf(result.child, 'A')).toEqual({ ...inputsOf(workflow, 'A'), from: "@triggerBody()?['input_manual']" });
    expect(result.child.parameters).toEqual(workflow.parameters);
    expect(result.outputs[0].schema).toEqual({ type: 'string' });
    expect(inputsOf(result.child, 'B')).toBe("@body('A')");
  });

  it.each([
    { from: '@item()', columns: [] },
    { from: [], columns: [{ header: '@item()', value: 'literal' }] },
    { from: [], columns: [{ header: 'Name', value: 'literal', valueMetadata: '@item()' }] },
    { from: [], columnsMetadata: [{ value: '@item()' }] },
  ])('does not extend Table row context to non-value fields: %j', (inputs) => {
    const workflow = fixture();
    actionsOf(workflow).A = operation('Table', { format: 'CSV', ...inputs }, 'Before');
    expectCode(() => plan(workflow), 'unsupported-context');
  });

  it('preserves recovery ordering and failed-action body reads entirely inside a moved Scope', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Scope',
      actions: {
        Request: operation('Http', { uri: 'https://example.invalid', method: 'GET' }),
        Recover: {
          ...compose({ error: "@body('Request')", status: "@outputs('Request').statusCode" }),
          runAfter: { Request: ['Failed', 'TimedOut'] },
        },
      },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    const result = plan(workflow);
    expect(actionsOf(result.child).A).toEqual({ ...actionsOf(workflow).A, runAfter: {} });
    expect(result.inputs).toEqual([]);
  });

  it('blocks notes anchored to descendants of selected containers', () => {
    const workflow = fixture();
    actionsOf(workflow).A = {
      type: 'Scope',
      actions: { Nested: compose('value') },
      runAfter: { Before: ['Succeeded'] },
    };
    actionsOf(workflow).B = compose('done', 'A');
    (workflow.notes!.general.metadata as unknown as Record<string, unknown>).nodeId = 'Nested';
    expectCode(() => plan(workflow), 'anchored-note');
  });
});

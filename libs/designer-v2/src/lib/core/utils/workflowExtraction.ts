import {
  ExpressionBuilder,
  ExpressionParser,
  ExpressionType,
  RUN_AFTER_STATUS,
  convertToStringLiteral,
  equals,
  isFunction,
  isStringInterpolation,
  isStringLiteral,
  isTemplateExpression,
  type Expression,
  type ExpressionFunction,
  type LogicAppsV2,
  type OpenAPIV2,
} from '@microsoft/logic-apps-shared';
import type { Workflow } from '../../common/models/workflow';
import type { WorkflowExtractionBinding, WorkflowExtractionPlan, WorkflowExtractionService } from '../../common/models/workflowExtraction';

export class WorkflowExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'WorkflowExtractionError';
  }
}

function fail(code: string, message: string): never {
  throw new WorkflowExtractionError(code, message);
}

// Context-free functions stay in their original action/consumer, never in a binding.
const dataFunctions = new Set(
  [
    'add',
    'adddays',
    'addhours',
    'addminutes',
    'addseconds',
    'addproperty',
    'addtotime',
    'and',
    'array',
    'base64',
    'base64tostring',
    'bool',
    'chunk',
    'coalesce',
    'concat',
    'contains',
    'converttimezone',
    'convertfromutc',
    'converttoutc',
    'createarray',
    'datauri',
    'datauritostring',
    'datedifference',
    'dayofmonth',
    'dayofweek',
    'dayofyear',
    'decimal',
    'decodebase64',
    'decodeuricomponent',
    'div',
    'empty',
    'encodeuricomponent',
    'endswith',
    'equals',
    'first',
    'float',
    'formatdatetime',
    'formatnumber',
    'getfuturetime',
    'getpasttime',
    'greater',
    'greaterorequals',
    'guid',
    'if',
    'indexof',
    'int',
    'intersection',
    'isfloat',
    'isint',
    'join',
    'json',
    'last',
    'lastindexof',
    'length',
    'less',
    'lessorequals',
    'max',
    'min',
    'mod',
    'mul',
    'not',
    'nthindexof',
    'or',
    'parsedatetime',
    'rand',
    'range',
    'removeproperty',
    'replace',
    'reverse',
    'setproperty',
    'skip',
    'slice',
    'sort',
    'split',
    'startofday',
    'startofhour',
    'startofmonth',
    'startswith',
    'string',
    'sub',
    'substring',
    'subtractfromtime',
    'take',
    'ticks',
    'tolower',
    'toupper',
    'trim',
    'union',
    'uricomponent',
    'uricomponenttostring',
    'urihost',
    'uripath',
    'uripathandquery',
    'uriport',
    'uriquery',
    'urischeme',
    'utcnow',
  ].map((name) => name.toLowerCase())
);

const sensitiveName =
  /^(?:\$content|\$content-type|password|passwd|secret|token|access_token|accessToken|refresh_token|authorization|authentication|apiKey|connectionString|clientSecret)$/i;
const builder = new ExpressionBuilder();
type Schema = OpenAPIV2.SchemaObject;
type Site = { actionId?: string; child?: boolean; workflowOutput?: boolean };
type ActionLocation = {
  action: LogicAppsV2.ActionDefinition;
  collection: LogicAppsV2.Actions;
  parentId?: string;
  topId: string;
  path: string;
};
const getInputs = (action: LogicAppsV2.ActionDefinition) => ('inputs' in action ? action.inputs : undefined);
const withinField = (path: string, field: string): boolean =>
  path === field || path.startsWith(`${field}.`) || path.startsWith(`${field}[`);
const hasOpaqueContext = (value: unknown): boolean =>
  typeof value === 'string'
    ? /\b(?:workflowContext|triggerContext)\b/i.test(value)
    : Array.isArray(value)
      ? value.some(hasOpaqueContext)
      : record(value) && Object.values(value).some(hasOpaqueContext);
const successOnly = (statuses: unknown): boolean =>
  Array.isArray(statuses) && statuses.length === 1 && typeof statuses[0] === 'string' && equals(statuses[0], RUN_AFTER_STATUS.SUCCEEDED);

function copy<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(copy) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copy(entry)])) as T;
  }
  return value;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parse(value: string, location: string): Expression {
  try {
    return ExpressionParser.parseTemplateExpression(value);
  } catch {
    return fail('invalid-expression', `An expression at ${location} could not be parsed safely.`);
  }
}

function visit(expression: Expression, transform: (node: ExpressionFunction) => ExpressionFunction): Expression {
  if (isStringInterpolation(expression)) {
    return { ...expression, segments: expression.segments.map((segment) => visit(segment, transform)) };
  }
  if (!isFunction(expression)) {
    return expression;
  }
  return transform({
    ...expression,
    arguments: expression.arguments.map((argument) => visit(argument, transform)),
    dereferences: expression.dereferences.map((dereference) => ({
      ...dereference,
      expression: visit(dereference.expression, transform),
    })),
  });
}

function walk(value: unknown, transform: (value: string, location: string) => string, location: string): unknown {
  if (typeof value === 'string') {
    return isTemplateExpression(value) ? transform(value, location) : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => walk(entry, transform, `${location}[${index}]`));
  }
  if (record(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (isTemplateExpression(key)) {
          fail('expression-key', `Expression-valued property names at ${location} are not supported.`);
        }
        return [key, walk(entry, transform, `${location}.${key}`)];
      })
    );
  }
  return value;
}

function uniqueName(base: string, occupied: string[]): string {
  const names = new Set(occupied.map((name) => name.toLowerCase()));
  let result = base;
  let suffix = 2;
  while (names.has(result.toLowerCase())) {
    result = `${base}_${suffix++}`;
  }
  return result;
}

function childCollections(action: LogicAppsV2.ActionDefinition): { path: string[]; actions: LogicAppsV2.Actions }[] {
  const result: { path: string[]; actions: LogicAppsV2.Actions }[] = [];
  const add = (value: unknown, path: string[]) => {
    if (value !== undefined) {
      if (!record(value)) {
        fail('invalid-action-collection', 'A control-flow action contains an invalid action collection.');
      }
      result.push({ path, actions: value as LogicAppsV2.Actions });
    }
  };
  switch (action.type.toLowerCase()) {
    case 'scope':
    case 'foreach':
    case 'until':
    case 'if': {
      add('actions' in action ? action.actions : undefined, ['actions']);
      if ('else' in action) {
        add(action.else?.actions, ['else', 'actions']);
      }
      break;
    }
    case 'switch': {
      for (const [name, branch] of Object.entries('cases' in action ? (action.cases ?? {}) : {})) {
        if (!record(branch)) {
          fail('invalid-action-collection', 'A Switch action contains an invalid case.');
        }
        add(branch.actions, ['cases', name, 'actions']);
      }
      add('default' in action ? action.default?.actions : undefined, ['default', 'actions']);
      break;
    }
  }
  return result;
}

function indexActions(actions: LogicAppsV2.Actions): Map<string, ActionLocation> {
  const locations = new Map<string, ActionLocation>();
  const collect = (collection: LogicAppsV2.Actions, path: string, parentId?: string, topId?: string) => {
    for (const [id, action] of Object.entries(collection)) {
      if (!record(action) || typeof action.type !== 'string' || !action.type.trim()) {
        fail('invalid-operation', `Action "${id}" has an invalid operation definition.`);
      }
      if (locations.has(id)) {
        fail('duplicate-action', `Action "${id}" occurs more than once; extraction requires unambiguous action names.`);
      }
      const actionPath = `${path}.${id}`;
      locations.set(id, { action, collection, parentId, topId: topId ?? id, path: actionPath });
      for (const nested of childCollections(action)) {
        collect(nested.actions, `${actionPath}.${nested.path.join('.')}`, id, topId ?? id);
      }
    }
  };
  collect(actions, 'actions');
  return locations;
}

function assertNoSensitiveData(value: unknown, location: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => assertNoSensitiveData(entry, location));
  } else if (record(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (sensitiveName.test(key)) {
        fail('unsafe-data', `Data at ${location} contains a secret or binary field and cannot cross the workflow boundary.`);
      }
      assertNoSensitiveData(entry, location);
    }
  }
}

function assertSafeTriggerSchema(value: unknown): asserts value is Schema {
  const unsafe = () =>
    fail('unsafe-trigger-schema', 'The transported schema contains secret, binary, or unresolved externally defined data.');
  if (value === undefined || typeof value === 'boolean') {
    return;
  }
  if (!record(value)) {
    return unsafe();
  }
  const schema = value;
  if (
    schema.$ref ||
    schema['x-ms-secret'] ||
    schema.writeOnly ||
    schema.contentEncoding ||
    schema.contentMediaType ||
    ['password', 'byte', 'binary'].includes(String(schema.format).toLowerCase())
  ) {
    unsafe();
  }
  if (record(schema.properties)) {
    for (const [key, property] of Object.entries(schema.properties)) {
      if (sensitiveName.test(key)) {
        unsafe();
      }
      assertSafeTriggerSchema(property);
    }
  }
  if (schema.items !== undefined) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach(assertSafeTriggerSchema);
    } else {
      assertSafeTriggerSchema(schema.items);
    }
  }
  for (const key of ['oneOf', 'anyOf', 'allOf', 'prefixItems']) {
    if (Array.isArray(schema[key])) {
      schema[key].forEach(assertSafeTriggerSchema);
    }
  }
  for (const key of ['additionalProperties', 'not', 'if', 'then', 'else', 'contains']) {
    if (schema[key] !== undefined) {
      assertSafeTriggerSchema(schema[key]);
    }
  }
  if (record(schema.patternProperties)) {
    Object.values(schema.patternProperties).forEach(assertSafeTriggerSchema);
  }
}

function checkNotes(notes: Workflow['notes'], selected: Set<string>): void {
  const anchorKeys = new Set(['actionId', 'actionName', 'nodeId', 'operationId', 'attachedTo', 'anchor', 'parentId']);
  const hasAnchor = (value: unknown): boolean => {
    if (Array.isArray(value)) {
      return value.some(hasAnchor);
    }
    if (!record(value)) {
      return false;
    }
    return Object.entries(value).some(
      ([key, entry]) => (anchorKeys.has(key) && typeof entry === 'string' && selected.has(entry)) || hasAnchor(entry)
    );
  };
  if (Object.entries(notes ?? {}).some(([id, note]) => selected.has(id) || hasAnchor(note))) {
    fail('anchored-note', 'A note is anchored to a selected action. Detach that note before extracting the actions.');
  }
}

/**
 * Plans extraction from a serialized Standard workflow. The caller resolves
 * pending designer renames; the host supplies its own synchronous invocation.
 */
export function buildWorkflowExtractionPlan(
  workflow: Workflow,
  selectedIds: string[],
  childName: string,
  createInvocation: WorkflowExtractionService['createInvocation']
): WorkflowExtractionPlan {
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(childName) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(childName)) {
    fail('invalid-name', 'Use a child workflow name of 1–80 letters, digits, hyphens, or underscores, starting with a letter or digit.');
  }
  if (workflow.kind && !['stateful', 'stateless'].includes(workflow.kind.toLowerCase())) {
    fail('unsupported-kind', 'Only Stateful and Stateless Standard workflows can be extracted.');
  }
  const selected = new Set(selectedIds);
  if (selected.size < 2 || selected.size !== selectedIds.length) {
    fail('invalid-selection', 'Select at least two distinct actions to extract.');
  }
  const actions = workflow.definition.actions ?? {};
  const locations = indexActions(actions);
  for (const id of selected) {
    if (!Object.prototype.hasOwnProperty.call(actions, id)) {
      fail('selection-not-top-level', `Selected action "${id}" is missing or is not in the top-level action collection.`);
    }
  }
  const moved = new Set([...locations].filter(([, location]) => selected.has(location.topId)).map(([id]) => id));
  checkNotes(workflow.notes, moved);
  const triggers = Object.entries(workflow.definition.triggers ?? {});
  if (triggers.length !== 1) {
    fail('unsupported-trigger', 'Extraction requires exactly one source workflow trigger.');
  }
  const [triggerId, trigger] = triggers[0];
  if (!trigger || typeof trigger.type !== 'string') {
    fail('unsupported-trigger', 'The source workflow trigger has an invalid operation definition.');
  }
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();
  for (const [id, action] of Object.entries(actions)) {
    const runAfter = action.runAfter ?? {};
    if (!record(runAfter)) {
      fail('invalid-run-after', `Action "${id}" has an invalid runAfter definition.`);
    }
    predecessors.set(id, Object.keys(runAfter));
    for (const [parent, statuses] of Object.entries(runAfter)) {
      if (!Object.prototype.hasOwnProperty.call(actions, parent)) {
        fail('invalid-run-after', `Action "${id}" depends on an unknown action "${parent}".`);
      }
      if ((selected.has(id) || selected.has(parent)) && !successOnly(statuses)) {
        fail('status-sensitive-path', `Action "${id}" has a non-success or status-sensitive dependency on "${parent}".`);
      }
      successors.set(parent, [...(successors.get(parent) ?? []), id]);
    }
  }
  const ancestorCache = new Map<string, Set<string>>();
  const ancestors = (id: string, visiting = new Set<string>()): Set<string> => {
    const cached = ancestorCache.get(id);
    if (cached) {
      return cached;
    }
    if (visiting.has(id)) {
      return fail('cyclic-dependency', 'The action dependency graph contains a cycle.');
    }
    const nextVisiting = new Set([...visiting, id]);
    const result = new Set<string>();
    for (const parent of predecessors.get(id) ?? []) {
      result.add(parent);
      for (const ancestor of ancestors(parent, nextVisiting)) {
        result.add(ancestor);
      }
    }
    ancestorCache.set(id, result);
    return result;
  };
  Object.keys(actions).forEach((id) => ancestors(id));
  const entries = [...selected].filter((id) => !(predecessors.get(id) ?? []).some((parent) => selected.has(parent)));
  if (entries.length !== 1) {
    fail('selection-not-linear', 'Select one contiguous linear chain without gaps or parallel branches.');
  }
  const entry = entries[0];
  if ((predecessors.get(entry)?.length ?? 0) > 1) {
    fail('multiple-entry-parents', 'The first selected action must have at most one incoming dependency.');
  }
  const ordered: string[] = [];
  let current: string | undefined = entry;
  while (current) {
    ordered.push(current);
    const next: string[] = (successors.get(current) ?? []).filter((id) => selected.has(id));
    if (next.length > 1) {
      fail('selection-not-linear', 'Selected actions contain a parallel branch instead of a linear chain.');
    }
    if (next.length && predecessors.get(next[0])?.length !== 1) {
      fail('incoming-interior-edge', `Selected action "${next[0]}" has an additional incoming dependency.`);
    }
    current = next[0];
  }
  if (ordered.length !== selected.size) {
    fail('selection-not-linear', 'Select one contiguous linear chain without gaps.');
  }
  const tail = ordered[ordered.length - 1];
  for (const id of ordered.slice(0, -1)) {
    if ((successors.get(id) ?? []).some((successor) => !selected.has(successor))) {
      fail('intermediate-side-exit', `Selected action "${id}" has a side exit. Only the last selected action may have outside consumers.`);
    }
  }
  for (const id of successors.get(tail) ?? []) {
    if ((predecessors.get(id)?.length ?? 0) > 1) {
      fail('multiple-exit-parents', `Action "${id}" joins the selection with another dependency at the extraction boundary.`);
    }
  }

  const invocationId = uniqueName('Invoke_extracted_workflow', [...locations.keys(), triggerId]);
  const inputs: WorkflowExtractionBinding[] = [];
  const outputs: WorkflowExtractionBinding[] = [];
  const inputBindings = new Map<string, WorkflowExtractionBinding>();
  const outputBindings = new Map<string, WorkflowExtractionBinding>();
  const triggerSchema: unknown = 'inputs' in trigger && record(trigger.inputs) ? trigger.inputs.schema : undefined;

  const containers = (id: string): string[] => {
    const parents: string[] = [];
    let parent = locations.get(id)?.parentId;
    while (parent) {
      parents.push(parent);
      parent = locations.get(parent)?.parentId;
    }
    return parents;
  };
  const localAncestors = (id: string, visiting = new Set<string>()): Set<string> => {
    if (visiting.has(id)) {
      return fail('cyclic-dependency', 'The action dependency graph contains a cycle.');
    }
    const location = locations.get(id)!;
    const result = new Set<string>();
    const runAfter = location.action.runAfter ?? {};
    if (!record(runAfter)) {
      fail('invalid-run-after', `Action "${id}" has an invalid runAfter definition.`);
    }
    for (const parent of Object.keys(runAfter)) {
      if (!Object.prototype.hasOwnProperty.call(location.collection, parent)) {
        fail('invalid-run-after', `Action "${id}" depends on an action outside its own scope.`);
      }
      result.add(parent);
      for (const ancestor of localAncestors(parent, new Set([...visiting, id]))) {
        result.add(ancestor);
      }
    }
    return result;
  };
  const available = (reference: string, consumer: string): boolean => {
    for (const site of [consumer, ...containers(consumer)]) {
      const before = localAncestors(site);
      if (before.has(reference) || containers(reference).some((parent) => before.has(parent))) {
        return true;
      }
    }
    return false;
  };
  const successfulAncestors = (id: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(id)) {
      return fail('cyclic-dependency', 'The action dependency graph contains a cycle.');
    }
    const result = new Set<string>();
    for (const [parent, statuses] of Object.entries(locations.get(id)!.action.runAfter ?? {})) {
      if (successOnly(statuses)) {
        result.add(parent);
        for (const ancestor of successfulAncestors(parent, new Set([...seen, id]))) {
          result.add(ancestor);
        }
      }
    }
    return result;
  };
  const guaranteedBefore = (reference: string, consumer: string): boolean => {
    const before = successfulAncestors(consumer);
    if (before.has(reference)) {
      return true;
    }
    return containers(reference).some(
      (scope) =>
        before.has(scope) &&
        containers(reference).every((parent) => locations.get(parent)!.action.type.toLowerCase() === 'scope') &&
        [...locations]
          .filter(([id]) => containers(id).includes(scope))
          .every(([, location]) => Object.values(location.action.runAfter ?? {}).every(successOnly))
    );
  };
  const assertSingleResult = (id: string): void => {
    if (containers(id).some((parent) => ['foreach', 'until', 'if', 'switch'].includes(locations.get(parent)!.action.type.toLowerCase()))) {
      fail('conditional-output', `Action "${id}" is inside a loop or conditional branch. Extract the value outside that container first.`);
    }
  };
  const literalArgument = (node: ExpressionFunction, location: string, code = 'unsupported-context'): string => {
    if (node.arguments.length !== 1 || !isStringLiteral(node.arguments[0])) {
      fail(code, `Function "${node.name}" at ${location} requires one literal name so its dependencies can be preserved.`);
    }
    return node.arguments[0].value;
  };
  const variables = new Map<string, { name: string; id: string; type: string; value: unknown }>();
  const variableWriters = new Map<string, string[]>();
  for (const [id, { action }] of locations) {
    const type = action.type.toLowerCase();
    const actionInputs = getInputs(action);
    if (type === 'initializevariable') {
      if (!Array.isArray(actionInputs?.variables)) {
        fail('invalid-variable', `Action "${id}" has an invalid variable declaration.`);
      }
      for (const variable of actionInputs.variables) {
        if (!record(variable) || typeof variable.name !== 'string' || typeof variable.type !== 'string') {
          fail('invalid-variable', `Action "${id}" has an invalid variable declaration.`);
        }
        const key = variable.name.toLowerCase();
        if (variables.has(key)) {
          fail('invalid-variable', `Variable "${variable.name}" has more than one declaration.`);
        }
        variables.set(key, { name: variable.name, id, type: variable.type.toLowerCase(), value: variable.value });
      }
    } else if (
      ['setvariable', 'incrementvariable', 'decrementvariable', 'appendtoarrayvariable', 'appendtostringvariable'].includes(type)
    ) {
      if (typeof actionInputs?.name !== 'string' || isTemplateExpression(actionInputs.name)) {
        fail('invalid-variable', `Action "${id}" must use a literal variable name.`);
      }
      const key = actionInputs.name.toLowerCase();
      variableWriters.set(key, [...(variableWriters.get(key) ?? []), id]);
    }
    if (moved.has(id)) {
      if (type === 'response' || type === 'terminate') {
        fail(
          'workflow-lifecycle',
          `Action "${id}" responds to or terminates the original workflow. Moving it would change which workflow or caller it affects.`
        );
      }
      if (type.endsWith('code') && hasOpaqueContext(actionInputs)) {
        fail('opaque-context', `Code in "${id}" reads workflow execution context. Replace those reads with explicit action inputs first.`);
      }
    } else if (type.endsWith('code') && hasOpaqueContext(actionInputs)) {
      fail(
        'opaque-context',
        `Code in "${id}" reads actions through opaque execution context; extraction cannot safely rewrite those references.`
      );
    }
  }
  for (const [name, writers] of variableWriters) {
    const declaration = variables.get(name);
    if (writers.some((id) => moved.has(id)) && (!declaration || !moved.has(declaration.id))) {
      fail('shared-variable-write', `Variable "${name}" is changed by the selection but belongs to the source workflow.`);
    }
    if (declaration && moved.has(declaration.id) && writers.some((id) => !moved.has(id))) {
      fail('escaping-variable', `Variable "${name}" is declared in the selection but is changed outside it.`);
    }
  }
  const requiredParameters = new Set<string>();
  const requiredConnections = new Set<string>();
  const requiredStaticResults = new Set<string>();
  const collectParameter = (name: string): void => {
    if (requiredParameters.has(name)) {
      return;
    }
    const supplied = workflow.parameters?.[name];
    const definition = workflow.definition.parameters?.[name];
    if (!supplied && !definition) {
      fail('missing-parameter', `Parameter "${name}" used by the selection is missing from the workflow.`);
    }
    const representations = [supplied, definition].filter((parameter) => parameter !== undefined);
    if (representations.some((parameter) => /^secure/i.test(parameter.type))) {
      fail('parameter-boundary', `Secure parameter "${name}" cannot be copied into the extracted workflow.`);
    }
    requiredParameters.add(name);
    walk(
      representations,
      (text, path) => {
        visit(parse(text, path), (node) => {
          const functionName = node.name.toLowerCase();
          if (functionName === 'parameters') {
            collectParameter(literalArgument(node, path, 'parameter-boundary'));
          } else if (functionName !== 'appsetting' && !dataFunctions.has(functionName)) {
            fail('parameter-boundary', `Parameter "${name}" depends on workflow execution context.`);
          }
          return node;
        });
        return text;
      },
      `parameters.${name}`
    );
  };
  for (const id of moved) {
    const action = locations.get(id)!.action;
    const actionInputs = getInputs(action);
    const connectionName = actionInputs?.host?.connection?.referenceName ?? actionInputs?.serviceProviderConfiguration?.connectionName;
    if (connectionName !== undefined) {
      if (typeof connectionName !== 'string' || isTemplateExpression(connectionName)) {
        fail('dynamic-connection', `Action "${id}" has a dynamic connection name that cannot be transferred safely.`);
      }
      if (!Object.prototype.hasOwnProperty.call(workflow.connectionReferences ?? {}, connectionName)) {
        fail('missing-connection', `Connection reference "${connectionName}" required by "${id}" is missing from the workflow.`);
      }
      requiredConnections.add(connectionName);
    }
    const staticName = action.runtimeConfiguration?.staticResult?.name;
    if (typeof staticName === 'string') {
      if (!Object.prototype.hasOwnProperty.call(workflow.definition.staticResults ?? {}, staticName)) {
        fail('missing-static-result', `Static result "${staticName}" required by "${id}" is missing from the workflow.`);
      }
      requiredStaticResults.add(staticName);
    }
  }

  const referenceId = (node: ExpressionFunction, location: string): string => {
    const id = literalArgument(node, location, 'dynamic-action-reference');
    if (!locations.has(id)) {
      return fail('dynamic-action-reference', `An action reference at ${location} must name an existing action with a string literal.`);
    }
    if (locations.get(id)!.action.type.toLowerCase() === 'compose' && node.name.toLowerCase() === 'body') {
      return fail(
        'unsupported-action-reference',
        `Reference at ${location} is unsupported. Use outputs() for the raw result of a Compose action; body() is not interchangeable.`
      );
    }
    return id;
  };

  const ensureTransportable = (value: unknown, location: string, seen = new Set<string>()): void => {
    assertNoSensitiveData(value, location);
    walk(
      value,
      (text, path) => {
        visit(parse(text, path), (node) => {
          const name = node.name.toLowerCase();
          if (name === 'parameters') {
            const parameterName = literalArgument(node, path, 'parameter-boundary');
            const parameter = workflow.parameters?.[parameterName] ?? workflow.definition.parameters?.[parameterName];
            if (!parameter || /^secure/i.test(parameter.type) || sensitiveName.test(parameterName)) {
              fail('parameter-boundary', `Parameter "${parameterName}" cannot be transported as ordinary JSON.`);
            }
            const key = `parameter:${parameterName}`;
            if (!seen.has(key)) {
              ensureTransportable(parameter.value ?? parameter.defaultValue, path, new Set([...seen, key]));
            }
          } else if (name === 'appsetting') {
            fail('parameter-boundary', 'App-setting values cannot cross the extraction boundary as ordinary JSON.');
          }
          if (name === 'triggerbody' || name === 'triggeroutputs') {
            if (trigger.runtimeConfiguration?.secureData?.properties?.length) {
              fail('unsafe-data', 'The source trigger has secure data enabled; its values cannot be exposed in extraction bindings.');
            }
            assertSafeTriggerSchema(triggerSchema);
          } else if (name === 'outputs' || name === 'body') {
            const id = referenceId(node, path);
            const action = locations.get(id)!.action;
            const actionInputs = getInputs(action);
            if (action.runtimeConfiguration?.secureData?.properties?.length) {
              fail('unsafe-data', `Action "${id}" has secure data enabled; its values cannot be exposed in extraction bindings.`);
            }
            if (!seen.has(id)) {
              if (['compose', 'query', 'select', 'parsejson'].includes(action.type.toLowerCase())) {
                const value =
                  action.type.toLowerCase() === 'compose'
                    ? actionInputs
                    : action.type.toLowerCase() === 'parsejson'
                      ? actionInputs?.content
                      : actionInputs?.from;
                ensureTransportable(value, path, new Set([...seen, id]));
                if (action.type.toLowerCase() === 'select') {
                  ensureTransportable(actionInputs?.select, path, new Set([...seen, id]));
                }
                if (action.type.toLowerCase() === 'parsejson') {
                  assertSafeTriggerSchema(actionInputs?.schema);
                }
              }
            }
          } else if (name === 'variables') {
            const variable = variables.get(literalArgument(node, path).toLowerCase());
            if (!variable) {
              fail('unsupported-context', `Variable referenced at ${path} has no declaration.`);
            }
            if (sensitiveName.test(variable.name)) {
              fail('unsafe-data', `Variable "${variable.name}" cannot cross the extraction boundary as ordinary JSON.`);
            }
            if (!seen.has(variable.id)) {
              ensureTransportable(variable.value, path, new Set([...seen, variable.id]));
              for (const writer of variableWriters.get(variable.name.toLowerCase()) ?? []) {
                ensureTransportable(getInputs(locations.get(writer)!.action)?.value, path, new Set([...seen, variable.id]));
              }
            }
          } else if (['binary', 'base64tobinary', 'datauritobinary', 'xml'].includes(name)) {
            fail('unsafe-data', 'Binary or XML values cannot be represented by ordinary JSON extraction bindings.');
          }
          return node;
        });
        return text;
      },
      location
    );
  };

  const inferSchema = (value: unknown, seen = new Set<string>()): Schema => {
    if (value === null) {
      return { type: 'null' };
    }
    if (typeof value === 'number') {
      return { type: Number.isInteger(value) ? 'integer' : 'number' };
    }
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }
    if (typeof value === 'string') {
      if (!isTemplateExpression(value)) {
        return { type: 'string' };
      }
      const ast = parse(value, 'transport schema');
      if (ast.type === ExpressionType.StringLiteral || isStringInterpolation(ast)) {
        return { type: 'string' };
      }
      if (!isFunction(ast)) {
        if (ast.type === ExpressionType.NullLiteral) {
          return { type: 'null' };
        }
        return {
          type: ast.type === ExpressionType.BooleanLiteral ? 'boolean' : Number.isInteger(Number(ast.value)) ? 'integer' : 'number',
        };
      }
      let schema: Schema = {};
      if (ast.name.toLowerCase() === 'triggerbody') {
        schema = record(triggerSchema) ? (copy(triggerSchema) as Schema) : {};
      } else if (ast.name.toLowerCase() === 'triggeroutputs') {
        schema = {
          type: 'object',
          properties: { body: record(triggerSchema) ? (copy(triggerSchema) as Schema) : {}, headers: { type: 'object' } },
        };
      } else if (ast.name.toLowerCase() === 'variables') {
        const variable = variables.get(literalArgument(ast, 'transport schema').toLowerCase());
        if (variable) {
          const type = variable.type === 'float' ? 'number' : variable.type;
          schema = type === 'array' ? { type, items: {} } : { type };
        }
      } else if (['outputs', 'body'].includes(ast.name.toLowerCase())) {
        const id = referenceId(ast, 'transport schema');
        if (!seen.has(id)) {
          const action = locations.get(id)!.action;
          const actionInputs = getInputs(action);
          const nextSeen = new Set([...seen, id]);
          const type = action.type.toLowerCase();
          if (type === 'compose') {
            schema = inferSchema(actionInputs, nextSeen);
          } else {
            let body: Schema = {};
            if (type === 'parsejson' && record(actionInputs?.schema)) {
              body = copy(actionInputs.schema) as Schema;
            } else if (type === 'query') {
              const from = inferSchema(actionInputs?.from, nextSeen);
              body = { type: 'array', items: from.items ?? {} };
            } else if (type === 'select') {
              body = { type: 'array', items: inferSchema(actionInputs?.select, nextSeen) };
            } else if (['join', 'table'].includes(type)) {
              body = { type: 'string' };
            }
            schema =
              ast.name.toLowerCase() === 'body'
                ? body
                : ['http', 'workflow', 'apiconnection', 'apiconnectionwebhook', 'parsejson', 'query', 'select', 'join', 'table'].includes(
                      type
                    )
                  ? {
                      type: 'object',
                      properties: {
                        body,
                        ...(type === 'http' || type === 'workflow' ? { statusCode: { type: 'integer' }, headers: { type: 'object' } } : {}),
                      },
                    }
                  : {};
          }
        }
      }
      for (const dereference of ast.dereferences) {
        const key = dereference.expression;
        if (schema.type === 'object' && isStringLiteral(key)) {
          schema = (schema.properties?.[key.value] as Schema) ?? {};
        } else if (schema.type === 'array' && key.type === ExpressionType.NumberLiteral && !Array.isArray(schema.items)) {
          schema = (schema.items as Schema) ?? {};
        } else {
          schema = {};
        }
        // Safe navigation may return null even when the property's schema is typed.
        if (dereference.isSafe && schema.type) {
          const types = Array.isArray(schema.type) ? schema.type : [schema.type];
          schema = { ...schema, type: [...new Set([...types, 'null'])] };
        }
      }
      return copy(schema);
    }
    if (Array.isArray(value)) {
      const schemas = value.map((entry) => inferSchema(entry, seen));
      return {
        type: 'array',
        items: schemas.length && schemas.every((schema) => JSON.stringify(schema) === JSON.stringify(schemas[0])) ? schemas[0] : {},
      };
    }
    if (record(value)) {
      return {
        type: 'object',
        properties: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, inferSchema(entry, seen)])),
        additionalProperties: false,
      };
    }
    return {};
  };

  const bind = (node: ExpressionFunction, inbound: boolean): ExpressionFunction => {
    const functionName = node.name.toLowerCase();
    const root = {
      ...node,
      name: functionName === 'triggerbody' ? 'triggerBody' : functionName === 'triggeroutputs' ? 'triggerOutputs' : functionName,
      dereferences: [],
    };
    const expression = builder.buildTemplateExpression(root);
    const bindings = inbound ? inputBindings : outputBindings;
    let binding = bindings.get(expression);
    if (!binding) {
      ensureTransportable(expression, 'transported data');
      const sourceId = functionName.startsWith('trigger')
        ? triggerId
        : functionName === 'variables'
          ? literalArgument(node, 'transported data')
          : referenceId(node, 'transported data');
      const sourceName = sourceId.replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^_+|_+$/g, '') || 'action';
      const name = uniqueName(
        `${inbound ? 'input' : 'output'}_${sourceName}`,
        Array.from(bindings.values(), (existing) => existing.name)
      );
      const rewrittenExpression = inbound
        ? `@triggerBody()?[${convertToStringLiteral(name)}]`
        : `@body(${convertToStringLiteral(invocationId)})?[${convertToStringLiteral(name)}]`;
      binding = { name, expression, rewrittenExpression, schema: inferSchema(expression) };
      bindings.set(expression, binding);
      (inbound ? inputs : outputs).push(binding);
    }
    const replacement = parse(binding.rewrittenExpression, 'binding') as ExpressionFunction;
    return { ...replacement, dereferences: [...replacement.dereferences, ...node.dereferences] };
  };

  const rewrite = (value: unknown, site: Site, location: string): unknown =>
    walk(
      value,
      (text, path) => {
        let changed = false;
        const expression = visit(parse(text, path), (node) => {
          const name = node.name.toLowerCase();
          if (name === 'parameters' || name === 'appsetting') {
            if (site.child) {
              const parameterName = literalArgument(node, path, 'parameter-boundary');
              if (name === 'parameters') {
                collectParameter(parameterName);
              }
            }
            return node;
          }
          if (name === 'triggerbody' || name === 'triggeroutputs') {
            if (node.arguments.length) {
              fail('unsupported-expression', `${node.name}() at ${path} must not have arguments.`);
            }
            if (site.child) {
              changed = true;
              return bind(node, true);
            }
            return node;
          }
          if (name === 'outputs' || name === 'body') {
            const id = referenceId(node, path);
            const crossing = !!site.child !== moved.has(id);
            const selfTrackedProperty = id === site.actionId && withinField(path, `${locations.get(id)!.path}.trackedProperties`);
            const untilCondition =
              site.actionId &&
              locations.get(site.actionId)!.action.type.toLowerCase() === 'until' &&
              withinField(path, `${locations.get(site.actionId)!.path}.expression`) &&
              containers(id).includes(site.actionId);
            if ((site.child || crossing) && site.actionId && !selfTrackedProperty && !untilCondition && !available(id, site.actionId)) {
              fail('unavailable-data', `Action "${site.actionId}" references "${id}", which is not guaranteed to have succeeded first.`);
            }
            if (site.child && !moved.has(id)) {
              if (!available(id, entry) || !guaranteedBefore(id, entry)) {
                fail('unavailable-data', `Input "${id}" is not guaranteed to have succeeded before the selected chain.`);
              }
              assertSingleResult(id);
              changed = true;
              return bind(node, true);
            }
            if (!site.child && moved.has(id)) {
              if (!site.workflowOutput && (!site.actionId || !available(tail, site.actionId))) {
                fail(
                  'unsupported-reference-location',
                  `A selected action is referenced at ${path}, outside a guaranteed downstream consumer.`
                );
              }
              assertSingleResult(id);
              changed = true;
              return bind(node, false);
            }
            return node;
          }
          if (name === 'variables') {
            const variableName = literalArgument(node, path).toLowerCase();
            const variable = variables.get(variableName);
            if (!variable) {
              fail('unsupported-context', `Variable at ${path} has no declaration.`);
            }
            if (!site.child && moved.has(variable.id)) {
              fail('escaping-variable', `Variable "${variable.name}" is declared in the selection but is read outside it.`);
            }
            if (site.child) {
              if (!site.actionId || !available(variable.id, site.actionId)) {
                fail('unavailable-data', `Variable "${variable.name}" is not initialized before the selected action.`);
              }
              if (!moved.has(variable.id)) {
                if (!guaranteedBefore(variable.id, entry)) {
                  fail(
                    'shared-variable-write',
                    `Variable "${variable.name}" is not guaranteed to be initialized before the child workflow call.`
                  );
                }
                if ((variableWriters.get(variableName) ?? []).some((writer) => !available(writer, entry) && !available(tail, writer))) {
                  fail('shared-variable-write', `Variable "${variable.name}" may change while the selected actions run.`);
                }
                changed = true;
                return bind(node, true);
              }
            }
            return node;
          }
          if (name === 'item' || name === 'items' || name === 'iterationindexes') {
            if (!site.child) {
              return node;
            }
            const ownerIds = site.actionId ? containers(site.actionId) : [];
            if (name === 'item' && node.arguments.length === 0) {
              const local = site.actionId && locations.get(site.actionId)!.action.type.toLowerCase();
              const localPath = site.actionId ? locations.get(site.actionId)!.path : '';
              if (
                (local === 'query' && withinField(path, `${localPath}.inputs.where`)) ||
                (local === 'select' && withinField(path, `${localPath}.inputs.select`)) ||
                (local === 'table' &&
                  /^\[\d+\]\.value(?:\.|\[|$)/.test(path.slice(`${localPath}.inputs.columns`.length)) &&
                  withinField(path, `${localPath}.inputs.columns`)) ||
                ownerIds.some((id) => moved.has(id) && locations.get(id)!.action.type.toLowerCase() === 'foreach')
              ) {
                return node;
              }
            } else {
              const owner = literalArgument(node, path);
              const expected = name === 'items' ? 'foreach' : 'until';
              const ownUntilCondition =
                name === 'iterationindexes' && owner === site.actionId && withinField(path, `${locations.get(owner)!.path}.expression`);
              if (
                (ownerIds.includes(owner) || ownUntilCondition) &&
                moved.has(owner) &&
                locations.get(owner)!.action.type.toLowerCase() === expected
              ) {
                return node;
              }
            }
            fail('unsupported-context', `Loop item context at ${path} does not move with the selection.`);
          }
          if (name === 'actions' || name === 'result') {
            const id = literalArgument(node, path);
            if (!site.child && !moved.has(id)) {
              return node;
            }
            if (site.child && moved.has(id) && site.actionId && available(id, site.actionId)) {
              return node;
            }
            fail('unsupported-context', `Status or result context for "${id}" cannot cross the extraction boundary.`);
          }
          if (site.child && !dataFunctions.has(name)) {
            fail(
              'unsupported-context',
              `Function "${node.name}" at ${path} depends on execution context that is not preserved by a child workflow.`
            );
          }
          return node;
        });
        return changed ? builder.buildTemplateExpression(expression) : text;
      },
      location
    );

  const rewriteAction = (id: string, child: boolean): LogicAppsV2.ActionDefinition => {
    const { action, path } = locations.get(id)!;
    const nestedCollections = childCollections(action);
    const definition = copy(action);
    const replaceCollection = (target: LogicAppsV2.ActionDefinition, segments: string[], value: LogicAppsV2.Actions) => {
      if (!record(target)) {
        fail('invalid-operation', `Action "${id}" has an invalid operation definition.`);
      }
      let container: Record<string, unknown> = target;
      for (const segment of segments.slice(0, -1)) {
        const next = container[segment];
        if (!record(next)) {
          fail('invalid-action-collection', `Action "${id}" has an invalid child action collection.`);
        }
        container = next;
      }
      Object.defineProperty(container, segments[segments.length - 1], { value, enumerable: true, writable: true, configurable: true });
    };
    for (const nested of nestedCollections) {
      replaceCollection(definition, nested.path, {});
    }
    if (child && action.type.toLowerCase() === 'compose') {
      assertNoSensitiveData(getInputs(action), `${path}.inputs`);
    }
    const rewritten = rewrite(definition, { child, actionId: id }, path) as LogicAppsV2.ActionDefinition;
    for (const nested of nestedCollections) {
      replaceCollection(
        rewritten,
        nested.path,
        Object.fromEntries(Object.keys(nested.actions).map((nestedId) => [nestedId, rewriteAction(nestedId, child)]))
      );
    }
    return rewritten;
  };
  const childActions: LogicAppsV2.Actions = Object.fromEntries(ordered.map((id) => [id, rewriteAction(id, true)]));
  childActions[entry].runAfter = {};
  const source = copy(workflow);
  const sourceActions: LogicAppsV2.Actions = {};
  for (const id of Object.keys(actions)) {
    if (!selected.has(id)) {
      const rewritten = rewriteAction(id, false);
      if (Object.prototype.hasOwnProperty.call(rewritten.runAfter ?? {}, tail)) {
        rewritten.runAfter = { [invocationId]: ['Succeeded'] };
      }
      Object.defineProperty(sourceActions, id, { value: rewritten, enumerable: true, configurable: true, writable: true });
    } else if (id === entry) {
      Object.defineProperty(sourceActions, invocationId, {
        value: undefined,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  for (const [key, value] of Object.entries(source.definition)) {
    if (key !== 'actions') {
      (source.definition as unknown as Record<string, unknown>)[key] = rewrite(
        value,
        { workflowOutput: key === 'outputs' },
        `definition.${key}`
      );
    }
  }
  if (source.parameters) {
    source.parameters = rewrite(source.parameters, {}, 'parameters') as Workflow['parameters'];
  }
  const requestId = uniqueName('Request', [...moved]);
  const responseId = uniqueName('Response', [...moved, requestId]);
  const objectSchema = (bindings: WorkflowExtractionBinding[]): Schema => ({
    type: 'object',
    properties: Object.fromEntries(bindings.map((binding) => [binding.name, copy(binding.schema)])),
    additionalProperties: false,
  });
  childActions[responseId] = {
    type: 'Response',
    kind: 'Http',
    inputs: {
      statusCode: 200,
      body: Object.fromEntries(outputs.map((binding) => [binding.name, binding.expression])),
      schema: objectSchema(outputs),
    },
    runAfter: { [tail]: ['Succeeded'] },
  } as LogicAppsV2.ActionDefinition;
  const child: Workflow = {
    definition: {
      $schema: workflow.definition.$schema,
      contentVersion: workflow.definition.contentVersion,
      triggers: {
        [requestId]: {
          type: 'Request',
          kind: 'Http',
          inputs: { schema: objectSchema(inputs) as LogicAppsV2.ManualTriggerInputs['schema'] },
        },
      },
      actions: childActions,
      outputs: {},
    },
    connectionReferences: {},
    ...(workflow.kind === undefined ? {} : { kind: workflow.kind }),
  };
  for (const name of requiredConnections) {
    const reference = workflow.connectionReferences[name];
    Object.defineProperty(child.connectionReferences, name, {
      value: copy(reference),
      enumerable: true,
      configurable: true,
      writable: true,
    });
    walk(
      reference,
      (text, path) => {
        visit(parse(text, path), (node) => {
          if (node.name.toLowerCase() === 'parameters') {
            collectParameter(literalArgument(node, path, 'parameter-boundary'));
          } else if (node.name.toLowerCase() !== 'appsetting' && !dataFunctions.has(node.name.toLowerCase())) {
            fail('connection-context', `Connection "${name}" depends on workflow execution context.`);
          }
          return node;
        });
        return text;
      },
      `connectionReferences.${name}`
    );
  }
  if (requiredParameters.size) {
    const values = Object.entries(workflow.parameters ?? {}).filter(([name]) => requiredParameters.has(name));
    const definitions = Object.entries(workflow.definition.parameters ?? {}).filter(([name]) => requiredParameters.has(name));
    if (values.length) {
      child.parameters = copy(Object.fromEntries(values));
    }
    if (definitions.length) {
      child.definition.parameters = copy(Object.fromEntries(definitions));
    }
  }
  if (requiredStaticResults.size) {
    child.definition.staticResults = copy(
      Object.fromEntries(Object.entries(workflow.definition.staticResults ?? {}).filter(([name]) => requiredStaticResults.has(name)))
    );
  }
  sourceActions[invocationId] = copy(
    createInvocation(
      childName,
      Object.fromEntries(inputs.map((binding) => [binding.name, binding.expression])),
      copy(actions[entry].runAfter ?? {})
    )
  );
  source.definition.actions = sourceActions;
  return { source, child, childName, selectedIds: ordered, invocationId, inputs, outputs };
}

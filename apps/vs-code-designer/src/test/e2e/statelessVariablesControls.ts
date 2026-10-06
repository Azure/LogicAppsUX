import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export const statelessResponseBody = '[1,2,3]foobar';
export const statelessHistoryOption = 'WithStatelessRunHistory';

export function objectValue(value: unknown, description: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${description} must be an object`);
  return value as Record<string, unknown>;
}

export interface StatelessOperations {
  trigger: string;
  initialize: string;
  appendArray: string;
  appendString: string;
  response: string;
}

/** Read-only oracle. The native test must author every operation through the designer. */
export function assertStatelessDefinition(value: unknown): StatelessOperations {
  const workflow = objectValue(value, 'workflow');
  assert.strictEqual(workflow.kind, 'Stateless', 'A Stateful proxy is not the stateless fixture');
  const definition = objectValue(workflow.definition, 'definition');
  const triggers = objectValue(definition.triggers, 'triggers');
  assert.strictEqual(Object.keys(triggers).length, 1);
  const trigger = Object.keys(triggers)[0];
  const request = objectValue(triggers[trigger], 'Request trigger');
  assert.strictEqual(request.type, 'Request');
  assert.strictEqual(request.kind, 'Http');
  const actions = objectValue(definition.actions, 'actions');
  assert.strictEqual(Object.keys(actions).length, 4, 'Exactly one multi-variable Initialize and both appends plus Response are required');
  const find = (type: string): [string, Record<string, unknown>] => {
    const matches = Object.entries(actions).filter(([, action]) => objectValue(action, 'action').type === type);
    assert.strictEqual(matches.length, 1, `Expected exactly one ${type}`);
    return [matches[0][0], objectValue(matches[0][1], type)];
  };
  const [initialize, init] = find('InitializeVariable');
  const variables = objectValue(init.inputs, 'Initialize inputs').variables;
  assert.deepStrictEqual(
    variables,
    [
      { name: 'v1', type: 'array', value: [1, 2] },
      { name: 'v2', type: 'string', value: 'foo' },
    ],
    'Initialize must preserve both exact variable types and values'
  );
  const [appendArray, array] = find('AppendToArrayVariable');
  assert.deepStrictEqual(array.inputs, { name: 'v1', value: 3 }, 'Append must add a number, not a string');
  const [appendString, string] = find('AppendToStringVariable');
  assert.deepStrictEqual(string.inputs, { name: 'v2', value: 'bar' });
  const [response, reply] = find('Response');
  const replyInputs = objectValue(reply.inputs, 'Response inputs');
  assert.strictEqual(replyInputs.statusCode, 200);
  assert.strictEqual(replyInputs.body, "@{variables('v1')}@{variables('v2')}", 'Response must contain both adjacent variable tokens');
  assert.deepStrictEqual(init.runAfter, {});
  assert.deepStrictEqual(array.runAfter, { [initialize]: ['Succeeded'] });
  assert.deepStrictEqual(string.runAfter, { [appendArray]: ['Succeeded'] });
  assert.deepStrictEqual(reply.runAfter, { [appendString]: ['Succeeded'] });
  return { trigger, initialize, appendArray, appendString, response };
}

export function assertStatelessResponse(status: number, body: unknown): void {
  assert.strictEqual(status, 200, 'Callback/Response must return HTTP 200');
  assert.strictEqual(body, statelessResponseBody, 'Callback/Response must return the exact combined variable body');
}

export function listValues(value: unknown): Record<string, unknown>[] {
  const values = objectValue(value, 'management response').value;
  assert.ok(Array.isArray(values), 'Management response must have a value array');
  return values.map((item) => objectValue(item, 'management item'));
}

export function assertStatelessRun(
  runName: string,
  previousRunNames: ReadonlySet<string>,
  runValue: unknown,
  actionValue: unknown,
  operations: StatelessOperations
): void {
  assert.ok(runName.length > 0 && !previousRunNames.has(runName), 'Callback must identify an exact new run');
  const run = objectValue(runValue, 'run');
  assert.strictEqual(run.name, runName, 'History must refer to the callback run, not the latest unrelated run');
  assert.strictEqual(objectValue(run.properties, 'run properties').status, 'Succeeded');
  const actions = listValues(actionValue);
  const expected = [operations.initialize, operations.appendArray, operations.appendString, operations.response].sort();
  assert.deepStrictEqual(actions.map((action) => action.name).sort(), expected, 'History must contain the exact saved action identities');
  for (const action of actions) {
    assert.strictEqual(
      objectValue(action.properties, 'action properties').status,
      'Succeeded',
      `Action ${String(action.name)} must succeed`
    );
  }
}

export function statelessSettingsTargets(appDir: string): [string, string] {
  // The source requires "both" settings. These are the two extension-generated
  // local.settings.json targets, not host.json, workspace settings or a portal target.
  return [path.join(appDir, 'local.settings.json'), path.join(appDir, 'workflow-designtime', 'local.settings.json')];
}

interface SettingsSnapshot {
  file: string;
  original: Buffer;
  installed: Buffer;
}

export interface StatelessSettingsLease {
  assertInstalled(): void;
  restore(): void;
}

function parseSettings(bytes: Buffer): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    // JSON parse errors can echo secret-bearing settings; never include the bytes.
    throw new Error('Stateless local settings contain invalid JSON');
  }
  const root = objectValue(value, 'local settings');
  objectValue(root.Values, 'local settings Values');
  return root;
}

/** All-file preflight; any foreign edit preserves BOTH files without partial restore. */
export function installStatelessHistorySettings(appDir: string, workflowName: string): StatelessSettingsLease {
  assert.ok(/^[A-Za-z0-9_-]+$/.test(workflowName), 'Invalid workflow name for OperationOptions');
  const key = `Workflows.${workflowName}.OperationOptions`;
  const snapshots: SettingsSnapshot[] = statelessSettingsTargets(appDir).map((file) => {
    assert.ok(fs.existsSync(file), 'Both generated local settings targets must exist before mutation');
    const original = fs.readFileSync(file);
    const settings = parseSettings(original);
    const values = objectValue(settings.Values, 'local settings Values');
    assert.ok(values[key] === undefined || typeof values[key] === 'string', 'Existing OperationOptions must be a string');
    values[key] = statelessHistoryOption;
    return { file, original, installed: Buffer.from(`${JSON.stringify(settings, null, 2)}\n`) };
  });
  for (const snapshot of snapshots) {
    assert.ok(fs.readFileSync(snapshot.file).equals(snapshot.original), 'Foreign settings edit before install');
  }
  for (const snapshot of snapshots) {
    fs.writeFileSync(snapshot.file, snapshot.installed);
  }
  let restored = false;
  const assertInstalled = () => {
    assert.ok(!restored, 'History settings lease has already been restored');
    for (const snapshot of snapshots) {
      assert.ok(
        fs.existsSync(snapshot.file) && fs.readFileSync(snapshot.file).equals(snapshot.installed),
        'Foreign settings edit: refusing to overwrite either local settings target'
      );
      assert.strictEqual(objectValue(parseSettings(snapshot.installed).Values, 'Values')[key], statelessHistoryOption);
    }
  };
  return {
    assertInstalled,
    restore() {
      if (restored) {
        return;
      }
      assertInstalled();
      for (const snapshot of snapshots) {
        fs.writeFileSync(snapshot.file, snapshot.original);
      }
      restored = true;
    },
  };
}

export interface RecoveryHooks {
  stop(deadline: number): Promise<void>;
  restore(): void;
  restart(deadline: number): Promise<void>;
  verify(deadline: number): Promise<void>;
}

export function remainingMs(deadline: number, cap = Number.MAX_SAFE_INTEGER): number {
  const remaining = deadline - Date.now();
  assert.ok(remaining > 0, 'Stateless phase deadline expired');
  return Math.min(remaining, cap);
}

export async function withinDeadline<T>(deadline: number, phase: string, action: () => PromiseLike<T>): Promise<T> {
  const timeoutMs = remainingMs(deadline);
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(action),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Stateless ${phase} deadline expired`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/** Recovery never borrows the expired positive deadline and never hides its failure. */
export async function recoverStateless(hooks: RecoveryHooks, budgetMs = 120_000): Promise<void> {
  assert.ok(Number.isFinite(budgetMs) && budgetMs > 0, 'Recovery needs a positive finite budget');
  const deadline = Date.now() + budgetMs;
  await withinDeadline(deadline, 'recovery stop', () => hooks.stop(deadline));
  hooks.restore(); // A foreign edit fails closed before restarting with unknown settings.
  const failures: unknown[] = [];
  try {
    await withinDeadline(deadline, 'recovery restart', () => hooks.restart(deadline));
    await withinDeadline(deadline, 'recovery callback', () => hooks.verify(deadline));
  } catch (error) {
    failures.push(error);
  }
  // Teardown is independent even if verification used the entire recovery budget.
  const stopDeadline = Date.now() + Math.min(budgetMs, 30_000);
  try {
    await withinDeadline(stopDeadline, 'recovery final stop', () => hooks.stop(stopDeadline));
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Stateless recovery failed');
  }
}

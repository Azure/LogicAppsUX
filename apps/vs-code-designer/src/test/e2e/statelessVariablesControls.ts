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
  quiesce(deadline: number): Promise<void>;
  stop(deadline: number): Promise<void>;
  restore(): void;
  restart(deadline: number, signal: AbortSignal): Promise<void>;
  verify(deadline: number, signal: AbortSignal): Promise<void>;
  onQuiescenceVerified?(): void;
}

export function assertPhaseActive(deadline: number, signal: AbortSignal): void {
  signal.throwIfAborted();
  remainingMs(deadline);
}

export function abortable<T>(operation: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(operation)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Keeps the underlying operation, not just the timed race. Restoration may only
 * follow quiescence; an uncooperative operation makes cleanup inadmissible. */
export class StatelessOperationScope {
  private readonly pending = new Map<Promise<unknown>, AbortController>();

  async run<T>(deadline: number, phase: string, action: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
    const timeoutMs = remainingMs(deadline);
    const controller = new AbortController();
    const operation = Promise.resolve().then(() => {
      assertPhaseActive(deadline, controller.signal);
      return action(controller.signal);
    });
    this.pending.set(operation, controller);
    const remove = () => this.pending.delete(operation);
    operation.then(remove, remove);
    const timer = setTimeout(() => controller.abort(new Error(`Stateless ${phase} deadline expired`)), timeoutMs);
    try {
      return await abortable(operation, controller.signal);
    } finally {
      clearTimeout(timer);
      controller.abort(new Error(`Stateless ${phase} operation closed`));
    }
  }

  cancel(): void {
    for (const controller of this.pending.values()) {
      controller.abort(new Error('Stateless operation cancelled for quiescence'));
    }
  }

  async quiesce(deadline: number): Promise<void> {
    this.cancel();
    await withinDeadline(deadline, 'operation quiescence', () => Promise.allSettled([...this.pending.keys()]));
    assert.strictEqual(this.pending.size, 0, 'No pending side effect may overlap restoration or another restart');
  }
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
  await withinDeadline(deadline, 'positive operation quiescence', () => hooks.quiesce(deadline));
  await withinDeadline(deadline, 'recovery stop', () => hooks.stop(deadline));
  hooks.restore(); // A foreign edit fails closed before restarting with unknown settings.
  const failures: unknown[] = [];
  const scope = new StatelessOperationScope();
  try {
    await scope.run(deadline, 'recovery restart', (signal) => hooks.restart(deadline, signal));
    await scope.run(deadline, 'recovery callback', (signal) => hooks.verify(deadline, signal));
  } catch (error) {
    failures.push(error);
  }
  // Teardown is independent even if verification used the entire recovery budget.
  const stopDeadline = Date.now() + Math.min(budgetMs, 30_000);
  scope.cancel();
  const cleanup = await Promise.allSettled([
    scope.quiesce(stopDeadline),
    hooks.quiesce(stopDeadline),
    withinDeadline(stopDeadline, 'recovery final stop', () => hooks.stop(stopDeadline)),
  ]);
  for (const result of cleanup) {
    if (result.status === 'rejected') {
      failures.push(result.reason);
    }
  }
  if (cleanup.every((result) => result.status === 'fulfilled')) {
    // Physical owned-operation quiescence is independent of callback success.
    // Preserve any verification failure while allowing safe fixture restoration.
    try {
      hooks.onQuiescenceVerified?.();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Stateless recovery failed');
  }
}

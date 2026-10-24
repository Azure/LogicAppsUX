import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';

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

function assertSucceededRunAfter(value: unknown, predecessor: string): void {
  const runAfter = objectValue(value, 'runAfter');
  assert.deepStrictEqual(Object.keys(runAfter), [predecessor]);
  const statuses = runAfter[predecessor];
  assert.ok(Array.isArray(statuses) && statuses.length === 1, 'runAfter must contain exactly one success status');
  assert.strictEqual(String(statuses[0]).toLowerCase(), 'succeeded', 'runAfter must require the predecessor to succeed');
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
  assertSucceededRunAfter(array.runAfter, initialize);
  assertSucceededRunAfter(string.runAfter, appendArray);
  assertSucceededRunAfter(reply.runAfter, appendString);
  return { trigger, initialize, appendArray, appendString, response };
}

export function assertStatelessResponse(status: number, body: unknown): void {
  assert.strictEqual(status, 200, 'Callback/Response must return HTTP 200');
  assert.strictEqual(body, statelessResponseBody, 'Callback/Response must return the exact combined variable body');
}

export function listValues(value: unknown): Record<string, unknown>[] {
  const values = Array.isArray(value) ? value : objectValue(value, 'management response').value;
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
  ownedChanges: OwnedJsonChange[];
  createdContainers: string[][];
  identity: SettingsFileIdentity;
}

export interface StatelessSettingsLease {
  assertInstalled(): void;
  restore(): void;
}

export interface SettingsTransactionHooks {
  beforeOpen?(file: string, index: number): void;
  afterWrite?(file: string, index: number): void;
}

interface JsonPathState {
  exists: boolean;
  value?: unknown;
}

interface OwnedJsonChange {
  path: string[];
  original: JsonPathState;
  installed: JsonPathState;
}

interface OwnedJsonChanges {
  changes: OwnedJsonChange[];
  createdContainers: string[][];
}

interface SettingsFileIdentity {
  dev: bigint;
  ino: bigint;
  nlink: bigint;
}

interface CurrentSettings {
  bytes: Buffer;
  value: Record<string, unknown>;
  identity: SettingsFileIdentity;
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

/**
 * Installs a JSON settings mutation and derives ownership from the exact
 * base-to-installed diff. Restoration preflights every owned path in every
 * target before writing, then reverts only those paths into the current file.
 */
export function installOwnedLocalSettings(
  files: readonly string[],
  mutate: (settings: Record<string, unknown>, file: string) => void,
  transactionHooks?: SettingsTransactionHooks
): StatelessSettingsLease {
  const root = validateSettingsTargets(files);
  const snapshots: SettingsSnapshot[] = files.map((file) => {
    const current = readCurrentSettings(file, root);
    const originalValue = current.value;
    const installedValue = structuredClone(originalValue);
    mutate(installedValue, file);
    objectValue(installedValue.Values, 'local settings Values');
    const owned = collectOwnedJsonChanges(originalValue, installedValue);
    return {
      file,
      original: current.bytes,
      installed: serializeJsonLike(current.bytes, installedValue),
      ownedChanges: owned.changes,
      createdContainers: owned.createdContainers,
      identity: current.identity,
    };
  });
  for (const snapshot of snapshots) {
    const current = readCurrentSettings(snapshot.file, root);
    assertSameSettingsFile(snapshot, current, 'Foreign settings edit before install');
  }
  writeSettingsTransactionally(
    snapshots.map((snapshot) => ({
      file: snapshot.file,
      bytes: snapshot.installed,
      expectedBytes: snapshot.original,
      identity: snapshot.identity,
    })),
    root,
    transactionHooks
  );
  let restored = false;
  const assertInstalled = () => {
    assert.ok(!restored, 'History settings lease has already been restored');
    for (const snapshot of snapshots) {
      const current = readCurrentSettings(snapshot.file, root);
      assertSameSettingsIdentity(snapshot, current);
      assertOwnedJsonPaths(snapshot, current.value);
    }
  };
  return {
    assertInstalled,
    restore() {
      if (restored) {
        return;
      }
      const outputs = snapshots.map((snapshot) => {
        const current = readCurrentSettings(snapshot.file, root);
        assertSameSettingsIdentity(snapshot, current);
        assertOwnedJsonPaths(snapshot, current.value);
        if (current.bytes.equals(snapshot.installed)) {
          return {
            file: snapshot.file,
            bytes: snapshot.original,
            expectedBytes: current.bytes,
            identity: current.identity,
          };
        }
        let restoredValue: unknown = structuredClone(current.value);
        for (const change of snapshot.ownedChanges) {
          restoredValue = applyJsonPathState(restoredValue, change.path, change.original);
        }
        pruneEmptyCreatedContainers(restoredValue, snapshot.createdContainers);
        return {
          file: snapshot.file,
          bytes: serializeJsonLike(current.bytes, objectValue(restoredValue, 'restored local settings')),
          expectedBytes: current.bytes,
          identity: current.identity,
        };
      });
      writeSettingsTransactionally(outputs, root, transactionHooks);
      restored = true;
    },
  };
}

/** All-file preflight; unrelated runtime edits survive owned-key restoration. */
export function installStatelessHistorySettings(appDir: string, workflowName: string): StatelessSettingsLease {
  assert.ok(/^[A-Za-z0-9_-]+$/.test(workflowName), 'Invalid workflow name for OperationOptions');
  const key = `Workflows.${workflowName}.OperationOptions`;
  return installOwnedLocalSettings(statelessSettingsTargets(appDir), (settings) => {
    const values = objectValue(settings.Values, 'local settings Values');
    assert.ok(values[key] === undefined || typeof values[key] === 'string', 'Existing OperationOptions must be a string');
    values[key] = statelessHistoryOption;
  });
}

function readCurrentSettings(file: string, root: string): CurrentSettings {
  validateSettingsTarget(file, root);
  const stat = fs.lstatSync(file, { bigint: true });
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Local settings target must remain a regular file: ${path.basename(file)}`);
  assert.strictEqual(stat.nlink, 1n, `Local settings target must not have hard links: ${path.basename(file)}`);
  const bytes = fs.readFileSync(file);
  return { bytes, value: parseSettings(bytes), identity: { dev: stat.dev, ino: stat.ino, nlink: stat.nlink } };
}

function collectOwnedJsonChanges(original: unknown, installed: unknown, path: string[] = []): OwnedJsonChanges {
  if (isObjectRecord(original) && isObjectRecord(installed)) {
    const changes: OwnedJsonChange[] = [];
    const createdContainers: string[][] = [];
    const keys = new Set([...Object.keys(original), ...Object.keys(installed)]);
    for (const key of keys) {
      const originalExists = Object.hasOwn(original, key);
      const installedExists = Object.hasOwn(installed, key);
      const childPath = [...path, key];
      if (!originalExists && installedExists && isObjectRecord(installed[key])) {
        assert.ok(Object.keys(installed[key]).length > 0, `Empty object mutations are unsupported at ${formatJsonPath(childPath)}`);
        const nested = collectOwnedJsonChanges({}, installed[key], childPath);
        changes.push(...nested.changes);
        createdContainers.push(childPath, ...nested.createdContainers);
        continue;
      }
      if (originalExists && !installedExists && isObjectRecord(original[key])) {
        assert.ok(Object.keys(original[key]).length > 0, `Empty object mutations are unsupported at ${formatJsonPath(childPath)}`);
        const nested = collectOwnedJsonChanges(original[key], {}, childPath);
        changes.push(...nested.changes);
        createdContainers.push(...nested.createdContainers);
        continue;
      }
      if (!originalExists || !installedExists) {
        assertNoArrayMutation(originalExists ? original[key] : installed[key], childPath);
        changes.push({
          path: childPath,
          original: { exists: originalExists, value: originalExists ? structuredClone(original[key]) : undefined },
          installed: { exists: installedExists, value: installedExists ? structuredClone(installed[key]) : undefined },
        });
        continue;
      }
      const nested = collectOwnedJsonChanges(original[key], installed[key], childPath);
      changes.push(...nested.changes);
      createdContainers.push(...nested.createdContainers);
    }
    return { changes, createdContainers };
  }
  if (isDeepStrictEqual(original, installed)) {
    return { changes: [], createdContainers: [] };
  }
  assertNoArrayMutation(original, path);
  assertNoArrayMutation(installed, path);
  return {
    changes: [
      {
        path,
        original: { exists: true, value: structuredClone(original) },
        installed: { exists: true, value: structuredClone(installed) },
      },
    ],
    createdContainers: [],
  };
}

function assertOwnedJsonPaths(snapshot: SettingsSnapshot, current: Record<string, unknown>): void {
  for (const change of snapshot.ownedChanges) {
    const currentState = readJsonPathState(current, change.path);
    assert.ok(
      currentState.exists === change.installed.exists &&
        (!currentState.exists || isDeepStrictEqual(currentState.value, change.installed.value)),
      `Foreign settings edit at owned path ${formatJsonPath(change.path)} in ${path.basename(
        snapshot.file
      )}: refusing to overwrite either local settings target`
    );
  }
}

function readJsonPathState(root: unknown, pathParts: readonly string[]): JsonPathState {
  let current = root;
  for (const part of pathParts) {
    if (!isObjectRecord(current) || !Object.hasOwn(current, part)) {
      return { exists: false };
    }
    current = current[part];
  }
  return { exists: true, value: current };
}

function applyJsonPathState(root: unknown, pathParts: readonly string[], state: JsonPathState): unknown {
  if (pathParts.length === 0) {
    assert.ok(state.exists, 'Owned local settings root cannot be deleted');
    return structuredClone(state.value);
  }
  const output = objectValue(root, 'current local settings');
  let parent = output;
  for (const part of pathParts.slice(0, -1)) {
    if (!isObjectRecord(parent[part])) {
      assert.ok(parent[part] === undefined, `Foreign settings edit at ${formatJsonPath(pathParts)} prevents restoration`);
      parent[part] = {};
    }
    parent = objectValue(parent[part], `current local settings ${formatJsonPath(pathParts)}`);
  }
  const key = pathParts[pathParts.length - 1];
  if (state.exists) {
    parent[key] = structuredClone(state.value);
  } else {
    delete parent[key];
  }
  return output;
}

function pruneEmptyCreatedContainers(root: unknown, paths: readonly string[][]): void {
  for (const pathParts of [...paths].sort((left, right) => right.length - left.length)) {
    if (pathParts.length === 0) {
      continue;
    }
    const parentState = readJsonPathState(root, pathParts.slice(0, -1));
    if (!parentState.exists || !isObjectRecord(parentState.value)) {
      continue;
    }
    const key = pathParts[pathParts.length - 1];
    const value = parentState.value[key];
    if (isObjectRecord(value) && Object.keys(value).length === 0) {
      delete parentState.value[key];
    }
  }
}

function assertNoArrayMutation(value: unknown, pathParts: readonly string[]): void {
  assert.ok(!Array.isArray(value), `Array mutations are unsupported at ${formatJsonPath(pathParts)}`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatJsonPath(pathParts: readonly string[]): string {
  return pathParts.length === 0 ? '<root>' : pathParts.join('.');
}

function serializeJsonLike(source: Buffer, value: Record<string, unknown>): Buffer {
  const text = source.toString('utf8');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = /\r?\n$/.test(text);
  const body = trailingNewline ? text.replace(/\r?\n$/, '') : text;
  const indentation = body.includes('\n')
    ? body.match(/\r?\n([ \t]+)"/)?.[1].includes('\t')
      ? '\t'
      : body.match(/\r?\n([ \t]+)"/)?.[1].length || 2
    : undefined;
  let serialized = indentation === undefined ? JSON.stringify(value) : JSON.stringify(value, null, indentation);
  if (newline !== '\n') {
    serialized = serialized.replace(/\n/g, newline);
  }
  if (trailingNewline) {
    serialized += newline;
  }
  return Buffer.from(serialized);
}

function validateSettingsTargets(files: readonly string[]): string {
  assert.ok(files.length > 0, 'At least one local settings target is required');
  assert.ok(
    files.every((file) => fs.existsSync(file)),
    'Both generated local settings targets must exist before mutation'
  );
  const root = path.resolve(path.dirname(files[0]));
  const unique = new Set(files.map((file) => path.resolve(file)));
  assert.strictEqual(unique.size, files.length, 'Local settings targets must be unique');
  for (const file of files) {
    validateSettingsTarget(file, root);
  }
  return root;
}

function validateSettingsTarget(file: string, root: string): void {
  const resolved = path.resolve(file);
  const relative = path.relative(root, resolved);
  assert.ok(
    relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative),
    'Local settings target escaped app root'
  );
  const rootStat = fs.lstatSync(root);
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Local settings app root must be a regular directory');
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    assert.ok(fs.existsSync(current), `Foreign settings edit at file boundary: refusing to recreate ${path.basename(file)}`);
    const stat = fs.lstatSync(current);
    assert.ok(!stat.isSymbolicLink(), `Local settings target path must not contain links: ${path.basename(file)}`);
  }
}

function assertSameSettingsIdentity(snapshot: SettingsSnapshot, current: CurrentSettings): void {
  assert.ok(
    sameSettingsIdentity(snapshot.identity, current.identity),
    `Foreign settings replacement at file boundary: refusing to overwrite ${path.basename(snapshot.file)}`
  );
}

function assertSameSettingsFile(snapshot: SettingsSnapshot, current: CurrentSettings, message: string): void {
  assertSameSettingsIdentity(snapshot, current);
  assert.ok(current.bytes.equals(snapshot.original), message);
}

function writeSettingsTransactionally(
  outputs: Array<{ file: string; bytes: Buffer; expectedBytes: Buffer; identity: SettingsFileIdentity }>,
  root: string,
  hooks?: SettingsTransactionHooks
): void {
  const opened: Array<{ file: string; descriptor: number; original: Buffer; bytes: Buffer }> = [];
  const mutated: Array<{ file: string; descriptor: number; original: Buffer; bytes: Buffer }> = [];
  const rollbackErrors: unknown[] = [];
  try {
    for (const [index, output] of outputs.entries()) {
      const current = readCurrentSettings(output.file, root);
      assert.ok(
        sameSettingsIdentity(current.identity, output.identity),
        `Foreign settings replacement at file boundary: refusing to overwrite ${path.basename(output.file)}`
      );
      assert.ok(current.bytes.equals(output.expectedBytes), `Foreign settings edit before write: ${path.basename(output.file)}`);
      hooks?.beforeOpen?.(output.file, index);
      const descriptor = fs.openSync(output.file, fs.constants.O_RDWR);
      const openedStat = fs.fstatSync(descriptor, { bigint: true });
      const openedIdentity = { dev: openedStat.dev, ino: openedStat.ino, nlink: openedStat.nlink };
      if (!openedStat.isFile() || !sameSettingsIdentity(openedIdentity, output.identity)) {
        fs.closeSync(descriptor);
        throw new Error(`Foreign settings replacement during write: ${path.basename(output.file)}`);
      }
      const descriptorBytes = fs.readFileSync(descriptor);
      if (!descriptorBytes.equals(output.expectedBytes)) {
        fs.closeSync(descriptor);
        throw new Error(`Foreign settings edit during write: ${path.basename(output.file)}`);
      }
      opened.push({ file: output.file, descriptor, original: descriptorBytes, bytes: output.bytes });
    }
    for (const output of opened) {
      assertLiveSettingsPath(output.file, output.descriptor, root);
    }
  } catch (error) {
    for (const output of opened) {
      fs.closeSync(output.descriptor);
    }
    throw error;
  }
  try {
    for (const [index, output] of opened.entries()) {
      assertLiveSettingsPath(output.file, output.descriptor, root);
      mutated.push(output);
      writeSettingsDescriptor(output.descriptor, output.bytes);
      fs.fsyncSync(output.descriptor);
      hooks?.afterWrite?.(output.file, index);
    }
    for (const output of opened) {
      assertLiveSettingsPath(output.file, output.descriptor, root);
      assert.ok(
        readSettingsDescriptor(output.descriptor).equals(output.bytes),
        `Local settings write verification failed: ${path.basename(output.file)}`
      );
    }
  } catch (error) {
    for (const output of mutated) {
      try {
        writeSettingsDescriptor(output.descriptor, output.original);
        fs.fsyncSync(output.descriptor);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Local settings transaction and rollback failed', { cause: error });
    }
    throw error;
  } finally {
    for (const output of opened) {
      fs.closeSync(output.descriptor);
    }
  }
}

function sameSettingsIdentity(left: SettingsFileIdentity, right: SettingsFileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.nlink === 1n && right.nlink === 1n;
}

function assertLiveSettingsPath(file: string, descriptor: number, root: string): void {
  validateSettingsTarget(file, root);
  const pathStat = fs.lstatSync(file, { bigint: true });
  const descriptorStat = fs.fstatSync(descriptor, { bigint: true });
  const pathIdentity = { dev: pathStat.dev, ino: pathStat.ino, nlink: pathStat.nlink };
  const descriptorIdentity = { dev: descriptorStat.dev, ino: descriptorStat.ino, nlink: descriptorStat.nlink };
  assert.ok(sameSettingsIdentity(pathIdentity, descriptorIdentity), `Foreign settings replacement during write: ${path.basename(file)}`);
}

function readSettingsDescriptor(descriptor: number): Buffer {
  const size = fs.fstatSync(descriptor).size;
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const read = fs.readSync(descriptor, bytes, offset, size - offset, offset);
    assert.ok(read > 0, 'Local settings descriptor ended before its declared size');
    offset += read;
  }
  return bytes;
}

function writeSettingsDescriptor(descriptor: number, bytes: Buffer): void {
  fs.ftruncateSync(descriptor, 0);
  let offset = 0;
  while (offset < bytes.length) {
    offset += fs.writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
  }
}

export interface OrderedCleanupStep {
  phase: string;
  action(): void | PromiseLike<void>;
}

export async function runWithOrderedCleanup<T>(
  body: () => Promise<T>,
  cleanup: readonly OrderedCleanupStep[],
  aggregateMessage: string
): Promise<T> {
  let bodyResult: T | undefined;
  let bodyFailed = false;
  let bodyError: unknown;
  try {
    bodyResult = await body();
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  }

  const cleanupErrors: unknown[] = [];
  for (const step of cleanup) {
    try {
      await step.action();
    } catch (error) {
      console.error(`[cleanup][${step.phase}] ${String(error)}`);
      cleanupErrors.push(error);
    }
  }

  if (bodyFailed) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError([bodyError, ...cleanupErrors], aggregateMessage, { cause: bodyError });
    }
    throw bodyError;
  }
  if (cleanupErrors.length === 1) {
    throw cleanupErrors[0];
  }
  if (cleanupErrors.length > 1) {
    throw new AggregateError(cleanupErrors, aggregateMessage);
  }
  return bodyResult as T;
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

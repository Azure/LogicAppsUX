import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';
import { assertPhaseActive, recoverStateless, StatelessOperationScope, type RecoveryHooks } from './statelessVariablesControls';
import { StatelessOwnedDebug } from './statelessVariablesDebug';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stateless-review-controls-'));
let checks = 0;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function testColdProducer(): Promise<void> {
  const sourceFile = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'statelessVariablesLifecycle.test.ts');
  const text = fs.readFileSync(sourceFile, 'utf8');
  const source = ts.createSourceFile(sourceFile, text, ts.ScriptTarget.Latest, true);
  const method = source.statements.find(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'establishDesignTime'
  );
  assert.ok(method);
  const code = ts.transpileModule(`export ${method.getText(source)}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const order: string[] = [];
  let produced = false;
  let producerFails = false;
  const exports: { establishDesignTime?: (entry: { appDir: string }, deadline: number, signal: AbortSignal) => Promise<void> } = {};
  vm.runInNewContext(code, {
    exports,
    assertPhaseActive,
    path,
    fs: { existsSync: () => produced },
    helpers: {
      waitForGeneratedLogicAppFolder: async () => {
        order.push('folder');
      },
      openDesignerAndCreateWorkflow: async () => {
        order.push('real-designer');
        if (producerFails) {
          throw new Error('cold designer producer failed');
        }
        produced = true;
      },
    },
    poll: async (_deadline: number, _description: string, predicate: () => Promise<boolean>) => {
      order.push('readiness');
      assert.ok(await predicate(), 'Cold readiness must have a producer');
    },
  });
  const establish = exports.establishDesignTime;
  assert.ok(establish);
  await establish({ appDir: '/unit/cold-app' }, Date.now() + 1000, new AbortController().signal);
  assert.deepStrictEqual(order, ['folder', 'real-designer', 'readiness']);
  assert.ok(text.indexOf('await positiveScope.run(') < text.indexOf('await establishDesignTime(entry,'));
  checks++;
  produced = false;
  producerFails = true;
  order.length = 0;
  const scope = new StatelessOperationScope();
  await assert.rejects(
    () => scope.run(Date.now() + 1000, 'cold producer', (signal) => establish({ appDir: '/unit/cold-app' }, Date.now() + 1000, signal)),
    /cold designer producer failed/
  );
  await scope.quiesce(Date.now() + 1000);
  assert.deepStrictEqual(order, ['folder', 'real-designer'], 'No readiness wait may precede or outlive failed producer startup');
  checks++;
}

async function testResolvingSideEffectQuiescence(): Promise<void> {
  const scope = new StatelessOperationScope();
  const gate = deferred<void>();
  let changed = false;
  let restored = false;
  const positive = scope.run(Date.now() + 15, 'delayed positive', async (signal) => {
    await gate.promise;
    signal.throwIfAborted();
    changed = true;
  });
  await assert.rejects(() => positive, /deadline expired/);
  const recovery = recoverStateless(
    {
      quiesce: (deadline) => scope.quiesce(deadline),
      stop: async () => undefined,
      restore: () => {
        assert.ok(!changed);
        restored = true;
      },
      restart: async (_deadline, signal) => {
        signal.throwIfAborted();
        assert.ok(restored);
      },
      verify: async () => undefined,
    },
    1000
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.strictEqual(restored, false, 'Restoration must wait for the actual positive side effect, not its rejected race');
  gate.resolve();
  await recovery;
  assert.ok(restored && !changed, 'A resolving cancelled operation may not perform its deferred mutation');
  checks++;
}

function debugHarness(gate: Promise<void>, secondImmediate: boolean) {
  const order: string[] = [];
  const live = new Set<string>();
  let launches = 0;
  let foreignStops = 0;
  const tags = new Map<number, string>();
  const manager: StatelessOwnedDebug = new StatelessOwnedDebug('/unit/owned-app', 'func: host start', async (tag) => {
    const number = ++launches;
    tags.set(number, tag);
    order.push(`launch-${number}`);
    if (number === 1 || !secondImmediate) {
      await gate;
    }
    manager.sessionStarted({
      id: `wrong-root-${number}`,
      workspacePath: '/unit/foreign-app',
      ownerTag: tag,
      stop: async () => {
        foreignStops++;
      },
    });
    manager.taskStarted({
      id: `foreign-task-${number}`,
      workspacePath: '/unit/foreign-app',
      name: 'func: host start',
      terminate: () => {
        foreignStops++;
      },
    });
    live.add(`session-${number}`);
    manager.taskStarted({
      id: `task-${number}`,
      workspacePath: '/unit/owned-app',
      name: 'func: host start',
      terminate: () => {
        order.push(`task-stop-${number}`);
        manager.taskEnded(`task-${number}`);
      },
    });
    manager.sessionStarted({
      id: `session-${number}`,
      workspacePath: '/unit/owned-app',
      ownerTag: tag,
      stop: async () => {
        order.push(`session-stop-${number}`);
        live.delete(`session-${number}`);
        manager.sessionEnded(`session-${number}`);
      },
    });
    return true;
  });
  manager.sessionStarted({
    id: 'foreign-session',
    workspacePath: '/unit/owned-app',
    ownerTag: 'foreign-marker',
    stop: async () => {
      foreignStops++;
    },
  });
  manager.taskStarted({
    id: 'preexisting-task',
    workspacePath: '/unit/owned-app',
    name: 'func: host start',
    terminate: () => {
      foreignStops++;
    },
  });
  const injectLateFromFirst = () => {
    const tag = tags.get(1);
    assert.ok(tag);
    const stopped = deferred<void>();
    live.add('late-session-1');
    manager.sessionStarted({
      id: 'late-session-1',
      workspacePath: '/unit/owned-app',
      ownerTag: tag,
      stop: async () => {
        live.delete('late-session-1');
        manager.sessionEnded('late-session-1');
        stopped.resolve();
      },
    });
    return stopped.promise;
  };
  return { manager, order, live, injectLateFromFirst, launches: () => launches, foreignStops: () => foreignStops };
}

async function testLatePositiveLaunchBeforeRestore(): Promise<void> {
  const gate = deferred<void>();
  const h = debugHarness(gate.promise, true);
  const positive = new StatelessOperationScope();
  await assert.rejects(() => positive.run(Date.now() + 15, 'positive debug', (signal) => h.manager.start(signal)), /deadline expired/);
  let restored = false;
  const quiesce = async (deadline: number) => {
    positive.cancel();
    h.manager.cancel();
    await Promise.all([positive.quiesce(deadline), h.manager.quiesce(deadline)]);
  };
  const recovery = recoverStateless(
    {
      quiesce,
      stop: (deadline) => h.manager.quiesce(deadline),
      restore: () => {
        assert.strictEqual(h.live.size, 0);
        h.order.push('restore');
        restored = true;
      },
      restart: (_deadline, signal) => h.manager.start(signal),
      verify: async () => {
        assert.ok(h.live.has('session-2'));
        await h.injectLateFromFirst();
        assert.ok(h.live.has('session-2'), 'Stopping a late cancelled attempt must not stop a different currently owned recovery session');
      },
    },
    1000
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(!restored && h.launches() === 1, 'Unsettled late debug startup must prevent restore and an overlapping restart');
  gate.resolve();
  await recovery;
  assert.ok(h.order.indexOf('session-stop-1') < h.order.indexOf('restore'));
  assert.ok(h.order.indexOf('restore') < h.order.indexOf('launch-2'));
  assert.strictEqual(h.live.size, 0);
  assert.strictEqual(h.foreignStops(), 0, 'Neither a foreign session nor preexisting same-folder task may be stopped');
  checks++;
}

async function testFailedOrUnobservedNativeStart(): Promise<void> {
  const failed = new StatelessOwnedDebug('/unit/owned-app', 'func: host start', async () => false);
  await assert.rejects(() => failed.start(new AbortController().signal), /startDebugging=false/);
  await failed.quiesce(Date.now() + 1000);
  checks++;
  const unobserved = new StatelessOwnedDebug('/unit/owned-app', 'func: host start', async () => true);
  await unobserved.start(new AbortController().signal);
  await assert.rejects(() => unobserved.quiesce(Date.now() + 15), /deadline expired/);
  checks++;
  const missingTask: StatelessOwnedDebug = new StatelessOwnedDebug('/unit/owned-app', 'func: host start', async (tag) => {
    missingTask.sessionStarted({
      id: 'session-without-owned-task',
      workspacePath: '/unit/owned-app',
      ownerTag: tag,
      stop: async () => missingTask.sessionEnded('session-without-owned-task'),
    });
    return true;
  });
  await missingTask.start(new AbortController().signal);
  await assert.rejects(() => missingTask.quiesce(Date.now() + 15), /deadline expired/);
  checks++;
}

async function testLateRecoveryLaunchAfterRejectedDeadline(): Promise<void> {
  const gate = deferred<void>();
  const h = debugHarness(gate.promise, false);
  const hooks: RecoveryHooks = {
    quiesce: (deadline) => h.manager.quiesce(deadline),
    stop: (deadline) => h.manager.quiesce(deadline),
    restore: () => {
      h.order.push('restore');
    },
    restart: (_deadline, signal) => h.manager.start(signal),
    verify: async () => assert.fail('Expired restart must not reach callback verification'),
  };
  await assert.rejects(
    () => recoverStateless(hooks, 15),
    (error: AggregateError) => error.errors.some((cause: Error) => cause.message.includes('deadline expired'))
  );
  assert.strictEqual(h.launches(), 1);
  gate.resolve(); // The reviewed bug was a late RESOLVING start, not a never-settled promise.
  await h.manager.quiesce(Date.now() + 1000);
  assert.ok(h.order.includes('session-stop-1'), 'Cancelled raw startup must retain the exact late-session stop observer');
  assert.strictEqual(h.live.size, 0);
  assert.strictEqual(h.foreignStops(), 0);
  assert.strictEqual(h.launches(), 1, 'No second restart is permitted after inadmissible recovery');
  checks++;
}

interface Phase {
  phaseId: string;
  complete: boolean;
  exitCode: number;
  cleanupVerified: boolean;
  signal: null;
  diagnosticsError: string;
}
function testDirectThreePhaseEvidence(): void {
  const runner = require(path.resolve(__dirname, '..', '..', '..', 'scripts', 'run-e2e-cli.js')) as {
    _test: {
      getDirectExpectedPhaseIds(label: string): string[];
      getDirectSuiteComplete(label: string, phases: Phase[]): boolean;
    };
  };
  const api = runner._test;
  const phases = ['runtimeDependencyBootstrap:bootstrap', 'statelessVariablesLifecycle:create', 'statelessVariablesLifecycle:reopen'];
  assert.deepStrictEqual(api.getDirectExpectedPhaseIds('statelessVariablesLifecycle'), phases);
  assert.deepStrictEqual(api.getDirectExpectedPhaseIds('workspaceLifecycle'), ['workspaceLifecycle']);
  const good = phases.map(
    (phaseId): Phase => ({ phaseId, complete: true, exitCode: 0, cleanupVerified: true, signal: null, diagnosticsError: '' })
  );
  const defects = [
    good.slice(1),
    [good[2], good[0], good[1]],
    [...good, good[0]],
    good.map((phase, index) => (index === 2 ? { ...phase, cleanupVerified: false } : phase)),
    good.map((phase, index) => (index === 1 ? { ...phase, complete: false, exitCode: 1 } : phase)),
  ];
  for (const candidate of [good, ...defects]) {
    assert.strictEqual(api.getDirectSuiteComplete('statelessVariablesLifecycle', candidate), candidate === good);
    checks++;
  }
}

async function main(): Promise<void> {
  await testColdProducer();
  await testResolvingSideEffectQuiescence();
  await testLatePositiveLaunchBeforeRestore();
  await testLateRecoveryLaunchAfterRejectedDeadline();
  await testFailedOrUnobservedNativeStart();
  testDirectThreePhaseEvidence();
  console.log(
    `[statelessVariablesDebug.unit] ${checks} cold-start, resolving-late-start, ownership, quiescence and direct-evidence controls passed; no native credit`
  );
}

main()
  .finally(() => fs.rmSync(root, { recursive: true, force: true }))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

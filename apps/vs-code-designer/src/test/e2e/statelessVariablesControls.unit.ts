import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';
import { EventEmitter } from 'events';
import type { CdpEvaluator, Point } from './cdpFormHelpers';
import {
  assertStatelessDefinition,
  assertStatelessResponse,
  assertStatelessRun,
  installStatelessHistorySettings,
  recoverStateless,
  remainingMs,
  statelessSettingsTargets,
  withinDeadline,
  type RecoveryHooks,
} from './statelessVariablesControls';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stateless-variables-unit-'));
let checks = 0;

async function main(): Promise<void> {
  testSavedDefinition();
  testResponseAndHistory();
  testBothSettings();
  await testRecovery();
  testNativeWiring();
  await testNativeRowScopingAndTransport();
  await testRegisteredRunner();
  console.log(`[statelessVariablesControls.unit] ${checks} local controls passed; no native GUI/runtime credit`);
}

function check(action: () => void): void {
  action();
  checks++;
}

function unitDefinition() {
  // Unit-owned contract data only. This helper is never imported by native tests.
  return {
    kind: 'Stateless',
    definition: {
      triggers: { manual: { type: 'Request', kind: 'Http' } },
      actions: {
        Initialize_variables: {
          type: 'InitializeVariable',
          inputs: {
            variables: [
              { name: 'v1', type: 'array', value: [1, 2] },
              { name: 'v2', type: 'string', value: 'foo' },
            ],
          },
          runAfter: {},
        },
        Append_array: {
          type: 'AppendToArrayVariable',
          inputs: { name: 'v1', value: 3 },
          runAfter: { Initialize_variables: ['Succeeded'] },
        },
        Append_string: { type: 'AppendToStringVariable', inputs: { name: 'v2', value: 'bar' }, runAfter: { Append_array: ['Succeeded'] } },
        Response: {
          type: 'Response',
          inputs: { statusCode: 200, body: "@{variables('v1')}@{variables('v2')}" },
          runAfter: { Append_string: ['Succeeded'] },
        },
      },
    },
  };
}

function testSavedDefinition(): void {
  check(() => assert.strictEqual(assertStatelessDefinition(unitDefinition()).initialize, 'Initialize_variables'));
  check(() => assert.throws(() => assertStatelessDefinition({ ...unitDefinition(), kind: 'Stateful' }), /Stateful proxy/));
  check(() => {
    const workflow = unitDefinition();
    workflow.definition.actions.Initialize_variables.inputs.variables[0].type = 'string';
    assert.throws(() => assertStatelessDefinition(workflow), /exact variable types/);
  });
  check(() => {
    const workflow = unitDefinition();
    const actions = workflow.definition.actions as Record<string, unknown>;
    actions.Append_array = {
      type: 'AppendToArrayVariable',
      inputs: { name: 'v1', value: '3' },
      runAfter: { Initialize_variables: ['Succeeded'] },
    };
    assert.throws(() => assertStatelessDefinition(workflow), /number, not a string/);
  });
  check(() => {
    const workflow = unitDefinition();
    workflow.definition.actions.Response.inputs.body = "@variables('v1')";
    assert.throws(() => assertStatelessDefinition(workflow), /both adjacent variable tokens/);
  });
  check(() => {
    const workflow = unitDefinition();
    (workflow.definition.actions.Append_string.runAfter as Record<string, string[]>) = { Initialize_variables: ['Succeeded'] };
    assert.throws(() => assertStatelessDefinition(workflow));
  });
}

function testResponseAndHistory(): void {
  const operations = assertStatelessDefinition(unitDefinition());
  const run = { name: 'exact-new-run', properties: { status: 'Succeeded' } };
  const actions = {
    value: ['Initialize_variables', 'Append_array', 'Append_string', 'Response'].map((name) => ({
      name,
      properties: { status: 'Succeeded' },
    })),
  };
  check(() => assertStatelessResponse(200, '[1,2,3]foobar'));
  check(() => assert.throws(() => assertStatelessResponse(200, '[1,2,"3"]foobar')));
  check(() => assert.throws(() => assertStatelessResponse(202, '[1,2,3]foobar')));
  check(() => assertStatelessRun(run.name, new Set(['older']), run, actions, operations));
  check(() => assert.throws(() => assertStatelessRun(run.name, new Set([run.name]), run, actions, operations), /exact new run/));
  check(() =>
    assert.throws(() => assertStatelessRun(run.name, new Set(), { ...run, name: 'unrelated-latest' }, actions, operations), /callback run/)
  );
  check(() => assert.throws(() => assertStatelessRun(run.name, new Set(), run, { value: [] }, operations), /saved action identities/));
  check(() =>
    assert.throws(
      () => assertStatelessRun(run.name, new Set(), run, { value: actions.value.slice(1) }, operations),
      /saved action identities/
    )
  );
  check(() =>
    assert.throws(
      () => assertStatelessRun(run.name, new Set(), run, { value: [...actions.value, actions.value[0]] }, operations),
      /saved action identities/
    )
  );
  check(() =>
    assert.throws(() => assertStatelessRun(run.name, new Set(), { ...run, properties: { status: 'Failed' } }, actions, operations))
  );
  check(() =>
    assert.throws(
      () =>
        assertStatelessRun(
          run.name,
          new Set(),
          run,
          { value: actions.value.map((action) => ({ ...action, properties: { status: 'Failed' } })) },
          operations
        ),
      /must succeed/
    )
  );
}

function app(name: string): string {
  const dir = path.join(tempRoot, name);
  for (const file of statelessSettingsTargets(dir)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{"IsEncrypted":false,"Values":{"unrelated":"preserve","Workflows.testwf.OperationOptions":"PriorOption"}}\r\n');
  }
  return dir;
}

function testBothSettings(): void {
  check(() => {
    const dir = app('restore');
    const originals = statelessSettingsTargets(dir).map((file) => fs.readFileSync(file));
    const lease = installStatelessHistorySettings(dir, 'testwf');
    lease.assertInstalled();
    for (const file of statelessSettingsTargets(dir)) {
      assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).Values['Workflows.testwf.OperationOptions'], 'WithStatelessRunHistory');
    }
    lease.restore();
    lease.restore();
    statelessSettingsTargets(dir).forEach((file, index) => assert.ok(fs.readFileSync(file).equals(originals[index])));
  });
  for (const foreignIndex of [0, 1]) {
    check(() => {
      const dir = app(`foreign-${foreignIndex}`);
      const files = statelessSettingsTargets(dir);
      const lease = installStatelessHistorySettings(dir, 'testwf');
      fs.appendFileSync(files[foreignIndex], '\n ');
      const foreign = files.map((file) => fs.readFileSync(file));
      assert.throws(() => lease.restore(), /Foreign settings edit/);
      files.forEach((file, index) => assert.ok(fs.readFileSync(file).equals(foreign[index]), 'Neither file may be partly restored'));
    });
  }
  check(() => {
    const dir = app('missing');
    const files = statelessSettingsTargets(dir);
    const original = fs.readFileSync(files[0]);
    fs.unlinkSync(files[1]);
    assert.throws(() => installStatelessHistorySettings(dir, 'testwf'), /Both generated/);
    assert.ok(fs.readFileSync(files[0]).equals(original));
  });
  check(() => {
    const dir = app('malformed');
    const files = statelessSettingsTargets(dir);
    const original = fs.readFileSync(files[0]);
    fs.writeFileSync(files[1], '{"Values":{"secret":"UNIT_PRIVATE_MARKER",}');
    assert.throws(
      () => installStatelessHistorySettings(dir, 'testwf'),
      (error: Error) => error.message.includes('invalid JSON') && !error.message.includes('UNIT_PRIVATE_MARKER')
    );
    assert.ok(fs.readFileSync(files[0]).equals(original));
  });
  check(() => {
    const dir = app('wrong-option-type');
    fs.writeFileSync(statelessSettingsTargets(dir)[1], '{"Values":{"Workflows.testwf.OperationOptions":42}}');
    assert.throws(() => installStatelessHistorySettings(dir, 'testwf'), /must be a string/);
  });
  check(() => {
    const dir = app('deleted-after-install');
    const lease = installStatelessHistorySettings(dir, 'testwf');
    fs.unlinkSync(statelessSettingsTargets(dir)[1]);
    assert.throws(() => lease.restore(), /Foreign settings edit/);
    assert.ok(!fs.existsSync(statelessSettingsTargets(dir)[1]), 'Do not recreate a foreign-deleted file');
  });
}

async function testRecovery(): Promise<void> {
  const order: string[] = [];
  const hooks: RecoveryHooks = {
    quiesce: async () => undefined,
    stop: async (deadline) => {
      assert.ok(remainingMs(deadline) > 0);
      order.push('stop');
    },
    restore: () => {
      order.push('restore');
    },
    restart: async (deadline) => {
      assert.ok(remainingMs(deadline) > 0);
      order.push('restart');
    },
    verify: async (deadline) => {
      assert.ok(remainingMs(deadline) > 0);
      order.push('verify');
    },
  };
  await assert.rejects(() => withinDeadline(Date.now() - 1, 'positive', async () => assert.fail('Expired action must not run')), /expired/);
  await recoverStateless(hooks, 1000);
  check(() => assert.deepStrictEqual(order, ['stop', 'restore', 'restart', 'verify', 'stop']));
  order.length = 0;
  await assert.rejects(
    () =>
      recoverStateless(
        {
          ...hooks,
          restart: async () => {
            order.push('failed-start');
            throw new Error('startDebugging=false');
          },
        },
        1000
      ),
    (error: AggregateError) => error.errors.some((cause: Error) => cause.message === 'startDebugging=false')
  );
  check(() => assert.deepStrictEqual(order, ['stop', 'restore', 'failed-start', 'stop']));
  order.length = 0;
  await assert.rejects(
    () =>
      recoverStateless(
        {
          ...hooks,
          restore: () => {
            order.push('conflict');
            throw new Error('Foreign settings edit');
          },
        },
        1000
      ),
    /Foreign settings edit/
  );
  check(() => assert.deepStrictEqual(order, ['stop', 'conflict'], 'Do not start runtime on unknown foreign settings'));
  order.length = 0;
  await assert.rejects(
    () =>
      recoverStateless(
        {
          ...hooks,
          verify: async () => {
            order.push('expired-verify');
            await new Promise<void>(() => undefined);
          },
        },
        30
      ),
    (error: AggregateError) => error.errors.some((cause: Error) => cause.message.includes('deadline expired'))
  );
  check(() =>
    assert.deepStrictEqual(
      order,
      ['stop', 'restore', 'restart', 'expired-verify', 'stop'],
      'Expired recovery still gets bounded independent final stop'
    )
  );
  let stops = 0;
  await assert.rejects(
    () =>
      recoverStateless(
        {
          ...hooks,
          stop: async () => {
            if (++stops === 2) {
              throw new Error('final stop failed');
            }
          },
          verify: async () => {
            throw new Error('callback failed');
          },
        },
        1000
      ),
    (error: AggregateError) =>
      error.errors.length === 2 && error.errors[0].message === 'callback failed' && error.errors[1].message === 'final stop failed'
  );
  checks++;
  await assert.rejects(() => recoverStateless(hooks, 0), /positive finite/);
  checks++;
}

function sourcePath(name: string): string {
  return path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', name);
}

function testNativeWiring(): void {
  const native = fs.readFileSync(sourcePath('statelessVariablesLifecycle.test.ts'), 'utf8');
  const shared = fs.readFileSync(sourcePath('workspaceLifecycle.test.ts'), 'utf8');
  check(() => {
    assert.ok(native.includes("wfType: 'Stateless'"));
    assert.ok(!/seed[A-Z]\w*Workflow/.test(native), 'Native family must not seed the requested UI operations');
    assert.ok(native.includes('normalizeFsPath(entry.workspaceFilePath)'));
    assert.ok(native.includes('installStatelessHistorySettings(entry.appDir, entry.wfName)'));
    assert.ok(native.includes("callback.headers['x-ms-workflow-run-id']"));
    assert.ok(native.includes('assertStatelessRun(runName, previous, run, JSON.parse(actions.body), operations)'));
    assert.ok(native.includes('await recoverStateless('));
    assert.ok(
      native.includes('affirmativeAzureConnectorPrompt'),
      'Custom debug handling must reuse the approved affirmative connector policy'
    );
    assert.ok(
      native.includes('useAzureConnectors: true'),
      'Real designer setup must continue the affirmative Azure fixture/authentication journey'
    );
    assert.ok(!native.includes('Skip for now'), 'Stateless setup cannot silently choose a negative Azure connector fallback');
    assert.ok(shared.includes("creationCase.wfType ?? 'Stateful'"), 'Canonical old fixtures remain Stateful');
  });
  check(() => {
    const testConfig = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '.vscode-test.mjs'), 'utf8');
    assert.ok(testConfig.includes("files: ['out/test/e2e/statelessVariablesLifecycle.test.js']"));
    assert.ok(testConfig.includes('if (includeStatelessVariables)'));
  });
}

interface NativeUnitSeam {
  variableFieldPoint(cdp: CdpEvaluator, context: number, index: number, label: string, deadline: number): Promise<Point>;
  request(url: string, method: string, deadline: number): Promise<{ status: number; body: string }>;
}

async function testNativeRowScopingAndTransport(): Promise<void> {
  const { JSDOM } = require('jsdom') as {
    JSDOM: new (
      html: string,
      options: Record<string, unknown>
    ) => {
      window: {
        eval(expression: string): unknown;
        close(): void;
      };
    };
  };
  const file = sourcePath('statelessVariablesLifecycle.test.ts');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const nodes = source.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && ['variableFieldPoint', 'poll', 'request'].includes(statement.name?.text ?? '')
  );
  assert.strictEqual(nodes.length, 3);
  const implementation = ts.transpileModule(nodes.map((node) => `export ${node.getText(source)}`).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let transport = 'success';
  let destroyed = false;
  let requests = 0;
  const exported = {} as NativeUnitSeam;
  vm.runInNewContext(implementation, {
    exports: exported,
    assert,
    remainingMs,
    withinDeadline,
    setTimeout,
    clearTimeout,
    URL,
    Buffer,
    http: {
      request: (_url: URL, _options: unknown, callback: (response: EventEmitter & { statusCode: number; headers: object }) => void) => {
        requests++;
        const req = new EventEmitter() as EventEmitter & { destroy(error: Error): void; end(): void };
        req.destroy = (error) => {
          destroyed = true;
          req.emit('error', error);
        };
        req.end = () => {
          if (transport === 'success') {
            const response = new EventEmitter() as EventEmitter & { statusCode: number; headers: object };
            response.statusCode = 200;
            response.headers = {};
            callback(response);
            response.emit('data', Buffer.from('[1,2,3]foobar'));
            response.emit('end');
          }
        };
        return req;
      },
    },
  });
  const dom = new JSDOM(
    `<div class="msla-editor-initialize-variable"><div class="msla-input-parameter-field">
      <div class="msla-input-parameter-label">Name *</div><input data-x="10"></div></div>
     <div class="msla-editor-initialize-variable"><div class="msla-input-parameter-field">
      <div class="msla-input-parameter-label">Name *</div><input data-x="100"></div></div>`,
    { runScripts: 'outside-only' }
  );
  try {
    dom.window.eval(`HTMLElement.prototype.scrollIntoView=function(){};
      HTMLElement.prototype.getClientRects=function(){return [{width:20,height:10}]};
      HTMLElement.prototype.getBoundingClientRect=function(){return {x:Number(this.dataset.x),y:0,width:20,height:10}};`);
    const cdp: CdpEvaluator = {
      evaluate: async <T>(_context: number | undefined, expression: string) => dom.window.eval(expression) as T,
      send: async () => undefined,
    };
    const point = await exported.variableFieldPoint(cdp, 1, 1, 'name', Date.now() + 1000);
    check(() => assert.strictEqual(point.x, 110, 'Second variable fields must never select the first Name editor'));
  } finally {
    dom.window.close();
  }
  const response = await exported.request('http://localhost:7071/unit', 'POST', Date.now() + 1000);
  check(() => assertStatelessResponse(response.status, response.body));
  check(() =>
    assert.throws(
      () => exported.request('https://example.invalid/private-signed-unit', 'GET', Date.now() + 1000),
      /local runtime URLs only/
    )
  );
  check(() => assert.strictEqual(requests, 1, 'A nonlocal URL must never reach transport'));
  transport = 'stalled';
  await assert.rejects(
    () => exported.request('http://localhost:7071/unit?sig=UNIT_PRIVATE_MARKER', 'GET', Date.now() + 30),
    (error: Error) => error.message === 'Local stateless request failed' && !error.message.includes('UNIT_PRIVATE_MARKER')
  );
  check(() => assert.ok(destroyed, 'Absolute request expiry must destroy its own request even without socket inactivity'));
}

async function testRegisteredRunner(): Promise<void> {
  const file = path.resolve(__dirname, '..', '..', '..', 'scripts', 'run-e2e-cli.js');
  const text = fs.readFileSync(file, 'utf8');
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const node = parsed.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'runStatelessVariablesLifecycle'
  );
  assert.ok(node);
  const phaseNode = parsed.statements.find(
    (statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === 'getSuitePhaseId'
  );
  assert.ok(phaseNode);
  const entryPoints = parsed.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && ['main', 'parseArgs', 'exitWithError'].includes(statement.name?.text ?? '')
  );
  assert.strictEqual(entryPoints.length, 3);
  const implementation = ts.transpileModule(
    [node, phaseNode, ...entryPoints].map((statement) => `export ${statement.getText(parsed)}`).join('\n'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }
  ).outputText;
  const calls: Array<{ args: string[]; extraEnv: Record<string, string> }> = [];
  const exported: {
    runStatelessVariablesLifecycle?: (visibleDelayMs?: string) => Promise<void>;
    getSuitePhaseId?: (label: string, env: Record<string, string>) => string;
    main?: () => void;
  } = {};
  const cleanupRoots: string[] = [];
  let failBootstrap = false;
  let admissionComplete = true;
  let reportExit: (code: number) => void = () => undefined;
  const entry = { label: 'stateless-variables', appType: 'standard', workspaceFilePath: '/unit/created.code-workspace' };
  vm.runInNewContext(implementation, {
    exports: exported,
    process: {
      env: { LA_E2E_CLI_BATCH_MODE: '1', LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: '/unit/fresh-family-phases' },
      argv: ['node', 'unit-runner', '--stateless-variables-lifecycle'],
      exit: (code: number) => reportExit(code),
    },
    console: { error: () => undefined },
    getOwnedRootCleanupVerified: () => cleanupRoots.length === 2,
    getDirectSuiteComplete: () => admissionComplete,
    readJsonLinesIfExists: () => calls,
    runDirectFamily: async (suiteId: string) => {
      assert.strictEqual(suiteId, 'statelessVariablesLifecycle');
      return admissionComplete ? 0 : 1;
    },
    path,
    fs: { existsSync: () => false, mkdirSync: () => undefined, readFileSync: () => JSON.stringify([entry]) },
    createIsolatedRuntimeDependenciesRoot: () => '/unit/runtime-deps',
    waitForFuncCoreToolsAtDependencyRoot: async () => {
      assert.strictEqual(calls.length, 1, 'Bootstrap readiness must precede creation');
    },
    getLifecycleArtifactDir: () => '/unit/artifacts',
    createOwnedWorkspaceParent: () => '/unit/parent',
    runVscodeTest: async (args: string[], options: { extraEnv: Record<string, string> }) => {
      calls.push({ args, ...options });
      if (failBootstrap) {
        throw new Error('unit bootstrap failed');
      }
    },
    cleanupOwnedWorkspaceParent: async (root: string, _description: string, strict: boolean) => {
      assert.strictEqual(strict, true);
      cleanupRoots.push(root);
    },
  });
  assert.ok(exported.runStatelessVariablesLifecycle);
  await exported.runStatelessVariablesLifecycle();
  check(() => {
    assert.strictEqual(calls.length, 3, 'Real dependency bootstrap, creation and fresh reopen must be separate hosts');
    assert.deepStrictEqual(
      calls.map((call) => Array.from(call.args)),
      [
        ['--label', 'runtimeDependencyBootstrap'],
        ['--label', 'statelessVariablesLifecycle'],
        ['--label', 'statelessVariablesLifecycle'],
      ]
    );
    assert.strictEqual(calls[0].extraEnv.LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT, '1');
    assert.strictEqual(calls[1].extraEnv.LA_E2E_CLI_STATELESS_VARIABLES_MODE, 'create');
    assert.strictEqual(calls[2].extraEnv.LA_E2E_CLI_STATELESS_VARIABLES_MODE, 'run');
    assert.strictEqual(calls[2].extraEnv.LA_E2E_CLI_STARTUP_RESOURCE, entry.workspaceFilePath);
    assert.strictEqual(calls[2].extraEnv.LA_E2E_CLI_AUTO_START_DESIGN_TIME, '1');
    assert.deepStrictEqual(cleanupRoots, ['/unit/parent', '/unit/runtime-deps']);
    assert.ok(text.includes('--stateless-variables-lifecycle'));
  });
  interface RegisteredSuite {
    id: string;
    args: string[];
    expectedPhases: string[];
  }
  const batch = require(path.resolve(__dirname, '..', '..', '..', 'scripts', 'e2e-cli-batch.js')) as {
    SUITE_REGISTRY: Record<string, RegisteredSuite>;
    SUITE_ALIASES: { linux: string[]; windows: string[] };
    normalizeSuiteSelection(value: string, options: { platform: string }): RegisteredSuite[];
    createSuiteContext(options: { batchRoot: string; suite: RegisteredSuite; index: number; total: number }): object;
    buildSuiteEnvironment(env: Record<string, string>, context: object): Record<string, string>;
  };
  assert.ok(exported.getSuitePhaseId);
  check(() => {
    const observed = calls.map((call) => exported.getSuitePhaseId?.(call.args[1], call.extraEnv));
    assert.deepStrictEqual(observed, [
      'runtimeDependencyBootstrap:bootstrap',
      'statelessVariablesLifecycle:create',
      'statelessVariablesLifecycle:reopen',
    ]);
    assert.deepStrictEqual(observed, batch.SUITE_REGISTRY.statelessVariablesLifecycle.expectedPhases);
    assert.deepStrictEqual(batch.SUITE_REGISTRY.statelessVariablesLifecycle.args, ['--stateless-variables-lifecycle']);
    for (const platform of ['win32', 'linux']) {
      assert.strictEqual(batch.normalizeSuiteSelection('statelessVariablesLifecycle', { platform })[0].id, 'statelessVariablesLifecycle');
    }
    assert.ok(!batch.SUITE_ALIASES.linux.includes('statelessVariablesLifecycle'));
    assert.ok(!batch.SUITE_ALIASES.windows.includes('statelessVariablesLifecycle'), 'Canonical inventory must remain unchanged');
  });
  check(() => {
    const context = batch.createSuiteContext({
      batchRoot: tempRoot,
      suite: batch.SUITE_REGISTRY.statelessVariablesLifecycle,
      index: 0,
      total: 1,
    });
    const env = batch.buildSuiteEnvironment({ LA_E2E_CLI_STATELESS_VARIABLES_MODE: 'run' }, context);
    assert.strictEqual(env.LA_E2E_CLI_STATELESS_VARIABLES_MODE, undefined, 'Another suite must not inherit stale family mode');
  });
  calls.length = 0;
  cleanupRoots.length = 0;
  failBootstrap = true;
  await assert.rejects(
    () => exported.runStatelessVariablesLifecycle?.() ?? Promise.resolve(),
    (error: AggregateError) => error.errors.some((cause: Error) => cause.message === 'unit bootstrap failed')
  );
  check(() => {
    assert.strictEqual(calls.length, 1, 'A failed bootstrap must not run or report create/reopen');
    assert.strictEqual(cleanupRoots.length, 0, 'Preserve failed native dependency data for parent diagnostics');
  });
  failBootstrap = false;
  admissionComplete = false;
  calls.length = 0;
  cleanupRoots.length = 0;
  await assert.rejects(() => exported.runStatelessVariablesLifecycle?.() ?? Promise.resolve(), /evidence is inadmissible/);
  assert.strictEqual(calls.length, 3, 'Admission failure must be tested after all three successful native-shaped child stubs');
  assert.strictEqual(cleanupRoots.length, 2, 'Final evidence must follow both strict owned cleanup attempts');
  checks++;
  assert.ok(exported.main);
  calls.length = 0;
  cleanupRoots.length = 0;
  const exited = new Promise<number>((resolve) => {
    reportExit = resolve;
  });
  exported.main();
  check(() => assert.strictEqual(calls.length, 0, 'Direct main must select the shared wrapper, not an unwrapped orchestrator'));
  assert.strictEqual(await exited, 1, 'Direct selector must exit nonzero when final phase/cleanup admission fails');
  assert.strictEqual(calls.length, 0);
  checks++;
}

main()
  .finally(() => fs.rmSync(tempRoot, { recursive: true, force: true }))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';
import { EventEmitter } from 'events';
import type { CdpEvaluator, Point } from './cdpFormHelpers';
import {
  findLogicAppsStandardOutputCommand,
  selectLogicAppsStandardOutputThroughWorkbench,
  showLogicAppsStandardOutput,
} from './logicAppsOutputChannel';
import {
  assertStatelessDefinition,
  assertStatelessResponse,
  assertStatelessRun,
  installOwnedLocalSettings,
  installStatelessHistorySettings,
  listValues,
  objectValue,
  recoverStateless,
  remainingMs,
  runWithOrderedCleanup,
  statelessHistoryOption,
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
  await testCleanupOrdering();
  await testRecovery();
  testNativeWiring();
  await testNativeRowScopingAndTransport();
  await testOutputChannelSelection();
  await testRegisteredRunner();
  console.log(`[statelessVariablesControls.unit] ${checks} local controls passed; no native GUI/runtime credit`);
}

async function testOutputChannelSelection(): Promise<void> {
  const outputCommand =
    'workbench.action.output.show.extension-output-ms-azuretools.vscode-azurelogicapps-#1-Azure-Logic-Apps-Standard-log';
  check(() => {
    assert.strictEqual(findLogicAppsStandardOutputCommand(['workbench.action.output.toggleOutput', outputCommand]), outputCommand);
    assert.strictEqual(findLogicAppsStandardOutputCommand(['workbench.action.output.toggleOutput']), undefined);
    assert.throws(
      () =>
        findLogicAppsStandardOutputCommand([
          outputCommand,
          'workbench.action.output.show.extension-output-ms-azuretools.vscode-azurelogicapps-#2-Azure Logic Apps (Standard)',
        ]),
      /Ambiguous/
    );
  });
  let attempts = 0;
  const executed: Array<{ command: string; args: unknown[] }> = [];
  assert.strictEqual(
    await showLogicAppsStandardOutput(
      async () => (++attempts < 3 ? ['workbench.action.output.toggleOutput'] : ['workbench.action.output.toggleOutput', outputCommand]),
      async (command, ...args) => {
        executed.push({ command, args });
      },
      Date.now() + 1000
    ),
    outputCommand
  );
  check(() => {
    assert.strictEqual(attempts, 3, 'Output selection must tolerate asynchronous channel registration');
    assert.deepStrictEqual(
      executed,
      [
        { command: 'workbench.action.output.toggleOutput', args: [] },
        { command: outputCommand, args: [] },
      ],
      'Output must be opened before selecting the exact product channel'
    );
  });
  check(() => {
    assert.strictEqual(
      findLogicAppsStandardOutputCommand([
        'workbench.action.output.show.extension-output-ms-azuretools.vscode-azurelogicapps-#3-Azure Logic Apps (Standard)',
      ]),
      'workbench.action.output.show.extension-output-ms-azuretools.vscode-azurelogicapps-#3-Azure Logic Apps (Standard)'
    );
  });
  const fallbackExecutions: string[] = [];
  assert.strictEqual(
    await showLogicAppsStandardOutput(
      async () => ['workbench.action.output.toggleOutput'],
      async (command) => {
        fallbackExecutions.push(command);
      },
      Date.now() + 1000,
      async () => true
    ),
    'workbench UI channel "Azure Logic Apps (Standard)"'
  );
  check(() => {
    assert.deepStrictEqual(fallbackExecutions, ['workbench.action.output.toggleOutput']);
  });
  let selected = false;
  const nativeEvents: string[] = [];
  const outputCdp: CdpEvaluator = {
    async evaluate<T>(_contextId: number | undefined, expression: string) {
      if (expression.includes('HTMLSelectElement.prototype')) {
        selected = true;
        return {
          ok: true,
          selectedText: 'Azure Logic Apps (Standard)',
          candidates: [
            { selectedText: 'Text Model Changes Reason', options: ['Text Model Changes Reason', 'Azure Logic Apps (Standard)'] },
          ],
        } as T;
      }
      return {
        trigger: { kind: 'select', point: { x: 40, y: 20 }, optionIndex: 2 },
        selected,
      } as T;
    },
    async send(method, params) {
      nativeEvents.push(`${method}:${String(params?.type ?? params?.key ?? '')}`);
      if (method === 'Input.dispatchKeyEvent' && params?.type === 'keyUp' && params?.key === 'Enter') {
        selected = true;
      }
      return {};
    },
  };
  assert.strictEqual(await selectLogicAppsStandardOutputThroughWorkbench(outputCdp, Date.now() + 1000), true);
  check(() => {
    assert.deepStrictEqual(nativeEvents, [], 'Native select value assignment must not depend on keyboard navigation or picker focus');
    assert.strictEqual(selected, true);
  });
  await assert.rejects(
    () =>
      showLogicAppsStandardOutput(
        async () => [],
        async () => undefined,
        Date.now() - 1
      ),
    /was not registered/
  );
  checks++;
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
  check(() => {
    const workflow = unitDefinition();
    workflow.definition.actions.Append_array.runAfter.Initialize_variables = ['SUCCEEDED'];
    assert.strictEqual(assertStatelessDefinition(workflow).appendArray, 'Append_array');
  });
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
  check(() => {
    const workflow = unitDefinition();
    workflow.definition.actions.Append_array.runAfter.Initialize_variables = ['Failed'];
    assert.throws(() => assertStatelessDefinition(workflow), /predecessor to succeed/);
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
  check(() => assert.deepStrictEqual(listValues(actions.value), actions.value));
  check(() => assert.deepStrictEqual(listValues(actions), actions.value));
  check(() => assert.throws(() => listValues({ items: actions.value }), /value array/));
  check(() => assert.throws(() => listValues('not a management response'), /management response/));
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
  check(() => {
    const dir = app('unrelated-addition');
    const files = statelessSettingsTargets(dir);
    const lease = installStatelessHistorySettings(dir, 'testwf');
    const current = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    current.Values.languageWorkers__node__defaultExecutablePath = 'C:\\runtime\\node.exe';
    fs.writeFileSync(files[0], `${JSON.stringify(current, null, 4)}\r\n`);
    lease.restore();
    const restoredText = fs.readFileSync(files[0], 'utf8');
    const restored = JSON.parse(restoredText);
    assert.strictEqual(restored.Values['Workflows.testwf.OperationOptions'], 'PriorOption');
    assert.strictEqual(restored.Values.languageWorkers__node__defaultExecutablePath, 'C:\\runtime\\node.exe');
    assert.ok(restoredText.includes('\r\n    "Values"'), 'Runtime formatting and CRLF convention must be retained');
  });
  check(() => {
    const dir = app('unrelated-modification');
    const files = statelessSettingsTargets(dir);
    const lease = installStatelessHistorySettings(dir, 'testwf');
    const current = JSON.parse(fs.readFileSync(files[1], 'utf8'));
    current.Values.unrelated = 'runtime-modified';
    fs.writeFileSync(files[1], JSON.stringify(current));
    lease.restore();
    const restoredText = fs.readFileSync(files[1], 'utf8');
    const restored = JSON.parse(restoredText);
    assert.strictEqual(restored.Values.unrelated, 'runtime-modified');
    assert.strictEqual(restored.Values['Workflows.testwf.OperationOptions'], 'PriorOption');
    assert.ok(!restoredText.includes('\n'), 'Compact runtime formatting must be retained');
  });
  check(() => {
    const dir = app('owned-conflict');
    const files = statelessSettingsTargets(dir);
    const lease = installStatelessHistorySettings(dir, 'testwf');
    const current = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    current.Values['Workflows.testwf.OperationOptions'] = 'ForeignOption';
    fs.writeFileSync(files[0], JSON.stringify(current));
    const foreign = files.map((file) => fs.readFileSync(file));
    assert.throws(() => lease.restore(), /owned path Values\.Workflows\.testwf\.OperationOptions/);
    files.forEach((file, index) => assert.ok(fs.readFileSync(file).equals(foreign[index]), 'Neither file may be partly restored'));
  });
  check(() => {
    const dir = app('owned-addition');
    const files = statelessSettingsTargets(dir);
    const lease = installStatelessHistorySettings(dir, 'newwf');
    files.forEach((file) => {
      assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).Values['Workflows.newwf.OperationOptions'], statelessHistoryOption);
    });
    lease.restore();
    files.forEach((file) => {
      assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).Values['Workflows.newwf.OperationOptions'], undefined);
    });
  });
  check(() => {
    const dir = app('owned-deletion');
    const files = statelessSettingsTargets(dir);
    for (const file of files) {
      const settings = JSON.parse(fs.readFileSync(file, 'utf8'));
      settings.Values.nested = { owned: 'restore-me', unrelated: 'preserve-me' };
      fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
    }
    const lease = installOwnedLocalSettings(files, (settings) => {
      delete objectValue(objectValue(settings.Values, 'Values').nested, 'nested').owned;
    });
    const current = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    current.Values.nested.runtime = 'runtime-added';
    fs.writeFileSync(files[0], `${JSON.stringify(current, null, 2)}\n`);
    lease.restore();
    const restored = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    assert.deepStrictEqual(restored.Values.nested, {
      unrelated: 'preserve-me',
      runtime: 'runtime-added',
      owned: 'restore-me',
    });
  });
  check(() => {
    const dir = app('owned-object-addition');
    const files = statelessSettingsTargets(dir);
    const lease = installOwnedLocalSettings(files, (settings) => {
      objectValue(settings.Values, 'Values').testOwned = { value: 'remove-me' };
    });
    const current = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    current.Values.testOwned.runtime = 'preserve-me';
    fs.writeFileSync(files[0], `${JSON.stringify(current, null, 2)}\n`);
    lease.restore();
    const restored = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    assert.deepStrictEqual(restored.Values.testOwned, { runtime: 'preserve-me' });
    assert.strictEqual(JSON.parse(fs.readFileSync(files[1], 'utf8')).Values.testOwned, undefined);
  });
  check(() => {
    const dir = app('array-mutation');
    assert.throws(
      () =>
        installOwnedLocalSettings(statelessSettingsTargets(dir), (settings) => {
          objectValue(settings.Values, 'Values').ownedArray = ['unsupported'];
        }),
      /Array mutations are unsupported/
    );
  });
  check(() => {
    const dir = app('metadata-preserved');
    const files = statelessSettingsTargets(dir);
    for (const file of files) {
      fs.chmodSync(file, 0o600);
    }
    const modes = files.map((file) => fs.statSync(file).mode);
    const lease = installStatelessHistorySettings(dir, 'testwf');
    files.forEach((file, index) => assert.strictEqual(fs.statSync(file).mode, modes[index]));
    lease.restore();
    files.forEach((file, index) => assert.strictEqual(fs.statSync(file).mode, modes[index]));
  });
  check(() => {
    const dir = app('linked-target');
    const files = statelessSettingsTargets(dir);
    const external = path.join(tempRoot, 'linked-target-external');
    fs.mkdirSync(external, { recursive: true });
    fs.writeFileSync(path.join(external, 'local.settings.json'), fs.readFileSync(files[1]));
    fs.rmSync(path.dirname(files[1]), { recursive: true });
    fs.symlinkSync(external, path.dirname(files[1]), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => installStatelessHistorySettings(dir, 'testwf'), /must not contain links/);
  });
  check(() => {
    const dir = app('hard-linked-target');
    const files = statelessSettingsTargets(dir);
    const external = path.join(tempRoot, 'hard-linked-target-external.json');
    fs.writeFileSync(external, fs.readFileSync(files[1]));
    fs.rmSync(files[1]);
    fs.linkSync(external, files[1]);
    assert.throws(() => installStatelessHistorySettings(dir, 'testwf'), /must not have hard links/);
  });
  check(() => {
    const dir = app('transaction-rollback');
    const files = statelessSettingsTargets(dir);
    let restoring = false;
    const lease = installOwnedLocalSettings(
      files,
      (settings) => {
        objectValue(settings.Values, 'Values')['Workflows.testwf.OperationOptions'] = statelessHistoryOption;
      },
      {
        afterWrite: (_file, index) => {
          if (restoring && index === 1) {
            throw new Error('unit second-target write failure');
          }
        },
      }
    );
    const installed = files.map((file) => fs.readFileSync(file));
    restoring = true;
    assert.throws(() => lease.restore(), /unit second-target write failure/);
    restoring = false;
    files.forEach((file, index) =>
      assert.ok(fs.readFileSync(file).equals(installed[index]), 'A failed second write must roll back both targets')
    );
    lease.restore();
  });
  check(() => {
    const dir = app('transaction-open-failure');
    const files = statelessSettingsTargets(dir);
    let restoring = false;
    const lease = installOwnedLocalSettings(
      files,
      (settings) => {
        objectValue(settings.Values, 'Values')['Workflows.testwf.OperationOptions'] = statelessHistoryOption;
      },
      {
        beforeOpen: (_file, index) => {
          if (restoring && index === 1) {
            throw new Error('unit second-target open failure');
          }
        },
      }
    );
    const installed = files.map((file) => fs.readFileSync(file));
    restoring = true;
    assert.throws(() => lease.restore(), /unit second-target open failure/);
    restoring = false;
    files.forEach((file, index) =>
      assert.ok(fs.readFileSync(file).equals(installed[index]), 'Opening validation failure must not rewrite either target')
    );
    lease.restore();
  });
  check(() => {
    const dir = app('same-inode-edit');
    const files = statelessSettingsTargets(dir);
    let restoring = false;
    let foreign = Buffer.alloc(0);
    const lease = installOwnedLocalSettings(
      files,
      (settings) => {
        objectValue(settings.Values, 'Values')['Workflows.testwf.OperationOptions'] = statelessHistoryOption;
      },
      {
        beforeOpen: (file, index) => {
          if (restoring && index === 0) {
            const current = JSON.parse(fs.readFileSync(file, 'utf8'));
            current.Values.runtimeConcurrentEdit = 'preserve';
            foreign = Buffer.from(JSON.stringify(current));
            fs.writeFileSync(file, foreign);
          }
        },
      }
    );
    const secondInstalled = fs.readFileSync(files[1]);
    restoring = true;
    assert.throws(() => lease.restore(), /Foreign settings edit during write/);
    assert.ok(fs.readFileSync(files[0]).equals(foreign), 'Same-inode foreign content must survive rejected restoration');
    assert.ok(fs.readFileSync(files[1]).equals(secondInstalled), 'Same-inode conflict must fail before writing the other target');
  });
  check(() => {
    if (process.platform === 'win32') {
      return;
    }
    const dir = app('path-replacement');
    const files = statelessSettingsTargets(dir);
    let restoring = false;
    const detached = `${files[0]}.detached`;
    const replacement = Buffer.from('{"IsEncrypted":false,"Values":{"foreign":"preserve"}}');
    const lease = installOwnedLocalSettings(
      files,
      (settings) => {
        objectValue(settings.Values, 'Values')['Workflows.testwf.OperationOptions'] = statelessHistoryOption;
      },
      {
        afterWrite: (file, index) => {
          if (restoring && index === 0) {
            fs.renameSync(file, detached);
            fs.writeFileSync(file, replacement);
          }
        },
      }
    );
    const installed = files.map((file) => fs.readFileSync(file));
    restoring = true;
    assert.throws(() => lease.restore(), /Foreign settings replacement during write/);
    assert.ok(fs.readFileSync(files[0]).equals(replacement), 'Foreign replacement must remain untouched');
    assert.ok(fs.readFileSync(files[1]).equals(installed[1]), 'Other mutated targets must roll back after path replacement');
  });
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
    assert.throws(() => lease.restore(), /refusing to recreate/);
    assert.ok(!fs.existsSync(statelessSettingsTargets(dir)[1]), 'Do not recreate a foreign-deleted file');
  });
  check(() => {
    const dir = app('malformed-after-install');
    const files = statelessSettingsTargets(dir);
    const lease = installStatelessHistorySettings(dir, 'testwf');
    fs.writeFileSync(files[1], '{"Values":{"secret":"UNIT_PRIVATE_MARKER",}');
    const before = files.map((file) => fs.readFileSync(file));
    assert.throws(
      () => lease.restore(),
      (error: Error) => error.message.includes('invalid JSON') && !error.message.includes('UNIT_PRIVATE_MARKER')
    );
    files.forEach((file, index) => assert.ok(fs.readFileSync(file).equals(before[index]), 'Malformed preflight must prevent every write'));
  });
}

async function testCleanupOrdering(): Promise<void> {
  const order: string[] = [];
  const diagnostics: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...values: unknown[]) => diagnostics.push(values.map(String).join(' '));
  try {
    await assert.rejects(
      () =>
        runWithOrderedCleanup(
          async () => {
            order.push('body');
            throw new Error('body failure');
          },
          [
            {
              phase: 'first cleanup',
              action: () => {
                order.push('cleanup-1');
                throw new Error('cleanup failure 1');
              },
            },
            {
              phase: 'second cleanup',
              action: () => {
                order.push('cleanup-2');
                throw new Error('cleanup failure 2');
              },
            },
          ],
          'unit body and cleanup failure'
        ),
      (error: AggregateError) =>
        error.errors.length === 3 &&
        error.errors[0].message === 'body failure' &&
        error.errors[1].message === 'cleanup failure 1' &&
        error.errors[2].message === 'cleanup failure 2' &&
        error.cause === error.errors[0]
    );
  } finally {
    console.error = originalConsoleError;
  }
  check(() => assert.deepStrictEqual(order, ['body', 'cleanup-1', 'cleanup-2']));
  check(() =>
    assert.deepStrictEqual(diagnostics, [
      '[cleanup][first cleanup] Error: cleanup failure 1',
      '[cleanup][second cleanup] Error: cleanup failure 2',
    ])
  );
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
      native.includes('handleAffirmativeConnectorWorkbenchPrompt('),
      'Debug startup must reuse the proven affirmative connector prompt journey'
    );
    assert.ok(
      native.includes('selectApprovedAzureConnectorFixturePrompt(') && native.includes('readApprovedAzureSubscriptionName('),
      'Debug startup must select the approved subscription display name and existing resource group through native UI'
    );
    assert.ok(native.includes('coordinateStatelessStartup('), 'Prompt monitoring must remain active through workflow registration');
    assert.ok(native.includes('selectExactWorkbenchPromptOption('), 'Azurite/debug prompts must use the same owned workbench connection');
    assert.ok(native.includes("prompt.kind === 'notification'"), 'Debug prompt allowlisting must not auto-select dialogs or quick picks');
    assert.ok(
      native.includes('azureFixture = await readApprovedExistingResourceGroup(azureFixture, deadline, undefined, fetch, signal)') &&
        native.includes('azureFixture = await readApprovedExistingResourceGroup(azureFixture, positiveDeadline, undefined, fetch, signal)'),
      'Preparation and run hosts must bind the actual existing resource-group location with cancellation'
    );
    assert.ok(native.includes('assertAzureConnectorAccountTreePrerequisite('));
    assert.ok(!native.includes('approvedAzureFixturePrompts'), 'Do not regress to GUID matching through the generic prompt loop');
    assert.ok(
      native.includes('useAzureConnectors: true'),
      'Real designer setup must continue the affirmative Azure fixture/authentication journey'
    );
    assert.ok(!native.includes('Skip for now'), 'Stateless setup cannot silently choose a negative Azure connector fallback');
    assert.ok(native.includes('readApprovedAzureConnectorFixture(process.env)'));
    assert.ok(native.includes('const preparationLease = installApprovedAzureFixture(entry.appDir, azureFixture)'));
    assert.ok(
      native.indexOf('readApprovedExistingResourceGroup(azureFixture, deadline, undefined, fetch, signal)') <
        native.indexOf('const preparationLease = installApprovedAzureFixture(entry.appDir, azureFixture)'),
      'Preparation must verify the actual resource-group location before binding settings'
    );
    assert.ok(native.includes('preparationLease.bindGeneratedDesignTime()'));
    assert.ok(native.includes('await waitForActivationDesignTime(positiveDeadline, signal)'));
    assert.ok(
      native.match(/await waitForRuntimePortReleased\((positiveDeadline|deadline), signal\)/g)?.length === 3,
      'Positive-lifecycle and recovery restarts must prove exclusive availability of port 7071 before continuing'
    );
    assert.ok(native.includes('server.listen({ port: 7071, host, ipv6Only, exclusive: true }'));
    assert.ok(native.includes('showLogicAppsStandardOutput('));
    assert.ok(native.includes('lease?.restore();'), 'Stateless history settings restoration must remain in bounded recovery');
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
  const calls: Array<{ args: string[]; controlledFuncDirectory?: string; extraEnv: Record<string, string> }> = [];
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
    getFuncCoreToolsBinaryPath: (runtimeRoot: string) => path.join(runtimeRoot, 'FuncCoreTools', 'func'),
    waitForFuncCoreToolsAtDependencyRoot: async () => {
      assert.strictEqual(calls.length, 1, 'Bootstrap readiness must precede creation');
    },
    getLifecycleArtifactDir: () => '/unit/artifacts',
    createOwnedWorkspaceParent: () => '/unit/parent',
    runVscodeTest: async (args: string[], options: { controlledFuncDirectory?: string; extraEnv: Record<string, string> }) => {
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
    assert.strictEqual(calls.length, 4, 'Bootstrap, creation, preparation and activation must use separate hosts');
    assert.deepStrictEqual(
      calls.map((call) => Array.from(call.args)),
      [
        ['--label', 'runtimeDependencyBootstrap'],
        ['--label', 'statelessVariablesLifecycle'],
        ['--label', 'statelessVariablesLifecycle'],
        ['--label', 'statelessVariablesLifecycle'],
      ]
    );
    assert.strictEqual(calls[0].extraEnv.LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT, '1');
    assert.strictEqual(calls[1].extraEnv.LA_E2E_CLI_STATELESS_VARIABLES_MODE, 'create');
    assert.strictEqual(calls[2].extraEnv.LA_E2E_CLI_STATELESS_VARIABLES_MODE, 'prepare');
    assert.strictEqual(calls[2].extraEnv.LA_E2E_CLI_AUTO_START_DESIGN_TIME, '0');
    assert.strictEqual(calls[3].extraEnv.LA_E2E_CLI_STATELESS_VARIABLES_MODE, 'run');
    assert.strictEqual(calls[3].extraEnv.LA_E2E_CLI_STARTUP_RESOURCE, entry.workspaceFilePath);
    assert.strictEqual(calls[3].extraEnv.LA_E2E_CLI_AUTO_START_DESIGN_TIME, '1');
    assert.strictEqual(calls[3].extraEnv.LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL, '1');
    assert.strictEqual(calls[3].extraEnv.LA_E2E_CLI_PROFILE_PHASE, 'stateless-variables-activation');
    assert.strictEqual(
      calls[3].controlledFuncDirectory,
      path.join('/unit/runtime-deps', 'FuncCoreTools'),
      'Activation host must control final PATH resolution with the bootstrap-admitted Func directory'
    );
    assert.deepStrictEqual(cleanupRoots, ['/unit/parent', '/unit/runtime-deps']);
    assert.ok(text.includes('--stateless-variables-lifecycle'));
  });
  interface RegisteredSuite {
    id: string;
    requiresAzure?: boolean;
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
      'statelessVariablesLifecycle:prepare',
      'statelessVariablesLifecycle:reopen',
    ]);
    assert.deepStrictEqual(observed, batch.SUITE_REGISTRY.statelessVariablesLifecycle.expectedPhases);
    assert.deepStrictEqual(batch.SUITE_REGISTRY.statelessVariablesLifecycle.args, ['--stateless-variables-lifecycle']);
    assert.strictEqual(batch.SUITE_REGISTRY.statelessVariablesLifecycle.requiresAzure, true, 'Approved WIF fixture must be forwarded');
    for (const platform of ['win32', 'linux']) {
      assert.strictEqual(batch.normalizeSuiteSelection('statelessVariablesLifecycle', { platform })[0].id, 'statelessVariablesLifecycle');
    }
    const context = batch.createSuiteContext({
      batchRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'stateless-batch-artifacts-')),
      suite: batch.SUITE_REGISTRY.statelessVariablesLifecycle,
      index: 0,
      total: 1,
    });
    const external = {
      LA_E2E_CLI_VSCODE_LOG_DIR: path.join(tempRoot, 'published-vscode-logs'),
      LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: path.join(tempRoot, 'published-workspaces'),
      LA_E2E_CLI_SCREENSHOT_DIR: path.join(tempRoot, 'published-screenshots'),
      LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT: path.join(tempRoot, 'published-lifecycle'),
    };
    const artifactEnv = batch.buildSuiteEnvironment(external, context);
    for (const [key, value] of Object.entries(external)) {
      assert.strictEqual(artifactEnv[key], value, `${key} must survive batch isolation so ADO can stage diagnostics`);
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
  assert.strictEqual(calls.length, 4, 'Admission failure must be tested after all four successful native-shaped child stubs');
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

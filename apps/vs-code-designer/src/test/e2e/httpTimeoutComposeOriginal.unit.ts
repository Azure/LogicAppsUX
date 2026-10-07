import * as assert from 'assert';
import './approvedAzureFixture.unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CdpConnection } from './cdpClient';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import { runHttpTimeoutComposeDomControls } from './httpTimeoutComposeDom.unit';
import { runHttpTimeoutComposeDirectControls } from './httpTimeoutComposeDirect.unit';
import { runHttpTimeoutEnvironmentControls } from './httpTimeoutComposeEnvironment.unit';
import { runApprovedAzureConnectorFixtureControls } from './azureConnectorFixture.unit';
import {
  assembleHttpTimeoutComposeCode,
  assertHttpTimeoutComposeAuthored,
  assertHttpTimeoutComposePersisted,
  assertHttpTimeoutComposeVisibleError,
  httpTimeoutComposeAction,
  httpTimeoutComposeError,
  type HttpTimeoutComposeRenderedPage,
  type HttpTimeoutComposeWorkflow,
  httpTimeoutComposeRemaining,
  pollHttpTimeoutCompose,
  replaceHttpTimeoutComposeAction,
  selectHttpTimeoutComposeWorkspace,
} from './httpTimeoutComposeOracle';
import { buildScreenshotReadinessExpression } from './screenshotReadiness';

const authored: HttpTimeoutComposeWorkflow = {
  kind: 'Stateless',
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
    contentVersion: '1.0.0.0',
    triggers: { Request: { type: 'Request', kind: 'Http' } },
    actions: { Compose: { inputs: 'test', runAfter: {}, type: 'Compose' } },
    outputs: {},
  },
};
const expected = replaceHttpTimeoutComposeAction(authored);
const owner = { targetId: 'unit-target', frameId: 'unit-frame', contextId: 17, documentOrigin: 123 };
const observation = { ...owner, visible: true, activeDesigner: true, messages: [httpTimeoutComposeError] };
let passed = 0;

async function control(name: string, run: () => void | Promise<void>): Promise<void> {
  await run();
  passed++;
  console.log(`[http-timeout-compose-control] PASS ${name}`);
}

function numbered(text: string): HttpTimeoutComposeRenderedPage {
  return { editorId: 'unit-editor-json', lines: text.split('\n').map((text, index) => ({ number: index + 1, text })) };
}

function inputDriverFixture(deadline = Date.now() + 5000) {
  const sent: Array<{ method: string; params: Record<string, unknown> }> = [];
  const cdp = {
    async evaluate() {
      throw new Error('Input-only control cannot supply synthetic editor DOM/pages');
    },
    async send(method: string, params: Record<string, unknown>) {
      sent.push({ method, params });
      return {};
    },
  } as unknown as CdpConnection;
  return { driver: new HttpTimeoutComposeDriver(cdp, 17, deadline, () => {}), sent };
}

async function main(): Promise<void> {
  await control('original replacement is exact and leaves authored source unchanged', () => {
    assertHttpTimeoutComposeAuthored(authored);
    assert.deepStrictEqual(expected.definition.actions.Compose, {
      inputs: 'test',
      runAfter: {},
      runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
      type: 'Compose',
    });
    assert.deepStrictEqual(expected.definition.triggers, authored.definition.triggers);
    assert.ok(!('runtimeConfiguration' in (authored.definition.actions.Compose as object)));
    assertHttpTimeoutComposePersisted(structuredClone(expected), expected);
    assertHttpTimeoutComposeVisibleError(observation, owner);
  });
  for (const [name, mutate] of [
    [
      'wrong kind',
      (value: HttpTimeoutComposeWorkflow) => {
        value.kind = 'Stateful';
      },
    ],
    [
      'missing Request',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.triggers = {};
      },
    ],
    [
      'wrong trigger',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.triggers.Request.type = 'Recurrence';
      },
    ],
    [
      'wrong input',
      (value: HttpTimeoutComposeWorkflow) => {
        (value.definition.actions.Compose as Record<string, unknown>).inputs = 'other';
      },
    ],
    [
      'extra action',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.actions.HTTP = { type: 'Http' };
      },
    ],
  ] as const) {
    await control(`authored ${name} fails`, () => {
      const value = structuredClone(authored);
      mutate(value);
      assert.throws(() => replaceHttpTimeoutComposeAction(value));
    });
  }
  await control('stale initial persisted definition fails', () => {
    assert.throws(() => assertHttpTimeoutComposePersisted(authored, expected));
  });
  for (const [name, mutate] of [
    [
      'timeout changed',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.actions.Compose = { ...httpTimeoutComposeAction, runtimeConfiguration: { requestOptions: { timeout: 'PT1S' } } };
      },
    ],
    [
      'input changed',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.actions.Compose = { ...httpTimeoutComposeAction, inputs: 'wrong' };
      },
    ],
    [
      'trigger changed',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.triggers.Request.type = 'Recurrence';
      },
    ],
    [
      'partial action',
      (value: HttpTimeoutComposeWorkflow) => {
        value.definition.actions.Compose = { type: 'Compose' };
      },
    ],
  ] as const) {
    await control(`persisted ${name} fails`, () => {
      const value = structuredClone(expected);
      mutate(value);
      assert.throws(() => assertHttpTimeoutComposePersisted(value, expected));
    });
  }
  for (const key of ['targetId', 'frameId', 'contextId', 'documentOrigin'] as const) {
    await control(`wrong ${key} error context fails`, () => {
      const value = { ...observation, [key]: typeof owner[key] === 'string' ? 'other' : 999 };
      assert.throws(() => assertHttpTimeoutComposeVisibleError(value, owner));
    });
  }
  await control('hidden and inactive error fail', () => {
    assert.throws(() => assertHttpTimeoutComposeVisibleError({ ...observation, visible: false }, owner));
    assert.throws(() => assertHttpTimeoutComposeVisibleError({ ...observation, activeDesigner: false }, owner));
  });
  await control('incomplete original designer identity cannot accept an error', () => {
    for (const identity of [
      { ...owner, targetId: '' },
      { ...owner, frameId: '' },
      { ...owner, contextId: 0 },
      { ...owner, documentOrigin: Number.NaN },
    ]) {
      assert.throws(() => assertHttpTimeoutComposeVisibleError({ ...observation, ...identity }, identity));
    }
  });
  await control('mismatched, partial, and quoted editor error text fail', () => {
    for (const message of [
      httpTimeoutComposeError.replace("'Compose'", "'Other'"),
      httpTimeoutComposeError.slice(0, -1),
      `"${httpTimeoutComposeError}"`,
    ]) {
      assert.throws(() => assertHttpTimeoutComposeVisibleError({ ...observation, messages: [message] }, owner));
    }
  });
  await control('actual screenshot readiness probe requires visible designer error, not a workbench shell', () => {
    const { JSDOM } = require('jsdom');
    for (const [html, ready] of [
      [`<div role="alert">${httpTimeoutComposeError}</div>`, true],
      [`<div role="alert" style="display:none">${httpTimeoutComposeError}</div>`, false],
      ['<div role="alert">Unrelated validation error</div>', false],
      [`<div class="monaco-editor"><div role="alert">${httpTimeoutComposeError}</div></div>`, false],
    ] as const) {
      const dom = new JSDOM(`<html><body>${html}</body></html>`, { runScripts: 'outside-only' });
      try {
        const prototype = dom.window.HTMLElement.prototype;
        Object.defineProperty(prototype, 'offsetWidth', { configurable: true, get: () => 400 });
        Object.defineProperty(prototype, 'offsetHeight', { configurable: true, get: () => 40 });
        prototype.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 40, width: 400, height: 40 });
        prototype.getClientRects = function () {
          return [this.getBoundingClientRect()];
        };
        const snapshot = dom.window.eval(
          buildScreenshotReadinessExpression(
            {
              kind: 'designerValidationError',
              label: 'http-timeout-compose-control',
              message: httpTimeoutComposeError,
            },
            1,
            1
          )
        );
        assert.strictEqual(snapshot.ready, ready);
      } finally {
        dom.window.close();
      }
    }
  });
  const text = JSON.stringify(expected, null, 2);
  const full = numbered(text);
  const eof = full.lines.length;
  const pages = [
    { ...full, lines: full.lines.slice(0, 16) },
    { ...full, lines: full.lines.slice(12, 28) },
    { ...full, lines: full.lines.slice(24) },
  ];
  await control('complete overlapping rendered pages assemble exactly', () => {
    assert.strictEqual(assembleHttpTimeoutComposeCode(pages, eof), text);
  });
  await control('incomplete Code editor virtualization fails without fixture fallback', () => {
    const missing = pages.map((page) => ({ ...page, lines: page.lines.filter((line) => line.number !== 8) }));
    assert.throws(() => assembleHttpTimeoutComposeCode(missing, eof), /missing line 8/);
    assert.throws(() => assembleHttpTimeoutComposeCode([pages[0]], eof), /missing line/);
  });
  await control('changed overlapping text and editor identity fail', () => {
    const changed = structuredClone(pages);
    changed[1].lines[0] = { ...changed[1].lines[0], text: '"unexpected"' };
    assert.throws(() => assembleHttpTimeoutComposeCode(changed, eof), /changed while reading/);
    assert.throws(() => assembleHttpTimeoutComposeCode([pages[0], { ...pages[1], editorId: 'wrong' }, pages[2]], eof), /editor changed/);
  });
  await control('missing EOF, empty page, and invalid JSON fail', () => {
    assert.throws(() => assembleHttpTimeoutComposeCode(pages, 0));
    assert.throws(() => assembleHttpTimeoutComposeCode([{ ...full, lines: [] }], eof));
    assert.throws(() => assembleHttpTimeoutComposeCode([numbered('{"Compose":')], 1));
  });
  await runHttpTimeoutComposeDomControls(control, authored);
  await control('replacement uses key dispatch and insertText only', async () => {
    const { driver, sent } = inputDriverFixture();
    await driver.replaceFocused(text);
    assert.deepStrictEqual(
      sent.map((entry) => entry.method),
      ['Input.dispatchKeyEvent', 'Input.dispatchKeyEvent', 'Input.insertText']
    );
    assert.strictEqual(sent[0].params.modifiers, 2);
    assert.strictEqual(sent[2].params.text, text);
  });
  await control('input RPC failure cannot inject a fallback', async () => {
    let reads = 0;
    const cdp = {
      async evaluate() {
        reads++;
        return {};
      },
      async send() {
        throw new Error('original input RPC failure');
      },
    } as unknown as CdpConnection;
    const driver = new HttpTimeoutComposeDriver(cdp, 17, Date.now() + 5000, () => {});
    await assert.rejects(() => driver.replaceFocused(text), /original input RPC failure/);
    assert.strictEqual(reads, 0);
  });
  await control('wrong active tab prevents every driver observation and input', async () => {
    const { driver } = inputDriverFixture();
    const inactive = new HttpTimeoutComposeDriver(driver.cdp, 17, Date.now() + 5000, () => {
      throw new Error('wrong tab');
    });
    await assert.rejects(() => inactive.readCode(), /wrong tab/);
  });
  await control('expired deadline, late readiness and RPC failure fail', async () => {
    assert.throws(() => httpTimeoutComposeRemaining(10, 10), /expired/);
    await assert.rejects(() => pollHttpTimeoutCompose(async () => true, Boolean, Date.now() - 1, 'expired'), /expired/);
    const deadline = Date.now() + 10;
    await assert.rejects(
      () =>
        pollHttpTimeoutCompose(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 15));
            return true;
          },
          Boolean,
          deadline,
          'late readiness'
        ),
      /expired/
    );
    await assert.rejects(
      () =>
        pollHttpTimeoutCompose(
          async () => {
            throw new Error('original read error');
          },
          Boolean,
          Date.now() + 1000,
          'RPC'
        ),
      /original read error/
    );
  });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'http-timeout-compose-unit-'));
  const environmentKeys = [
    'LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT',
    'LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH',
    'LA_E2E_CLI_PRESERVE_WORKSPACES',
    'LA_E2E_CLI_BATCH_MODE',
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN',
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON',
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT',
  ] as const;
  const priorEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  for (const key of environmentKeys) {
    delete process.env[key];
  }
  process.env.LA_E2E_CLI_BATCH_MODE = '1'; // Existing callback-only controls leave finalization to the batch wrapper.
  process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN = 'unit-token';
  process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON = '2099-01-01T00:00:00.000Z';
  process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT = new Date().toISOString();
  try {
    const makeEntry = (createdAt = new Date().toISOString()) => ({
      appType: 'standard',
      wfType: 'Stateless',
      parentDir: root,
      wsName: 'workspace',
      appName: 'app',
      wfName: 'workflow',
      wsDir: path.join(root, 'workspace'),
      wsFilePath: path.join(root, 'workspace', 'workspace.code-workspace'),
      appDir: path.join(root, 'workspace', 'app'),
      wfDir: path.join(root, 'workspace', 'app', 'workflow'),
      createdAt,
    });
    await control('manifest rejects stale, wrong-root, ambiguous and mismatched fixtures', () => {
      const now = Date.now();
      const entry = makeEntry();
      assert.deepStrictEqual(selectHttpTimeoutComposeWorkspace([entry], root, now - 1000), entry);
      assert.throws(() => selectHttpTimeoutComposeWorkspace([], root, now - 1000));
      assert.throws(() => selectHttpTimeoutComposeWorkspace([entry, entry], root, now - 1000));
      assert.throws(() => selectHttpTimeoutComposeWorkspace([makeEntry(new Date(now - 2000).toISOString())], root, now - 1000));
      assert.throws(() => selectHttpTimeoutComposeWorkspace([{ ...entry, parentDir: path.dirname(root) }], root, now - 1000));
      assert.throws(() => selectHttpTimeoutComposeWorkspace([{ ...entry, wfType: 'Stateful' }], root, now - 1000));
      assert.throws(() => selectHttpTimeoutComposeWorkspace([{ ...entry, wfDir: root }], root, now - 1000));
    });
    const runner = require(path.resolve(__dirname, '../../../scripts/run-e2e-cli.js'))._test;
    const batch = require(path.resolve(__dirname, '../../../scripts/e2e-cli-batch.js'));
    const expectedPhases = [
      'runtimeDependencyBootstrap:bootstrap',
      'httpTimeoutComposeOriginal:create',
      'httpTimeoutComposeOriginal:reopen',
    ];
    await control('shared family ID registers exact phases without expanding canonical aliases', () => {
      const suite = batch.SUITE_REGISTRY.httpTimeoutComposeOriginal;
      assert.deepStrictEqual(suite.args, ['--http-timeout-compose-original']);
      assert.deepStrictEqual(suite.expectedPhases, expectedPhases);
      assert.deepStrictEqual(runner.getDirectExpectedPhaseIds('httpTimeoutComposeOriginal'), expectedPhases);
      for (const platform of ['linux', 'win32']) {
        assert.strictEqual(batch.normalizeSuiteSelection('httpTimeoutComposeOriginal', { platform })[0], suite);
      }
      for (const alias of ['linux', 'windows']) {
        assert.ok(!batch.normalizeSuiteSelection(alias).some((entry: { id: string }) => entry.id === suite.id));
      }
    });
    await control('registered runner bootstraps then creates Stateless and fresh-reopens exact workspace', async () => {
      const labels: string[] = [];
      const phases: string[] = [];
      const phasePaths: string[] = [];
      const profiles: string[] = [];
      let cleanup = false;
      let runtimeCleanup = false;
      const result = await runner.runHttpTimeoutComposeOriginal({
        artifactDir: path.join(root, 'artifacts'),
        createParent: () => root,
        createRuntimeRoot: () => path.join(root, 'runtime'),
        cleanupRuntime: async (directory: string) => {
          assert.strictEqual(directory, path.join(root, 'runtime'));
          runtimeCleanup = true;
        },
        cleanup: async (_root: string, _description: string, strict: boolean) => {
          assert.strictEqual(strict, true);
          cleanup = true;
        },
        run: async (args: string[], options: { extraEnv: Record<string, string> }) => {
          labels.push(args[1]);
          const env = options.extraEnv;
          phases.push(runner.getSuitePhaseId(args[1], env));
          phasePaths.push(env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH);
          profiles.push(env.LA_E2E_CLI_USER_DATA_SUFFIX);
          assert.strictEqual(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT, path.join(root, 'runtime'));
          if (labels.length === 1) {
            assert.strictEqual(env.LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP, '1');
            assert.strictEqual(env.LA_E2E_CLI_MINIMAL_ACTIVATION, '1', 'Bootstrap admission stays unchanged');
          } else if (labels.length === 2) {
            assert.strictEqual(env.LA_E2E_CLI_CREATE_WORKSPACE_CASE, 'standard-stateless');
            const entry = makeEntry();
            fs.mkdirSync(entry.wfDir, { recursive: true });
            fs.writeFileSync(entry.wsFilePath, '{}');
            fs.writeFileSync(path.join(entry.wfDir, 'workflow.json'), '{}');
            fs.writeFileSync(env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST, JSON.stringify([entry]));
          } else {
            assert.strictEqual(env.LA_E2E_CLI_MINIMAL_ACTIVATION, '0', 'Actual HTTP consumer must initialize the real Azure account tree');
            assert.strictEqual(env.LA_E2E_CLI_VALIDATE_DEPENDENCIES, '1', 'Normal activation preserves managed runtime admission');
            assert.strictEqual(env.LA_E2E_STRICT_DEPENDENCY_VALIDATION, '1');
            assert.strictEqual(env.LA_E2E_CLI_STARTUP_RESOURCE, makeEntry().wsFilePath);
            assert.strictEqual(env.LA_E2E_CLI_INCLUDE_HTTP_TIMEOUT_COMPOSE_ORIGINAL, '1');
          }
          return 0;
        },
      });
      assert.strictEqual(result, 0);
      assert.deepStrictEqual(labels, ['runtimeDependencyBootstrap', 'createWorkspaceFixturesManifest', 'httpTimeoutComposeOriginal']);
      assert.deepStrictEqual(phases, expectedPhases);
      assert.strictEqual(new Set(phasePaths).size, 1, 'Every exact phase must report to the same original invocation JSONL');
      assert.strictEqual(new Set(profiles).size, 3, 'Bootstrap, create and reopen must use fresh hosts/profiles');
      assert.strictEqual(cleanup, true);
      assert.strictEqual(runtimeCleanup, true);
    });
    await control('runner bootstrap, create, reopen and cleanup failures propagate', async () => {
      for (const failAt of [1, 2, 3, 4, 5]) {
        let calls = 0;
        const failed = new Error(`original phase ${failAt} failure`);
        await assert.rejects(
          () =>
            runner.runHttpTimeoutComposeOriginal({
              artifactDir: path.join(root, 'failures'),
              createParent: () => root,
              createRuntimeRoot: () => path.join(root, 'runtime'),
              cleanupRuntime: async () => {
                throw failed;
              },
              cleanup: async () => {
                if (failAt === 4) {
                  throw failed;
                }
              },
              run: async (_args: string[], options: { extraEnv: Record<string, string> }) => {
                calls++;
                if (calls === failAt) {
                  throw failed;
                }
                if (calls === 2) {
                  fs.writeFileSync(options.extraEnv.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST, JSON.stringify([makeEntry()]));
                }
                return 0;
              },
            }),
          (error) => error === failed
        );
        assert.strictEqual(calls, Math.min(failAt, 3));
      }
    });
    await control('phase completion rejects missing, duplicate, mismatched and failed phases', () => {
      const phases = expectedPhases.map((phaseId) => ({
        phaseId,
        complete: true,
        exitCode: 0,
        signal: null,
        cleanupVerified: true,
        diagnosticsError: '',
      }));
      assert.strictEqual(runner.getDirectSuiteComplete('httpTimeoutComposeOriginal', phases), true);
      for (const invalid of [
        phases.slice(1),
        [...phases, phases[0]],
        [phases[1], phases[0], phases[2]],
        [{ ...phases[0], phaseId: 'wrong:bootstrap' }, ...phases.slice(1)],
        [phases[0], phases[1], { ...phases[2], complete: false }],
        [phases[0], phases[1], { ...phases[2], exitCode: 1 }],
      ]) {
        assert.strictEqual(runner.getDirectSuiteComplete('httpTimeoutComposeOriginal', invalid), false);
      }
    });
    await control('batch terminal requires exact completed family phases and ordinary wrapper success', () => {
      const suite = batch.SUITE_REGISTRY.httpTimeoutComposeOriginal;
      const context = {
        expectedPhaseIds: expectedPhases,
        phaseResultsPath: path.join(root, 'batch-phases.jsonl'),
        cleanupLedgerPath: path.join(root, 'batch-cleanup.json'),
        terminalResultPath: path.join(root, 'batch-terminal.json'),
      };
      const phases = expectedPhases.map((phaseId) => ({
        phaseId,
        complete: true,
        exitCode: 0,
        signal: null,
        cleanupVerified: true,
        diagnosticsError: '',
      }));
      for (const [phaseResults, exitCode, complete] of [
        [phases, 0, true],
        [phases.slice(1), 1, false],
        [[...phases, phases[0]], 0, false],
        [[phases[1], phases[0], phases[2]], 0, false],
        [[phases[0], phases[1], { ...phases[2], complete: false }], 0, false],
        [phases, 1, false],
      ] as const) {
        fs.writeFileSync(context.phaseResultsPath, phaseResults.map((phase) => JSON.stringify(phase)).join('\n'));
        runner.writeSuiteFinalEvidence({ context, suite, exitCode, signal: null, processCleanup: { verified: true } });
        const terminal = JSON.parse(fs.readFileSync(context.terminalResultPath, 'utf8'));
        assert.strictEqual(terminal.complete, complete);
        assert.deepStrictEqual(terminal.expectedPhaseIds, expectedPhases);
        assert.deepStrictEqual(
          terminal.observedPhaseIds,
          phaseResults.map((phase) => phase.phaseId)
        );
        assert.strictEqual(terminal.ogfScenarios, undefined, 'Phase controls must not create mapped source/native credit');
      }
    });
  } finally {
    for (const key of environmentKeys) {
      if (priorEnvironment[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = priorEnvironment[key];
      }
    }
    fs.rmSync(root, { recursive: true, force: true }); // Unit-owned temporary command fixture only.
  }
  await runHttpTimeoutComposeDirectControls(control);
  await runHttpTimeoutEnvironmentControls(control);
  await runApprovedAzureConnectorFixtureControls(control);
  console.log(`[http-timeout-compose-control] ${passed} non-GUI controls passed; no native host launched or credited.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

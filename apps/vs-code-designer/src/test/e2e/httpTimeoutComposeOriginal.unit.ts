import * as assert from 'assert';
import './approvedAzureFixture.unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CdpConnection } from './cdpClient';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import { runHttpTimeoutComposeDomControls } from './httpTimeoutComposeDom.unit';
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
import {
  assertHttpTimeoutActionFailed,
  assertHttpTimeoutRequestPersisted,
  selectHttpTimeoutRequestWorkspace,
} from './httpTimeoutRequestOracle';
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
  await control('combined lifecycle executes request execution, validation, then Compose in one ordered test', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const pt1s = source.indexOf('await provePt1sExecution');
    const pt24h = source.indexOf('await provePt24hAndInvalidValidation');
    const compose = source.indexOf('await proveComposeUnsupportedTimeoutOnSameWorkflow');
    assert.ok(pt1s >= 0 && pt1s < pt24h && pt24h < compose);
    assert.strictEqual(
      (source.match(/\btest\('proves HTTP execution, HTTP validation, then Compose unsupported timeout in one session'/g) ?? []).length,
      1
    );
    assert.ok(!source.includes('createComposeWorkflow'));
    assert.ok(!source.includes("executeCommand('azureLogicAppsStandard.createWorkflow'"));
    assert.ok(!source.includes('LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_SCENARIO'));
  });
  await control('all scenarios mutate one physical workflow only after prior evidence passes', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const scenario2Complete = source.indexOf('http-timeout-request-scenario-2-complete-before-reset');
    const deleteHttp = source.indexOf("await activeSession.driver.deleteNode(['HTTP'])", scenario2Complete);
    const deleteRequest = source.indexOf('await activeSession.driver.deleteNode(requestTitles)', deleteHttp);
    const transitionCleared = source.indexOf('http-timeout-transition-cleared', deleteRequest);
    const addRequest = source.indexOf('await activeSession.driver.addRequestTrigger()', transitionCleared);
    const addCompose = source.indexOf("await activeSession.driver.addAction('Compose', 'Compose')", addRequest);
    assert.ok(
      scenario2Complete >= 0 &&
        scenario2Complete < deleteHttp &&
        deleteHttp < deleteRequest &&
        deleteRequest < transitionCleared &&
        transitionCleared < addRequest &&
        addRequest < addCompose
    );
    assert.ok(source.includes('openExactExplorerFileInNativeEditor(workbench, entry.workflowJsonPath, deadline)'));
    assert.ok(source.includes('openDesignerFromExactExplorerFile('));
    assert.ok(!source.includes("uniqueName('httpcomposewf')"));
  });
  await control('HTTP request evidence checkpoints are unique, ordered, and use the proven semantic screenshot binding', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const scenario1 = [
      'http-timeout-request-pt1s-designer-ready',
      'http-timeout-request-pt1s-request-inserted',
      'http-timeout-request-pt1s-http-panel-ready',
      'http-timeout-request-pt1s-method-selected',
      'http-timeout-request-pt1s-settings-configured',
      'http-timeout-request-pt1s-saved',
    ];
    const scenario2 = [
      'http-timeout-request-pt24h-designer-reopened',
      'http-timeout-request-pt24h-settings-configured',
      'http-timeout-request-pt24h-saved',
      'http-timeout-request-invalid-designer-reopened',
      'http-timeout-request-invalid-duration',
      'http-timeout-request-valid-state-restored',
    ];
    for (const labels of [scenario1, scenario2]) {
      let previous = -1;
      for (const label of labels) {
        const index = source.indexOf(label);
        assert.ok(index > previous, `Expected ordered HTTP evidence checkpoint ${label}`);
        assert.strictEqual(source.indexOf(label, index + 1), -1, `HTTP evidence checkpoint ${label} must not overwrite itself`);
        previous = index;
      }
    }
    assert.strictEqual(new Set([...scenario1, ...scenario2]).size, scenario1.length + scenario2.length);
    assert.ok(source.includes('await captureEvidenceScreenshot(name, expectation, {'));
    assert.ok(source.includes('semanticCdp: session.cdp'));
    assert.ok(source.includes('semanticContextId: session.contextId'));
    assert.ok(source.includes("binding: { activeTabText: [entry.wfName, 'Workspace'], semanticText }"));
  });
  await control('failing HTTP evidence expectations use the shared local screenshot cap instead of the family deadline', () => {
    const lifecycle = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const screenshot = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/screenshot.ts'), 'utf8');
    assert.ok(lifecycle.includes('defaultEvidenceScreenshotTimeoutMs'));
    assert.ok(lifecycle.includes('deadlineMs: Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs)'));
    const helperStart = lifecycle.indexOf('async function captureHttpDesignerEvidence');
    const helperEnd = lifecycle.indexOf('async function captureHttpDesignerFailure', helperStart);
    const helper = lifecycle.slice(helperStart, helperEnd);
    assert.ok(!helper.includes('deadlineMs: deadline'));
    assert.ok(screenshot.includes('export const defaultEvidenceScreenshotTimeoutMs = 15_000;'));
    assert.ok(screenshot.includes("classification === 'diagnostic' ? 5000 : defaultEvidenceScreenshotTimeoutMs"));
    const now = Date.now();
    assert.strictEqual(Math.min(now + 1_680_000, now + 15_000), now + 15_000);
  });
  await control('HTTP screenshot expectations are satisfiable at their exact production lifecycle checkpoints', () => {
    const lifecycle = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const readiness = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/screenshotReadiness.ts'), 'utf8');
    const networking = fs.readFileSync(
      path.resolve(__dirname, '../../../../../libs/designer-v2/src/lib/ui/settings/sections/networking.tsx'),
      'utf8'
    );
    const validation = fs.readFileSync(
      path.resolve(__dirname, '../../../../../libs/designer-v2/src/lib/ui/settings/validation/validation.ts'),
      'utf8'
    );
    const errorBar = fs.readFileSync(
      path.resolve(__dirname, '../../../../../libs/designer-v2/src/lib/ui/settings/validation/errorbar.tsx'),
      'utf8'
    );
    assert.ok(
      readiness.includes(
        'ready = !!designerCanvas && hasRequiredText(visibleText(designerCanvas), expectation.requiredNodes || []) && concreteNodeState.ok'
      ),
      'Designer-ready evidence must permit an empty required-node list while requiring the real canvas'
    );
    assert.ok(networking.includes("defaultMessage: 'Request options - Timeout'") && networking.includes('ariaLabel: requestOptionsTitle'));
    assert.ok(validation.includes("defaultMessage: 'Timeout value is invalid, must match ISO 8601 duration format'"));
    assert.ok(errorBar.includes("const role = type === 'error' || type === 'warning' ? 'alert' : undefined;"));
    assert.ok(readiness.includes('\'[role="alert"], [aria-live], .ms-MessageBar, [class*="error"], [class*="Error"]\''));
    const configured = lifecycle.indexOf('http-timeout-request-pt1s-settings-configured');
    const addHttp = lifecycle.indexOf("await driver.addAction('HTTP', 'HTTP', ['http']);");
    const selectGet = lifecycle.indexOf('await driver.selectHttpMethodGet();', addHttp);
    const methodEvidence = lifecycle.indexOf('http-timeout-request-pt1s-method-selected', selectGet);
    const enterUri = lifecycle.indexOf("await driver.fillParameter(['URI'], endpoint);", methodEvidence);
    const configureSettings = lifecycle.indexOf('await driver.configureHttpRequestSettings(timeout);', enterUri);
    const closePanel = lifecycle.indexOf('await driver.closePanel();', configured);
    const saved = lifecycle.indexOf('http-timeout-request-pt1s-saved', closePanel);
    const persisted = lifecycle.lastIndexOf('assertHttpTimeoutRequestPersisted(persisted, timeout, endpoint);', saved);
    assert.ok(
      addHttp >= 0 &&
        addHttp < selectGet &&
        selectGet < methodEvidence &&
        methodEvidence < enterUri &&
        enterUri < configureSettings &&
        configureSettings < configured &&
        configured < closePanel &&
        closePanel < persisted &&
        persisted < saved
    );
    assert.strictEqual(
      (lifecycle.match(/await driver\.selectHttpMethodGet\(\);/g) ?? []).length,
      1,
      'Scenario 1 must explicitly select GET exactly once instead of relying on an implicit HTTP method'
    );
    assert.ok(
      lifecycle.includes("fields: [{ labels: ['Method'], value: 'GET' }]"),
      'Pre-save evidence must expose the selected Method GET value'
    );
    const invalidConfigured = lifecycle.indexOf("await activeSession.driver.configureHttpRequestSettings('InvalidString')");
    const invalidEvidence = lifecycle.indexOf('http-timeout-request-invalid-duration', invalidConfigured);
    const restoration = lifecycle.indexOf('http-timeout-request-valid-state-restored', invalidEvidence);
    assert.ok(invalidConfigured >= 0 && invalidConfigured < invalidEvidence && invalidEvidence < restoration);
  });
  await control('Designer acquisition and later failures capture before optional disposal and tab cleanup', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    const pt1sStart = source.indexOf('async function provePt1sExecution');
    const scenario2Start = source.indexOf('async function provePt24hAndInvalidValidation');
    const authorStart = source.indexOf('async function authorHttpRequest');
    const pt1s = source.slice(pt1sStart, scenario2Start);
    const scenario2 = source.slice(scenario2Start, authorStart);
    for (const [body, failureCall] of [
      [pt1s, "captureHttpDesignerFailure('pt1s-designer-lifecycle'"],
      [scenario2, "captureHttpDesignerFailure('pt24h-designer-lifecycle'"],
      [scenario2, "captureHttpDesignerFailure('invalid-duration-designer-lifecycle'"],
    ] as const) {
      const capture = body.indexOf(failureCall);
      const dispose = body.indexOf('session?.dispose()', capture);
      const closeTabs = body.indexOf('await closeAllTabs()', dispose);
      assert.ok(capture >= 0 && capture < dispose && dispose < closeTabs, `${failureCall} must precede Designer cleanup`);
    }
    assert.ok(pt1s.indexOf('const activeSession = await openDesigner') > pt1s.indexOf('try {'));
    assert.ok(scenario2.indexOf('const activeSession = await openDesigner') > scenario2.indexOf('try {'));
    assert.ok(source.includes('let session: DesignerSession | undefined;'));
    assert.ok(source.includes('captureDiagnosticScreenshot(`http-timeout-request-${stage}-before-cleanup-${Date.now()}`'));
  });
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
  await control('HTTP request oracles require exact timeout, async option, URI, and failed action identity', () => {
    const uri = 'http://127.0.0.1:12345/longresponse';
    const workflow = {
      kind: 'Stateless',
      definition: {
        triggers: { Request: { type: 'Request', kind: 'Http' } },
        actions: {
          HTTP: {
            type: 'Http',
            inputs: { method: 'GET', uri },
            runAfter: {},
            operationOptions: 'DisableAsyncPattern',
            runtimeConfiguration: { requestOptions: { timeout: 'PT1S' } },
          },
        },
      },
    };
    assertHttpTimeoutRequestPersisted(workflow, 'PT1S', uri);
    assertHttpTimeoutActionFailed(
      { value: [{ name: 'HTTP', properties: { status: 'Failed', error: { code: 'ActionTimedOut', message: 'Request timed out' } } }] },
      'run-1'
    );
    assert.throws(() => assertHttpTimeoutRequestPersisted(workflow, 'PT24H', uri));
    assert.throws(() =>
      assertHttpTimeoutActionFailed(
        { value: [{ name: 'HTTP', properties: { status: 'Failed', error: { code: 'ConnectionFailure', message: 'refused' } } }] },
        'run-2'
      )
    );
  });
  await control('HTTP request fixture selector rejects shared or mislabeled workspaces', () => {
    const workspaceDir = path.resolve(os.tmpdir(), 'http-timeout-request-execution');
    const entry = {
      label: 'http-timeout-request-execution',
      appType: 'standard',
      wsName: 'workspace',
      appName: 'app',
      wfName: 'workflow',
      workspaceDir,
      workspaceFilePath: path.join(workspaceDir, 'workspace.code-workspace'),
      appDir: path.join(workspaceDir, 'app'),
      workflowJsonPath: path.join(workspaceDir, 'app', 'workflow', 'workflow.json'),
      folderPaths: [path.join(workspaceDir, 'app')],
    };
    assert.deepStrictEqual(selectHttpTimeoutRequestWorkspace([entry], entry.label), entry);
    assert.throws(() => selectHttpTimeoutRequestWorkspace([entry, entry], entry.label));
    assert.throws(() => selectHttpTimeoutRequestWorkspace([{ ...entry, label: 'other' }], entry.label));
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
      /Timed out waiting for late readiness/
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
    const expectedPhases = ['runtimeDependencyBootstrap:bootstrap', 'httpTimeoutLifecycle:create', 'httpTimeoutLifecycle:reopen'];
    await control('combined HTTP family registers exact canonical phases without a legacy standalone label', () => {
      const suite = batch.SUITE_REGISTRY.httpTimeoutLifecycle;
      assert.deepStrictEqual(suite.args, ['--http-timeout-lifecycle']);
      assert.deepStrictEqual(suite.expectedPhases, expectedPhases);
      assert.deepStrictEqual(runner.getDirectExpectedPhaseIds('httpTimeoutLifecycle'), expectedPhases);
      for (const platform of ['linux', 'win32']) {
        assert.strictEqual(batch.normalizeSuiteSelection('httpTimeoutLifecycle', { platform })[0], suite);
      }
      for (const alias of ['linux', 'windows']) {
        assert.ok(!batch.normalizeSuiteSelection(alias).some((entry: { id: string }) => entry.id === suite.id));
      }
      const vscodeTestSource = fs.readFileSync(path.resolve(__dirname, '../../../.vscode-test.mjs'), 'utf8');
      assert.ok(vscodeTestSource.includes('const httpTimeoutRequestMode = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE;'));
      assert.ok(
        vscodeTestSource.includes("(httpTimeoutRequestMode === 'create' || httpTimeoutRequestMode === 'run')"),
        'Canonical HTTP test registration must require an exact valid lifecycle mode'
      );
      assert.ok(vscodeTestSource.includes("label: 'httpTimeoutLifecycle'"));
      assert.ok(vscodeTestSource.includes("files: ['out/test/e2e/httpTimeoutComposeOriginal.test.js']"));
      assert.ok(!vscodeTestSource.includes("label: 'httpTimeoutComposeOriginal'"));
      assert.ok(!vscodeTestSource.includes('LA_E2E_CLI_INCLUDE_HTTP_TIMEOUT_COMPOSE_ORIGINAL'));
    });
    await control('all public HTTP timeout flags dispatch through the canonical lifecycle runner', () => {
      const runnerSource = fs.readFileSync(path.resolve(__dirname, '../../../scripts/run-e2e-cli.js'), 'utf8');
      const selectorStart = runnerSource.indexOf('const httpTimeoutSelector = [');
      const selectorEnd = runnerSource.indexOf('].find((selector) => process.argv.includes(selector));', selectorStart);
      assert.ok(selectorStart >= 0 && selectorStart < selectorEnd);
      const selectorSource = runnerSource.slice(selectorStart, selectorEnd);
      for (const flag of [
        '--http-timeout-lifecycle',
        '--http-timeout-request-execution',
        '--http-timeout-request-validation',
        '--http-timeout-compose-original',
      ]) {
        assert.ok(selectorSource.includes(`'${flag}'`), `${flag} must remain a canonical lifecycle alias`);
      }
      assert.ok(
        runnerSource.includes(
          "requiresDirectFamilyWrapper(process.env) ? runDirectFamily('httpTimeoutLifecycle') : runHttpTimeoutLifecycle()"
        )
      );
      assert.ok(!runnerSource.includes('runHttpTimeoutComposeOriginal'), 'No public flag may dispatch through a legacy standalone runner');
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
      assert.strictEqual(runner.getDirectSuiteComplete('httpTimeoutLifecycle', phases), true);
      for (const invalid of [
        phases.slice(1),
        [...phases, phases[0]],
        [phases[1], phases[0], phases[2]],
        [{ ...phases[0], phaseId: 'wrong:bootstrap' }, ...phases.slice(1)],
        [phases[0], phases[1], { ...phases[2], complete: false }],
        [phases[0], phases[1], { ...phases[2], exitCode: 1 }],
      ]) {
        assert.strictEqual(runner.getDirectSuiteComplete('httpTimeoutLifecycle', invalid), false);
      }
    });
    await control('batch terminal requires exact completed family phases and ordinary wrapper success', () => {
      const suite = batch.SUITE_REGISTRY.httpTimeoutLifecycle;
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
  await runHttpTimeoutEnvironmentControls(control);
  await runApprovedAzureConnectorFixtureControls(control);
  console.log(`[http-timeout-compose-control] ${passed} non-GUI controls passed; no native host launched or credited.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CdpConnection } from './cdpClient';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
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

function driverFixture(pages: HttpTimeoutComposeRenderedPage[], deadline = Date.now() + 5000) {
  let index = 0;
  const sent: Array<{ method: string; params: Record<string, unknown> }> = [];
  const cdp = {
    async evaluate<T>(_contextId: number, expression: string): Promise<T> {
      return (expression.includes('const editors =') ? pages[index] : { x: 10, y: 10 }) as T;
    },
    async send(method: string, params: Record<string, unknown>) {
      sent.push({ method, params });
      if (method === 'Input.dispatchKeyEvent' && params.type === 'keyDown') {
        if (params.code === 'End') {
          index = pages.length - 1;
        } else if (params.code === 'Home') {
          index = 0;
        } else if (params.code === 'PageDown') {
          index = Math.min(index + 1, pages.length - 1);
        }
      }
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
  await control('incomplete Monaco virtualization fails without fixture fallback', () => {
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
  await control('suite driver reads all supplied pages through key dispatch', async () => {
    const { driver, sent } = driverFixture(pages);
    assert.strictEqual(await driver.readCode(), text);
    assert.ok(sent.some((entry) => entry.params.code === 'PageDown'));
    assert.ok(!sent.some((entry) => entry.method === 'Input.insertText'));
  });
  await control('suite driver rejects missing virtualized line', async () => {
    const { driver } = driverFixture(pages.map((page) => ({ ...page, lines: page.lines.filter((line) => line.number !== 8) })));
    await assert.rejects(() => driver.readCode(), /missing line 8/);
  });
  await control('replacement uses key dispatch and insertText only', async () => {
    const { driver, sent } = driverFixture(pages);
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
    const { driver } = driverFixture(pages);
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
    await control('registered runner creates Stateless then fresh-reopens exact workspace', async () => {
      const labels: string[] = [];
      let cleanup = false;
      const result = await runner.runHttpTimeoutComposeOriginal({
        artifactDir: path.join(root, 'artifacts'),
        createParent: () => root,
        cleanup: async (_root: string, _description: string, strict: boolean) => {
          assert.strictEqual(strict, true);
          cleanup = true;
        },
        run: async (args: string[], options: { extraEnv: Record<string, string> }) => {
          labels.push(args[1]);
          const env = options.extraEnv;
          if (labels.length === 1) {
            assert.strictEqual(env.LA_E2E_CLI_CREATE_WORKSPACE_CASE, 'standard-stateless');
            const entry = makeEntry();
            fs.mkdirSync(entry.wfDir, { recursive: true });
            fs.writeFileSync(entry.wsFilePath, '{}');
            fs.writeFileSync(path.join(entry.wfDir, 'workflow.json'), '{}');
            fs.writeFileSync(env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST, JSON.stringify([entry]));
          } else {
            assert.strictEqual(env.LA_E2E_CLI_STARTUP_RESOURCE, makeEntry().wsFilePath);
            assert.strictEqual(env.LA_E2E_CLI_INCLUDE_HTTP_TIMEOUT_COMPOSE_ORIGINAL, '1');
          }
          return 0;
        },
      });
      assert.strictEqual(result, 0);
      assert.deepStrictEqual(labels, ['createWorkspaceFixturesManifest', 'httpTimeoutComposeOriginal']);
      assert.strictEqual(cleanup, true);
    });
    await control('runner setup, reopen and cleanup failures propagate', async () => {
      for (const failAt of [1, 2, 3]) {
        let calls = 0;
        const failed = new Error(`original phase ${failAt} failure`);
        await assert.rejects(
          () =>
            runner.runHttpTimeoutComposeOriginal({
              artifactDir: path.join(root, 'failures'),
              createParent: () => root,
              cleanup: async () => {
                throw failed;
              },
              run: async (_args: string[], options: { extraEnv: Record<string, string> }) => {
                calls++;
                if (calls === failAt) {
                  throw failed;
                }
                fs.writeFileSync(options.extraEnv.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST, JSON.stringify([makeEntry()]));
                return 0;
              },
            }),
          (error) => error === failed
        );
        assert.strictEqual(calls, Math.min(failAt, 2));
      }
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true }); // Unit-owned temporary command fixture only.
  }
  console.log(`[http-timeout-compose-control] ${passed} non-GUI controls passed; no native host launched or credited.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertApprovedAzureConnectorFixtureSaved,
  assertAzureConnectorAccountTreePrerequisite,
  describeUnsupportedAzurePrompt,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';
import type { CdpEvaluator } from './cdpFormHelpers';
import { handleAffirmativeConnectorWorkbenchPrompt, selectExactWorkbenchPromptOption } from './workbenchPrompts';
import {
  readWorkbenchPrompts,
  workbenchPromptDomScript,
  flagUnexpectedWorkbenchPrompt,
  type DetectedWorkbenchPrompt,
} from './workbenchPrompts';
import { createDiagnosticProducer, diagnosticOperationId } from '../../../scripts/e2e-cli-diagnostics';
import { setScreenshotFileSystemForTests } from './screenshot';
import { boundedCdp } from './workbenchCdpActions';
import { setOperationDiagnosticScope, operationDiagnosticBinding } from './operationDiagnostics';

type Control = (name: string, run: () => void | Promise<void>) => Promise<void>;
const env = {
  LA_E2E_CLI_AZURE_TENANT_ID: '00000000-0000-4000-8000-000000000002',
  LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: '00000000-0000-4000-8000-000000000001',
  LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'unit-owned-token',
  LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: 'unit-existing-group',
  LA_E2E_CLI_AZURE_LOCATION_NAME: 'westus',
  LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL: 'https://management.azure.com/',
};

export async function runApprovedAzureConnectorFixtureControls(control: Control): Promise<void> {
  const owningControl = control;
  control = (name, body) =>
    owningControl(name, async () => {
      // Prompt failure controls never write to a developer's real screenshot root.
      const restore = setScreenshotFileSystemForTests({ mkdirSync: () => undefined, rmSync: () => {}, writeFileSync: () => {} });
      try {
        await body();
      } finally {
        restore();
      }
    });
  await control('approved fixture environment fails missing context and verifies product-persisted settings without injection', () => {
    const target = readApprovedAzureConnectorFixture(env);
    const fixture = { ...target, location: 'eastus', resourceGroupLocationVerified: true };
    for (const key of Object.keys(env)) {
      assert.throws(() => readApprovedAzureConnectorFixture({ ...env, [key]: '' }), /fixture.*missing/i);
    }
    assert.throws(() => readApprovedAzureConnectorFixture({ ...env, LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL: 'http://example.test' }));
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-fixture-unit-'));
    try {
      const settings = {
        Values: {
          WORKFLOWS_TENANT_ID: fixture.tenantId,
          WORKFLOWS_SUBSCRIPTION_ID: fixture.subscriptionId,
          WORKFLOWS_RESOURCE_GROUP_NAME: fixture.resourceGroupName,
          WORKFLOWS_LOCATION_NAME: fixture.location,
          WORKFLOWS_MANAGEMENT_BASE_URI: `${fixture.managementBaseUrl}/`,
        },
      };
      fs.writeFileSync(path.join(root, 'local.settings.json'), JSON.stringify(settings));
      assertApprovedAzureConnectorFixtureSaved(root, fixture);
      assert.throws(() => assertApprovedAzureConnectorFixtureSaved(root, target), /actual location must be verified/);
      assert.throws(() => assertApprovedAzureConnectorFixtureSaved(root, { ...fixture, location: 'westus' }), /Approved Azure fixture/);
      settings.Values.WORKFLOWS_RESOURCE_GROUP_NAME = 'other-group';
      fs.writeFileSync(path.join(root, 'local.settings.json'), JSON.stringify(settings));
      assert.throws(() => assertApprovedAzureConnectorFixtureSaved(root, fixture), /Approved Azure fixture/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  await control('normal HTTP activation requires a real initialized account-tree API before affirmative setup', () => {
    const api = { appResourceTree: { _rootTreeItem: { getSubscriptionPromptStep: () => {} } } };
    assertAzureConnectorAccountTreePrerequisite(api, '0');
    assert.throws(() => assertAzureConnectorAccountTreePrerequisite(api, '1'), /normal activation/);
    assert.throws(() => assertAzureConnectorAccountTreePrerequisite({}, '0'), /account tree is unavailable/);
    assert.throws(() => assertAzureConnectorAccountTreePrerequisite(undefined, '0'), /account tree is unavailable/);
    const family = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
    assert.ok(family.includes('assertAzureConnectorAccountTreePrerequisite'));
    assert.ok(
      family.indexOf('assertAzureConnectorAccountTreePrerequisite(') <
        family.indexOf("executeCommand('azureLogicAppsStandard.openDesigner'")
    );
  });
  await control('existing RG actual ARM location replaces template hint and WIF failures remain blockers', async () => {
    const target = readApprovedAzureConnectorFixture(env);
    const group = {
      id: `/subscriptions/${target.subscriptionId}/resourceGroups/${target.resourceGroupName}`,
      name: target.resourceGroupName,
      location: 'eastus',
    };
    let calls = 0;
    const get = async (url: any, options: any) => {
      calls++;
      assert.strictEqual(
        String(url),
        `https://management.azure.com/subscriptions/${target.subscriptionId}/resourceGroups/unit-existing-group?api-version=2022-09-01`
      );
      assert.strictEqual(options.method, 'GET');
      return { ok: true, json: async () => group };
    };
    const observed = await readApprovedExistingResourceGroup(target, Date.now() + 1000, 'unit-owned-token', get as typeof fetch);
    assert.strictEqual(target.location, 'westus');
    assert.strictEqual(observed.location, 'eastus', 'Do not hardcode or trust template westus over the actual RG');
    assert.strictEqual(observed.resourceGroupLocationVerified, true);
    await assert.rejects(() => readApprovedExistingResourceGroup(target, Date.now() + 1000, '', get as typeof fetch), /token missing/);
    assert.strictEqual(calls, 1);
    await assert.rejects(
      () =>
        readApprovedExistingResourceGroup(target, Date.now() + 1000, 'unit-owned-token', (async () => ({
          ok: false,
          status: 403,
        })) as unknown as typeof fetch),
      /HTTP 403/
    );
    await assert.rejects(
      () =>
        readApprovedExistingResourceGroup(target, Date.now() + 1000, 'unit-owned-token', (async () => ({
          ok: true,
          json: async () => ({ ...group, id: '/subscriptions/foreign/resourceGroups/other' }),
        })) as unknown as typeof fetch),
      /another existing resource group/
    );
    let transientCalls = 0;
    const transient = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    const recovered = await readApprovedExistingResourceGroup(
      target,
      Date.now() + 1000,
      'unit-owned-token',
      (async () => {
        transientCalls++;
        if (transientCalls === 1) {
          throw transient;
        }
        return { ok: true, status: 200, json: async () => group };
      }) as unknown as typeof fetch,
      undefined,
      { sleep: async () => {} }
    );
    assert.strictEqual(recovered.resourceGroupLocationVerified, true);
    assert.strictEqual(transientCalls, 2);
    let timeoutCalls = 0;
    const timeoutRecovered = await readApprovedExistingResourceGroup(
      target,
      Date.now() + 1000,
      'unit-owned-token',
      ((_url: unknown, options: { signal: AbortSignal }) => {
        timeoutCalls++;
        if (timeoutCalls > 1) {
          return Promise.resolve({ ok: true, status: 200, json: async () => group });
        }
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        });
      }) as unknown as typeof fetch,
      undefined,
      { attemptTimeoutMs: 5, sleep: async () => {} }
    );
    assert.strictEqual(timeoutRecovered.resourceGroupLocationVerified, true);
    assert.strictEqual(timeoutCalls, 2);
    let aggregateCalls = 0;
    const aggregateRecovered = await readApprovedExistingResourceGroup(
      target,
      Date.now() + 1000,
      'unit-owned-token',
      (async () => {
        aggregateCalls++;
        if (aggregateCalls === 1) {
          throw new Error('request wrapper', {
            cause: new AggregateError([Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })]),
          });
        }
        return { ok: true, status: 200, json: async () => group };
      }) as unknown as typeof fetch,
      undefined,
      { sleep: async () => {} }
    );
    assert.strictEqual(aggregateRecovered.resourceGroupLocationVerified, true);
    assert.strictEqual(aggregateCalls, 2);
    let forbiddenCalls = 0;
    await assert.rejects(
      () =>
        readApprovedExistingResourceGroup(
          target,
          Date.now() + 1000,
          'unit-owned-token',
          (async () => {
            forbiddenCalls++;
            return { ok: false, status: 403 };
          }) as unknown as typeof fetch,
          undefined,
          { sleep: async () => {} }
        ),
      /HTTP 403/
    );
    assert.strictEqual(forbiddenCalls, 1);
    const parent = new AbortController();
    let requestAborted = false;
    const pending = readApprovedExistingResourceGroup(
      target,
      Date.now() + 1000,
      'unit-owned-token',
      ((_url: unknown, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          const abort = () => {
            requestAborted = true;
            reject(options.signal.reason);
          };
          options.signal.addEventListener('abort', abort, { once: true });
          if (options.signal.aborted) {
            abort();
          }
        })) as typeof fetch,
      parent.signal
    );
    parent.abort(new Error('resource-group lookup cancelled'));
    await assert.rejects(pending, /resource-group lookup cancelled/);
    assert.strictEqual(requestAborted, true);

    const bodyParent = new AbortController();
    let bodyAborted = false;
    let markBodyStarted!: () => void;
    const bodyStarted = new Promise<void>((resolve) => {
      markBodyStarted = resolve;
    });
    const bodyPending = readApprovedExistingResourceGroup(
      target,
      Date.now() + 1000,
      'unit-owned-token',
      ((_url: unknown, options: { signal: AbortSignal }) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_resolve, reject) => {
              markBodyStarted();
              const abort = () => {
                bodyAborted = true;
                reject(options.signal.reason);
              };
              options.signal.addEventListener('abort', abort, { once: true });
              if (options.signal.aborted) {
                abort();
              }
            }),
        })) as typeof fetch,
      bodyParent.signal
    );
    await bodyStarted;
    bodyParent.abort(new Error('resource-group response body cancelled'));
    await assert.rejects(bodyPending, /resource-group response body cancelled/);
    assert.strictEqual(bodyAborted, true);
  });
  await control('approved subscription identity lookup is exact read-only ARM GET and has no ambient auth fallback', async () => {
    const fixture = { ...readApprovedAzureConnectorFixture(env), location: 'eastus', resourceGroupLocationVerified: true };
    let calls = 0;
    const get = async (url: any, options: any) => {
      calls++;
      assert.strictEqual(String(url), `https://management.azure.com/subscriptions/${fixture.subscriptionId}?api-version=2022-12-01`);
      assert.strictEqual(options.method, 'GET');
      assert.strictEqual(options.headers.Authorization, 'Bearer unit-owned-token');
      return {
        ok: true,
        json: async () => ({
          subscriptionId: fixture.subscriptionId,
          tenantId: fixture.tenantId,
          displayName: 'Unit Approved Subscription',
        }),
      };
    };
    assert.strictEqual(
      await readApprovedAzureSubscriptionName(fixture, Date.now() + 1000, 'unit-owned-token', get as typeof fetch),
      'Unit Approved Subscription'
    );
    await assert.rejects(() => readApprovedAzureSubscriptionName(fixture, Date.now() + 1000, '', get as typeof fetch), /token missing/);
    assert.strictEqual(calls, 1);
    await assert.rejects(
      () =>
        readApprovedAzureSubscriptionName(fixture, Date.now() + 1000, 'unit-owned-token', (async () => ({
          ok: true,
          json: async () => ({ subscriptionId: 'other', tenantId: fixture.tenantId, displayName: 'Wrong' }),
        })) as unknown as typeof fetch),
      /another subscription/
    );
    let retryableCalls = 0;
    assert.strictEqual(
      await readApprovedAzureSubscriptionName(
        fixture,
        Date.now() + 1000,
        'unit-owned-token',
        (async () => {
          retryableCalls++;
          if (retryableCalls === 1) {
            return { ok: false, status: 503 };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              subscriptionId: fixture.subscriptionId,
              tenantId: fixture.tenantId,
              displayName: 'Unit Approved Subscription',
            }),
          };
        }) as unknown as typeof fetch,
        undefined,
        { sleep: async () => {} }
      ),
      'Unit Approved Subscription'
    );
    assert.strictEqual(retryableCalls, 2);
    let malformedCalls = 0;
    await assert.rejects(() =>
      readApprovedAzureSubscriptionName(
        fixture,
        Date.now() + 1000,
        'unit-owned-token',
        (async () => {
          malformedCalls++;
          return {
            ok: true,
            status: 200,
            json: async () => {
              throw new SyntaxError('invalid JSON');
            },
          };
        }) as unknown as typeof fetch,
        undefined,
        { sleep: async () => {} }
      )
    );
    assert.strictEqual(malformedCalls, 1);
    const abort = new AbortController();
    const pending = readApprovedAzureSubscriptionName(
      fixture,
      Date.now() + 1000,
      'unit-owned-token',
      (async (_url: unknown, options: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        })) as unknown as typeof fetch,
      abort.signal
    );
    abort.abort(new Error('unit subscription lookup cancelled'));
    await assert.rejects(() => pending, /unit subscription lookup cancelled/);
  });
  for (const fault of [
    'none',
    'missing-group',
    'duplicate-group',
    'disabled-group',
    'wrong-subscription',
    'auth-prompt',
    'creation-prompt',
    'external-focus',
    'hidden-visibility',
    'readonly-connector-input',
    'readonly-target-input',
    'delayed-connector-row',
    'delayed-subscription-rows',
    'delayed-resource-group-rows',
    'transient-resource-group-gap',
    'loading-after-affirmative',
    'virtualized-resource-group',
  ]) {
    await control(`approved native fixture journey DOM ${fault} never creates or selects a foreign target`, async () => {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM('<html><body></body></html>', { pretendToBeVisual: true, runScripts: 'outside-only' });
      const window = dom.window;
      const fixture = { ...readApprovedAzureConnectorFixture(env), location: 'eastus', resourceGroupLocationVerified: true };
      const clicked: string[] = [];
      const observations: string[] = [];
      const trace = createDiagnosticProducer({ sink: (line) => observations.push(line) });
      let stage = 0;
      let loadingReads = 0;
      let resourceGroupGapReads = 0;
      let filterText = '';
      const stageReads = new Map<number, number>();
      const render = () => {
        const titles = [
          'Enable connectors in Azure for Logic App unitApp',
          'Select subscription',
          'Select a resource group for new resources.',
        ];
        const loadingAfterAffirmative = fault === 'loading-after-affirmative' && stage === 1 && loadingReads === 0;
        const delayedRows =
          ((fault === 'delayed-connector-row' && stage === 0) ||
            (fault === 'delayed-subscription-rows' && stage === 1) ||
            (fault === 'delayed-resource-group-rows' && stage === 2)) &&
          (stageReads.get(stage) ?? 0) === 0;
        const title = loadingAfterAffirmative
          ? 'Loading...'
          : stage === 2 && fault === 'auth-prompt'
            ? 'Sign in to Azure'
            : stage === 2 && fault === 'creation-prompt'
              ? 'Enter the name of the new resource group'
              : titles[stage];
        const rows =
          loadingAfterAffirmative || delayedRows
            ? []
            : stage === 0
              ? ['Skip for now', 'Use connectors from Azure']
              : stage === 1
                ? [fault === 'wrong-subscription' ? 'Other Subscription' : 'Unit Approved Subscription']
                : fault === 'virtualized-resource-group' && !filterText
                  ? [
                      '$(plus) Create new resource group',
                      ...Array.from({ length: 30 }, (_, index) => `foreign-group-${index}`),
                      fixture.resourceGroupName,
                    ]
                  : [
                      '$(plus) Create new resource group',
                      fault === 'missing-group' ? 'other-group' : fixture.resourceGroupName,
                      ...(fault === 'duplicate-group' ? [fixture.resourceGroupName] : []),
                    ];
        window.document.body.innerHTML =
          stage > 2 || (fault === 'transient-resource-group-gap' && stage === 2 && resourceGroupGapReads === 0)
            ? '<div class="react-flow">Ready</div>'
            : `<div class="quick-input-widget"><input placeholder="${title}" value="${filterText}" ${
                (stage === 0 && fault === 'readonly-connector-input') || (stage > 0 && fault === 'readonly-target-input') ? 'readonly' : ''
              }><div class="monaco-list" role="listbox">${rows
                .map(
                  (text, index) =>
                    `<div class="monaco-list-row" role="option" data-unit-row="${index}" ${stage === 2 && fault === 'disabled-group' && index === 1 ? 'aria-disabled="true"' : ''}>
              <span class="label-name">${text}</span></div>`
                )
                .join('')}</div></div>`;
        if (fault === 'external-focus') {
          window.document.body.focus();
        } else {
          window.document.querySelector('input')?.focus();
        }
        if (fault === 'hidden-visibility') {
          Object.defineProperty(window.document, 'visibilityState', { configurable: true, value: 'hidden' });
        }
      };
      render();
      const geometry = (element: any) => {
        const index = Number(element.closest('.monaco-list-row')?.getAttribute('data-unit-row') ?? 0);
        const top = element.matches('.monaco-list-row') ? 40 + index * 30 : 0;
        return { left: 0, top, right: 600, bottom: top + (element.matches('.monaco-list-row') ? 25 : 180), width: 600, height: 25 };
      };
      window.HTMLElement.prototype.getBoundingClientRect = function () {
        return geometry(this);
      };
      window.HTMLElement.prototype.getClientRects = function () {
        return [geometry(this)];
      };
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.document.hasFocus = () => true;
      window.document.elementFromPoint = (_x: number, y: number) =>
        y < 40 ? window.document.querySelector('input') : window.document.querySelector(`[data-unit-row="${Math.round((y - 52.5) / 30)}"]`);
      const cdp: CdpEvaluator = {
        async evaluate<T>(_context: number | undefined, expression: string) {
          const result = window.eval(expression) as T;
          if (fault === 'loading-after-affirmative' && stage === 1 && loadingReads === 0) {
            loadingReads++;
            render();
          }
          if (
            ((fault === 'delayed-connector-row' && stage === 0) ||
              (fault === 'delayed-subscription-rows' && stage === 1) ||
              (fault === 'delayed-resource-group-rows' && stage === 2)) &&
            (stageReads.get(stage) ?? 0) === 0
          ) {
            stageReads.set(stage, 1);
            render();
          }
          if (fault === 'transient-resource-group-gap' && stage === 2 && resourceGroupGapReads === 0) {
            resourceGroupGapReads++;
            render();
          }
          return result;
        },
        async send(method, params) {
          if (method === 'Input.insertText') {
            filterText = String(params?.text ?? '');
            render();
          }
          if (params?.type === 'mouseReleased') {
            const row = window.document.elementFromPoint(Number(params.x), Number(params.y));
            if (!row?.matches('.monaco-list-row')) {
              return {};
            }
            const text = row.textContent.trim();
            clicked.push(text);
            assert.ok(!/skip|cancel|create new|other|sign in/i.test(text), 'Never click a negative, creation or foreign target action');
            stage++;
            render();
          }
          return {};
        },
      };
      try {
        const deadline = Date.now() + 2000;
        const journey = () =>
          handleAffirmativeConnectorWorkbenchPrompt(cdp, 'unitApp', deadline, (prompt) =>
            selectApprovedAzureConnectorFixturePrompt(
              cdp,
              prompt,
              fixture,
              deadline,
              async () => 'Unit Approved Subscription',
              undefined,
              trace
            )
          );
        if (
          fault === 'none' ||
          fault === 'external-focus' ||
          fault === 'hidden-visibility' ||
          fault === 'readonly-connector-input' ||
          fault === 'readonly-target-input' ||
          fault === 'delayed-connector-row' ||
          fault === 'delayed-subscription-rows' ||
          fault === 'delayed-resource-group-rows' ||
          fault === 'transient-resource-group-gap' ||
          fault === 'loading-after-affirmative' ||
          fault === 'virtualized-resource-group'
        ) {
          assert.strictEqual(await journey(), true);
          assert.deepStrictEqual(clicked, ['Use connectors from Azure', 'Unit Approved Subscription', 'unit-existing-group']);
          const records = observations.map((line) => JSON.parse(line));
          assert.ok(records.some((record) => record.state?.candidates?.items?.some((item: any) => item.subscriptionNameMatch)));
          assert.ok(records.some((record) => record.state?.candidates?.items?.some((item: any) => item.resourceGroupMatch)));
          assert.ok(records.some((record) => record.state?.title?.knownTitleCode === 1));
          assert.ok(records.some((record) => record.state?.title?.knownTitleCode === 7));
          assert.doesNotMatch(observations.join(''), /Unit Approved Subscription|unit-existing-group/);
        } else {
          await assert.rejects(journey);
          assert.ok(!clicked.includes(fixture.resourceGroupName), 'Blocked setup cannot be credited as selected fixture');
        }
      } finally {
        window.close();
      }
    });
  }
  await control('unsupported Azure prompt diagnostics preserve actions but hash target identities', () => {
    const diagnostic = describeUnsupportedAzurePrompt({
      kind: 'quickInput',
      title: 'Sign in to Azure',
      text: 'Sign in to Azure',
      interactive: true,
      buttons: [],
      rows: [
        { text: 'Sign in', label: 'Sign in', point: { x: 1, y: 1 } },
        { text: 'Unit Approved Subscription', label: 'Unit Approved Subscription', point: { x: 1, y: 2 } },
      ],
    });
    assert.match(diagnostic, /Sign in to Azure/);
    assert.match(diagnostic, /"label":"Sign in"/);
    assert.doesNotMatch(diagnostic, /Unit Approved Subscription/);
    assert.match(diagnostic, /<target:[0-9a-f]{12}>/);
  });
  await control('exact debug prompt selection waits for a hit-testable option and honors cancellation', async () => {
    let reads = 0;
    let selected = false;
    let nativeInput = 0;
    const prompt = {
      kind: 'notification' as const,
      title: 'Configure Azurite to autostart on project debug?',
      text: 'Configure Azurite to autostart on project debug? Enable AutoStart',
      interactive: true,
      inputPoint: undefined,
      buttons: [{ text: 'Enable AutoStart', point: undefined }],
      rows: [],
    };
    const cdp = {
      async evaluate() {
        reads++;
        if (selected) {
          return [];
        }
        return [{ ...prompt, buttons: [{ ...prompt.buttons[0], point: { x: 10, y: 10 } }] }];
      },
      async send(method, params) {
        if (method === 'Input.dispatchMouseEvent') {
          nativeInput++;
          if (params?.type === 'mouseReleased') {
            selected = true;
          }
        }
        return {};
      },
    } as CdpEvaluator;
    assert.strictEqual(
      await handleAffirmativeConnectorWorkbenchPrompt(
        cdp,
        'unitApp',
        Date.now() + 2000,
        (current) =>
          selectExactWorkbenchPromptOption(cdp, current, { matchText: prompt.title, optionText: 'Enable AutoStart' }, Date.now() + 2000),
        undefined,
        (current) => current.kind === 'notification' && current.text.includes(prompt.title)
      ),
      true
    );
    assert.ok(reads >= 2 && selected && nativeInput >= 2);

    const aborted = new AbortController();
    aborted.abort(new Error('unit prompt cancelled'));
    nativeInput = 0;
    await assert.rejects(
      () =>
        selectExactWorkbenchPromptOption(
          cdp,
          prompt,
          { matchText: prompt.title, optionText: 'Enable AutoStart' },
          Date.now() + 1000,
          aborted.signal
        ),
      /unit prompt cancelled/
    );
    assert.strictEqual(nativeInput, 0);
  });
  await control('unsupported Azure prompt diagnostics redact dynamic action and account titles', () => {
    const diagnostic = describeUnsupportedAzurePrompt({
      kind: 'quickInput',
      title: 'Sign in to Azure as unit@example.test',
      text: 'Sign in to Azure as unit@example.test',
      interactive: true,
      buttons: [],
      rows: [{ text: 'Create production-secret-subscription', label: 'Create production-secret-subscription', point: { x: 1, y: 1 } }],
    });
    assert.doesNotMatch(diagnostic, /unit@example\.test|production-secret-subscription/);
    assert.match(diagnostic, /"category":"authentication"/);
    assert.match(diagnostic, /<prompt:[0-9a-f]{12}>/);
    assert.match(diagnostic, /<target:[0-9a-f]{12}>/);
  });
  await control('unsupported Azure prompts retain safe diagnostic evidence', async () => {
    const fixture = { ...readApprovedAzureConnectorFixture(env), location: 'eastus', resourceGroupLocationVerified: true };
    const cdp = {
      async evaluate() {
        return [];
      },
      async send() {
        throw new Error('Unsupported prompts must receive no input');
      },
    } as CdpEvaluator;
    for (const prompt of [
      {
        kind: 'dialog' as const,
        title: 'Sign in to Azure as unit@example.test',
        text: 'Sign in to Azure as unit@example.test',
        interactive: true,
        buttons: [],
        rows: [],
      },
      {
        kind: 'quickInput' as const,
        title: 'Enter the name of the new resource group',
        text: 'Enter the name of the new resource group',
        interactive: false,
        buttons: [],
        rows: [],
      },
    ]) {
      const error = await selectApprovedAzureConnectorFixturePrompt(cdp, prompt, fixture, Date.now() + 1000, async () => 'unused').then(
        () => undefined,
        (reason) => reason as Error
      );
      assert.ok(error);
      assert.match(error.message, /unsupported prompt/);
      assert.doesNotMatch(error.message, /unit@example\.test/);
      assert.match(error.message, /"kind":"(dialog|quickInput)"/);
    }
  });
  for (const state of ['active', 'closing', 'inert'] as const) {
    await control(`stock debug picker ${state} retains rows without becoming an Azure setup prompt after acceptance`, async () => {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(
        `<div class="quick-input-widget${state === 'closing' ? ' quick-input-widget-closing' : ''}"${state === 'inert' ? ' inert' : ''}>
          <input placeholder="Select a debug configuration">
          ${Array.from({ length: 9 }, (_, index) => `<div class="monaco-list-row">configuration-${index}</div>`).join('')}
        </div>`,
        { pretendToBeVisual: true, runScripts: 'outside-only' }
      );
      const window = dom.window;
      window.HTMLElement.prototype.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 300,
        width: 200,
        height: 300,
      });
      const widget = window.document.querySelector('.quick-input-widget');
      Object.defineProperty(widget, 'inert', { value: state === 'inert' });
      window.document.elementFromPoint = () => window.document.body;
      let captures = 0;
      const cdp: CdpEvaluator = {
        async evaluate<T>(_context: number | undefined, expression: string) {
          assert.strictEqual(expression, workbenchPromptDomScript);
          return window.eval(expression) as T;
        },
        async send(method) {
          assert.ok(!method.startsWith('Input.'), 'A retained debug picker must never receive Azure input');
          if (method === 'Page.captureScreenshot') {
            captures++;
            return { result: { data: Buffer.from('unit-png').toString('base64') } };
          }
          return {};
        },
      };
      try {
        const prompts = await readWorkbenchPrompts(cdp);
        if (state === 'active') {
          assert.strictEqual(prompts.length, 1, 'Active unknown or covered prompts must remain observable and rejected');
          await assert.rejects(handleAffirmativeConnectorWorkbenchPrompt(cdp, 'unitApp', Date.now() + 1000), /Unrecognized auth/);
          assert.strictEqual(captures, 1);
        } else {
          assert.strictEqual(prompts.length, 0);
          assert.strictEqual(await handleAffirmativeConnectorWorkbenchPrompt(cdp, 'unitApp', Date.now() + 1000), false);
          assert.strictEqual(captures, 0, 'A stock dismissed/inert picker is not unexpected blocking UI');
        }
      } finally {
        window.close();
      }
    });
  }
  for (const transition of [false, true]) {
    await control(`original unknown nine-row non-hit-testable prompt remains blocked; transition=${transition}`, async () => {
      const { JSDOM } = require('jsdom');
      const fixture = { ...readApprovedAzureConnectorFixture(env), resourceGroupLocationVerified: true };
      const secretTitle = 'private fixture prompt for unit@example.test';
      const labels = [
        fixture.resourceGroupName,
        fixture.subscriptionId,
        fixture.location,
        ...Array.from({ length: 6 }, (_, index) => `private-target-${index}`),
      ];
      const dom = new JSDOM(
        `<div class="quick-input-widget" aria-busy="true">
          <div class="quick-input-title">Select a resource group for new resources.</div>
          <input placeholder="${secretTitle}" aria-label="private-account@example.test">
          ${labels.map((label) => `<div class="monaco-list-row"><span class="label-name">${label}</span></div>`).join('')}
        </div>`,
        { pretendToBeVisual: true, runScripts: 'outside-only' }
      );
      const window = dom.window;
      window.HTMLElement.prototype.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 200,
        bottom: 30,
        width: 200,
        height: 30,
      });
      window.document.elementFromPoint = () => window.document.body; // Overlay: every row fails the real hit test.
      let reads = 0;
      let sends = 0;
      const cdp: CdpEvaluator = {
        async evaluate<T>(_context: number | undefined, expression: string) {
          if (expression !== workbenchPromptDomScript) {
            throw new Error('Unit diagnostic readiness unavailable');
          }
          reads++;
          return window.eval(expression) as T;
        },
        async send(method) {
          if (method.startsWith('Input.')) {
            sends++;
            throw new Error('Unsupported or covered prompt must receive no input');
          }
          return method === 'Page.captureScreenshot' ? { result: { data: Buffer.from('unit-png').toString('base64') } } : {};
        },
      };
      const lines: string[] = [];
      const trace = createDiagnosticProducer({ sink: (line) => lines.push(line), maxEvents: 64 });
      try {
        const [unknown] = await readWorkbenchPrompts(cdp);
        assert.strictEqual(unknown.rows.length, 9);
        assert.ok(unknown.rows.every((row) => !row.point));
        const initial = transition
          ? { ...unknown, title: 'Select a resource group for new resources.', promptSources: undefined }
          : unknown;
        const error = await selectApprovedAzureConnectorFixturePrompt(
          cdp,
          initial,
          fixture,
          Date.now() + 2000,
          async () => {
            throw new Error('Unknown prompt must not trigger ARM lookup');
          },
          undefined,
          trace
        ).then(
          () => undefined,
          (reason) => reason as Error
        );
        assert.ok(error);
        assert.match(error.message, transition ? /changed to an unsupported prompt/ : /reached an unsupported prompt/);
        assert.strictEqual(sends, 0);
        assert.strictEqual(reads, transition ? 2 : 1, 'Diagnostics must reuse owning reads, not poll unknown prompts');
        const records = lines.map((line) => JSON.parse(line));
        const summary = records.at(-1);
        assert.strictEqual(summary.firstFailedGate, 'azure-fixture-prompt');
        assert.strictEqual(summary.state.supported, false);
        assert.strictEqual(summary.state.title.knownTitleCode, 0);
        assert.strictEqual(summary.state.promptSources.widgetTitle.knownTitleCode, 7);
        assert.strictEqual(summary.state.promptSources.placeholder.sha256, summary.state.title.sha256);
        assert.strictEqual(summary.state.promptSources.titleSourcesAgree, false);
        assert.strictEqual(summary.state.promptSources.titleSourceCode, 1);
        assert.strictEqual(summary.state.promptSources.busy, true);
        assert.strictEqual(summary.state.count, 9);
        assert.strictEqual(summary.state.hitTestableCount, 0);
        assert.strictEqual(summary.state.candidates.items[0].resourceGroupMatch, true);
        assert.strictEqual(summary.state.candidates.items[1].subscriptionIdMatch, true);
        assert.strictEqual(summary.state.candidates.items[2].locationMatch, true);
        assert.strictEqual(summary.state.subscriptionNameKnown, false);
        for (const record of records) {
          assert.ok(diagnosticOperationId(record.operation), 'Prompt observations survive existing operation allowlist');
        }
        assert.doesNotMatch(lines.join('') + error.message, /unit@example|private-account|private-target|unit-existing-group|westus/);
        assert.ok(lines.every((line) => Buffer.byteLength(line) <= 8192));
      } finally {
        window.close();
      }
    });
  }
  for (const kind of ['quickInput', 'dialog'] as const) {
    for (const consumer of ['azure', 'shared'] as const) {
      await control(`unexpected ${kind} ${consumer} captures once on its current owner before rejection with no input`, async () => {
        const fixture = unexpectedPromptScreenshotFixture(kind);
        const previousScope = operationDiagnosticBinding();
        const binding = {
          suite: 'workspaceMultiRoot',
          phase: 'regular-workbench-debug-root-1',
          nativeInvocation: 'unit-native-invocation',
        };
        setOperationDiagnosticScope(binding);
        const lines: string[] = [];
        const trace = createDiagnosticProducer({ sink: (line) => lines.push(line), binding });
        try {
          // Expired action wrapper must not consume the fresh diagnostic budget
          // or lose the exact connection's target/generation.
          const cdp = boundedCdp(fixture.cdp, Date.now() - 1);
          const pending =
            consumer === 'azure'
              ? selectApprovedAzureConnectorFixturePrompt(
                  cdp,
                  fixture.prompt,
                  readApprovedAzureConnectorFixture(env),
                  Date.now() - 1,
                  async () => {
                    throw new Error('Unexpected UI must not trigger ARM lookup');
                  },
                  undefined,
                  trace
                )
              : handleAffirmativeConnectorWorkbenchPrompt(fixture.cdp, 'unitApp', Date.now() + 2000);
          const error = await pending.then(
            () => undefined,
            (reason) => reason as Error
          );
          fixture.events.push('rejected');
          assert.ok(error);
          assert.match(error.message, consumer === 'azure' ? /unsupported prompt/ : /Unrecognized auth/);
          assert.doesNotMatch(error.message, /private-account@example/);
          assert.deepStrictEqual(fixture.events, ['capture', 'png-written', 'metadata-written', 'rejected']);
          assert.strictEqual(fixture.captures, 1);
          const metadata = fixture.metadata();
          assert.strictEqual(metadata.classification, 'diagnostic');
          assert.strictEqual(metadata.verdict, 'diagnostic', 'Never an ordered acceptance checkpoint');
          assert.strictEqual(metadata.target.generation, 7);
          assert.strictEqual(metadata.diagnosticContext.phase, binding.phase);
          assert.strictEqual(metadata.diagnosticContext.nativeInvocation, binding.nativeInvocation);
          assert.match(metadata.checkpoint, /^unexpected-ui-/);
          assert.ok(metadata.checkpoint.endsWith(metadata.diagnosticContext.operationId.replace(/:/g, '-')));
          assert.strictEqual(fixture.files.size, 2, 'Exactly the diagnostic PNG and its bound sidecar');
          if (consumer === 'azure') {
            const records = lines.map((line) => JSON.parse(line));
            const flag = records.find((record) => record.operation === 'unexpected-ui-terminal');
            assert.strictEqual(flag.state.screenshotPresent, true);
            assert.strictEqual(flag.state.screenshotMissing, false);
            assert.strictEqual(flag.firstFailedGate, 'unexpected-ui');
            assert.strictEqual(flag.nativeInvocation, binding.nativeInvocation);
          }
          assert.doesNotMatch(lines.join('') + JSON.stringify(metadata), /private-account@example|private title/);
        } finally {
          setOperationDiagnosticScope(previousScope);
          fixture.restore();
        }
      });
    }
  }
  for (const consumer of ['azure', 'affirmative', 'exact'] as const) {
    await control(`nonactionable ${consumer} picker captures once before original deadline rejection`, async () => {
      const fixture = unexpectedPromptScreenshotFixture('quickInput');
      fixture.prompt.title =
        consumer === 'affirmative' ? 'Enable connectors in Azure for Logic App unitApp' : 'Select a resource group for new resources.';
      fixture.prompt.text = fixture.prompt.title;
      fixture.prompt.interactive = false;
      fixture.prompt.rows = [{ text: consumer === 'affirmative' ? 'Use connectors from Azure' : 'unit-existing-group' }];
      try {
        const deadline = Date.now() - 1;
        const pending =
          consumer === 'azure'
            ? selectApprovedAzureConnectorFixturePrompt(
                fixture.cdp,
                fixture.prompt,
                { ...readApprovedAzureConnectorFixture(env), resourceGroupLocationVerified: true },
                deadline,
                async () => {
                  throw new Error('Resource group prompt must not query a subscription');
                }
              )
            : consumer === 'affirmative'
              ? handleAffirmativeConnectorWorkbenchPrompt(fixture.cdp, 'unitApp', Date.now() + 100)
              : selectExactWorkbenchPromptOption(
                  fixture.cdp,
                  fixture.prompt,
                  { matchText: fixture.prompt.title, optionText: 'unit-existing-group' },
                  deadline
                );
        const error = await pending.then(
          () => undefined,
          (reason) => reason as Error
        );
        fixture.events.push('rejected');
        assert.ok(error);
        assert.match(error.message, /deadline/);
        assert.strictEqual(fixture.captures, 1);
        assert.deepStrictEqual(fixture.events, ['capture', 'png-written', 'metadata-written', 'rejected']);
      } finally {
        fixture.restore();
      }
    });
  }
  for (const fault of ['timeout', 'capture-error', 'storage-error', 'missing-data'] as const) {
    await control(`unexpected prompt screenshot ${fault} flags missing and cannot replace the original rejection`, async () => {
      const fixture = unexpectedPromptScreenshotFixture('quickInput', fault);
      const lines: string[] = [];
      const trace = createDiagnosticProducer({ sink: (line) => lines.push(line) });
      const primary = new Error('unit original unexpected prompt');
      try {
        await assert.rejects(
          (async () => {
            await flagUnexpectedWorkbenchPrompt(fixture.cdp, fixture.prompt, primary, trace);
            throw primary;
          })(),
          (error) => error === primary
        );
        assert.strictEqual(fixture.captures, 1, 'No retry, desktop fallback or different-window capture');
        const records = lines.map((line) => JSON.parse(line));
        const terminal = records.at(-1);
        assert.strictEqual(terminal.firstFailedGate, 'unexpected-ui');
        assert.strictEqual(terminal.state.screenshotMissing, true);
        assert.strictEqual(terminal.state.screenshotPresent, false);
        assert.ok(records.some((record) => record.operation === 'unexpected-ui-capture' && record.status === 'failure'));
        if (fault === 'timeout') {
          assert.ok(
            records.some((record) => record.error?.code === 'ETIMEDOUT'),
            'Retain the secondary timeout code separately'
          );
        }
        // Also exercise the actual selector's throw site, not only the capture helper.
        await assert.rejects(
          selectApprovedAzureConnectorFixturePrompt(
            fixture.cdp,
            fixture.prompt,
            readApprovedAzureConnectorFixture(env),
            Date.now() + 1000,
            async () => 'unused',
            undefined,
            trace
          ),
          /Azure setup reached an unsupported prompt/
        );
        assert.strictEqual(fixture.captures, 2, 'Exactly one attempt per independent detection');
        assert.ok(!records.some((record) => record.operation === 'unexpected-ui-capture' && record.status === 'end'));
      } finally {
        fixture.restore();
      }
    });
  }
  await control('Azure prompt diagnostics are bounded and a throwing sink cannot replace the original ARM error', async () => {
    const fixture = { ...readApprovedAzureConnectorFixture(env), resourceGroupLocationVerified: true };
    const failure = new Error('unit-owned ARM failure');
    const trace = createDiagnosticProducer({
      sink: () => {
        throw new Error('secondary diagnostic failure');
      },
    });
    await assert.rejects(
      selectApprovedAzureConnectorFixturePrompt(
        {} as CdpEvaluator,
        { kind: 'quickInput', title: 'Select subscription', text: '', interactive: true, rows: [], buttons: [] },
        fixture,
        Date.now() + 2000,
        async () => {
          throw failure;
        },
        undefined,
        trace
      ),
      (error) => error === failure
    );
    const description = JSON.parse(
      describeUnsupportedAzurePrompt(
        {
          kind: 'quickInput',
          title: 'unknown',
          text: '',
          interactive: true,
          buttons: [],
          rows: Array.from({ length: 100 }, (_, index) => ({ text: `private-label-${index}` })),
        },
        fixture
      )
    );
    assert.strictEqual(description.rows.length, 12);
    assert.strictEqual(description.observation.count, 100);
    assert.strictEqual(description.observation.capped, true);
    assert.doesNotMatch(JSON.stringify(description), /private-label/);
  });
  await control('expired approved-target deadline sends no native input', async () => {
    const fixture = { ...readApprovedAzureConnectorFixture(env), location: 'eastus', resourceGroupLocationVerified: true };
    let inputSent = false;
    const cdp = {
      async evaluate() {
        return [];
      },
      async send(method: string) {
        if (method.startsWith('Input.')) {
          inputSent = true;
        }

        return {};
      },
    } as CdpEvaluator;
    await assert.rejects(
      selectApprovedAzureConnectorFixturePrompt(
        cdp,
        {
          kind: 'quickInput',
          title: 'Select a resource group for new resources.',
          text: 'Select a resource group for new resources.',
          interactive: false,
          buttons: [],
          rows: [{ text: fixture.resourceGroupName, label: fixture.resourceGroupName, point: { x: 10, y: 10 } }],
        },
        fixture,
        Date.now() - 1,
        async () => 'unused'
      ),
      /original deadline/
    );
    assert.strictEqual(inputSent, false);
  });
}

function unexpectedPromptScreenshotFixture(
  kind: 'quickInput' | 'dialog',
  fault?: 'timeout' | 'capture-error' | 'storage-error' | 'missing-data'
) {
  const events: string[] = [];
  const files = new Map<string, string | Buffer>();
  const prompt: DetectedWorkbenchPrompt = {
    kind,
    title: 'private title private-account@example.test',
    text: 'private title private-account@example.test',
    rows: Array.from({ length: 9 }, () => ({ text: 'private target' })),
    buttons: [],
    interactive: true,
  };
  let captures = 0;
  const cdp: CdpEvaluator = {
    targetId: 'unit-exact-current-workbench',
    contextGeneration: 7,
    async evaluate<T>(_context: number | undefined, expression: string) {
      if (expression === workbenchPromptDomScript) {
        return [prompt] as T;
      }
      throw new Error('Diagnostic capture must not need settled prompt readiness');
    },
    async send(method, _params, options) {
      assert.ok(
        !method.startsWith('Input.') && method !== 'Page.bringToFront' && !method.startsWith('Target.'),
        'Never dismiss, focus, navigate or discover another window'
      );
      assert.ok(
        options?.timeoutMs && options.timeoutMs > 0 && options.timeoutMs <= 5000,
        'Fresh bounded capture budget reaches the same CDP'
      );
      if (method === 'Page.getFrameTree') {
        return { result: { frameTree: { frame: { id: 'unit-owner-frame' } } } };
      }
      if (method === 'Page.captureScreenshot') {
        assert.strictEqual(this, cdp, 'Capture must use the existing connection, not a detached send method');
        events.push('capture');
        captures++;
        if (fault === 'timeout' || fault === 'capture-error') {
          throw Object.assign(new Error('unit secondary capture failure'), { code: fault === 'timeout' ? 'ETIMEDOUT' : 'EIO' });
        }
        return { result: { data: fault === 'missing-data' ? undefined : Buffer.from('unit-png').toString('base64') } };
      }
      return {};
    },
  };
  const restore = setScreenshotFileSystemForTests({
    mkdirSync: () => undefined,
    rmSync: () => {},
    writeFileSync(file, data) {
      if (fault === 'storage-error') {
        throw new Error('unit secondary screenshot storage failure');
      }
      files.set(file, typeof data === 'string' ? data : Buffer.from(data as Uint8Array));
      events.push(file.endsWith('.png') ? 'png-written' : 'metadata-written');
    },
  });
  return {
    cdp,
    prompt,
    events,
    files,
    restore,
    get captures() {
      return captures;
    },
    metadata: () => JSON.parse(String([...files.entries()].find(([file]) => file.endsWith('.json'))?.[1])),
  };
}

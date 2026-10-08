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
            selectApprovedAzureConnectorFixturePrompt(cdp, prompt, fixture, deadline, async () => 'Unit Approved Subscription')
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

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertApprovedAzureConnectorFixtureSaved,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';
import type { CdpEvaluator } from './cdpFormHelpers';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';

type Control = (name: string, run: () => void | Promise<void>) => Promise<void>;
const env = {
  LA_E2E_CLI_AZURE_TENANT_ID: 'unit-tenant',
  LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: 'unit-subscription',
  LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: 'unit-existing-group',
  LA_E2E_CLI_AZURE_LOCATION_NAME: 'westus',
  LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL: 'https://management.azure.com/',
};

export async function runApprovedAzureConnectorFixtureControls(control: Control): Promise<void> {
  await control('approved fixture environment fails missing context and verifies product-persisted settings without injection', () => {
    const fixture = readApprovedAzureConnectorFixture(env);
    for (const key of Object.keys(env)) {
      assert.throws(() => readApprovedAzureConnectorFixture({ ...env, [key]: '' }), /fixture missing/);
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
      settings.Values.WORKFLOWS_RESOURCE_GROUP_NAME = 'other-group';
      fs.writeFileSync(path.join(root, 'local.settings.json'), JSON.stringify(settings));
      assert.throws(() => assertApprovedAzureConnectorFixtureSaved(root, fixture), /approved target/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  await control('approved subscription identity lookup is exact read-only ARM GET and has no ambient auth fallback', async () => {
    const fixture = readApprovedAzureConnectorFixture(env);
    let calls = 0;
    const get = async (url: any, options: any) => {
      calls++;
      assert.strictEqual(String(url), 'https://management.azure.com/subscriptions/unit-subscription?api-version=2022-12-01');
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
  });
  for (const fault of [
    'none',
    'missing-group',
    'duplicate-group',
    'disabled-group',
    'wrong-subscription',
    'auth-prompt',
    'creation-prompt',
  ]) {
    await control(`approved native fixture journey DOM ${fault} never creates or selects a foreign target`, async () => {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM('<html><body></body></html>', { pretendToBeVisual: true, runScripts: 'outside-only' });
      const window = dom.window;
      const fixture = readApprovedAzureConnectorFixture(env);
      const clicked: string[] = [];
      let stage = 0;
      const render = () => {
        const titles = [
          'Enable connectors in Azure for Logic App unitApp',
          'Select subscription',
          'Select a resource group for new resources.',
        ];
        const title =
          stage === 2 && fault === 'auth-prompt'
            ? 'Sign in to Azure'
            : stage === 2 && fault === 'creation-prompt'
              ? 'Enter the name of the new resource group'
              : titles[stage];
        const rows =
          stage === 0
            ? ['Skip for now', 'Use connectors from Azure']
            : stage === 1
              ? [fault === 'wrong-subscription' ? 'Other Subscription' : 'Unit Approved Subscription']
              : [
                  '$(plus) Create new resource group',
                  fault === 'missing-group' ? 'other-group' : fixture.resourceGroupName,
                  ...(fault === 'duplicate-group' ? [fixture.resourceGroupName] : []),
                ];
        window.document.body.innerHTML =
          stage > 2
            ? '<div class="react-flow">Ready</div>'
            : `<div class="quick-input-widget"><input placeholder="${title}"><div class="monaco-list" role="listbox">${rows
                .map(
                  (text, index) =>
                    `<div class="monaco-list-row" role="option" data-unit-row="${index}" ${stage === 2 && fault === 'disabled-group' && index === 1 ? 'aria-disabled="true"' : ''}>
              <span class="label-name">${text}</span></div>`
                )
                .join('')}</div></div>`;
        window.document.querySelector('input')?.focus();
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
        window.document.querySelector(`[data-unit-row="${Math.round((y - 52.5) / 30)}"]`);
      const cdp: CdpEvaluator = {
        async evaluate<T>(_context: number | undefined, expression: string) {
          return window.eval(expression) as T;
        },
        async send(_method, params) {
          if (params?.type === 'mouseReleased') {
            const row = window.document.elementFromPoint(Number(params.x), Number(params.y));
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
        if (fault === 'none') {
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
}

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import type { MsnWeatherAzureSettings } from './msnWeatherSettings';
import { normalizeManagementBaseUrl } from './msnWeatherSettings';
import type { WorkbenchPrompt } from './workbenchPromptSelection';

export type ApprovedAzureFixture = MsnWeatherAzureSettings;
const targetKeys = [
  ['WORKFLOWS_SUBSCRIPTION_ID', 'subscriptionId'],
  ['WORKFLOWS_RESOURCE_GROUP_NAME', 'resourceGroupName'],
  ['WORKFLOWS_LOCATION_NAME', 'location'],
  ['WORKFLOWS_TENANT_ID', 'tenantId'],
  ['WORKFLOWS_MANAGEMENT_BASE_URI', 'managementBaseUrl'],
] as const;

export function approvedAzureFixtureFromEnvironment(env: NodeJS.ProcessEnv): ApprovedAzureFixture {
  const read = (name: string) => {
    const value = env[name]?.trim();
    assert.ok(value, `Approved Azure fixture is missing ${name}; no ambient or interactive target fallback`);
    return value;
  };
  const fixture: ApprovedAzureFixture = {
    subscriptionId: read('LA_E2E_CLI_AZURE_SUBSCRIPTION_ID'),
    tenantId: read('LA_E2E_CLI_AZURE_TENANT_ID'),
    resourceGroupName: read('LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME'),
    location: read('LA_E2E_CLI_AZURE_LOCATION_NAME'),
    managementBaseUrl: normalizeManagementBaseUrl(env.LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL ?? 'https://management.azure.com'),
  };
  read('LA_E2E_CLI_AZURE_ACCESS_TOKEN'); // Kept in environment, never persisted in local settings.
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert.ok(guid.test(fixture.subscriptionId) && guid.test(fixture.tenantId), 'Approved Azure fixture identities must be GUIDs');
  assert.ok(!/[\\/]/.test(fixture.resourceGroupName), 'Approved existing resource-group name is invalid');
  assert.ok(/^https:\/\//.test(fixture.managementBaseUrl), 'Approved management base URI must use HTTPS');
  for (const [key, property] of targetKeys) {
    const ambient = env[key]?.trim();
    if (ambient) {
      assert.strictEqual(
        property === 'managementBaseUrl' ? normalizeManagementBaseUrl(ambient) : ambient,
        fixture[property],
        `Conflicting approved Azure fixture ${key}`
      );
    }
  }
  const connectionTenant = env.FC_SERVICE_CONNECTION_TENANT_ID ?? env.AzCode_ServiceConnectionDomain;
  if (connectionTenant) {
    assert.strictEqual(connectionTenant.toLowerCase(), fixture.tenantId.toLowerCase(), 'Approved WIF tenant must match fixture tenant');
  }
  return fixture;
}

export function approvedAzureFixturePrompts(fixture: ApprovedAzureFixture): WorkbenchPrompt[] {
  return [
    { matchText: 'Select a subscription', optionText: fixture.subscriptionId },
    { matchText: 'Select a resource group', optionText: fixture.resourceGroupName, exactRowLabel: true },
  ];
}

function settings(file: string): { root: Record<string, unknown>; values: Record<string, unknown> } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error('Approved Azure fixture settings are missing or invalid JSON');
  }
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Approved fixture settings must be an object');
  const root = parsed as Record<string, unknown>;
  assert.ok(root.Values && typeof root.Values === 'object' && !Array.isArray(root.Values), 'Approved fixture Values must be an object');
  return { root, values: root.Values as Record<string, unknown> };
}

export function assertApprovedAzureFixture(file: string, fixture: ApprovedAzureFixture): void {
  const { values } = settings(file);
  for (const [key, property] of targetKeys) {
    const actual = values[key];
    assert.strictEqual(typeof actual, 'string', `Approved Azure fixture ${key} must exist`);
    assert.strictEqual(
      property === 'managementBaseUrl' ? normalizeManagementBaseUrl(actual as string) : actual,
      fixture[property],
      `Approved Azure fixture ${key} changed`
    );
  }
}

export interface ApprovedAzureFixtureLease {
  bindGeneratedDesignTime(): void;
  assertBound(): void;
  restore(): void;
}

/** Canonical MSN target preconfiguration, with per-key ownership so unrelated
 * product/foreign settings changes survive restoration. No token is written. */
export function installApprovedAzureFixture(appDir: string, fixture: ApprovedAzureFixture): ApprovedAzureFixtureLease {
  const rootFile = path.join(appDir, 'local.settings.json');
  const designFile = path.join(appDir, 'workflow-designtime', 'local.settings.json');
  const beforeInstall = fs.readFileSync(rootFile);
  const original = settings(rootFile);
  for (const [key, property] of targetKeys) {
    const value = original.values[key];
    if (value !== undefined && value !== '') {
      assert.strictEqual(typeof value, 'string', `Existing fixture ${key} has the wrong type`);
      assert.strictEqual(
        property === 'managementBaseUrl' ? normalizeManagementBaseUrl(value as string) : value,
        fixture[property],
        `Refusing to replace a foreign ${key} target`
      );
    }
  }
  const previous = new Map(
    targetKeys.map(([key]) => [
      key,
      {
        existed: Object.hasOwn(original.values, key),
        value: original.values[key],
      },
    ])
  );
  for (const [key, property] of targetKeys) {
    original.values[key] = property === 'managementBaseUrl' ? `${fixture[property]}/` : fixture[property];
  }
  assert.ok(fs.readFileSync(rootFile).equals(beforeInstall), 'Foreign settings edit before approved fixture install');
  fs.writeFileSync(rootFile, `${JSON.stringify(original.root, null, 2)}\n`);
  const files = [rootFile];
  let restored = false;
  const assertBound = () => {
    assert.ok(!restored, 'Approved fixture lease was restored');
    files.forEach((file) => assertApprovedAzureFixture(file, fixture));
  };
  return {
    assertBound,
    bindGeneratedDesignTime() {
      assertApprovedAzureFixture(designFile, fixture);
      if (!files.includes(designFile)) {
        files.push(designFile);
      }
    },
    restore() {
      if (restored) {
        return;
      }
      assertBound(); // All-target preflight: never partly restore after a foreign target edit.
      const updates = files.map((file) => {
        const before = fs.readFileSync(file);
        const current = settings(file);
        for (const [key] of targetKeys) {
          const prior = previous.get(key);
          assert.ok(prior);
          if (prior.existed) {
            current.values[key] = prior.value;
          } else {
            delete current.values[key];
          }
        }
        return { file, before, content: `${JSON.stringify(current.root, null, 2)}\n` };
      });
      for (const update of updates) {
        assert.ok(fs.readFileSync(update.file).equals(update.before), 'Foreign settings edit before approved fixture restore');
      }
      for (const update of updates) {
        fs.writeFileSync(update.file, update.content);
      }
      restored = true;
    },
  };
}

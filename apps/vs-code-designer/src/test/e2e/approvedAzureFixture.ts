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

function parseSettings(content: string | Buffer): { root: Record<string, unknown>; values: Record<string, unknown> } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.toString());
  } catch {
    throw new Error('Approved Azure fixture settings are missing or invalid JSON');
  }
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Approved fixture settings must be an object');
  const root = parsed as Record<string, unknown>;
  assert.ok(root.Values && typeof root.Values === 'object' && !Array.isArray(root.Values), 'Approved fixture Values must be an object');
  return { root, values: root.Values as Record<string, unknown> };
}

function settings(file: string): { root: Record<string, unknown>; values: Record<string, unknown> } {
  return parseSettings(fs.readFileSync(file));
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

type TargetKey = (typeof targetKeys)[number][0];
interface BoundSettingsFile {
  file: string;
  previous: Map<TargetKey, { existed: boolean; value: unknown }>;
}

interface PreparedSettingsFile extends BoundSettingsFile {
  before: Buffer;
  content: string;
}

interface SettingsTransactionFile {
  file: string;
  before: Buffer;
  content: string;
}

function prepareSettingsFile(file: string, fixture: ApprovedAzureFixture): PreparedSettingsFile {
  const before = fs.readFileSync(file);
  const original = settings(file);
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
  const previous = new Map(targetKeys.map(([key]) => [key, { existed: Object.hasOwn(original.values, key), value: original.values[key] }]));
  for (const [key, property] of targetKeys) {
    original.values[key] = property === 'managementBaseUrl' ? `${fixture[property]}/` : fixture[property];
  }
  assert.ok(fs.readFileSync(file).equals(before), 'Foreign settings edit before approved fixture install');
  return { file, previous, before, content: `${JSON.stringify(original.root, null, 2)}\n` };
}

function targetState(values: Record<string, unknown>, key: TargetKey): { existed: boolean; value: unknown } {
  return { existed: Object.hasOwn(values, key), value: values[key] };
}

function applyTargetState(values: Record<string, unknown>, key: TargetKey, state: { existed: boolean; value: unknown }): void {
  if (state.existed) {
    values[key] = state.value;
  } else {
    delete values[key];
  }
}

function rollbackCommittedSettingsFile(entry: SettingsTransactionFile): void {
  const current = settings(entry.file);
  const expected = parseSettings(entry.content);
  const rollback = parseSettings(entry.before);
  for (const [key] of targetKeys) {
    assert.deepStrictEqual(
      targetState(current.values, key),
      targetState(expected.values, key),
      `Foreign ${key} target edit during approved fixture transaction`
    );
    applyTargetState(current.values, key, targetState(rollback.values, key));
  }
  fs.writeFileSync(entry.file, `${JSON.stringify(current.root, null, 2)}\n`);
}

function commitSettingsTransaction(entries: SettingsTransactionFile[], writeFile: typeof fs.writeFileSync, preflightMessage: string): void {
  for (const entry of entries) {
    assert.ok(fs.readFileSync(entry.file).equals(entry.before), preflightMessage);
  }
  const committed: SettingsTransactionFile[] = [];
  let inProgress: SettingsTransactionFile | undefined;
  try {
    for (const entry of entries) {
      inProgress = entry;
      writeFile(entry.file, entry.content);
      committed.push(entry);
      inProgress = undefined;
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    if (inProgress) {
      try {
        fs.writeFileSync(inProgress.file, inProgress.before);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const entry of committed.reverse()) {
      try {
        rollbackCommittedSettingsFile(entry);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Approved Azure fixture transaction and rollback failed');
    }
    throw error;
  }
}

function commitSettingsFiles(prepared: PreparedSettingsFile[], writeFile: typeof fs.writeFileSync): BoundSettingsFile[] {
  commitSettingsTransaction(prepared, writeFile, 'Foreign settings edit before approved fixture install');
  return prepared.map(({ file, previous }) => ({ file, previous }));
}

/** Canonical MSN target preconfiguration, with per-key ownership so unrelated
 * product/foreign settings changes survive restoration. No token is written. */
export function installApprovedAzureFixture(
  appDir: string,
  fixture: ApprovedAzureFixture,
  writeFile: typeof fs.writeFileSync = fs.writeFileSync
): ApprovedAzureFixtureLease {
  const rootFile = path.join(appDir, 'local.settings.json');
  const designFile = path.join(appDir, 'workflow-designtime', 'local.settings.json');
  const prepared = [prepareSettingsFile(rootFile, fixture)];
  if (fs.existsSync(designFile)) {
    prepared.push(prepareSettingsFile(designFile, fixture));
  }
  const files = commitSettingsFiles(prepared, writeFile);
  let restored = false;
  let generatedBindingFailed = false;
  const assertBound = () => {
    assert.ok(!restored, 'Approved fixture lease was restored');
    assert.ok(!generatedBindingFailed, 'Generated fixture binding failed; refusing partial restoration');
    files.forEach(({ file }) => assertApprovedAzureFixture(file, fixture));
  };
  return {
    assertBound,
    bindGeneratedDesignTime() {
      assert.ok(!restored, 'Approved fixture lease was restored');
      if (files.some(({ file }) => file === designFile)) {
        assertApprovedAzureFixture(designFile, fixture);
      } else {
        // The product generator has an independent baseline; never substitute
        // the app-root snapshot or assert inherited Azure keys before binding.
        try {
          files.push(...commitSettingsFiles([prepareSettingsFile(designFile, fixture)], writeFile));
        } catch (error) {
          generatedBindingFailed = true;
          throw error;
        }
      }
      assertApprovedAzureFixture(designFile, fixture);
    },
    restore() {
      if (restored) {
        return;
      }
      assertBound(); // All-target preflight: never partly restore after a foreign target edit.
      const updates = files.map(({ file, previous }) => {
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
      commitSettingsTransaction(updates, writeFile, 'Foreign settings edit before approved fixture restore');
      restored = true;
    },
  };
}

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertMsnWeatherLocalSettings,
  canUseInteractiveMsnWeatherAzureSettings,
  type MsnWeatherAzureSettings,
  getMsnWeatherLocalSettingsEvidence,
  normalizeManagementBaseUrl,
} from './msnWeatherSettings';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'msn-weather-settings-unit-'));
const expectedSettings: MsnWeatherAzureSettings = {
  subscriptionId: '00000000-0000-4000-8000-000000000001',
  resourceGroupName: 'LogicAppsVSCode-E2E-Fixtures',
  location: 'westus',
  tenantId: '00000000-0000-4000-8000-000000000002',
  managementBaseUrl: 'https://management.azure.com',
};

try {
  testMatchingSettings();
  testMissingEmptyWrongTypeAndMismatchSettings();
  testMissingExpectedTarget();
  testTenantIsRequired();
  testManagementUrlSlashNormalization();
  testMalformedJsonAndValues();
  testMalformedJsonDoesNotLeakSecrets();
  testInteractiveBypassIsBlockedInCi();
  testPostWriteMutationFails();
  console.log('[msnWeatherSettings.unit] all tests passed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function testMatchingSettings(): void {
  const appDir = createAppWithSettings('matching', {
    Values: {
      WORKFLOWS_SUBSCRIPTION_ID: expectedSettings.subscriptionId,
      WORKFLOWS_RESOURCE_GROUP_NAME: expectedSettings.resourceGroupName,
      WORKFLOWS_LOCATION_NAME: expectedSettings.location,
      WORKFLOWS_TENANT_ID: expectedSettings.tenantId,
      WORKFLOWS_MANAGEMENT_BASE_URI: `${expectedSettings.managementBaseUrl}/`,
    },
  });

  const evidence = assertMsnWeatherLocalSettings(appDir, expectedSettings, 'after-preseed');
  assert.deepStrictEqual(
    Object.values(evidence.keys).map((entry) => entry.status),
    ['valid', 'valid', 'valid', 'valid', 'valid']
  );
  assert.ok(
    fs.existsSync(
      path.join(path.dirname(appDir), '.vscode-e2e-diagnostics', path.basename(appDir), 'msn-weather-local-settings-after-preseed.json')
    ),
    'safe evidence should be written into the generated workspace snapshot outside the live app root'
  );
}

function testMissingEmptyWrongTypeAndMismatchSettings(): void {
  const appDir = createAppWithSettings('invalid-values', {
    Values: {
      WORKFLOWS_RESOURCE_GROUP_NAME: '   ',
      WORKFLOWS_LOCATION_NAME: 42,
      WORKFLOWS_TENANT_ID: 'wrong-tenant',
      WORKFLOWS_MANAGEMENT_BASE_URI: 'https://management.azure.com/',
    },
  });

  const evidence = getMsnWeatherLocalSettingsEvidence(path.join(appDir, 'local.settings.json'), expectedSettings, 'after-save');
  assert.strictEqual(evidence.keys.WORKFLOWS_SUBSCRIPTION_ID.status, 'missing');
  assert.strictEqual(evidence.keys.WORKFLOWS_RESOURCE_GROUP_NAME.status, 'empty');
  assert.strictEqual(evidence.keys.WORKFLOWS_LOCATION_NAME.status, 'wrong-type');
  assert.strictEqual(evidence.keys.WORKFLOWS_TENANT_ID.status, 'mismatch');
  assert.throws(() => assertMsnWeatherLocalSettings(appDir, expectedSettings, 'after-save'), /WORKFLOWS_TENANT_ID: mismatch/);
}

function testMissingExpectedTarget(): void {
  const appDir = createAppWithSettings('missing-expected', {
    Values: {
      WORKFLOWS_SUBSCRIPTION_ID: expectedSettings.subscriptionId,
      WORKFLOWS_RESOURCE_GROUP_NAME: expectedSettings.resourceGroupName,
      WORKFLOWS_LOCATION_NAME: expectedSettings.location,
      WORKFLOWS_TENANT_ID: expectedSettings.tenantId,
      WORKFLOWS_MANAGEMENT_BASE_URI: expectedSettings.managementBaseUrl,
    },
  });
  assert.throws(
    () => assertMsnWeatherLocalSettings(appDir, { ...expectedSettings, subscriptionId: '' }, 'before-debug'),
    /expected Azure target is incomplete/
  );
}

function testTenantIsRequired(): void {
  const appDir = createAppWithSettings('missing-tenant', {
    Values: {
      WORKFLOWS_SUBSCRIPTION_ID: expectedSettings.subscriptionId,
      WORKFLOWS_RESOURCE_GROUP_NAME: expectedSettings.resourceGroupName,
      WORKFLOWS_LOCATION_NAME: expectedSettings.location,
      WORKFLOWS_MANAGEMENT_BASE_URI: expectedSettings.managementBaseUrl,
    },
  });
  assert.throws(() => assertMsnWeatherLocalSettings(appDir, expectedSettings, 'after-warmup'), /WORKFLOWS_TENANT_ID: missing/);
}

function testManagementUrlSlashNormalization(): void {
  assert.strictEqual(normalizeManagementBaseUrl('https://management.azure.com///'), 'https://management.azure.com');
  const appDir = createAppWithSettings('url-slashes', {
    Values: {
      WORKFLOWS_SUBSCRIPTION_ID: ` ${expectedSettings.subscriptionId} `,
      WORKFLOWS_RESOURCE_GROUP_NAME: expectedSettings.resourceGroupName,
      WORKFLOWS_LOCATION_NAME: expectedSettings.location,
      WORKFLOWS_TENANT_ID: expectedSettings.tenantId,
      WORKFLOWS_MANAGEMENT_BASE_URI: 'https://management.azure.com///',
    },
  });
  assertMsnWeatherLocalSettings(appDir, { ...expectedSettings, managementBaseUrl: 'https://management.azure.com/' }, 'before-debug');
}

function testMalformedJsonAndValues(): void {
  const malformedDir = path.join(tempRoot, 'malformed');
  fs.mkdirSync(malformedDir, { recursive: true });
  fs.writeFileSync(path.join(malformedDir, 'local.settings.json'), '{');
  assert.throws(() => assertMsnWeatherLocalSettings(malformedDir, expectedSettings, 'malformed'), /Unable to parse/);

  const badValuesDir = createAppWithSettings('bad-values', { Values: 'not-object' });
  assert.throws(() => assertMsnWeatherLocalSettings(badValuesDir, expectedSettings, 'bad-values'), /object Values property/);

  const nullRootDir = createAppWithSettings('null-root', null);
  assert.throws(() => assertMsnWeatherLocalSettings(nullRootDir, expectedSettings, 'null-root'), /root object/);

  const arrayRootDir = createAppWithSettings('array-root', []);
  assert.throws(() => assertMsnWeatherLocalSettings(arrayRootDir, expectedSettings, 'array-root'), /root object/);
}

function testMalformedJsonDoesNotLeakSecrets(): void {
  const malformedSecretDir = path.join(tempRoot, 'malformed-secret');
  fs.mkdirSync(malformedSecretDir, { recursive: true });
  fs.writeFileSync(path.join(malformedSecretDir, 'local.settings.json'), '{"Values":{"AzureWebJobsStorage":"FAKE_TEST_SECRET",}');
  assert.throws(
    () => assertMsnWeatherLocalSettings(malformedSecretDir, expectedSettings, 'malformed-secret'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Unable to parse/);
      assert.doesNotMatch(error.message, /FAKE_TEST_SECRET/);
      return true;
    }
  );
}

function testInteractiveBypassIsBlockedInCi(): void {
  assert.strictEqual(canUseInteractiveMsnWeatherAzureSettings({ LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1' }), true);
  assert.strictEqual(
    canUseInteractiveMsnWeatherAzureSettings({
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      TF_BUILD: 'True',
    }),
    false
  );
  assert.strictEqual(
    canUseInteractiveMsnWeatherAzureSettings({
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      GITHUB_ACTIONS: 'true',
    }),
    false
  );
}

function testPostWriteMutationFails(): void {
  const appDir = createAppWithSettings('post-write-mutation', {
    Values: {
      WORKFLOWS_SUBSCRIPTION_ID: expectedSettings.subscriptionId,
      WORKFLOWS_RESOURCE_GROUP_NAME: expectedSettings.resourceGroupName,
      WORKFLOWS_LOCATION_NAME: expectedSettings.location,
      WORKFLOWS_TENANT_ID: expectedSettings.tenantId,
      WORKFLOWS_MANAGEMENT_BASE_URI: expectedSettings.managementBaseUrl,
    },
  });
  assertMsnWeatherLocalSettings(appDir, expectedSettings, 'after-preseed');

  const settingsPath = path.join(appDir, 'local.settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  settings.Values.WORKFLOWS_RESOURCE_GROUP_NAME = 'mutated-resource-group';
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);

  assert.throws(() => assertMsnWeatherLocalSettings(appDir, expectedSettings, 'before-debug'), /WORKFLOWS_RESOURCE_GROUP_NAME: mismatch/);
}

function createAppWithSettings(name: string, settings: unknown): string {
  const appDir = path.join(tempRoot, name);
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(appDir, 'local.settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
  return appDir;
}

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export interface MsnWeatherAzureSettings {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  tenantId: string;
  managementBaseUrl: string;
}

export interface MsnWeatherLocalSettingsEvidence {
  settingsPath: string;
  stage: string;
  requiredKeys: string[];
  keys: Record<string, MsnWeatherLocalSettingsKeyEvidence>;
}

interface MsnWeatherLocalSettingsKeyEvidence {
  expected: string;
  actual: string;
  status: 'valid' | 'missing' | 'empty' | 'wrong-type' | 'mismatch';
}

const keyMap: Array<{ key: string; expectedProperty: keyof MsnWeatherAzureSettings; normalize?: (value: string) => string }> = [
  { key: 'WORKFLOWS_SUBSCRIPTION_ID', expectedProperty: 'subscriptionId' },
  { key: 'WORKFLOWS_RESOURCE_GROUP_NAME', expectedProperty: 'resourceGroupName' },
  { key: 'WORKFLOWS_LOCATION_NAME', expectedProperty: 'location' },
  { key: 'WORKFLOWS_TENANT_ID', expectedProperty: 'tenantId' },
  { key: 'WORKFLOWS_MANAGEMENT_BASE_URI', expectedProperty: 'managementBaseUrl', normalize: normalizeManagementBaseUrl },
];

export function normalizeManagementBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function canUseInteractiveMsnWeatherAzureSettings(env: NodeJS.ProcessEnv): boolean {
  return (
    env.LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS === '1' &&
    env.CI !== 'true' &&
    env.TF_BUILD !== 'True' &&
    env.GITHUB_ACTIONS !== 'true'
  );
}

export function assertMsnWeatherLocalSettings(
  appDir: string,
  expectedSettings: MsnWeatherAzureSettings,
  stage: string
): MsnWeatherLocalSettingsEvidence {
  const settingsPath = path.join(appDir, 'local.settings.json');
  const evidence = getMsnWeatherLocalSettingsEvidence(settingsPath, expectedSettings, stage);
  writeMsnWeatherLocalSettingsEvidence(appDir, evidence);

  const failures = Object.entries(evidence.keys).filter(([, value]) => value.status !== 'valid');
  assert.strictEqual(
    failures.length,
    0,
    [
      `MSN Weather lifecycle local.settings.json Azure target mismatch at ${stage}: ${settingsPath}`,
      ...failures.map(
        ([key, value]) => `- ${key}: ${value.status}; expected=${JSON.stringify(value.expected)} actual=${JSON.stringify(value.actual)}`
      ),
    ].join('\n')
  );

  return evidence;
}

export function getMsnWeatherLocalSettingsEvidence(
  settingsPath: string,
  expectedSettings: MsnWeatherAzureSettings,
  stage: string
): MsnWeatherLocalSettingsEvidence {
  const expectedProblems = keyMap
    .map(({ key, expectedProperty, normalize }) => {
      const rawExpected = expectedSettings[expectedProperty];
      const normalizedExpected = typeof rawExpected === 'string' ? (normalize ?? normalizePlainValue)(rawExpected) : '';
      return { key, expected: normalizedExpected, ok: normalizedExpected.length > 0 };
    })
    .filter((entry) => !entry.ok);

  if (expectedProblems.length > 0) {
    throw new Error(
      [
        `MSN Weather lifecycle expected Azure target is incomplete at ${stage}.`,
        ...expectedProblems.map((entry) => `- ${entry.key}: expected value is missing or empty`),
      ].join('\n')
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    throw new Error(`Unable to parse MSN Weather local.settings.json at ${settingsPath} during ${stage}.`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`MSN Weather local.settings.json at ${settingsPath} must contain a root object during ${stage}.`);
  }

  const parsedObject = parsed as Record<string, unknown>;
  if (!parsedObject.Values || typeof parsedObject.Values !== 'object' || Array.isArray(parsedObject.Values)) {
    throw new Error(`MSN Weather local.settings.json at ${settingsPath} must contain an object Values property during ${stage}.`);
  }

  const values = parsedObject.Values as Record<string, unknown>;
  const keys = Object.fromEntries(
    keyMap.map(({ key, expectedProperty, normalize }) => {
      const expected = (normalize ?? normalizePlainValue)(expectedSettings[expectedProperty]);
      const actualValue = values[key];
      const actual = typeof actualValue === 'string' ? (normalize ?? normalizePlainValue)(actualValue) : '';
      return [
        key,
        {
          expected,
          actual,
          status: getKeyStatus(actualValue, actual, expected),
        },
      ];
    })
  );

  return {
    settingsPath,
    stage,
    requiredKeys: keyMap.map((entry) => entry.key),
    keys,
  };
}

export function writeMsnWeatherLocalSettingsEvidence(appDir: string, evidence: MsnWeatherLocalSettingsEvidence): void {
  const diagnosticsDir = path.join(path.dirname(appDir), '.vscode-e2e-diagnostics', path.basename(appDir));
  fs.mkdirSync(diagnosticsDir, { recursive: true });
  const fileName = `msn-weather-local-settings-${evidence.stage.replace(/[^a-z0-9_-]+/gi, '-')}.json`;
  fs.writeFileSync(path.join(diagnosticsDir, fileName), `${JSON.stringify(evidence, null, 2)}\n`);
}

function getKeyStatus(actualValue: unknown, actual: string, expected: string): MsnWeatherLocalSettingsKeyEvidence['status'] {
  if (actualValue === undefined || actualValue === null) {
    return 'missing';
  }

  if (typeof actualValue !== 'string') {
    return 'wrong-type';
  }

  if (actual.length === 0) {
    return 'empty';
  }

  return actual === expected ? 'valid' : 'mismatch';
}

function normalizePlainValue(value: string): string {
  return value.trim();
}

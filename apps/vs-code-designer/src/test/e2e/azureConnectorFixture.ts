import * as assert from 'assert';
import * as path from 'path';
import type { CdpEvaluator } from './cdpFormHelpers';
import { clickPoint } from './cdpFormHelpers';
import { getMsnWeatherLocalSettingsEvidence, type MsnWeatherAzureSettings, normalizeManagementBaseUrl } from './msnWeatherSettings';
import { readWorkbenchPrompts, type DetectedWorkbenchPrompt } from './workbenchPrompts';

export type ApprovedAzureConnectorFixture = MsnWeatherAzureSettings;

export function readApprovedAzureConnectorFixture(env: NodeJS.ProcessEnv = process.env): ApprovedAzureConnectorFixture {
  const fields = {
    tenantId: 'LA_E2E_CLI_AZURE_TENANT_ID',
    subscriptionId: 'LA_E2E_CLI_AZURE_SUBSCRIPTION_ID',
    resourceGroupName: 'LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME',
    location: 'LA_E2E_CLI_AZURE_LOCATION_NAME',
    managementBaseUrl: 'LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL',
  } as const;
  const missing = Object.values(fields).filter((key) => !env[key]?.trim());
  assert.strictEqual(
    missing.length,
    0,
    `Approved Azure connector fixture missing: ${missing.join(', ')}; parent HTTP lane requiresAzureAccessToken/WIF context must be enabled`
  );
  const result = Object.fromEntries(
    Object.entries(fields).map(([field, key]) => [field, env[key]!.trim()])
  ) as unknown as ApprovedAzureConnectorFixture;
  const endpoint = new URL(result.managementBaseUrl);
  assert.ok(
    endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash,
    'Approved management endpoint must be an HTTPS base URL without credentials/query'
  );
  result.managementBaseUrl = normalizeManagementBaseUrl(result.managementBaseUrl);
  return result;
}

export function assertApprovedAzureConnectorFixtureSaved(appDir: string, fixture: ApprovedAzureConnectorFixture): void {
  // Reuse the existing independent local.settings evidence reader. Product
  // SaveAzureContext writes these values; the HTTP harness never injects them.
  const evidence = getMsnWeatherLocalSettingsEvidence(path.join(appDir, 'local.settings.json'), fixture, 'http-affirmative-native-wizard');
  const invalid = Object.entries(evidence.keys)
    .filter(([, value]) => value.status !== 'valid')
    .map(([key]) => key);
  assert.strictEqual(invalid.length, 0, `Product affirmative Azure setup did not persist the approved target: ${invalid.join(', ')}`);
}

export async function selectApprovedAzureConnectorFixturePrompt(
  cdp: CdpEvaluator,
  prompt: DetectedWorkbenchPrompt,
  fixture: ApprovedAzureConnectorFixture,
  deadline: number,
  getSubscriptionName: () => Promise<string>
): Promise<boolean> {
  assert.ok(prompt.kind === 'quickInput' && prompt.interactive, 'Approved fixture picker must be an interactive native QuickPick');
  const subscriptionTitles = [
    'Select subscription',
    'Select subscription.',
    'Select a subscription',
    'Select a subscription.',
    'Select an Azure subscription',
    'Select an Azure subscription.',
  ];
  let expectedName: string;
  if (subscriptionTitles.includes(prompt.title)) {
    expectedName = await getSubscriptionName();
  } else if (prompt.title === 'Select a resource group for new resources.') {
    expectedName = fixture.resourceGroupName;
  } else {
    throw new Error(
      'Azure setup reached an unsupported auth/creation prompt; existing approved WIF sign-in and target fixture are required'
    );
  }
  assert.ok(
    expectedName && !/create new|sign in|grant|permission/i.test(expectedName),
    'Never select cloud creation, sign-in or elevation actions'
  );
  const matches = prompt.rows.filter((row) => row.text === expectedName);
  assert.strictEqual(
    matches.length,
    1,
    'Approved existing Azure target unavailable/ambiguous; do not select another target or create a resource'
  );
  assert.ok(matches[0].point, 'Approved existing target must be enabled and hit-testable');
  assert.ok(Date.now() < deadline, 'Approved existing target observation deadline expired before native input');
  await clickPoint(cdp, matches[0].point);
  while (Date.now() < deadline) {
    const next = (await readWorkbenchPrompts(cdp, Math.min(3000, deadline - Date.now()))).filter((value) => value.kind !== 'notification');
    if (!next.length || next.every((value) => value.title !== prompt.title)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, deadline - Date.now())));
  }
  throw new Error('Approved Azure target selection did not advance within the original deadline');
}

export async function readApprovedAzureSubscriptionName(
  fixture: ApprovedAzureConnectorFixture,
  deadline: number,
  token = process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN,
  get = fetch
): Promise<string> {
  assert.ok(token?.trim(), 'Approved ARM access token missing; parent must enable requiresAzureAccessToken using existing WIF connection');
  assert.ok(deadline > Date.now(), 'Approved subscription lookup deadline expired');
  // Read-only lookup of this exact existing subscription, never list/create/
  // mutate resources or use Azure CLI/ambient sign-in as a fallback.
  const endpoint = new URL(`${fixture.managementBaseUrl}/subscriptions/${encodeURIComponent(fixture.subscriptionId)}`);
  endpoint.searchParams.set('api-version', '2022-12-01');
  const response = await get(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(Math.min(5000, deadline - Date.now())),
  });
  assert.ok(
    response.ok,
    `Approved subscription read-only lookup failed: HTTP ${response.status}; existing auth/fixture access is required`
  );
  const subscription = (await response.json()) as { subscriptionId?: string; tenantId?: string; displayName?: string };
  assert.ok(Date.now() < deadline, 'Approved subscription lookup completed after the original observation deadline');
  assert.strictEqual(subscription.subscriptionId?.toLowerCase(), fixture.subscriptionId.toLowerCase(), 'ARM returned another subscription');
  assert.strictEqual(subscription.tenantId?.toLowerCase(), fixture.tenantId.toLowerCase(), 'ARM returned another tenant');
  const displayName = subscription.displayName;
  assert.ok(typeof displayName === 'string' && displayName.trim(), 'Approved subscription display name unavailable');
  return displayName.trim();
}

import * as assert from 'assert';
import * as path from 'path';
import type { CdpEvaluator } from './cdpFormHelpers';
import { clickPoint } from './cdpFormHelpers';
import {
  approvedAzureFixtureFromEnvironment,
  approvedAzureFixturePrompts,
  assertApprovedAzureFixture,
  type ApprovedAzureFixture,
} from './approvedAzureFixture';
import { selectWorkbenchPromptOption } from './workbenchPromptSelection';
import { readWorkbenchPrompts, type DetectedWorkbenchPrompt } from './workbenchPrompts';

export interface ApprovedAzureConnectorFixture extends ApprovedAzureFixture {
  // Template location is only a setup hint until the approved existing RG's
  // actual ARM location has been read and independently checked.
  resourceGroupLocationVerified?: boolean;
}

export function readApprovedAzureConnectorFixture(env: NodeJS.ProcessEnv = process.env): ApprovedAzureConnectorFixture {
  assert.ok(env.LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL?.trim(), 'Approved HTTP fixture missing LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL');
  const result = approvedAzureFixtureFromEnvironment(env);
  const endpoint = new URL(result.managementBaseUrl);
  assert.ok(
    endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash,
    'Approved management endpoint must be an HTTPS base URL without credentials/query'
  );
  return result;
}

export function assertApprovedAzureConnectorFixtureSaved(appDir: string, fixture: ApprovedAzureConnectorFixture): void {
  assert.strictEqual(
    fixture.resourceGroupLocationVerified,
    true,
    'Existing resource-group actual location must be verified, not assumed from template'
  );
  // Shared strict verifier only. HTTP deliberately does not call the shared
  // preconfiguration lease: product wizard persistence is still required.
  assertApprovedAzureFixture(path.join(appDir, 'local.settings.json'), fixture);
}

export async function readApprovedExistingResourceGroup(
  fixture: ApprovedAzureConnectorFixture,
  deadline: number,
  token = process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN,
  get = fetch
): Promise<ApprovedAzureConnectorFixture> {
  assert.ok(token?.trim(), 'Approved ARM access token missing for existing resource-group verification');
  assert.ok(Date.now() < deadline, 'Existing resource-group verification deadline expired');
  const endpoint = new URL(
    `${fixture.managementBaseUrl}/subscriptions/${encodeURIComponent(fixture.subscriptionId)}/resourceGroups/${encodeURIComponent(fixture.resourceGroupName)}`
  );
  endpoint.searchParams.set('api-version', '2022-09-01');
  const response = await get(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(Math.min(5000, deadline - Date.now())),
  });
  assert.ok(response.ok, `Existing approved resource-group read failed: HTTP ${response.status}; WIF access/fixture remains blocked`);
  const group = (await response.json()) as { id?: string; name?: string; location?: string };
  assert.ok(Date.now() < deadline, 'Existing resource-group response arrived after the original deadline');
  const expectedId = `/subscriptions/${fixture.subscriptionId}/resourceGroups/${fixture.resourceGroupName}`;
  assert.strictEqual(group.id?.toLowerCase(), expectedId.toLowerCase(), 'ARM returned another existing resource group/subscription');
  assert.strictEqual(group.name?.toLowerCase(), fixture.resourceGroupName.toLowerCase(), 'ARM returned another group name');
  const location = group.location;
  assert.ok(typeof location === 'string' && location.trim(), 'Existing approved resource-group actual location unavailable');
  return { ...fixture, location: location.trim(), resourceGroupLocationVerified: true };
}

export function assertAzureConnectorAccountTreePrerequisite(api: unknown, minimalActivation: string | undefined): void {
  assert.notStrictEqual(minimalActivation, '1', 'HTTP affirmative wizard requires normal activation, not minimal command-only activation');
  const resourceApi = api as { appResourceTree?: { _rootTreeItem?: { getSubscriptionPromptStep?: unknown } } } | undefined;
  assert.strictEqual(
    typeof resourceApi?.appResourceTree?._rootTreeItem?.getSubscriptionPromptStep,
    'function',
    'Actual activated Azure Resources account tree is unavailable; approved WIF initialization is a native prerequisite'
  );
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
    assert.strictEqual(
      fixture.resourceGroupLocationVerified,
      true,
      'Existing RG identity/location must be read before its native selection'
    );
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
  const matches = prompt.rows.filter((row) => (row.label ?? row.text) === expectedName);
  assert.strictEqual(
    matches.length,
    1,
    'Approved existing Azure target unavailable/ambiguous; do not select another target or create a resource'
  );
  const sharedRule = approvedAzureFixturePrompts(fixture)[subscriptionTitles.includes(prompt.title) ? 0 : 1];
  const selection = selectWorkbenchPromptOption(
    [{ ...sharedRule, matchText: prompt.title, optionText: expectedName, exactRowLabel: true }],
    [prompt]
  );
  assert.ok(selection.point, 'Approved existing target must be enabled and hit-testable');
  assert.ok(Date.now() < deadline, 'Approved existing target observation deadline expired before native input');
  await clickPoint(cdp, selection.point);
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

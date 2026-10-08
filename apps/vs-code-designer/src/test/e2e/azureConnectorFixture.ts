import * as assert from 'assert';
import { createHash } from 'crypto';
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

export function describeUnsupportedAzurePrompt(prompt: DetectedWorkbenchPrompt): string {
  const knownActions = new Set([
    'Cancel',
    'Create new resource group',
    'Grant permission',
    'Loading...',
    'Sign in',
    'Sign in to Azure',
    'Skip for now',
  ]);
  const safeLabel = (value: string) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (knownActions.has(normalized)) {
      return normalized;
    }
    return `<target:${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}>`;
  };
  const normalizedTitle = prompt.title.replace(/\s+/g, ' ').trim();
  return JSON.stringify({
    kind: prompt.kind,
    title: knownActions.has(normalizedTitle)
      ? normalizedTitle
      : `<prompt:${createHash('sha256').update(normalizedTitle).digest('hex').slice(0, 12)}>`,
    category: /sign in|account/i.test(normalizedTitle)
      ? 'authentication'
      : /create|resource group/i.test(normalizedTitle)
        ? 'resource-creation'
        : /grant|permission/i.test(normalizedTitle)
          ? 'permission'
          : /subscription/i.test(normalizedTitle)
            ? 'subscription'
            : 'unknown',
    interactive: prompt.interactive,
    rows: prompt.rows.map((row) => ({
      label: safeLabel(row.label ?? row.text),
      hitTestable: Boolean(row.point),
    })),
  });
}

export async function selectApprovedAzureConnectorFixturePrompt(
  cdp: CdpEvaluator,
  prompt: DetectedWorkbenchPrompt,
  fixture: ApprovedAzureConnectorFixture,
  deadline: number,
  getSubscriptionName: () => Promise<string>,
  signal?: AbortSignal
): Promise<boolean> {
  const subscriptionTitles = [
    'Select subscription',
    'Select subscription.',
    'Select a subscription',
    'Select a subscription.',
    'Select an Azure subscription',
    'Select an Azure subscription.',
  ];
  const supportedTitle = subscriptionTitles.includes(prompt.title) || prompt.title === 'Select a resource group for new resources.';
  if (prompt.kind !== 'quickInput' || !supportedTitle) {
    throw new Error(
      `Azure setup reached an unsupported prompt; existing approved WIF sign-in and target fixture are required: ${describeUnsupportedAzurePrompt(prompt)}`
    );
  }
  let expectedName: string;
  if (subscriptionTitles.includes(prompt.title)) {
    signal?.throwIfAborted();
    expectedName = await getSubscriptionName();
    signal?.throwIfAborted();
  } else {
    assert.strictEqual(prompt.title, 'Select a resource group for new resources.');
    assert.strictEqual(
      fixture.resourceGroupLocationVerified,
      true,
      'Existing RG identity/location must be read before its native selection'
    );
    expectedName = fixture.resourceGroupName;
  }
  assert.ok(
    expectedName && !/create new|sign in|grant|permission/i.test(expectedName),
    'Never select cloud creation, sign-in or elevation actions'
  );
  const remaining = () => {
    signal?.throwIfAborted();
    const value = deadline - Date.now();
    assert.ok(value > 0, 'Approved existing Azure target unavailable before the original deadline');
    return value;
  };
  const sharedRule = approvedAzureFixturePrompts(fixture)[subscriptionTitles.includes(prompt.title) ? 0 : 1];
  let current = prompt;
  let filtered = false;
  let selection: ReturnType<typeof selectWorkbenchPromptOption>;
  while (true) {
    const matches = current.rows.filter((row) => (row.label ?? row.text) === expectedName);
    assert.ok(matches.length <= 1, 'Approved existing Azure target is ambiguous; do not select another target or create a resource');
    selection = selectWorkbenchPromptOption(
      [{ ...sharedRule, matchText: prompt.title, optionText: expectedName, exactRowLabel: true }],
      [current]
    );
    if (selection.point) {
      assert.strictEqual(matches.length, 1, 'Approved existing Azure target selection must resolve exactly one row');
      break;
    }
    if (!filtered && current.interactive && current.inputPoint) {
      await clickPoint(cdp, current.inputPoint);
      await replaceFocusedWorkbenchInput(cdp, expectedName);
      filtered = true;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining())));
    const prompts = (await readWorkbenchPrompts(cdp, Math.min(3000, remaining()))).filter((value) => value.kind !== 'notification');
    signal?.throwIfAborted();
    assert.strictEqual(prompts.length, 1, 'Approved Azure target prompt disappeared or became ambiguous before selection');
    current = prompts[0];
    if (current.kind !== 'quickInput' || current.title !== prompt.title) {
      throw new Error(
        `Azure setup changed to an unsupported prompt before the approved target was actionable: ${describeUnsupportedAzurePrompt(current)}`
      );
    }
  }

  async function replaceFocusedWorkbenchInput(cdp: CdpEvaluator, value: string): Promise<void> {
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17,
      nativeVirtualKeyCode: 17,
      modifiers: 2,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      windowsVirtualKeyCode: 65,
      nativeVirtualKeyCode: 65,
      modifiers: 2,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'a',
      code: 'KeyA',
      windowsVirtualKeyCode: 65,
      nativeVirtualKeyCode: 65,
      modifiers: 2,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17,
      nativeVirtualKeyCode: 17,
    });
    await cdp.send('Input.insertText', { text: value });
  }
  remaining();
  await clickPoint(cdp, selection.point);
  while (true) {
    const next = (await readWorkbenchPrompts(cdp, Math.min(3000, remaining()))).filter((value) => value.kind !== 'notification');
    signal?.throwIfAborted();
    if (!next.length || next.every((value) => value.title !== prompt.title)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining())));
  }
}

export async function readApprovedAzureSubscriptionName(
  fixture: ApprovedAzureConnectorFixture,
  deadline: number,
  token = process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN,
  get = fetch,
  signal?: AbortSignal
): Promise<string> {
  assert.ok(token?.trim(), 'Approved ARM access token missing; parent must enable requiresAzureAccessToken using existing WIF connection');
  signal?.throwIfAborted();
  const timeoutMs = Math.min(5000, deadline - Date.now());
  assert.ok(timeoutMs > 0, 'Approved subscription lookup deadline expired');
  // Read-only lookup of this exact existing subscription, never list/create/
  // mutate resources or use Azure CLI/ambient sign-in as a fallback.
  const endpoint = new URL(`${fixture.managementBaseUrl}/subscriptions/${encodeURIComponent(fixture.subscriptionId)}`);
  endpoint.searchParams.set('api-version', '2022-12-01');
  const request = new AbortController();
  const cancelRequest = () => request.abort(signal?.reason);
  signal?.addEventListener('abort', cancelRequest, { once: true });
  if (signal?.aborted) {
    cancelRequest();
  }
  const timeout = setTimeout(() => request.abort(new Error('Approved subscription lookup timed out')), timeoutMs);
  let response: Response;
  try {
    response = await get(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: request.signal,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancelRequest);
  }
  signal?.throwIfAborted();
  assert.ok(
    response.ok,
    `Approved subscription read-only lookup failed: HTTP ${response.status}; existing auth/fixture access is required`
  );
  const subscription = (await response.json()) as { subscriptionId?: string; tenantId?: string; displayName?: string };
  signal?.throwIfAborted();
  assert.ok(Date.now() < deadline, 'Approved subscription lookup completed after the original observation deadline');
  assert.strictEqual(subscription.subscriptionId?.toLowerCase(), fixture.subscriptionId.toLowerCase(), 'ARM returned another subscription');
  assert.strictEqual(subscription.tenantId?.toLowerCase(), fixture.tenantId.toLowerCase(), 'ARM returned another tenant');
  const displayName = subscription.displayName;
  assert.ok(typeof displayName === 'string' && displayName.trim(), 'Approved subscription display name unavailable');
  return displayName.trim();
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { EditorView, Key, type WebDriver, VSBrowser, Workbench } from 'vscode-extension-tester';
import { clearBlockingUI, dismissAllDialogs, dismissNotifications, sleep } from './helpers';
import {
  waitForExtensionValidationComplete,
  openWorkspaceFileInSession,
  openDesignerViaExplorer,
  switchToDesignerWebview,
} from './designerHelpers';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';

const TEST_TIMEOUT = 360_000;

function removeAzureConnectorSentinels(appDir: string): { localSettingsPath: string; originalContents: string | undefined } {
  const localSettingsPath = path.join(appDir, 'local.settings.json');
  const originalContents = fs.existsSync(localSettingsPath) ? fs.readFileSync(localSettingsPath, 'utf-8') : undefined;
  const settings = fs.existsSync(localSettingsPath)
    ? JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'))
    : { IsEncrypted: false, Values: {} };
  settings.Values = settings.Values ?? {};

  for (const key of [
    'WORKFLOWS_SUBSCRIPTION_ID',
    'WORKFLOWS_TENANT_ID',
    'WORKFLOWS_RESOURCE_GROUP_NAME',
    'WORKFLOWS_LOCATION_NAME',
    'WORKFLOWS_AUTHENTICATION_METHOD',
  ]) {
    delete settings.Values[key];
  }

  fs.writeFileSync(localSettingsPath, JSON.stringify(settings, null, 2));
  console.log(`[connectionPromptFallback] Removed Azure connector sentinels from ${localSettingsPath}`);
  return { localSettingsPath, originalContents };
}

async function cancelVisibleQuickPickIfPresent(driver: WebDriver): Promise<boolean> {
  const quickInputVisible = await driver
    .executeScript<boolean>(
      'return Array.from(document.querySelectorAll(".quick-input-widget")).some((w) => {' +
        'const s = getComputedStyle(w);' +
        'return s.display !== "none" && s.visibility !== "hidden" && w.offsetParent !== null;' +
        '});'
    )
    .catch(() => false);

  if (!quickInputVisible) {
    return false;
  }

  console.log('[connectionPromptFallback] Cancelling visible QuickPick');
  await driver.actions().sendKeys(Key.ESCAPE).perform();
  await sleep(1000);
  return true;
}

describe('Connection prompt fallback E2E', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];
  let restoreLocalSettings: (() => void) | undefined;

  before(async function () {
    this.timeout(TEST_TIMEOUT);
    if (!fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      assert.fail(`Workspace manifest not found at ${WORKSPACE_MANIFEST_PATH} - Phase 4.1 must run first`);
      return;
    }

    manifest = loadWorkspaceManifest();
    if (manifest.length === 0) {
      assert.fail('Workspace manifest is empty - Phase 4.1 must create workspaces first');
      return;
    }

    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    if (process.env.LA_E2E_SKIP_VALIDATION_WAIT === '1') {
      console.log('[connectionPromptFallback] Skipping dependency validation wait by scenario setting');
    } else {
      await waitForExtensionValidationComplete(driver);
    }
  });

  afterEach(async () => {
    restoreLocalSettings?.();
    restoreLocalSettings = undefined;

    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    try {
      await new EditorView().closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(1000);
  });

  it('loads the local designer when Azure connector prompts are cancelled/defaulted', async () => {
    const entry =
      manifest.find((candidate) => candidate.appType === 'standard' && candidate.wfType === 'Stateful') ||
      manifest.find((candidate) => candidate.appType === 'standard');
    if (!entry) {
      assert.fail('No Standard workspace entry found in manifest');
      return;
    }

    const localSettingsSnapshot = removeAzureConnectorSentinels(entry.appDir);
    restoreLocalSettings = () => {
      if (localSettingsSnapshot.originalContents === undefined) {
        fs.rmSync(localSettingsSnapshot.localSettingsPath, { force: true });
      } else {
        fs.writeFileSync(localSettingsSnapshot.localSettingsPath, localSettingsSnapshot.originalContents);
      }
    };

    await openWorkspaceFileInSession(workbench, entry.wsFilePath);
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    await sleep(4000);
    await clearBlockingUI(driver);

    const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
    const opened = await openDesignerViaExplorer(driver, workflowJsonPath, entry.wfName || 'workflow', false, true);
    assert.ok(opened, 'Designer should open even when Azure connector settings are missing');

    await driver.switchTo().defaultContent();
    await cancelVisibleQuickPickIfPresent(driver);
    await dismissAllDialogs(driver);
    await dismissNotifications(driver);

    const webview = await switchToDesignerWebview(driver);
    assert.ok(webview, 'Designer webview should load after connector prompt cancellation/default');

    await driver.switchTo().defaultContent();
    const localSettings = JSON.parse(fs.readFileSync(path.join(entry.appDir, 'local.settings.json'), 'utf-8'));
    assert.strictEqual(localSettings.Values?.WORKFLOWS_SUBSCRIPTION_ID, '', 'Cancellation should persist Azure connectors disabled');
    assert.strictEqual(
      localSettings.Values?.WORKFLOWS_AUTHENTICATION_METHOD,
      'managedServiceIdentity',
      'Cancellation should default to managed service identity'
    );
  });
});

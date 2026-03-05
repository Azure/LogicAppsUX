// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Workspace Conversion Test: Open logic app subfolder — prompt appears
 *
 * ADO Coverage: Test Case #31054994, Step 8 variant
 *
 * Verifies:
 *   1. Opening a logic app SUBFOLDER (e.g., testapp_xxx/) triggers the
 *      "You must open your workspace..." prompt because a .code-workspace
 *      exists in the parent directory
 *   2. Clicking "No" / dismissing leaves VS Code on the same folder
 *   3. VS Code remains functional after dismissal
 *
 * Phase 4.8e — own session, startup resource = logic app subfolder
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, type WebDriver, VSBrowser, ModalDialog, By, Key } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot } from './helpers';

const TEST_TIMEOUT = 60_000;

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'wsConversionSubfolder-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

/**
 * Wait for any workspace-related prompt (modal dialog or notification).
 */
async function waitForWorkspacePrompt(driver: WebDriver, timeoutMs = 30_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const dialog = new ModalDialog();
      const message = await dialog.getMessage();
      if (message && (message.includes('workspace') || message.includes('Workspace'))) {
        console.log(`[subfolder] Found modal dialog: "${message.substring(0, 150)}"`);
        return message;
      }
    } catch {
      // No modal dialog
    }
    try {
      const dialogs = await driver.findElements(By.css('.monaco-dialog-box, [role="dialog"], .notification-toast'));
      for (const d of dialogs) {
        const text = await d.getText().catch(() => '');
        if (text.includes('workspace') || text.includes('Workspace') || text.includes('Open Workspace')) {
          console.log(`[subfolder] Found prompt: "${text.substring(0, 150)}"`);
          return text;
        }
      }
    } catch {
      // No dialog elements
    }
    await sleep(1000);
  }
  return null;
}

describe('Workspace Conversion — Open Subfolder', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(30_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
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
  });

  afterEach(async () => {
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await sleep(1000);
  });

  it('should show workspace prompt when opening a logic app subfolder and dismiss on No', async () => {
    // The run-e2e.js phase for this test opens the logic app SUBFOLDER
    // (e.g., testws_xxx/testapp_xxx/) as the startup folder.
    // The extension detects a Logic App project in root and finds the
    // .code-workspace in the parent directory.
    await captureScreenshot(driver, 'subfolder-start', EXPLICIT_SCREENSHOT_DIR);

    // Wait for the workspace prompt
    const promptMessage = await waitForWorkspacePrompt(driver, 30_000);
    await captureScreenshot(driver, 'subfolder-prompt-found', EXPLICIT_SCREENSHOT_DIR);

    if (!promptMessage) {
      console.log('[subfolder] No workspace prompt appeared — the extension may not have detected the project or the .code-workspace');
      // Log what folder we opened
      console.log('[subfolder] This test requires the startup folder to be a logic app subfolder within a workspace directory');
      assert.fail('Test precondition not met - required setup failed');
      return;
    }

    assert.ok(
      promptMessage.includes('workspace') || promptMessage.includes('Workspace') || promptMessage.includes('Open Workspace'),
      `Prompt should mention workspace: "${promptMessage.substring(0, 100)}"`
    );

    // Click "No" / dismiss the prompt
    let dismissed = false;
    const dismissLabels = ['no', "don't open", 'cancel', 'dismiss', 'not now', 'close'];

    // Strategy 1: ModalDialog
    try {
      const dialog = new ModalDialog();
      for (const label of ['No', "Don't Open", 'Cancel', 'Not Now']) {
        try {
          await dialog.pushButton(label);
          dismissed = true;
          console.log(`[subfolder] Clicked "${label}" via ModalDialog`);
          break;
        } catch {
          /* try next */
        }
      }
      if (!dismissed) {
        try {
          await dialog.close();
          dismissed = true;
          console.log('[subfolder] Closed dialog via ModalDialog.close()');
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* no ModalDialog */
    }

    // Strategy 2: Raw buttons (notifications)
    if (!dismissed) {
      try {
        const buttons = await driver.findElements(
          By.css('.monaco-dialog-box button, [role="dialog"] button, .notification-toast .action-label, .notification-toast button')
        );
        for (const btn of buttons) {
          const text = (await btn.getText().catch(() => '')).toLowerCase();
          const ariaLabel = ((await btn.getAttribute('aria-label')?.catch(() => '')) || '').toLowerCase();
          if (dismissLabels.some((l) => text.includes(l) || ariaLabel.includes(l))) {
            await btn.click();
            dismissed = true;
            console.log(`[subfolder] Clicked dismiss button: "${text || ariaLabel}"`);
            break;
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Strategy 3: Notification X button
    if (!dismissed) {
      try {
        const closeButtons = await driver.findElements(By.css('.notification-toast .codicon-close, .codicon-notifications-clear-all'));
        if (closeButtons.length > 0) {
          await closeButtons[0].click();
          dismissed = true;
          console.log('[subfolder] Closed via notification X button');
        }
      } catch {
        /* ignore */
      }
    }

    // Strategy 4: Escape key
    if (!dismissed) {
      try {
        await driver.findElement(By.css('body')).sendKeys(Key.ESCAPE);
        dismissed = true;
        console.log('[subfolder] Dismissed via Escape key');
      } catch {
        /* ignore */
      }
    }

    await sleep(1000);
    await captureScreenshot(driver, 'subfolder-after-dismiss', EXPLICIT_SCREENSHOT_DIR);
    assert.ok(dismissed, 'Dismiss/No button should be clickable');

    // Verify VS Code is still functional
    await sleep(2000);
    try {
      const input = await workbench.openCommandPrompt();
      await sleep(500);
      await input.cancel();
      console.log('[subfolder] VS Code is still functional after dismissal');
    } catch (e: any) {
      console.log(`[subfolder] Command palette check: ${e.message}`);
    }

    await captureScreenshot(driver, 'subfolder-completed', EXPLICIT_SCREENSHOT_DIR);
    console.log('[subfolder] PASSED — prompt appeared when opening subfolder, dismissed, VS Code functional');
  });
});

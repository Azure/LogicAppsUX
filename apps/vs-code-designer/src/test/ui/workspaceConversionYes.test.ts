// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Workspace Conversion Test: Click "Yes" on workspace open dialog
 *
 * ADO Coverage: Test Case #31054994, Steps 5-7
 *
 * Verifies:
 *   1. Opening a workspace DIRECTORY (not .code-workspace file) triggers
 *      the "You must open your workspace..." prompt
 *   2. Clicking "Yes" is successful (the button is clickable)
 *
 * NOTE: Clicking "Yes" causes VS Code to reload (opens the .code-workspace),
 * which terminates the Selenium session. We can verify the dialog appeared
 * and the button click succeeded, but cannot verify the post-reload state.
 * The actual reload behavior is covered by CLI integration tests in
 * workspaceConversion.test.ts.
 *
 * Phase 4.8d — own session, startup resource = workspace directory
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { type WebDriver, VSBrowser, ModalDialog, By } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot } from './helpers';

const TEST_TIMEOUT = 60_000;

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'wsConversionYes-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

/**
 * Wait for the workspace prompt (notification or modal dialog).
 * Returns the message text, or null if not found.
 */
async function waitForWorkspacePrompt(driver: WebDriver, timeoutMs = 30_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Check ModalDialog
    try {
      const dialog = new ModalDialog();
      const message = await dialog.getMessage();
      if (message && (message.includes('workspace') || message.includes('Workspace'))) {
        console.log(`[conversionYes] Found modal dialog: "${message.substring(0, 150)}"`);
        return message;
      }
    } catch {
      // No modal dialog
    }
    // Check notification/raw dialog
    try {
      const dialogs = await driver.findElements(By.css('.monaco-dialog-box, [role="dialog"], .notification-toast'));
      for (const d of dialogs) {
        const text = await d.getText().catch(() => '');
        if (text.includes('workspace') || text.includes('Workspace') || text.includes('Open Workspace')) {
          console.log(`[conversionYes] Found prompt: "${text.substring(0, 150)}"`);
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

describe('Workspace Conversion — Click Yes', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
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
  });

  it('should show workspace prompt and successfully click Yes', async () => {
    await captureScreenshot(driver, 'conversion-yes-start', EXPLICIT_SCREENSHOT_DIR);

    // Wait for the prompt
    const promptMessage = await waitForWorkspacePrompt(driver, 30_000);
    await captureScreenshot(driver, 'conversion-yes-prompt-found', EXPLICIT_SCREENSHOT_DIR);

    if (!promptMessage) {
      console.log('[conversionYes] No workspace prompt appeared — skipping');
      assert.fail('Test precondition not met - required setup failed');
      return;
    }

    assert.ok(
      promptMessage.includes('workspace') || promptMessage.includes('Workspace') || promptMessage.includes('Open Workspace'),
      `Prompt should mention workspace: "${promptMessage.substring(0, 100)}"`
    );

    // Click "Yes" / "Open Workspace" / accept button
    let clicked = false;

    // Strategy 1: Notification action buttons
    // VS Code shows workspace prompt as a notification with "Open Workspace" as the title.
    // The action button may be hidden behind "more actions..." or may be the notification itself.
    try {
      // First try clicking the notification's primary action directly
      const actionBtns = await driver.findElements(
        By.css('.notification-toast .action-label, .notification-list-item .action-label, .notifications-list-container .action-label')
      );
      console.log(`[conversionYes] Found ${actionBtns.length} notification action button(s)`);
      for (const btn of actionBtns) {
        const text = (await btn.getText().catch(() => '')).toLowerCase();
        const ariaLabel = ((await btn.getAttribute('aria-label')?.catch(() => '')) || '').toLowerCase();
        console.log(`[conversionYes]   Action: text="${text}" aria="${ariaLabel}"`);
        if (text.includes('open workspace') || ariaLabel.includes('open workspace')) {
          await btn.click();
          clicked = true;
          console.log('[conversionYes] Clicked "Open Workspace" notification action');
          break;
        }
        // Click "more actions..." to reveal hidden actions
        if (ariaLabel.includes('more actions')) {
          await btn.click();
          await sleep(500);
          // Look for the action in the expanded menu
          const menuItems = await driver.findElements(By.css('.context-view .action-label, .monaco-menu .action-label'));
          for (const mi of menuItems) {
            const miText = (await mi.getText().catch(() => '')).toLowerCase();
            if (miText.includes('open workspace') || miText.includes('open')) {
              await mi.click();
              clicked = true;
              console.log(`[conversionYes] Clicked "${miText}" from more actions menu`);
              break;
            }
          }
          if (clicked) {
            break;
          }
          await driver.actions().sendKeys(Key.ESCAPE).perform();
        }
      }
    } catch {
      /* ignore */
    }

    // Strategy 1b: Click the notification body/title itself via JS
    // VS Code's "Open Workspace" may use the notification title as the action.
    if (!clicked) {
      try {
        const clickedNotif = await driver.executeScript<boolean>(`
          var notifs = document.querySelectorAll(
            '.notification-toast, .notification-list-item, .notifications-toasts .notification-list-item'
          );
          for (var i = 0; i < notifs.length; i++) {
            var text = (notifs[i].textContent || '').toLowerCase();
            if (text.includes('open workspace') || text.includes('workspace')) {
              var msg = notifs[i].querySelector('.notification-list-item-message, .notification-message');
              if (msg) { msg.click(); return true; }
              var link = notifs[i].querySelector('a');
              if (link) { link.click(); return true; }
              notifs[i].click();
              return true;
            }
          }
          return false;
        `);
        if (clickedNotif) {
          clicked = true;
          console.log('[conversionYes] Clicked notification body/title via JS');
        }
      } catch {
        /* ignore */
      }
    }

    // Strategy 2: ModalDialog
    if (!clicked) {
      try {
        const dialog = new ModalDialog();
        await dialog.pushButton('Yes');
        clicked = true;
        console.log('[conversionYes] Clicked "Yes" via ModalDialog');
      } catch {
        try {
          const dialog2 = new ModalDialog();
          for (const label of ['Open', 'Open Workspace', 'OK']) {
            try {
              await dialog2.pushButton(label);
              clicked = true;
              console.log(`[conversionYes] Clicked "${label}" via ModalDialog`);
              break;
            } catch {
              /* try next */
            }
          }
        } catch {
          /* no ModalDialog */
        }
      }
    }

    // Strategy 3: Raw button selectors (for notifications)
    if (!clicked) {
      try {
        const buttons = await driver.findElements(
          By.css('.monaco-dialog-box button, [role="dialog"] button, .notification-toast button, .notification-toast .action-label')
        );
        for (const btn of buttons) {
          const text = (await btn.getText().catch(() => '')).toLowerCase();
          const ariaLabel = ((await btn.getAttribute('aria-label')?.catch(() => '')) || '').toLowerCase();
          if (text.includes('yes') || text.includes('open') || ariaLabel.includes('open workspace') || ariaLabel.includes('yes')) {
            await btn.click();
            clicked = true;
            console.log(`[conversionYes] Clicked "${text || ariaLabel}" via raw selector`);
            break;
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Strategy 4: JS click on notification action
    if (!clicked) {
      try {
        clicked =
          (await driver.executeScript<boolean>(`
          var btns = document.querySelectorAll('.notification-toast .action-label, .notification-toast button, [role="dialog"] button');
          for (var i = 0; i < btns.length; i++) {
            var text = (btns[i].textContent || '').toLowerCase();
            var aria = (btns[i].getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('yes') || text.includes('open') || aria.includes('open workspace')) {
              btns[i].click();
              return true;
            }
          }
          return false;
        `)) ?? false;
        if (clicked) {
          console.log('[conversionYes] Clicked via JS injection');
        }
      } catch {
        /* ignore */
      }
    }

    await sleep(1000);
    await captureScreenshot(driver, 'conversion-yes-after-click', EXPLICIT_SCREENSHOT_DIR);
    assert.ok(clicked, '"Yes" / "Open Workspace" button should be clickable');

    // After clicking Yes, VS Code may reload (killing the Selenium session).
    // Wait briefly to see if we're still alive — if so, the click succeeded
    // but the reload hasn't happened yet, which is fine.
    await sleep(3000);
    console.log('[conversionYes] PASSED — prompt appeared, accept button clicked');
  });
});

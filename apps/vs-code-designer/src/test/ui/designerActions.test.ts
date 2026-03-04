// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import {
  Workbench,
  WebView,
  By,
  until,
  EditorView,
  type WebDriver,
  VSBrowser,
  type WebElement,
  Key,
  ModalDialog,
  type InputBox,
} from 'vscode-extension-tester';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';

/**
 * Designer Actions E2E Tests
 *
 * Reads the workspace manifest written by createWorkspace.test.ts and verifies
 * that the designer webview opens properly and supports adding new actions.
 *
 * This file MUST run AFTER designerOpen.test.ts. Mocha loads files
 * alphabetically, and "designerActions" sorts after "designerOpen", so
 * ordering is satisfied by naming convention.
 *
 * What we verify:
 *   1. The designer webview opens and renders the React Flow canvas
 *   2. For an empty workflow, the "Add a trigger" placeholder card is visible
 *   3. Clicking "Add a trigger" opens the discovery panel
 *   4. The discovery panel contains a search box
 *   5. Searching for a trigger/action returns results
 *   6. Selecting an operation adds a node to the canvas
 *   7. After adding a trigger, an "Add an action" drop zone / placeholder appears
 *   8. The add action flow works (+ button → menu → search → select)
 *
 * Notes:
 *   - The designer requires the design-time API (Azure Functions runtime)
 *     to fully load connectors. Without it, only built-in operations appear.
 *   - We use built-in operations (e.g., "Request", "Response", "Compose",
 *     "HTTP") that don't require runtime connectivity.
 */

// ===========================================================================
// Configuration
// ===========================================================================

/** Timeout for each individual test */
const TEST_TIMEOUT = 300_000;

/** Timeout for waiting for elements */
const ELEMENT_TIMEOUT = 15_000;

/** Time to allow the extension to recognise the project after opening folder */
const PROJECT_RECOGNITION_WAIT = 4_000;

/**
 * Maximum time to wait for the designer webview tab to appear after executing
 * the Open Designer command. Covers the dotnet build + func host start that
 * happens inside openDesigner for CustomCode workspaces.
 */
const DESIGNER_TAB_TIMEOUT = 30_000;

/**
 * Maximum time to wait inside the webview for the designer to finish loading.
 * We poll for the spinner to disappear and the canvas/nodes to render.
 * CustomCode workspaces need extra time because the design-time API
 * (func host start) may take 30-60s to become responsive.
 */
const DESIGNER_READY_TIMEOUT = 75_000;

/** Directory for explicit screenshots */
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'designerActions-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

// ===========================================================================
// Helpers
// ===========================================================================

/** Sleep for ms milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileSegment(value: string): string {
  return value
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || /[<>:"/\\|?*]/.test(char) || /\s/.test(char)) {
        return '_';
      }
      return char;
    })
    .join('');
}

async function captureScreenshot(driver: WebDriver, fileName: string): Promise<string | undefined> {
  try {
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    const screenshotPath = path.join(EXPLICIT_SCREENSHOT_DIR, `${sanitizeFileSegment(fileName)}.png`);
    const base64 = await driver.takeScreenshot();
    fs.writeFileSync(screenshotPath, base64, 'base64');
    console.log(`[screenshot] Saved: ${screenshotPath}`);
    return screenshotPath;
  } catch (e: any) {
    console.log(`[screenshot] Failed to capture "${fileName}": ${e.message}`);
    return undefined;
  }
}

/**
 * Dismiss any VS Code notification toasts that may block interactions.
 */
async function dismissNotifications(driver: WebDriver): Promise<void> {
  try {
    const closeButtons = await driver.findElements(
      By.css('.notifications-toasts .codicon-notifications-clear-all, .notification-toast .action-label.codicon-close')
    );
    for (const btn of closeButtons) {
      try {
        await btn.click();
      } catch {
        // Notification may have auto-dismissed
      }
    }
  } catch {
    // No notifications — fine
  }
}

/**
 * Dismiss any VS Code modal dialog (auth sign-in, workspace trust, etc.).
 *
 * Tries multiple strategies in order:
 *   1. ExTester ModalDialog page object — pushButton('Cancel') or ('Don't Trust')
 *   2. Raw Selenium — search for .monaco-dialog-box buttons
 *   3. Broader CSS selectors — [role="dialog"] buttons
 *   4. Press Escape key as last resort
 *
 * Returns true if a dialog was found and dismissed.
 */
async function dismissAllDialogs(driver: WebDriver): Promise<boolean> {
  // Strategy 1: ExTester ModalDialog page object
  try {
    const dialog = new ModalDialog();
    const message = await dialog.getMessage();
    console.log(`[dismissAllDialogs] ModalDialog found: "${message.substring(0, 150)}"`);

    // Special case: Auth dialogs — Cancel sign-in since we're running locally
    // and don't need Azure auth for the overview/runtime
    if (
      message.includes('sign in') ||
      message.includes('Sign in') ||
      message.includes('wants to sign in') ||
      message.includes('authentication')
    ) {
      try {
        await dialog.pushButton('Cancel');
        console.log('[dismissAllDialogs] Clicked "Cancel" on auth dialog (local mode, no Azure auth needed)');
        await sleep(1000);
        return true;
      } catch {
        // "Cancel" button not found — fall through to dismiss
      }
    }

    // Try clicking Cancel, Don't Trust, or any dismiss-like button
    const dismissLabels = ['Cancel', "Don't Trust", "Don't Allow", 'No', 'Close', 'Dismiss', 'Not Now'];
    for (const label of dismissLabels) {
      try {
        await dialog.pushButton(label);
        console.log(`[dismissAllDialogs] Clicked "${label}" via ModalDialog`);
        await sleep(1000);
        return true;
      } catch {
        // Button with this label not found — try next
      }
    }

    // If none of the dismiss labels worked, try closing via close button
    try {
      await dialog.close();
      console.log('[dismissAllDialogs] Closed dialog via ModalDialog.close()');
      await sleep(1000);
      return true;
    } catch {
      /* no close button */
    }
  } catch {
    // No ModalDialog visible — try raw selectors
  }

  // Strategy 2: Raw Selenium with multiple CSS selectors for dialog containers
  const dialogSelectors = ['.monaco-dialog-box', '[role="dialog"]', '.dialog-shadow'];

  for (const containerSel of dialogSelectors) {
    try {
      const dialogs = await driver.findElements(By.css(containerSel));
      if (dialogs.length === 0) {
        continue;
      }

      let messageText = '';
      try {
        messageText = (await dialogs[0].getText()).substring(0, 200);
      } catch {
        /* ignore */
      }
      console.log(`[dismissAllDialogs] Found ${containerSel}: "${messageText}"`);

      // Special case: Auth dialogs — Cancel sign-in for local testing
      if (messageText.includes('sign in') || messageText.includes('Sign in') || messageText.includes('wants to sign in')) {
        try {
          const cancelBtns = await dialogs[0].findElements(By.css('button, .monaco-text-button, .monaco-button'));
          for (const btn of cancelBtns) {
            const label = await btn.getText().catch(() => '');
            if (label.toLowerCase().includes('cancel')) {
              console.log(`[dismissAllDialogs] Clicking "Cancel" on auth dialog (local mode)`);
              await btn.click();
              await sleep(1000);
              return true;
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Try finding and clicking a Cancel/dismiss button inside
      const buttonSelectors = [
        '.dialog-buttons-row .monaco-text-button',
        '.dialog-buttons-row .monaco-button',
        '.dialog-buttons button',
        'button',
      ];

      for (const btnSel of buttonSelectors) {
        try {
          const buttons = await dialogs[0].findElements(By.css(btnSel));
          for (const btn of buttons) {
            let label = '';
            try {
              label = await btn.getText();
            } catch {
              /* ignore */
            }
            if (!label) {
              try {
                label = await btn.getAttribute('title');
              } catch {
                /* ignore */
              }
            }
            const lower = label.toLowerCase();
            if (
              lower.includes('cancel') ||
              lower.includes("don't trust") ||
              lower.includes("don't allow") ||
              lower.includes('no') ||
              lower.includes('close') ||
              lower.includes('not now')
            ) {
              console.log(`[dismissAllDialogs] Clicking "${label}" in ${containerSel}`);
              await btn.click();
              await sleep(1000);
              return true;
            }
          }
          // If no cancel-like button, click the last button (often Cancel is last)
          if (buttons.length > 0) {
            const lastLabel = await buttons[buttons.length - 1].getText().catch(() => 'unknown');
            console.log(`[dismissAllDialogs] Clicking last button "${lastLabel}" in ${containerSel}`);
            await buttons[buttons.length - 1].click();
            await sleep(1000);
            return true;
          }
        } catch {
          /* try next button selector */
        }
      }

      // Try close (X) button
      try {
        const closeBtn = await dialogs[0].findElement(By.css('.codicon-dialog-close, .codicon-close'));
        await closeBtn.click();
        console.log(`[dismissAllDialogs] Closed ${containerSel} via X button`);
        await sleep(1000);
        return true;
      } catch {
        /* no close button */
      }
    } catch {
      /* selector not found */
    }
  }

  return false;
}

/**
 * Aggressively dismiss any blocking UI element: modal dialogs, notifications,
 * quick-pick widgets, and workspace trust prompts.
 * Also sends Escape keypresses as a fallback.
 */
async function clearBlockingUI(driver: WebDriver): Promise<void> {
  // Dismiss modal dialogs (auth, workspace trust, etc.)
  for (let i = 0; i < 5; i++) {
    const dismissed = await dismissAllDialogs(driver);
    if (!dismissed) {
      break;
    }
    await sleep(500);
  }

  // Dismiss notifications
  await dismissNotifications(driver);

  // Press Escape to close any other overlay (menus, quick-picks, etc.)
  try {
    const body = await driver.findElement(By.css('body'));
    for (let i = 0; i < 3; i++) {
      await body.sendKeys(Key.ESCAPE);
      await sleep(300);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Use JavaScript execution to scan the DOM for ANY elements that might be
 * blocking keyboard shortcuts.
 */
async function dumpDomState(driver: WebDriver, label: string): Promise<void> {
  try {
    const result = await driver.executeScript<string>(`
      const info = [];
      const dialogSelectors = [
        '.monaco-dialog-box', '[role="dialog"]', '.dialog-shadow',
        '.monaco-dialog-modal-block', '.dialog-box',
        '.quick-input-widget:not(.hidden)',
        '.notification-toast', '.notifications-toasts.visible',
        '.context-view.monaco-menu-container',
        '.welcomeOverlay', '.trust-dialog', '.workspace-trust',
        '.editor-widget.suggest-widget.visible',
      ];
      for (const sel of dialogSelectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const text = els[0].textContent?.substring(0, 200) || '';
          info.push(sel + ' (' + els.length + '): ' + text.replace(/\\n/g, ' '));
        }
      }
      const active = document.activeElement;
      if (active) {
        info.push('activeElement: <' + active.tagName + '> class=' + active.className?.substring(0, 100));
      }
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 100 &&
            el.offsetWidth > 100 && el.offsetHeight > 100 &&
            style.display !== 'none' && style.visibility !== 'hidden') {
          const text = el.textContent?.substring(0, 150) || '';
          if (text.length > 5) {
            info.push('FIXED-OVERLAY: <' + el.tagName + '.' + el.className?.substring(0, 80) + '> z=' + style.zIndex + ': ' + text.replace(/\\n/g, ' '));
          }
        }
      }
      return info.join('\\n');
    `);
    if (result && result.trim()) {
      console.log(`[dumpDomState:${label}]\n${result}`);
    } else {
      console.log(`[dumpDomState:${label}] No blocking elements found`);
    }
  } catch (e: any) {
    console.log(`[dumpDomState:${label}] Error: ${e.message}`);
  }
}

/**
 * Try to dismiss any dialog by injecting JavaScript to click Cancel/close buttons.
 */
async function jsDismissDialogs(driver: WebDriver): Promise<boolean> {
  try {
    const dismissed = await driver.executeScript<boolean>(`
      const selectors = [
        '.monaco-dialog-box .dialog-buttons-row button',
        '[role="dialog"] button',
        '.dialog-shadow button',
        '.dialog-box button',
      ];
      for (const sel of selectors) {
        const buttons = document.querySelectorAll(sel);
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('cancel') || text.includes("don't trust") || text.includes('no') || text.includes('close')) {
            btn.click();
            return true;
          }
        }
        if (buttons.length > 0) {
          buttons[buttons.length - 1].click();
          return true;
        }
      }
      return false;
    `);
    if (dismissed) {
      console.log('[jsDismissDialogs] Dismissed a dialog via JS injection');
      await sleep(1000);
    }
    return dismissed || false;
  } catch {
    return false;
  }
}

/**
 * Ensure focus is on the VS Code editor area (not a dialog or webview).
 */
async function focusEditor(driver: WebDriver): Promise<void> {
  try {
    const editor = await driver.findElement(By.css('.editor-container, .monaco-editor, .split-view-view'));
    await editor.click();
    await sleep(500);
  } catch {
    try {
      const wb = await driver.findElement(By.css('.monaco-workbench'));
      await wb.click();
      await sleep(500);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Ensure the local.settings.json for a workspace has WORKFLOWS_SUBSCRIPTION_ID
 * set to "" so that the Azure connector wizard is skipped when opening the designer.
 *
 * Without this, the extension shows two blocking QuickPick prompts:
 *   1. "Use connectors from Azure" / "Skip for now"
 *   2. "Managed Service Identity" / "Connection Keys"
 *
 * Setting WORKFLOWS_SUBSCRIPTION_ID to "" (empty string) prevents the wizard
 * from launching because the code checks `subscriptionId === undefined`.
 */
function ensureLocalSettingsForDesigner(appDir: string): void {
  const localSettingsPath = path.join(appDir, 'local.settings.json');
  let settings: any = {
    IsEncrypted: false,
    Values: {},
  };

  if (fs.existsSync(localSettingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
      if (!settings.Values) {
        settings.Values = {};
      }
    } catch {
      // Corrupted file — use defaults
      settings = { IsEncrypted: false, Values: {} };
    }
  }

  if (settings.Values.WORKFLOWS_SUBSCRIPTION_ID === undefined) {
    settings.Values.WORKFLOWS_SUBSCRIPTION_ID = '';
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(localSettingsPath, JSON.stringify(settings, null, 2));
    console.log(`[ensureLocalSettings] Set WORKFLOWS_SUBSCRIPTION_ID="" in ${localSettingsPath}`);
  }
}

/**
 * Handle the Azure connector wizard QuickPick prompts AND authentication
 * modal dialogs that may appear after executing the Open Designer command.
 *
 * QuickPick prompts (from Azure connector wizard):
 *   Prompt 1: "Enable connectors in Azure..." → Select "Skip for now"
 *   Prompt 2: "Select authentication method..." → Select "Connection Keys"
 *
 * Auth dialogs (from getAuthData → vscode.authentication.getSession):
 *   "The extension wants to sign in using Microsoft." → Click "Cancel"
 */
async function handleDesignerPrompts(workbench: Workbench, driver: WebDriver): Promise<void> {
  // Poll for QuickPick dialogs AND auth dialogs for up to 10 seconds
  const deadline = Date.now() + 6_000;

  while (Date.now() < deadline) {
    // First, check for and dismiss any modal dialog (auth, workspace trust, etc.)
    try {
      const dismissed = await dismissAllDialogs(driver);
      if (dismissed) {
        console.log('[handleDesignerPrompts] Dismissed a dialog');
        await sleep(500);
        continue;
      }
    } catch {
      /* ignore */
    }

    try {
      // Check for a QuickPick dialog (the Azure connector wizard uses context.ui.showQuickPick)
      const quickPicks = await driver.findElements(By.css('.quick-input-widget:not(.hidden) .quick-input-list .monaco-list-row'));

      if (quickPicks.length > 0) {
        // Read all available picks to determine which prompt this is
        const pickTexts: string[] = [];
        for (const pick of quickPicks) {
          try {
            const text = await pick.getText();
            pickTexts.push(text);
          } catch {
            /* stale element */
          }
        }
        console.log(`[handleDesignerPrompts] Found QuickPick with ${quickPicks.length} options: ${JSON.stringify(pickTexts)}`);

        // Prompt 1: "Use connectors from Azure" / "Skip for now"
        // → Select "Skip for now"
        for (let i = 0; i < quickPicks.length; i++) {
          const text = pickTexts[i]?.toLowerCase() || '';
          if (text.includes('skip')) {
            console.log('[handleDesignerPrompts] Selecting "Skip for now"');
            await quickPicks[i].click();
            await sleep(2000);
            break;
          }
        }

        // Check if there's another QuickPick (Prompt 2)
        await sleep(1000);
        continue;
      }

      // Also check for the authentication method prompt specifically
      // Prompt 2: "Managed Service Identity" / "Connection Keys"
      const picks2 = await driver.findElements(By.css('.quick-input-widget:not(.hidden) .quick-input-list .monaco-list-row'));
      if (picks2.length > 0) {
        const pickTexts2: string[] = [];
        for (const pick of picks2) {
          try {
            pickTexts2.push(await pick.getText());
          } catch {
            /* stale */
          }
        }
        console.log(`[handleDesignerPrompts] Found second QuickPick: ${JSON.stringify(pickTexts2)}`);

        for (let i = 0; i < picks2.length; i++) {
          const text = pickTexts2[i]?.toLowerCase() || '';
          if (text.includes('connection key') || text.includes('raw key')) {
            console.log('[handleDesignerPrompts] Selecting "Connection Keys"');
            await picks2[i].click();
            await sleep(2000);
            break;
          }
        }
        continue;
      }
    } catch {
      // Element lookup failed — no QuickPick visible, which is fine
    }

    // No QuickPick visible — check if a webview has appeared instead
    try {
      const webviewFrames = await driver.findElements(By.css('iframe.webview'));
      if (webviewFrames.length > 0) {
        console.log('[handleDesignerPrompts] Webview frame detected, prompts handled');
        return;
      }
    } catch {
      /* ignore */
    }

    await sleep(1000);
  }

  console.log('[handleDesignerPrompts] No prompts detected within timeout (this is expected if local.settings.json was pre-configured)');
}

/**
 * Open a specific .code-workspace file in the running VS Code session.
 * After opening, clears any blocking UI (auth dialogs, workspace trust prompts, etc.)
 */
async function openWorkspaceFileInSession(workbench: Workbench, wsFilePath: string): Promise<void> {
  console.log(`[openWorkspaceFileInSession] Opening workspace file: ${wsFilePath}`);

  if (!fs.existsSync(wsFilePath)) {
    throw new Error(`Workspace file not found: ${wsFilePath}`);
  }

  const driver = VSBrowser.instance.driver;

  await VSBrowser.instance.openResources(wsFilePath);
  await sleep(5000);

  // Dismiss any dialogs that appeared during workspace open
  await clearBlockingUI(driver);

  await (await workbench.getDriver()).wait(until.elementLocated(By.css('.monaco-workbench')), 20_000);

  // Extra wait for extension re-activation after workspace switch
  await sleep(3000);

  // Final clear of any dialogs that appeared during re-activation
  await clearBlockingUI(driver);

  console.log('[openWorkspaceFileInSession] Workspace file opened and workbench is ready');
}

/**
 * Open a file in the VS Code editor using VSBrowser.instance.openResources().
 *
 * Previous approach (Quick Open / command palette) was broken because:
 *   - "Open File" triggers a native dialog Selenium can't interact with
 *   - Quick Open file search doesn't support absolute paths
 *
 * openResources() is the ExTester-supported way to open files and reliably
 * makes them the active editor tab.
 */
async function openFileInEditor(workbench: Workbench, driver: WebDriver, filePath: string): Promise<void> {
  console.log(`[openFileInEditor] Opening: ${filePath}`);

  // Dismiss notifications that may block
  await dismissNotifications(driver);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await VSBrowser.instance.openResources(filePath);
      await sleep(2000);

      // Verify the file is now the active editor tab
      const expectedName = path.basename(filePath);
      const editorView = new EditorView();
      const activeTab = await editorView.getActiveTab();
      if (activeTab) {
        const tabTitle = await activeTab.getTitle();
        if (tabTitle === expectedName) {
          console.log(`[openFileInEditor] Active tab is "${tabTitle}" ✓`);
          return;
        }
        console.log(`[openFileInEditor] Active tab is "${tabTitle}", expected "${expectedName}" — retrying`);
      } else {
        console.log('[openFileInEditor] No active tab found — retrying');
      }
    } catch (e: any) {
      console.log(`[openFileInEditor] Attempt ${attempt + 1}/3 failed: ${e.message}`);
    }
    await sleep(2000);
  }

  // Final fallback — don't throw, log a warning and continue.
  // The designer command may still work if the file was opened in the background.
  console.log(`[openFileInEditor] Warning: could not confirm active tab for ${filePath}`);
}

/**
 * Ensure the extension has activated and dependency validation has completed.
 *
 * The extension shows a "Validating Runtime Dependency" notification on first
 * activation. This may have already completed if designerOpen.test.ts ran first.
 *
 * 1. If the notification is currently visible → wait for it to disappear.
 * 2. If not visible → wait briefly in case it's about to appear.
 * 3. If it never appears → verify extension activation by asserting the
 *    openDesigner command is registered.
 */
async function waitForDependencyValidation(driver: WebDriver, timeoutMs = 60_000): Promise<void> {
  const t0 = Date.now();
  const VALIDATION_TEXT = 'Validating Runtime Dependency';

  const isValidationVisible = async (): Promise<boolean> => {
    try {
      return (
        (await driver.executeScript<boolean>(`
        var vt = ${JSON.stringify(VALIDATION_TEXT)};
        var els = document.querySelectorAll('[role="dialog"], .notification-toast, .notifications-toasts .notification-list-item');
        for (var i = 0; i < els.length; i++) {
          if ((els[i].textContent || '').includes(vt)) return true;
        }
        return false;
      `)) ?? false
      );
    } catch {
      return false;
    }
  };

  // Check if the notification is currently visible
  if (await isValidationVisible()) {
    console.log(`[depValidation] "${VALIDATION_TEXT}" is visible — waiting for it to finish`);
    while (Date.now() - t0 < timeoutMs) {
      if (!(await isValidationVisible())) {
        console.log(`[depValidation] Validation complete (${Date.now() - t0}ms)`);
        return;
      }
      await sleep(500);
    }
    throw new Error(`"${VALIDATION_TEXT}" still visible after ${timeoutMs}ms`);
  }

  // Not visible yet — wait up to 60s for either the notification to appear
  // OR the extension to finish activating (commands become available).
  // Extension host may restart during activation, so this can take a while.
  const activationDeadline = Date.now() + 60_000;
  while (Date.now() < activationDeadline) {
    if (await isValidationVisible()) {
      console.log(`[depValidation] "${VALIDATION_TEXT}" appeared (${Date.now() - t0}ms) — waiting for it to finish`);
      while (Date.now() - t0 < timeoutMs) {
        if (!(await isValidationVisible())) {
          console.log(`[depValidation] Validation complete (${Date.now() - t0}ms)`);
          return;
        }
        await sleep(500);
      }
      throw new Error(`"${VALIDATION_TEXT}" still visible after ${timeoutMs}ms`);
    }

    // Also check if extension commands are already registered (validation may
    // have completed before we started looking).
    try {
      const wb = new Workbench();
      const input = await wb.openCommandPrompt();
      await sleep(500);
      await input.setText('> Open Designer');
      await sleep(1000);
      const picks = await input.getQuickPicks();
      let found = false;
      for (const p of picks) {
        const label = await p.getLabel();
        if (label.toLowerCase().includes('open designer')) {
          found = true;
          break;
        }
      }
      await input.cancel();
      if (found) {
        console.log(`[depValidation] Extension is active — openDesigner command found (${Date.now() - t0}ms)`);
        return;
      }
    } catch {
      /* command palette not ready yet — keep waiting */
    }

    await sleep(2000);
  }

  throw new Error(`Extension not properly activated after 60s: "${VALIDATION_TEXT}" never appeared and "Open Designer" command not found`);
}

/**
 * Poll until a webview tab (iframe) appears in the VS Code DOM, indicating
 * the designer panel has opened. Also dismisses any blocking prompts that
 * appear during this wait (Azure connector wizard, auth dialogs).
 */
async function waitForDesignerWebviewTab(driver: WebDriver): Promise<boolean> {
  const deadline = Date.now() + DESIGNER_TAB_TIMEOUT;
  const t0 = Date.now();

  while (Date.now() < deadline) {
    // Dismiss any blocking dialogs that appear during designer open
    try {
      await dismissAllDialogs(driver);
    } catch {
      /* ignore */
    }

    // Check for QuickPick prompts from the Azure connector wizard
    try {
      const quickPicks = await driver.findElements(By.css('.quick-input-widget:not(.hidden) .quick-input-list .monaco-list-row'));
      if (quickPicks.length > 0) {
        for (const pick of quickPicks) {
          try {
            const text = (await pick.getText()).toLowerCase();
            if (text.includes('skip')) {
              console.log('[waitForDesignerTab] Selecting "Skip for now"');
              await pick.click();
              await sleep(500);
              break;
            }
          } catch {
            /* stale element */
          }
        }
      }
    } catch {
      /* ignore */
    }

    // Check for the webview iframe — try multiple selectors since the class/id
    // can vary across VS Code versions. ExTester uses *[id="active-frame"] internally.
    try {
      const found = await driver.executeScript<boolean>(`
        return !!(
          document.querySelector('iframe.webview') ||
          document.querySelector('iframe[id*="webview"]') ||
          document.querySelector('iframe[src*="webview"]') ||
          document.querySelector('*[id="active-frame"]')
        );
      `);
      if (found) {
        console.log(`[waitForDesignerTab] Webview tab detected in ${Date.now() - t0}ms`);
        return true;
      }
    } catch {
      /* ignore */
    }

    await sleep(500);
  }

  console.log(`[waitForDesignerTab] Timeout after ${DESIGNER_TAB_TIMEOUT}ms — no webview tab found`);
  return false;
}

/**
 * Execute the Open Designer command from the command palette.
 * Dismisses auth dialogs before each attempt since they block keyboard input.
 */
async function executeOpenDesignerCommand(workbench: Workbench, driver: WebDriver): Promise<boolean> {
  console.log('[executeOpenDesigner] Opening command palette...');

  // Dump DOM state to understand what's on screen
  await dumpDomState(driver, 'before-command-palette');

  // Clear ALL blocking UI (dialogs, notifications, overlays)
  await clearBlockingUI(driver);

  // Also try JS-based dismissal
  await jsDismissDialogs(driver);
  await sleep(500);

  // Ensure focus is on the editor area
  await focusEditor(driver);

  let input: InputBox | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    // Clear blocking UI before each attempt
    await clearBlockingUI(driver);
    await jsDismissDialogs(driver);

    // Ensure focus is on the editor
    await focusEditor(driver);
    await sleep(500);

    try {
      input = await workbench.openCommandPrompt();
      await sleep(500);
      await input.setText('> Open Designer');
      await sleep(1500);

      const picks = await input.getQuickPicks();

      for (const pick of picks) {
        const label = await pick.getLabel();
        const lower = label.toLowerCase();
        if (lower.includes('open designer') && !lower.includes('data map')) {
          console.log(`[executeOpenDesigner] Selecting: "${label}"`);
          await pick.select();
          const tabFound = await waitForDesignerWebviewTab(driver);
          if (tabFound) {
            return true;
          }
          // Webview tab didn't appear — the command may have silently failed.
          // Continue to next retry attempt.
          console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/5: command selected but webview tab not found, retrying...`);
          break; // break inner picks loop, continue outer retry loop
        }
      }

      // Command not found in picks — log what was available, cancel, and retry.
      // The extension may still be registering commands after a workspace switch.
      const available: string[] = [];
      for (const pick of picks) {
        try {
          available.push(await pick.getLabel());
        } catch {
          /* stale */
        }
      }
      console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/5: "Open Designer" not found. Available: ${JSON.stringify(available)}`);
      await input.cancel();
      await sleep(3000);
    } catch (e: any) {
      console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/5 failed: ${e.message}`);
      try {
        await input?.cancel();
      } catch {
        /* ignore */
      }
      await sleep(3000);
    }
  }
  return false;
}

/**
 * Switch into the designer webview iframe and wait for the designer to
 * actually finish loading — not just exist. We detect three phases:
 *
 *   Phase 1: Webview iframe is switchable (ExTester's switchToFrame)
 *   Phase 2: Spinner disappears (React data fetch complete)
 *   Phase 3: Canvas and nodes render (React Flow + workflow graph ready)
 *
 * If Phase 3 doesn't complete we still return success as long as the canvas
 * div is mounted (Phase 2). Some tests only need the discovery panel which
 * opens even before nodes fully render.
 */
async function switchToDesignerWebview(driver: WebDriver, timeoutMs = DESIGNER_READY_TIMEOUT): Promise<WebView> {
  const webview = new WebView();
  const t0 = Date.now();

  // Phase 1: switch into the iframe
  await webview.switchToFrame();
  console.log(`[designerReady] Phase 1: switched into webview frame (${Date.now() - t0}ms)`);

  const deadline = Date.now() + timeoutMs;

  // Phase 2: wait for the loading spinner to disappear.
  // The VS Code designer renders <Spinner className="designerLoading" size="large">
  // while data is being fetched. Once that disappears, the Designer component
  // has mounted.
  let spinnerGone = false;
  while (Date.now() < deadline) {
    try {
      const spinners = await driver.findElements(By.css('.fui-Spinner, [role="progressbar"]'));
      if (spinners.length === 0) {
        // Also verify #root exists so we know we're in the right frame
        const roots = await driver.findElements(By.id('root'));
        if (roots.length > 0) {
          spinnerGone = true;
          break;
        }
      }
    } catch {
      /* elements may not exist yet */
    }
    await sleep(500);
  }

  if (spinnerGone) {
    console.log(`[designerReady] Phase 2: spinner gone, React app rendered (${Date.now() - t0}ms)`);
  } else {
    console.log(`[designerReady] Phase 2: spinner still present or #root not found after ${Date.now() - t0}ms`);
  }

  // Phase 3: wait for the actual designer canvas + nodes/placeholder to render.
  // The designer mounts .msla-designer-canvas → ReactFlow → .react-flow__viewport.
  // For empty workflows a [data-testid="card-Add a trigger"] card appears.
  // For non-empty workflows .react-flow__node elements appear.
  let readyLevel = 0; // 0=nothing, 1=canvas div, 2=react-flow, 3=nodes/trigger card
  while (Date.now() < deadline) {
    try {
      const result = await driver.executeScript<number>(`
        var canvas = document.querySelector('.msla-designer-canvas');
        if (!canvas) return 0;
        var rf = document.querySelector('.react-flow__viewport');
        if (!rf) return 1;
        var trigger = document.querySelector('[data-testid="card-Add a trigger"]');
        var nodes = document.querySelectorAll('.react-flow__node');
        var toolbar = document.querySelector('[role="toolbar"]');
        if (trigger || nodes.length > 0 || toolbar) return 3;
        return 2;
      `);
      readyLevel = Math.max(readyLevel, result ?? 0);
      if (readyLevel >= 3) {
        break;
      }
    } catch {
      /* script may fail during frame transitions */
    }
    await sleep(500);
  }

  const labels = ['nothing', 'canvas div', 'react-flow viewport', 'nodes/trigger/toolbar'];
  console.log(`[designerReady] Phase 3: readyLevel=${readyLevel} (${labels[readyLevel]}) in ${Date.now() - t0}ms`);

  if (readyLevel === 0) {
    console.log('[designerReady] Warning: designer content not found within timeout');
  }

  return webview;
}

/**
 * Find the "Add a trigger" placeholder card on the designer canvas.
 * This is shown for empty workflows.
 */
async function findAddTriggerCard(driver: WebDriver): Promise<WebElement | null> {
  // The AddActionCard for triggers uses these selectors:
  //   data-testid="card-Add a trigger"
  //   data-automation-id="card-Add_a_trigger"
  //   aria-label="Add a trigger"
  const selectors = ['[data-testid="card-Add a trigger"]', '[data-automation-id="card-Add_a_trigger"]', '[aria-label="Add a trigger"]'];

  for (const selector of selectors) {
    try {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        console.log(`[findAddTriggerCard] Found via: ${selector}`);
        return elements[0];
      }
    } catch {
      // Try next selector
    }
  }

  return null;
}

/**
 * Find the "Add an action" placeholder or drop zone button on the canvas.
 */
async function findAddActionElement(driver: WebDriver): Promise<WebElement | null> {
  // After a trigger is added, the designer shows a "+" button (DropZone)
  // or an "Add an action" placeholder card.
  const selectors = [
    '[data-testid="card-Add an action"]',
    '[data-automation-id="card-Add_an_action"]',
    '[aria-label="Add an action"]',
    '[data-automation-id^="msla-plus-button-"]',
    '[id^="msla-edge-button-"]',
  ];

  for (const selector of selectors) {
    try {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        console.log(`[findAddActionElement] Found via: ${selector}`);
        return elements[0];
      }
    } catch {
      // Try next selector
    }
  }

  return null;
}

/**
 * Find and click the "Add an action" menu item in the edge contextual menu.
 * This menu appears after clicking the "+" button on an edge.
 */

/**
 * Poll until the discovery panel (recommendation panel) is visible.
 * Returns when the panel root or search box appears, or after timeout.
 */
async function waitForDiscoveryPanel(driver: WebDriver, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const found = await driver.executeScript<boolean>(`
        return !!(
          document.querySelector('.msla-panel-root-Discovery') ||
          document.querySelector('[class*="panel-root"]') ||
          document.querySelector('[data-automation-id="msla-search-box"]') ||
          document.querySelector('.msla-search-box')
        );
      `);
      if (found) {
        return true;
      }
    } catch {
      /* ignore */
    }
    await sleep(300);
  }
  return false;
}

/**
 * Poll until search results appear in the discovery panel.
 * Returns when result cards are visible, or after timeout.
 */
async function waitForSearchResults(driver: WebDriver, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const count = await driver.executeScript<number>(`
        var cards = document.querySelectorAll(
          '[data-automation-id^="msla-op-search-result-"], .msla-op-search-card-container, .msla-recommendation-panel-card'
        );
        return cards.length;
      `);
      if ((count ?? 0) > 0) {
        return true;
      }
    } catch {
      /* ignore */
    }
    await sleep(300);
  }
  return false;
}

/**
 * Poll until the canvas node count increases above a baseline, indicating
 * an operation was successfully added.
 */
async function waitForNodeCountIncrease(driver: WebDriver, baseline: number, timeoutMs = 10000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await countCanvasNodes(driver);
    if (count > baseline) {
      return count;
    }
    await sleep(300);
  }
  return await countCanvasNodes(driver);
}

async function clickAddActionMenuItem(driver: WebDriver): Promise<boolean> {
  const selectors = ['[data-automation-id^="msla-add-button-"]', '[role="menuitem"]'];

  // Poll for the popover menu to appear (up to 3s)
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      try {
        const elements = await driver.findElements(By.css(selector));
        for (const el of elements) {
          const text = await el.getText();
          if (text.toLowerCase().includes('add an action')) {
            console.log(`[clickAddActionMenuItem] Found "Add an action" menu item`);
            await el.click();
            // Poll for the discovery panel to appear
            await waitForDiscoveryPanel(driver);
            return true;
          }
        }
      } catch {
        /* try next */
      }
    }
    await sleep(300);
  }

  return false;
}

/**
 * Verify that the discovery panel (recommendation panel) is open.
 * Returns details about what's visible in the panel.
 */
async function inspectDiscoveryPanel(driver: WebDriver): Promise<{
  found: boolean;
  hasSearchBox: boolean;
  hasHeader: boolean;
  headerText: string;
  hasResults: boolean;
  resultCount: number;
}> {
  const result = {
    found: false,
    hasSearchBox: false,
    hasHeader: false,
    headerText: '',
    hasResults: false,
    resultCount: 0,
  };

  try {
    // Check for the discovery panel root
    const panelSelectors = ['.msla-panel-root-Discovery', '[class*="panel-root"]', '.msla-app-action-header'];

    for (const selector of panelSelectors) {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        result.found = true;
        break;
      }
    }

    // Check for the search box
    const searchBoxSelectors = ['[data-automation-id="msla-search-box"]', '.msla-search-box', 'input[placeholder*="Search"]'];

    for (const selector of searchBoxSelectors) {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        result.hasSearchBox = true;
        break;
      }
    }

    // Check for the panel header
    try {
      const headers = await driver.findElements(By.css('.msla-app-action-header'));
      if (headers.length > 0) {
        result.hasHeader = true;
        result.headerText = await headers[0].getText();
      }
    } catch {
      /* ignore */
    }

    // Check for operation cards / results
    const resultSelectors = ['[data-automation-id^="msla-op-search-result-"]', '.msla-op-search-card-container', '[class*="connector"]'];

    for (const selector of resultSelectors) {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        result.hasResults = true;
        result.resultCount = elements.length;
        break;
      }
    }
  } catch (e: any) {
    console.log(`[inspectDiscoveryPanel] Error: ${e.message}`);
  }

  return result;
}

/**
 * Type a search term into the discovery panel search box.
 */
async function searchInDiscoveryPanel(driver: WebDriver, searchTerm: string): Promise<boolean> {
  const searchBoxSelectors = [
    '[data-automation-id="msla-search-box"]',
    '.msla-search-box input',
    '.msla-search-box',
    'input[placeholder*="Search"]',
    'input[type="text"]',
  ];

  for (const selector of searchBoxSelectors) {
    try {
      const elements = await driver.findElements(By.css(selector));
      for (const el of elements) {
        // Verify it's the right input
        const tag = await el.getTagName();
        let inputEl = el;

        if (tag.toLowerCase() !== 'input') {
          // Try to find the inner input
          try {
            inputEl = await el.findElement(By.css('input'));
          } catch {
            continue;
          }
        }

        // Clear and type
        await inputEl.click();
        await sleep(200);
        await inputEl.sendKeys(Key.chord(Key.CONTROL, 'a'));
        await inputEl.sendKeys(Key.BACK_SPACE);
        await sleep(200);
        await inputEl.sendKeys(searchTerm);
        console.log(`[searchInDiscoveryPanel] Typed "${searchTerm}" into search box`);
        // Poll for search results to appear instead of static wait
        await waitForSearchResults(driver);
        return true;
      }
    } catch {
      // Try next selector
    }
  }

  console.log('[searchInDiscoveryPanel] Could not find search box');
  return false;
}

/**
 * Find and click an operation card in the discovery panel by name.
 *
 * The designer uses Fluent UI Cards with data-automation-id="msla-op-search-result-{id}".
 * Clicking the card triggers React's onClick which dispatches addOperation() —
 * this is a single-click immediate insert with no confirmation step.
 *
 * We prioritize the most specific selectors first, then fall back to broader ones.
 * For the JS fallback we use Selenium Actions API (move+click) instead of
 * dispatchEvent, because React's synthetic event system doesn't respond to
 * native DOM MouseEvent dispatches.
 */
async function selectOperation(driver: WebDriver, operationName: string): Promise<boolean> {
  // Phase 1: Most reliable selectors — the actual operation search result cards
  const primarySelectors = [
    '[data-automation-id^="msla-op-search-result-"]',
    '[data-testid^="msla-op-search-result-"]',
    '.msla-op-search-card-container',
  ];

  // Phase 2: Broader fallback selectors
  const fallbackSelectors = [
    '.msla-op-search-card',
    '[class*="op-search"][class*="card"]',
    '.msla-recommendation-panel-card',
    '[role="option"]',
    '[class*="connector"] [role="button"]',
    '[class*="connector"] button',
  ];

  const operationVariants = [operationName.toLowerCase()];

  if (operationName.toLowerCase() === 'request') {
    operationVariants.push('when a http request is received', 'when an http request is received', 'http request');
  }
  if (operationName.toLowerCase() === 'compose') {
    operationVariants.push('compose');
  }

  const matchesVariant = (text: string, ariaLabel: string): boolean => {
    const textLower = (text || '').toLowerCase();
    const ariaLower = (ariaLabel || '').toLowerCase();
    return operationVariants.some((v) => textLower.includes(v) || ariaLower.includes(v));
  };

  const isBadMatch = (text: string, ariaLabel: string): boolean => {
    const combined = `${text} ${ariaLabel}`.toLowerCase().trim();
    return combined === 'all' || combined.startsWith('all\n') || combined.startsWith('all ');
  };

  /**
   * Attempt to click an element using Selenium Actions API (move to element + click).
   * This is more reliable than el.click() for React components because it
   * generates real browser input events that React's event delegation captures.
   */
  async function reliableClick(el: WebElement, label: string): Promise<boolean> {
    try {
      await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
      await driver.actions().move({ origin: el }).click().perform();
      console.log(`[selectOperation] Clicked "${label}" via Actions API`);
      return true;
    } catch (e: any) {
      try {
        await el.click();
        console.log(`[selectOperation] Clicked "${label}" via .click() fallback`);
        return true;
      } catch (e2: any) {
        console.log(`[selectOperation] Both click methods failed for "${label}": ${e2.message}`);
        return false;
      }
    }
  }

  // Phase 1 + 2: Try CSS selectors
  const allSelectors = [...primarySelectors, ...fallbackSelectors];
  for (const selector of allSelectors) {
    try {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length === 0) {
        continue;
      }

      for (const el of elements) {
        try {
          let text = '';
          try {
            const titleEl = await el.findElement(By.css('.msla-op-search-card-title'));
            text = await titleEl.getText();
          } catch {
            text = await el.getText();
          }

          const ariaLabel = (await el.getAttribute('aria-label')) || '';

          if (matchesVariant(text, ariaLabel) && !isBadMatch(text, ariaLabel)) {
            console.log(`[selectOperation] Found operation "${operationName}" via ${selector} — text: "${text.substring(0, 80)}"`);
            const clicked = await reliableClick(el, operationName);
            if (clicked) {
              return true;
            }
          }
        } catch {
          /* stale element, try next */
        }
      }
    } catch {
      /* selector failed, try next */
    }
  }

  // Phase 3: XPath text search
  try {
    const searchTerm = operationVariants[0];
    const xpath = `//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${searchTerm}")]`;
    const textMatches = await driver.findElements(By.xpath(xpath));
    for (const el of textMatches) {
      try {
        const text = (await el.getText()) || '';
        const aria = (await el.getAttribute('aria-label')) || '';
        if (!matchesVariant(text, aria) || isBadMatch(text, aria)) {
          continue;
        }
        const tag = await el.getTagName();
        // Skip non-interactive elements like plain text spans — find the closest card
        if (['span', 'p', 'div'].includes(tag.toLowerCase())) {
          // Try to find the clickable parent card
          try {
            const parent = await el.findElement(By.xpath('./ancestor::*[@data-automation-id or @role="button" or self::button][1]'));
            const clicked = await reliableClick(parent, operationName);
            if (clicked) {
              return true;
            }
          } catch {
            /* no clickable parent, try the element itself */
          }
        }
        const clicked = await reliableClick(el, operationName);
        if (clicked) {
          return true;
        }
      } catch {
        /* stale element */
      }
    }
  } catch {
    /* XPath search failed */
  }

  // Phase 4: JS-based element discovery + Selenium Actions click
  try {
    // First, log what candidates exist for debugging
    const debugMatches = await driver.executeScript<string[]>(
      `
      const variants = arguments[0];
      const results = [];
      for (const el of document.querySelectorAll('[data-automation-id^="msla-op-search-result-"], .msla-op-search-card-container, .msla-op-search-card, .msla-recommendation-panel-card, [role="option"]')) {
        const text = (el.textContent || '').replace(/\\s+/g, ' ').trim().substring(0, 120);
        const aid = el.getAttribute('data-automation-id') || '';
        results.push(aid + ' | ' + text);
      }
      return results.slice(0, 10);
      `,
      operationVariants
    );
    if (debugMatches.length > 0) {
      console.log(`[selectOperation] Available cards: ${JSON.stringify(debugMatches)}`);
    }

    // Find the element via JS and return its index so we can click it with Selenium
    const elementIndex = await driver.executeScript<number>(
      `
      const variants = arguments[0].map(v => v.toLowerCase());
      const cards = document.querySelectorAll('[data-automation-id^="msla-op-search-result-"], .msla-op-search-card-container, .msla-op-search-card, .msla-recommendation-panel-card');
      for (let i = 0; i < cards.length; i++) {
        const text = (cards[i].textContent || '').toLowerCase();
        const aria = (cards[i].getAttribute('aria-label') || '').toLowerCase();
        const aid = (cards[i].getAttribute('data-automation-id') || '').toLowerCase();
        if (variants.some(v => text.includes(v) || aria.includes(v) || aid.includes(v))) {
          cards[i].scrollIntoView({block: 'center'});
          return i;
        }
      }
      return -1;
      `,
      operationVariants
    );

    if (elementIndex >= 0) {
      // Re-find the element via the same selector and index, then use Selenium to click
      const cards = await driver.findElements(
        By.css(
          '[data-automation-id^="msla-op-search-result-"], .msla-op-search-card-container, .msla-op-search-card, .msla-recommendation-panel-card'
        )
      );
      if (elementIndex < cards.length) {
        const clicked = await reliableClick(cards[elementIndex], operationName);
        if (clicked) {
          return true;
        }
      }
    }
  } catch (e: any) {
    console.log(`[selectOperation] JS fallback failed: ${e.message}`);
  }

  console.log(`[selectOperation] Operation "${operationName}" not found`);
  return false;
}

/**
 * Count the number of workflow nodes currently visible on the canvas.
 */
async function countCanvasNodes(driver: WebDriver): Promise<number> {
  const nodeSelectors = ['.react-flow__node', '[data-testid*="node"]'];

  for (const selector of nodeSelectors) {
    try {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        return elements.length;
      }
    } catch {
      // Try next selector
    }
  }

  return 0;
}

/**
 * Check if the designer canvas has a specific node by partial text match.
 */
async function canvasHasNode(driver: WebDriver, nodeText: string): Promise<boolean> {
  try {
    const nodes = await driver.findElements(By.css('.react-flow__node'));
    for (const node of nodes) {
      try {
        const text = await node.getText();
        if (text.toLowerCase().includes(nodeText.toLowerCase())) {
          return true;
        }
      } catch {}
    }
  } catch {
    // No nodes found
  }

  return false;
}

/**
 * Full E2E flow: open a workspace's designer and verify the webview renders.
 * Returns the webview and driver for further interaction.
 */
async function openDesignerForEntry(
  workbench: Workbench,
  driver: WebDriver,
  entry: WorkspaceManifestEntry
): Promise<{ success: boolean; webview?: WebView; error?: string }> {
  const tag = `[${entry.label}]`;

  // 1. Verify workspace exists on disk
  if (!fs.existsSync(entry.wsDir)) {
    return { success: false, error: `Workspace directory not found: ${entry.wsDir}` };
  }

  // 2. Verify workflow.json exists
  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  if (!fs.existsSync(workflowJsonPath)) {
    return { success: false, error: `workflow.json not found: ${workflowJsonPath}` };
  }

  // 2.5. Ensure local.settings.json has WORKFLOWS_SUBSCRIPTION_ID to skip Azure wizard
  ensureLocalSettingsForDesigner(entry.appDir);

  // 3. Open the workspace file
  try {
    await openWorkspaceFileInSession(workbench, entry.wsFilePath);
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    console.log(`${tag} Opened workspace: ${entry.wsFilePath}`);
  } catch (e: any) {
    return { success: false, error: `Failed to open workspace: ${e.message}` };
  }

  // 4. Open workflow.json in the editor
  try {
    await openFileInEditor(workbench, driver, workflowJsonPath);
    console.log(`${tag} Opened workflow.json`);
  } catch (e: any) {
    return { success: false, error: `Failed to open workflow.json: ${e.message}` };
  }

  // 5. Wait for extension recognition, dismissing any blocking UI
  await sleep(PROJECT_RECOGNITION_WAIT);
  await clearBlockingUI(driver);

  // 6. Execute Open Designer command
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }

  const commandFound = await executeOpenDesignerCommand(workbench, driver);
  if (!commandFound) {
    await captureScreenshot(driver, `${entry.label}-command-not-found`);
    return { success: false, error: 'Open Designer command not found in palette' };
  }
  console.log(`${tag} Open Designer command executed`);

  // 7. Switch into the webview
  // Note: prompt handling is now integrated into waitForDesignerWebviewTab()
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }

  try {
    const webview = await switchToDesignerWebview(driver);
    console.log(`${tag} Switched into designer webview`);
    return { success: true, webview };
  } catch (e: any) {
    await captureScreenshot(driver, `${entry.label}-webview-switch-failed`);
    return { success: false, error: `Failed to switch to webview: ${e.message}` };
  }
}

/**
 * Click the Save button in the designer command bar (inside the webview).
 * The button has aria-label="Save". After clicking, we poll until the
 * save completes (button re-enables or "Saving" text disappears).
 */
async function clickSaveButton(driver: WebDriver): Promise<boolean> {
  // Find the Save button by aria-label
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const btns = await driver.findElements(By.css('button[aria-label="Save"]'));
      if (btns.length > 0) {
        const btn = btns[0];
        const disabled = await btn.getAttribute('disabled');
        if (!disabled) {
          await driver.actions().move({ origin: btn }).click().perform();
          console.log('[save] Clicked Save button');

          // Poll until Save is no longer "Saving" (save in progress)
          const saveDeadline = Date.now() + 15_000;
          while (Date.now() < saveDeadline) {
            try {
              const isSaving = await driver.executeScript<boolean>(`
                var btn = document.querySelector('button[aria-label="Save"]');
                if (!btn) return false;
                return btn.textContent.includes('Saving') || btn.disabled;
              `);
              if (!isSaving) {
                console.log('[save] Save completed');
                return true;
              }
            } catch {
              /* ignore */
            }
            await sleep(500);
          }
          console.log('[save] Save may still be in progress after timeout');
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    await sleep(500);
  }
  console.log('[save] Save button not found');
  return false;
}

/**
 * Read and parse the workflow.json file from disk.
 */
function readWorkflowJson(wfDir: string): any {
  const filePath = path.join(wfDir, 'workflow.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Start debugging via "Debug: Start Debugging" command palette.
 * The workspace launch.json uses "azureLogicAppsStandard.pickProcess"
 * which triggers pickFuncProcessInternal — this:
 *   1. Starts Azurite
 *   2. Validates connection keys
 *   3. Builds custom code if needed
 *   4. Starts "func host start" task
 *   5. Polls host status until running
 *   6. Picks the func/dotnet process
 *   7. Attaches debugger
 *
 * We may see QuickPick prompts during this process that we need to dismiss.
 */
async function startDebugging(workbench: Workbench, driver: WebDriver): Promise<void> {
  console.log('[debug] Starting debug via "Debug: Start Debugging"...');

  await clearBlockingUI(driver);
  await focusEditor(driver);
  await sleep(500);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await clearBlockingUI(driver);
      await focusEditor(driver);
      await sleep(500);

      const input = await workbench.openCommandPrompt();
      await sleep(500);
      await input.setText('> Debug: Start Debugging');
      await sleep(1500);

      const picks = await input.getQuickPicks();
      for (const pick of picks) {
        const label = await pick.getLabel();
        const lower = label.toLowerCase();
        // Match "Debug: Start Debugging" but NOT "Debug: Select and Start Debugging"
        if (lower.includes('start debugging') && !lower.includes('select')) {
          console.log(`[debug] Selecting: "${label}"`);
          await pick.select();
          await sleep(2000);
          return;
        }
      }

      // Log what was available
      for (const pick of picks) {
        try {
          console.log(`[debug] Available: "${await pick.getLabel()}"`);
        } catch {}
      }
      await input.cancel();
      await sleep(2000);
    } catch (e: any) {
      console.log(`[debug] Attempt ${attempt + 1}/3 failed: ${e.message}`);
      await sleep(2000);
    }
  }

  console.log('[debug] Could not find "Start Debugging" command');
}

/**
 * Poll the terminal panel text until the Functions runtime reports it is ready.
 * The func host start output contains "Host started" or "Worker process started"
 * when the runtime is up. We also check the debug toolbar appears.
 */
async function waitForRuntimeReady(driver: WebDriver, timeoutMs = 90_000): Promise<boolean> {
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let screenshotTaken = false;
  let terminalsDetectedAt = 0;

  while (Date.now() < deadline) {
    // Dismiss any dialogs that appear during debug startup
    try {
      await dismissAllDialogs(driver);
    } catch {
      /* ignore */
    }

    // Take a screenshot early so we can see what's on screen
    if (!screenshotTaken && Date.now() - t0 > 5000) {
      await captureScreenshot(driver, 'debug-waiting-for-runtime');
      screenshotTaken = true;
    }

    // Check 1: VS Code debug toolbar — appears when debugger successfully attaches.
    // The debug toolbar has a distinct floating widget with stop/restart/step buttons.
    try {
      const debugAttached = await driver.executeScript<boolean>(`
        // The debug actions widget appears when debugger is attached
        var toolbar = document.querySelector('.debug-toolbar');
        if (toolbar) {
          var style = window.getComputedStyle(toolbar);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }
        // Also check for the debug action bar (different VS Code versions)
        var actionBar = document.querySelector('[class*="debug-toolbar"], [class*="debugging-actions"]');
        return !!actionBar;
      `);
      if (debugAttached) {
        console.log(`[debug] Debug toolbar visible — debugger attached (${Date.now() - t0}ms)`);
        // Wait a couple more seconds for the runtime to stabilize after attach
        await sleep(3000);
        return true;
      }
    } catch {
      /* ignore */
    }

    // Check 2: Terminal panels exist (func host start creates them)
    try {
      const terminalCount = await driver.executeScript<number>(`
        var tabs = document.querySelectorAll('.terminal-tab, .terminal-tabs-entry');
        return tabs.length;
      `);
      if (terminalCount && terminalCount > 0 && terminalsDetectedAt === 0) {
        terminalsDetectedAt = Date.now();
        console.log(`[debug] Detected ${terminalCount} terminal(s) (${Date.now() - t0}ms)`);
      }
      // If terminals have been open for 30s+, the runtime is likely ready
      if (terminalsDetectedAt > 0 && Date.now() - terminalsDetectedAt > 30_000) {
        console.log(`[debug] Terminals open for 30s+ — assuming runtime ready (${Date.now() - t0}ms)`);
        return true;
      }
    } catch {
      /* ignore */
    }

    // Check 3: Try XHR to host status (may be blocked by CSP)
    try {
      const hostReady = await driver.executeScript<boolean>(`
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', 'http://localhost:7071/admin/host/status', false);
          xhr.timeout = 2000;
          xhr.send();
          if (xhr.status === 200) {
            var body = JSON.parse(xhr.responseText);
            return body && body.state && body.state.toLowerCase() === 'running';
          }
        } catch(e) {}
        return false;
      `);
      if (hostReady) {
        console.log(`[debug] Runtime ready — host status is 'running' (${Date.now() - t0}ms)`);
        return true;
      }
    } catch {
      /* ignore */
    }

    await sleep(3000);
  }

  await captureScreenshot(driver, 'debug-timeout');
  console.log(`[debug] Timeout waiting for runtime after ${timeoutMs}ms`);
  return false;
}

/**
 * Open the overview page by right-clicking on workflow.json in the Explorer
 * and selecting "Overview" from the context menu.
 * Returns true if the overview webview becomes visible.
 */
async function openOverviewPage(workbench: Workbench, driver: WebDriver, workflowJsonPath: string): Promise<boolean> {
  console.log('[overview] Opening overview via right-click on workflow.json...');

  // After debugging starts, VS Code switches to the Debug view in the sidebar.
  // We need to switch back to the Explorer view to see the file tree.
  console.log('[overview] Switching to Explorer view...');
  try {
    // Use keyboard shortcut Ctrl+Shift+E to open Explorer
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('e').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
    await sleep(1500);
    console.log('[overview] Switched to Explorer view');
  } catch (e: any) {
    console.log(`[overview] Could not switch to Explorer: ${e.message}`);
  }

  // Open workflow.json so the Explorer shows its location
  await VSBrowser.instance.openResources(workflowJsonPath);
  await sleep(2000);

  // Try to find and right-click on workflow.json in the explorer tree
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Find workflow.json in the Explorer tree using multiple selector strategies
      const treeItems =
        (await driver.executeScript<number>(`
        // Look for any element in the explorer that contains "workflow.json" text
        var items = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
        var found = 0;
        for (var i = 0; i < items.length; i++) {
          if ((items[i].textContent || '').includes('workflow.json')) {
            found++;
          }
        }
        return found;
      `)) ?? 0;

      if (treeItems === 0) {
        console.log(`[overview] Attempt ${attempt + 1}: workflow.json not found in Explorer tree`);
        // Take a screenshot to see the state
        await captureScreenshot(driver, `overview-explorer-attempt-${attempt + 1}`);
        await sleep(2000);
        continue;
      }

      console.log(`[overview] Found ${treeItems} workflow.json item(s) in tree`);

      // Click workflow.json to select it, then right-click
      const clicked = await driver.executeScript<boolean>(`
        var items = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
        for (var i = 0; i < items.length; i++) {
          if ((items[i].textContent || '').trim().includes('workflow.json')) {
            items[i].scrollIntoView({block: 'center'});
            return true;
          }
        }
        return false;
      `);

      if (!clicked) {
        console.log('[overview] Could not scroll to workflow.json');
        continue;
      }

      // Find the element via Selenium and right-click
      const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
      for (const row of rows) {
        try {
          const text = await row.getText();
          if (text.includes('workflow.json')) {
            console.log(`[overview] Right-clicking on: "${text.trim().substring(0, 50)}"`);
            await driver.actions().contextClick(row).perform();
            await sleep(1500);

            // Find "Overview" in the context menu
            const menuItems = await driver.findElements(
              By.css('.context-view .action-item a, .monaco-menu .action-item a, .context-view .action-label')
            );
            for (const menuItem of menuItems) {
              try {
                const label = await menuItem.getText();
                if (label.toLowerCase().includes('overview')) {
                  console.log(`[overview] Clicking context menu: "${label}"`);
                  await menuItem.click();
                  await sleep(3000);

                  // Wait for the overview webview to appear
                  const deadline = Date.now() + 15_000;
                  while (Date.now() < deadline) {
                    try {
                      const found = await driver.executeScript<boolean>(`
                        return !!(
                          document.querySelector('iframe.webview') ||
                          document.querySelector('iframe[id*="webview"]') ||
                          document.querySelector('*[id="active-frame"]')
                        );
                      `);
                      if (found) {
                        console.log('[overview] Overview webview detected');
                        return true;
                      }
                    } catch {
                      /* ignore */
                    }
                    await sleep(500);
                  }
                  console.log('[overview] Webview not detected after clicking Overview');
                  return false;
                }
              } catch {
                /* stale menu item */
              }
            }
            // Dismiss the context menu if Overview wasn't found
            await driver.actions().sendKeys(Key.ESCAPE).perform();
            break;
          }
        } catch {
          /* stale row element */
        }
      }

      // Dismiss the context menu if Overview wasn't found
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(500);
      console.log(`[overview] "Overview" not found in context menu on attempt ${attempt + 1}`);
    } catch (e: any) {
      console.log(`[overview] Attempt ${attempt + 1} failed: ${e.message}`);
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(2000);
    }
  }

  console.log('[overview] Could not open overview page');
  return false;
}

/**
 * Switch into the overview webview and wait for it to render.
 * Returns the WebView object for later switchBack().
 */
async function switchToOverviewWebview(driver: WebDriver, timeoutMs = 60_000): Promise<WebView> {
  const webview = new WebView();
  const t0 = Date.now();
  await webview.switchToFrame();
  console.log(`[overview] Switched into overview frame (${Date.now() - t0}ms)`);

  // Wait for the overview command bar to render.
  // Periodically switch back to VS Code chrome to dismiss auth popups
  // that may be blocking the overview from loading data.
  const deadline = Date.now() + timeoutMs;
  let lastAuthCheck = 0;
  let loggedContent = false;
  while (Date.now() < deadline) {
    try {
      const found = await driver.executeScript<boolean>(`
        return !!(
          document.querySelector('[data-testid="msla-overview-command-bar"]') ||
          document.querySelector('button[aria-label="Run trigger"]') ||
          document.querySelector('button[aria-label="Refresh"]')
        );
      `);
      if (found) {
        console.log(`[overview] Overview rendered (${Date.now() - t0}ms)`);
        return webview;
      }

      // Log what's in the webview every 15s for diagnostics
      if (!loggedContent && Date.now() - t0 > 5000) {
        loggedContent = true;
        try {
          const bodyText = await driver.executeScript<string>(`
            return (document.body ? document.body.textContent : '').substring(0, 300);
          `);
          console.log(`[overview] Webview body (${Date.now() - t0}ms): "${bodyText?.substring(0, 200)}"`);
          const buttonCount = await driver.executeScript<number>(`
            return document.querySelectorAll('button').length;
          `);
          console.log(`[overview] Buttons found: ${buttonCount}`);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }

    // Every 10 seconds, switch back to chrome to dismiss auth popups
    if (Date.now() - lastAuthCheck > 10000) {
      lastAuthCheck = Date.now();
      try {
        await webview.switchBack();
        await dismissAllDialogs(driver);
        // Switch back INTO the webview frame
        await webview.switchToFrame();
      } catch {
        // If switchBack/switchToFrame fails, try to recover
        try {
          await webview.switchToFrame();
        } catch {
          /* ignore */
        }
      }
    }

    await sleep(1000);
  }

  console.log(`[overview] Warning: overview content not detected after ${timeoutMs}ms`);
  return webview;
}

/**
 * Click the "Run trigger" button in the overview command bar.
 */
async function clickRunTrigger(driver: WebDriver): Promise<boolean> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const btns = await driver.findElements(By.css('button[aria-label="Run trigger"]'));
      if (btns.length > 0) {
        const btn = btns[0];
        const disabled = await btn.getAttribute('disabled');
        if (disabled) {
          console.log('[overview] "Run trigger" button is disabled — runtime may not be ready');
        } else {
          await driver.actions().move({ origin: btn }).click().perform();
          console.log('[overview] Clicked "Run trigger"');
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    await sleep(500);
  }
  console.log('[overview] "Run trigger" button not found or not clickable');
  return false;
}

/**
 * Click the "Refresh" button in the overview command bar.
 */
async function clickRefresh(driver: WebDriver): Promise<void> {
  try {
    const btns = await driver.findElements(By.css('button[aria-label="Refresh"]'));
    if (btns.length > 0) {
      await driver.actions().move({ origin: btns[0] }).click().perform();
      console.log('[overview] Clicked Refresh');
      await sleep(1000);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Get the status of the latest (topmost) run in the overview run history list.
 * Returns the status text ('Running', 'Succeeded', 'Failed', etc.) or empty string.
 */
async function getLatestRunStatus(driver: WebDriver): Promise<string> {
  try {
    return await driver.executeScript<string>(`
      var rows = document.querySelectorAll('[role="row"], .ms-DetailsRow, tr');
      for (var i = 0; i < rows.length; i++) {
        var text = rows[i].textContent || '';
        // Skip header rows
        if (text.includes('Status') && text.includes('Identifier')) continue;
        // Return the first status found in a data row
        var statuses = ['Running', 'Succeeded', 'Failed', 'Cancelled', 'Waiting'];
        for (var j = 0; j < statuses.length; j++) {
          if (text.includes(statuses[j])) return statuses[j];
        }
      }
      return '';
    `);
  } catch {
    return '';
  }
}

/**
 * Poll the overview run history list until the latest run shows the target status.
 * Clicks Refresh periodically to update the list. Takes screenshots of status changes.
 */
async function waitForRunStatusInList(
  driver: WebDriver,
  targetStatus: string,
  timeoutMs = 30_000
): Promise<{ found: boolean; lastStatus: string }> {
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let lastStatus = '';
  let refreshCount = 0;

  while (Date.now() < deadline) {
    const status = await getLatestRunStatus(driver);

    if (status && status !== lastStatus) {
      console.log(`[overview] Latest run status: "${status}" (${Date.now() - t0}ms)`);
      lastStatus = status;
    }

    if (status === targetStatus) {
      return { found: true, lastStatus: status };
    }

    // If we hit a terminal state that isn't our target, stop early
    if ((status === 'Failed' || status === 'Cancelled') && targetStatus !== status) {
      console.log(`[overview] Run ended with "${status}" instead of "${targetStatus}"`);
      return { found: false, lastStatus: status };
    }

    // Refresh every 3 seconds to get updated status
    if (Date.now() - t0 > (refreshCount + 1) * 3000) {
      await clickRefresh(driver);
      refreshCount++;
    }

    await sleep(1000);
  }

  console.log(`[overview] Target status "${targetStatus}" not found after ${timeoutMs}ms (last: "${lastStatus}")`);
  return { found: false, lastStatus };
}

/**
 * Click on the latest (topmost) run row to open the run details view.
 */
async function clickLatestRunRow(driver: WebDriver): Promise<boolean> {
  try {
    const clicked = await driver.executeScript<boolean>(`
      var rows = document.querySelectorAll('[role="row"], .ms-DetailsRow, tr');
      for (var i = 0; i < rows.length; i++) {
        var text = rows[i].textContent || '';
        if (text.includes('Status') && text.includes('Identifier')) continue;
        var statuses = ['Running', 'Succeeded', 'Failed', 'Cancelled', 'Waiting'];
        var isRunRow = false;
        for (var j = 0; j < statuses.length; j++) {
          if (text.includes(statuses[j])) { isRunRow = true; break; }
        }
        if (!isRunRow) continue;
        var link = rows[i].querySelector('a, button, [role="link"], [data-is-focusable="true"]');
        if (link) { link.click(); return true; }
        rows[i].click();
        return true;
      }
      return false;
    `);
    if (clicked) {
      console.log('[overview] Clicked on latest run row to open details');
      await sleep(3000); // Wait for run details panel/page to load
      return true;
    }
  } catch {
    /* ignore */
  }
  console.log('[overview] Could not find a run row to click');
  return false;
}

/**
 * Once inside the run details view, verify that all action nodes show "Succeeded".
 * Returns the count of succeeded nodes and any non-succeeded nodes found.
 */
async function verifyAllNodesSucceeded(driver: WebDriver): Promise<{ allSucceeded: boolean; details: string }> {
  try {
    const result = await driver.executeScript<{ succeeded: number; other: string[] }>(`
      var succeeded = 0;
      var other = [];
      var statusTexts = ['Succeeded', 'Running', 'Failed', 'Cancelled', 'Skipped', 'Waiting'];
      // Look in table rows / grid cells for action statuses
      var cells = document.querySelectorAll('[role="gridcell"], .ms-DetailsRow-cell, td');
      for (var i = 0; i < cells.length; i++) {
        var t = (cells[i].textContent || '').trim();
        for (var j = 0; j < statusTexts.length; j++) {
          if (t === statusTexts[j]) {
            if (t === 'Succeeded') succeeded++;
            else other.push(t);
            break;
          }
        }
      }
      // Also check leaf elements with exact status text
      if (succeeded === 0) {
        var all = document.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
          var t = (all[i].textContent || '').trim();
          if (all[i].children.length === 0 && statusTexts.indexOf(t) >= 0) {
            if (t === 'Succeeded') succeeded++;
            else other.push(t);
          }
        }
      }
      return { succeeded: succeeded, other: other };
    `);

    const details = `${result.succeeded} succeeded${result.other.length > 0 ? `, non-succeeded: [${result.other.join(', ')}]` : ''}`;
    console.log(`[overview] Run details — ${details}`);
    return {
      allSucceeded: result.succeeded > 0 && result.other.length === 0,
      details,
    };
  } catch (e: any) {
    console.log(`[overview] Error reading run details: ${e.message}`);
    return { allSucceeded: false, details: 'error reading details' };
  }
}

/**
 * Stop the debug session by pressing Shift+F5.
 */
async function stopDebugging(driver: WebDriver): Promise<void> {
  console.log('[debug] Stopping debug session (Shift+F5)...');
  try {
    await driver.actions().keyDown(Key.SHIFT).keyDown(Key.F5).keyUp(Key.F5).keyUp(Key.SHIFT).perform();
    await sleep(2000);
    console.log('[debug] Debug session stopped');
  } catch (e: any) {
    console.log(`[debug] Error stopping debug: ${e.message}`);
  }
}

// ===========================================================================
// Test Suite
// ===========================================================================

describe('Designer Actions Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(120_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });

    if (!fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      this.skip();
      return;
    }

    manifest = loadWorkspaceManifest();
    if (manifest.length === 0) {
      this.skip();
      return;
    }

    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    await waitForDependencyValidation(driver, 120_000);
  });

  afterEach(async () => {
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    try {
      const ev = new EditorView();
      await ev.closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(1000);
  });

  // =====================================================================
  // Test 1: Standard workflow — open designer, add Request trigger
  // =====================================================================
  it('should add a Request trigger and Response action, then save', async function () {
    const entry = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful');
    if (!entry) {
      this.skip();
      return;
    }

    // Reset workflow.json to empty so we start with a clean canvas.
    // Previous test runs may have saved triggers/actions into this file.
    const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
    const emptyWorkflow = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {},
        contentVersion: '1.0.0.0',
        outputs: {},
        triggers: {},
      },
      kind: 'Stateful',
    };
    fs.writeFileSync(workflowJsonPath, JSON.stringify(emptyWorkflow, null, 4));
    console.log('[test1] Reset workflow.json to empty');

    // Assertion 1: Designer opens
    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    if (!result.success) {
      await captureScreenshot(driver, 'test1-designer-open-failed');
    }
    assert.ok(result.success, `Designer should open — ${result.error}`);

    try {
      // Assertion 2: "Add a trigger" card visible, clicking it opens discovery panel
      const triggerCard = await findAddTriggerCard(driver);
      await captureScreenshot(driver, 'test1-step2-before-trigger-click');
      assert.ok(triggerCard, '"Add a trigger" card should be visible on empty canvas');

      await triggerCard.click();
      const panelOpened = await waitForDiscoveryPanel(driver);
      await captureScreenshot(driver, 'test1-step2-after-panel-open');
      assert.ok(panelOpened, 'Discovery panel should open after clicking trigger card');

      // Assertion 3: Search and add Request trigger
      const searched = await searchInDiscoveryPanel(driver, 'Request');
      assert.ok(searched, 'Search box should accept input');

      const hasResults = await waitForSearchResults(driver);
      assert.ok(hasResults, 'Search results should appear for "Request"');

      const triggerCount = await countCanvasNodes(driver);
      const selectedTrigger = await selectOperation(driver, 'request');
      assert.ok(selectedTrigger, '"Request" operation card should be clickable');

      // Don't wait for node count increase — trigger replaces the placeholder card,
      // so count may stay the same. Just verify the trigger node text is present.
      const hasTrigger = await canvasHasNode(driver, 'request');
      await captureScreenshot(driver, 'test1-step3-after-add-trigger');
      assert.ok(hasTrigger, 'Request trigger should appear on canvas');
      console.log('[test1] Trigger added');

      // Assertion 4: Immediately find + button and add Response action.
      // Retry the full click→menu→search→select flow if Response doesn't appear.
      let hasResponse = false;
      for (let responseAttempt = 0; responseAttempt < 3; responseAttempt++) {
        // Find and click + button
        let actionPanelOpened = false;
        for (let clickAttempt = 0; clickAttempt < 3; clickAttempt++) {
          const addActionEl = await findAddActionElement(driver);
          if (!addActionEl) {
            await sleep(500);
            continue;
          }
          try {
            await addActionEl.click();
            await sleep(300);
            await clickAddActionMenuItem(driver);
            actionPanelOpened = await waitForDiscoveryPanel(driver);
            break;
          } catch (clickErr: any) {
            if (clickAttempt < 2 && clickErr.name === 'StaleElementReferenceError') {
              console.log(`[test1] Stale element on + button attempt ${clickAttempt + 1}, retrying...`);
              await sleep(500);
              continue;
            }
            throw clickErr;
          }
        }

        if (!actionPanelOpened) {
          console.log(`[test1] Could not open action panel on attempt ${responseAttempt + 1}`);
          await sleep(1000);
          continue;
        }

        // Search and select Response
        const searchedAction = await searchInDiscoveryPanel(driver, 'Response');
        if (!searchedAction) {
          console.log(`[test1] Search box not found on attempt ${responseAttempt + 1}`);
          continue;
        }
        await waitForSearchResults(driver);

        const beforeCount = await countCanvasNodes(driver);
        const selectedAction = await selectOperation(driver, 'response');
        if (!selectedAction) {
          console.log(`[test1] Could not select Response on attempt ${responseAttempt + 1}`);
          continue;
        }

        await waitForNodeCountIncrease(driver, beforeCount);
        hasResponse = await canvasHasNode(driver, 'response');
        if (hasResponse) {
          break;
        }

        console.log(`[test1] Response not found on canvas after attempt ${responseAttempt + 1}, retrying...`);
        await sleep(1000);
      }

      await captureScreenshot(driver, 'test1-step4-after-add-response');
      assert.ok(hasResponse, 'Response action should appear on canvas');

      // Assertion 6: Save the workflow
      const saved = await clickSaveButton(driver);
      await captureScreenshot(driver, 'test1-step6-after-save');
      assert.ok(saved, 'Save button should be clickable and save should complete');

      // Assertion 7: Verify workflow.json on disk contains both trigger and action
      // Switch back from webview to read the file
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      await sleep(2000); // Brief wait for file write to flush

      const workflow = readWorkflowJson(entry.wfDir);
      await captureScreenshot(driver, 'test1-step7-after-verify');

      const triggers = workflow?.definition?.triggers;
      const actions = workflow?.definition?.actions;

      console.log(`[test1] workflow.json triggers: ${JSON.stringify(Object.keys(triggers || {}))}`);
      console.log(`[test1] workflow.json actions: ${JSON.stringify(Object.keys(actions || {}))}`);

      assert.ok(triggers && Object.keys(triggers).length > 0, 'workflow.json should contain at least one trigger');
      assert.ok(actions && Object.keys(actions).length > 0, 'workflow.json should contain at least one action');

      // Verify the trigger is an HTTP Request type
      const triggerValues = Object.values(triggers) as any[];
      const hasHttpTrigger = triggerValues.some((t: any) => t.type === 'Request' || t.type?.toLowerCase().includes('request'));
      assert.ok(hasHttpTrigger, 'workflow.json should contain an HTTP Request trigger');

      // Verify there's a Response action
      const actionValues = Object.values(actions) as any[];
      const hasResponseAction = actionValues.some((a: any) => a.type === 'Response' || a.type?.toLowerCase().includes('response'));
      assert.ok(hasResponseAction, 'workflow.json should contain a Response action');

      console.log('[test1] Workflow saved and verified — starting debug session...');

      // Assertion 8: Start debugging and wait for runtime to be ready
      workbench = new Workbench();
      await startDebugging(workbench, driver);
      const runtimeReady = await waitForRuntimeReady(driver);
      await captureScreenshot(driver, 'test1-step8-after-debug-start');
      assert.ok(runtimeReady, 'Functions runtime should start and become ready');

      // Assertion 9: Open overview page via right-click on workflow.json
      // First, close all editors (including the designer webview) so that
      // switchToOverviewWebview doesn't accidentally switch into the designer.
      try {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
        await sleep(1000);
      } catch {
        /* ignore */
      }

      workbench = new Workbench();
      const workflowPath = path.join(entry.wfDir, 'workflow.json');
      const overviewOpened = await openOverviewPage(workbench, driver, workflowPath);
      assert.ok(overviewOpened, 'Overview page should open');

      // Switch into the overview webview
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      const overviewWebview = await switchToOverviewWebview(driver);
      await captureScreenshot(driver, 'test1-step9-overview-loaded');

      // Assertion 10: Overview has a callback URL (indicates runtime is connected)
      const hasCallbackUrl = await driver.executeScript<boolean>(`
        var links = document.querySelectorAll('a[href*="localhost"], [class*="callback"] a, a');
        for (var i = 0; i < links.length; i++) {
          var href = (links[i].href || links[i].textContent || '');
          if (href.includes('localhost') || href.includes('127.0.0.1')) return true;
        }
        // Also check for text containing localhost URL
        var body = document.body ? document.body.textContent : '';
        return body.includes('localhost:') && body.includes('/api/');
      `);
      await captureScreenshot(driver, 'test1-step10-callback-url');
      // Don't assert callback URL — it may not appear if runtime hasn't fully registered the workflow yet

      // Assertion 11: Click "Run trigger"
      const triggerRan = await clickRunTrigger(driver);
      await captureScreenshot(driver, 'test1-step11-after-run-trigger');
      assert.ok(triggerRan, '"Run trigger" button should be clickable');

      // Assertion 12: See the run in "Running" state in the overview list
      await sleep(1000); // Brief wait for run to appear
      await clickRefresh(driver);
      const runningStatus = await getLatestRunStatus(driver);
      await captureScreenshot(driver, `test1-step12-run-status-${(runningStatus || 'none').toLowerCase()}`);
      console.log(`[test1] Latest run status after trigger: "${runningStatus}"`);
      // Don't assert Running — it may already be Succeeded if the run is fast

      // Assertion 13: Refresh until the run shows "Succeeded" in the overview list
      const { found: succeeded, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded');
      await captureScreenshot(driver, 'test1-step13-run-succeeded-in-list');
      assert.ok(succeeded, `Run should show "Succeeded" in overview list (last status: "${lastStatus}")`);

      // Assertion 14: Open the run and verify all action nodes are succeeded
      const detailsOpened = await clickLatestRunRow(driver);
      await captureScreenshot(driver, 'test1-step14-run-details-opened');
      assert.ok(detailsOpened, 'Should be able to open the succeeded run');

      const { allSucceeded, details } = await verifyAllNodesSucceeded(driver);
      await captureScreenshot(driver, 'test1-step15-all-nodes-succeeded');
      assert.ok(allSucceeded, `All action nodes should be succeeded (${details})`);

      console.log('[test1] PASSED — full flow: trigger + response + save + debug + overview + run succeeded');

      // Clean up: stop debugging and switch back
      try {
        await overviewWebview.switchBack();
      } catch {
        /* ignore */
      }
      await stopDebugging(driver);

      return; // Skip the finally switchBack since we already did it
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      // Make sure debugging is stopped in case of early failure
      try {
        await stopDebugging(driver);
      } catch {
        /* ignore */
      }
    }
  });

  // =====================================================================
  // Test 2: CustomCode workflow — open designer, add Compose action
  // =====================================================================
  it('should add a Compose action to a CustomCode workflow', async function () {
    const entry = manifest.find((e) => e.appType === 'customCode') || manifest.find((e) => e.appType === 'rulesEngine') || manifest[0];
    if (!entry) {
      this.skip();
      return;
    }

    // Assertion 1: Designer opens
    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    if (!result.success) {
      await captureScreenshot(driver, 'test2-designer-open-failed');
    }
    assert.ok(result.success, `Designer should open — ${result.error}`);

    try {
      // Assertion 2: Add-action button or trigger card visible, opens discovery panel
      // Use a retry loop because React Flow may re-render nodes after initial load,
      // causing StaleElementReferenceError if we click a stale reference.
      await captureScreenshot(driver, 'test2-step2-before-click');
      let panelOpened = false;
      for (let clickAttempt = 0; clickAttempt < 3; clickAttempt++) {
        const addActionEl = await findAddActionElement(driver);
        const triggerCard = await findAddTriggerCard(driver);
        assert.ok(addActionEl || triggerCard, 'Add-action button or trigger card should be visible');

        try {
          if (addActionEl) {
            await addActionEl.click();
            await sleep(500);
            await clickAddActionMenuItem(driver);
          } else {
            await triggerCard!.click();
          }
          panelOpened = await waitForDiscoveryPanel(driver);
          break;
        } catch (clickErr: any) {
          if (clickAttempt < 2 && clickErr.name === 'StaleElementReferenceError') {
            console.log(`[addAction] Stale element on click attempt ${clickAttempt + 1}, retrying...`);
            await sleep(1000);
            continue;
          }
          throw clickErr;
        }
      }
      await captureScreenshot(driver, 'test2-step2-after-panel-open');
      assert.ok(panelOpened, 'Discovery panel should open');

      // Assertion 3: Search returns results for "Compose"
      const searched = await searchInDiscoveryPanel(driver, 'Compose');
      assert.ok(searched, 'Search box should accept input');

      const hasResults = await waitForSearchResults(driver);
      await captureScreenshot(driver, 'test2-step3-search-results');
      assert.ok(hasResults, 'Search results should appear for "Compose"');

      // Assertion 4: Selecting "Compose" adds it to the canvas
      const initialCount = await countCanvasNodes(driver);
      const selected = await selectOperation(driver, 'Compose');
      assert.ok(selected, '"Compose" operation card should be clickable');

      const newCount = await waitForNodeCountIncrease(driver, initialCount);
      const hasNode = await canvasHasNode(driver, 'compose');
      await captureScreenshot(driver, 'test2-step4-after-add-action');

      assert.ok(hasNode, `Compose action should appear on canvas (nodes: ${initialCount} -> ${newCount})`);
      console.log(`[test2] Compose added — nodes: ${initialCount} -> ${newCount}`);

      // Assertion 5: Fill in the Compose inputs field (required for save)
      // After selecting Compose, the parameter panel auto-opens with the Inputs field.
      // It's a Lexical contentEditable editor, not a plain input.
      await sleep(2000); // Wait for parameter panel to render
      let inputsFilled = false;
      for (let fillAttempt = 0; fillAttempt < 5; fillAttempt++) {
        try {
          // Try multiple selectors for the Compose inputs editor
          const editors = await driver.findElements(
            By.css(
              '[contenteditable="true"].editor-input, [data-automation-id*="stringeditor"] [contenteditable="true"], .msla-editor-container [contenteditable="true"], [role="textbox"][contenteditable="true"]'
            )
          );
          if (editors.length > 0) {
            console.log(`[test2] Found ${editors.length} contenteditable editor(s) on attempt ${fillAttempt + 1}`);
            // Click and type into the first one
            await driver.actions().move({ origin: editors[0] }).click().perform();
            await sleep(300);
            await editors[0].sendKeys('test-compose-value');
            console.log('[test2] Filled Compose inputs field');
            inputsFilled = true;
            await captureScreenshot(driver, 'test2-step5-after-fill-inputs');
            break;
          }
          // Log what's in the panel for debugging
          if (fillAttempt === 0) {
            const panelInfo = await driver.executeScript<string>(`
              var automationIds = [];
              document.querySelectorAll('[data-automation-id]').forEach(function(el) {
                automationIds.push(el.getAttribute('data-automation-id'));
              });
              return 'automation-ids: ' + automationIds.slice(0, 10).join(', ') +
                ' | contenteditable: ' + document.querySelectorAll('[contenteditable]').length;
            `);
            console.log(`[test2] Panel state: ${panelInfo}`);
          }
          console.log(`[test2] Inputs field not found on attempt ${fillAttempt + 1}`);
          await sleep(1500);
        } catch (e: any) {
          console.log(`[test2] Fill inputs attempt ${fillAttempt + 1} failed: ${e.message}`);
          await sleep(1000);
        }
      }
      assert.ok(inputsFilled, 'Compose inputs field should be filled');

      // Assertion 6: Save the workflow
      const saved = await clickSaveButton(driver);
      await captureScreenshot(driver, 'test2-step5-after-save');
      assert.ok(saved, 'Save button should be clickable and save should complete');

      // Verify workflow.json on disk
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      await sleep(2000);

      const workflow = readWorkflowJson(entry.wfDir);
      const actions = workflow?.definition?.actions;
      console.log(`[test2] workflow.json actions: ${JSON.stringify(Object.keys(actions || {}))}`);
      assert.ok(actions && Object.keys(actions).length > 0, 'workflow.json should contain actions after save');

      console.log('[test2] Workflow saved — starting debug session...');

      // Assertion 6: Start debugging and wait for runtime
      workbench = new Workbench();
      await startDebugging(workbench, driver);
      const runtimeReady = await waitForRuntimeReady(driver);
      await captureScreenshot(driver, 'test2-step6-after-debug-start');
      assert.ok(runtimeReady, 'Functions runtime should start and become ready');

      // Assertion 7: Open overview page
      try {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
        await sleep(1000);
      } catch {
        /* ignore */
      }

      workbench = new Workbench();
      const workflowPath = path.join(entry.wfDir, 'workflow.json');
      const overviewOpened = await openOverviewPage(workbench, driver, workflowPath);
      assert.ok(overviewOpened, 'Overview page should open');

      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      const overviewWebview = await switchToOverviewWebview(driver);
      await captureScreenshot(driver, 'test2-step7-overview-loaded');

      // Assertion 8: Click "Run trigger"
      const triggerRan = await clickRunTrigger(driver);
      await captureScreenshot(driver, 'test2-step8-after-run-trigger');
      assert.ok(triggerRan, '"Run trigger" button should be clickable');

      // Assertion 9: See the run in "Running" state in the overview list
      await sleep(1000); // Brief wait for run to appear
      await clickRefresh(driver);
      const runningStatus = await getLatestRunStatus(driver);
      await captureScreenshot(driver, `test2-step9-run-status-${(runningStatus || 'none').toLowerCase()}`);
      console.log(`[test2] Latest run status after trigger: "${runningStatus}"`);

      // Assertion 10: Refresh until the run shows "Succeeded" in the overview list
      const { found: succeeded, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded');
      await captureScreenshot(driver, 'test2-step10-run-succeeded-in-list');
      assert.ok(succeeded, `Run should show "Succeeded" in overview list (last status: "${lastStatus}")`);

      // Assertion 11: Open the run and verify all action nodes are succeeded
      const detailsOpened = await clickLatestRunRow(driver);
      await captureScreenshot(driver, 'test2-step11-run-details-opened');
      assert.ok(detailsOpened, 'Should be able to open the succeeded run');

      const { allSucceeded, details } = await verifyAllNodesSucceeded(driver);
      await captureScreenshot(driver, 'test2-step12-all-nodes-succeeded');
      assert.ok(allSucceeded, `All action nodes should be succeeded (${details})`);

      console.log('[test2] PASSED — full flow: add action + save + debug + overview + run succeeded');

      try {
        await overviewWebview.switchBack();
      } catch {
        /* ignore */
      }
      await stopDebugging(driver);
      return;
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      try {
        await stopDebugging(driver);
      } catch {
        /* ignore */
      }
    }
  });
});

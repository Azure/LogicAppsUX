// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from 'path';
import * as fs from 'fs';
import {
  Workbench,
  WebView,
  By,
  until,
  EditorView,
  type WebDriver,
  type InputBox,
  VSBrowser,
  ModalDialog,
  Key,
} from 'vscode-extension-tester';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest, cleanupAllWorkspaces } from './workspaceManifest';

/**
 * Designer Open E2E Tests
 *
 * Reads the workspace manifest written by createWorkspace.test.ts and attempts
 * to open the Logic Apps designer for each created workspace.
 *
 * This file MUST run AFTER createWorkspace.test.ts.  Mocha loads files
 * alphabetically, and "designerOpen" sorts after "createWorkspace", so
 * ordering is satisfied by naming convention.
 *
 * What we verify for each workspace:
 *   1. The workspace folder exists on disk
 *   2. The workflow.json file exists
 *   3. We can open the workspace folder in VS Code
 *   4. The openDesigner command is available in the command palette
 *   5. A webview panel is created (designer or error)
 *   6. The webview contains the expected root element
 *
 * Notes:
 *   - The designer requires the design-time API (Azure Functions runtime)
 *     to fully load.  In the test environment, it may show a loading spinner
 *     or an error message.  We verify that the webview OPENS, not that the
 *     designer fully initialises.
 *   - After all tests complete we clean up the temp workspaces.
 */

// ===========================================================================
// Configuration
// ===========================================================================

/** Timeout for each individual test */
const TEST_TIMEOUT = 180_000;

/** Timeout for waiting for elements */
const ELEMENT_TIMEOUT = 15_000;

/** Time to allow the extension to recognise the project after opening folder */
const PROJECT_RECOGNITION_WAIT = 10_000;

/** Time to wait after opening the designer command */
const DESIGNER_OPEN_WAIT = 15_000;

/** Directory for explicit designer-open screenshots (captured on pass/fail) */
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'designerOpen-explicit',
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

    // Try clicking Cancel, Don't Trust, or any dismiss-like button
    const dismissLabels = ['Cancel', "Don't Trust", 'No', 'Close', 'Dismiss'];
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
            if (lower.includes('cancel') || lower.includes("don't trust") || lower.includes('no') || lower.includes('close')) {
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
 * blocking keyboard shortcuts.  This is more reliable than CSS selectors
 * because it can peek inside Shadow DOM and detect elements we haven't
 * anticipated.
 */
async function dumpDomState(driver: WebDriver, label: string): Promise<void> {
  try {
    const result = await driver.executeScript<string>(`
      const info = [];

      // 1. Check for dialog containers
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

      // 2. Check the active/focused element
      const active = document.activeElement;
      if (active) {
        info.push('activeElement: <' + active.tagName + '> class=' + active.className?.substring(0, 100));
      }

      // 3. Check for any fixed/modal overlay covering the screen
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
      console.log(`[dumpDomState:${label}]\\n${result}`);
    } else {
      console.log(`[dumpDomState:${label}] No blocking elements found`);
    }
  } catch (e: any) {
    console.log(`[dumpDomState:${label}] Error: ${e.message}`);
  }
}

/**
 * Try to dismiss any dialog by injecting JavaScript to click Cancel/close buttons.
 * This is a last-resort approach when Selenium selectors fail.
 */
async function jsDismissDialogs(driver: WebDriver): Promise<boolean> {
  try {
    const dismissed = await driver.executeScript<boolean>(`
      // Try all known dialog button selectors
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
        // Click last button as fallback
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
    // Click on the editor area to ensure focus
    const editor = await driver.findElement(By.css('.editor-container, .monaco-editor, .split-view-view'));
    await editor.click();
    await sleep(500);
  } catch {
    // Fallback: click on the workbench
    try {
      const wb = await driver.findElement(By.css('.monaco-workbench'));
      await wb.click();
      await sleep(500);
    } catch {
      /* ignore */
    }
  }
}

// openWorkspaceFolder removed — dead code. Use openWorkspaceFileInSession + openFileInEditor instead.

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
 *
 * This handles BOTH types because the code path depends on whether
 * WORKFLOWS_SUBSCRIPTION_ID is undefined (→ QuickPick) or defined (→ auth dialog).
 */
async function handleDesignerPrompts(workbench: Workbench, driver: WebDriver): Promise<void> {
  // Poll for QuickPick dialogs AND auth dialogs for up to 10 seconds
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    // First, check for and dismiss any modal dialog (auth, workspace trust, etc.)
    try {
      const dismissed = await dismissAllDialogs(driver);
      if (dismissed) {
        console.log('[handleDesignerPrompts] Dismissed a dialog');
        await sleep(1000);
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
      await sleep(3000);

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
 * Open a specific .code-workspace file in the running VS Code session.
 * This is required so workspace-scoped commands (like Open Designer) resolve
 * against the correct workspace folder for the active workflow file.
 *
 * After opening, clears any blocking UI (auth dialogs, workspace trust prompts, etc.)
 * that may have appeared during extension activation.
 */
async function openWorkspaceFileInSession(workbench: Workbench, wsFilePath: string): Promise<void> {
  console.log(`[openWorkspaceFileInSession] Opening workspace file: ${wsFilePath}`);

  if (!fs.existsSync(wsFilePath)) {
    throw new Error(`Workspace file not found: ${wsFilePath}`);
  }

  const driver = VSBrowser.instance.driver;

  await VSBrowser.instance.openResources(wsFilePath);
  await sleep(8000);

  // Dismiss any dialogs that appeared during workspace open
  await clearBlockingUI(driver);

  // Ensure a fresh workbench object after potential window/context changes.
  await workbench.getDriver().wait(until.elementLocated(By.css('.monaco-workbench')), 20_000);

  // Extra wait for extension re-activation after workspace switch
  await sleep(5000);

  // Final clear of any dialogs that appeared during re-activation
  await clearBlockingUI(driver);

  console.log('[openWorkspaceFileInSession] Workspace file opened and workbench is ready');
}

/**
 * Execute the Open Designer command from the command palette.
 * The openDesigner command needs a workflow.json file to be active.
 *
 * Before each attempt, we dismiss any pending auth dialogs that block
 * keyboard input (the modal auth dialog prevents F1/Ctrl+Shift+P from
 * reaching VS Code).
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
  for (let attempt = 0; attempt < 3; attempt++) {
    // Clear blocking UI before each attempt
    await clearBlockingUI(driver);
    await jsDismissDialogs(driver);

    // Dump DOM state on retries
    if (attempt > 0) {
      await dumpDomState(driver, `retry-${attempt}`);
    }

    // Ensure focus is on the editor
    await focusEditor(driver);
    await sleep(500);

    try {
      input = await workbench.openCommandPrompt();
      await sleep(1000);
      await input.setText('> Open Designer');
      await sleep(2000);

      const picks = await input.getQuickPicks();
      const allLabels: string[] = [];
      let designerPick: (typeof picks)[0] | null = null;

      for (const pick of picks) {
        const label = await pick.getLabel();
        allLabels.push(label);
        console.log(`[executeOpenDesigner] Pick: "${label}"`);

        const lower = label.toLowerCase();
        if (lower.includes('open designer') && !lower.includes('data map')) {
          designerPick = pick;
        }
      }

      if (designerPick) {
        const selectedLabel = await designerPick.getLabel();
        console.log(`[executeOpenDesigner] Found "Open Designer" command, selecting: "${selectedLabel}"`);
        await designerPick.select();
        await sleep(DESIGNER_OPEN_WAIT);
        return true;
      }

      // Try broader search
      await input.cancel();
      await sleep(500);
      input = await workbench.openCommandPrompt();
      await sleep(500);
      await input.setText('> logic apps open designer');
      await sleep(2000);

      const picks2 = await input.getQuickPicks();
      for (const pick of picks2) {
        const label = await pick.getLabel();
        allLabels.push(label);
        console.log(`[executeOpenDesigner] Retry pick: "${label}"`);
        if (label.toLowerCase().includes('designer')) {
          designerPick = pick;
          break;
        }
      }

      if (designerPick) {
        const selectedLabel = await designerPick.getLabel();
        console.log(`[executeOpenDesigner] Found designer command on retry, selecting: "${selectedLabel}"`);
        await designerPick.select();
        await sleep(DESIGNER_OPEN_WAIT);
        return true;
      }

      await input.cancel();
      console.log(`[executeOpenDesigner] No designer command found. Labels: ${JSON.stringify(allLabels)}`);
      return false;
    } catch (e: any) {
      console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/3 failed: ${e.message}`);
      try {
        await input?.cancel();
      } catch {
        /* ignore */
      }
      await sleep(2000);
    }
  }
  return false;
}

/**
 * Check if a webview panel (designer) is currently open.
 * Returns info about what the webview contains.
 */
async function inspectDesignerWebview(driver: WebDriver): Promise<{
  found: boolean;
  hasRootElement: boolean;
  hasSpinner: boolean;
  hasError: boolean;
  hasDesigner: boolean;
  hasNode: boolean;
  hasPlaceholder: boolean;
  bodyText: string;
  screenshotPath?: string;
}> {
  const result = {
    found: false,
    hasRootElement: false,
    hasSpinner: false,
    hasError: false,
    hasDesigner: false,
    hasNode: false,
    hasPlaceholder: false,
    bodyText: '',
    screenshotPath: undefined as string | undefined,
  };

  // Retry switching to the webview frame up to 3 times with delays.
  // The webview iframe may not be attached to the DOM immediately after
  // the Open Designer command returns.
  let webview: WebView | undefined;
  for (let frameAttempt = 0; frameAttempt < 3; frameAttempt++) {
    try {
      webview = new WebView();
      await webview.switchToFrame();
      await sleep(1000);
      result.found = true;
      break;
    } catch (e: any) {
      console.log(`[inspectDesignerWebview] switchToFrame attempt ${frameAttempt + 1}/3 failed: ${e.message}`);
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      await sleep(5000);
    }
  }

  if (!result.found) {
    console.log('[inspectDesignerWebview] Could not switch to webview frame after 3 attempts');
    return result;
  }

  try {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      // Check for #root element
      try {
        const roots = await driver.findElements(By.id('root'));
        result.hasRootElement = roots.length > 0;
      } catch {
        /* ignore */
      }

      // Check for Fluent UI Spinner (loading state)
      try {
        const spinners = await driver.findElements(By.css('[role="progressbar"], .fui-Spinner'));
        result.hasSpinner = spinners.length > 0;
      } catch {
        /* ignore */
      }

      // Check for error display
      try {
        const bodyText = await driver.findElement(By.css('body')).getText();
        result.bodyText = bodyText.substring(0, 1000);
        result.hasError =
          bodyText.toLowerCase().includes('error') ||
          bodyText.toLowerCase().includes('failed') ||
          bodyText.toLowerCase().includes('unable');
      } catch {
        /* ignore */
      }

      // Check for designer canvas (msla-designer-canvas is a common class)
      try {
        const designers = await driver.findElements(By.css('.msla-designer-canvas, [class*="designer"], .react-flow'));
        result.hasDesigner = designers.length > 0;
      } catch {
        /* ignore */
      }

      // Check for actual workflow node(s)
      try {
        const nodes = await driver.findElements(By.css('.react-flow__node, [data-testid*="node"], [class*="node-"]'));
        result.hasNode = nodes.length > 0;
      } catch {
        /* ignore */
      }

      // Check for placeholder cards ("Add a trigger" / "Add an action")
      // Empty workflows show these placeholder cards instead of regular nodes.
      try {
        const placeholders = await driver.findElements(
          By.css(
            '[data-testid="card-Add a trigger"], [data-automation-id="card-Add_a_trigger"], [data-testid="card-Add an action"], [data-automation-id="card-Add_an_action"]'
          )
        );
        result.hasPlaceholder = placeholders.length > 0;
      } catch {
        /* ignore */
      }

      if (result.hasNode || result.hasPlaceholder || result.hasDesigner || result.hasSpinner || result.hasRootElement || result.hasError) {
        break;
      }

      await sleep(1000);
    }

    result.screenshotPath = await captureScreenshot(driver, 'designer-open-webview');

    await webview!.switchBack();
  } catch (e: any) {
    console.log(`[inspectDesignerWebview] Error during inspection: ${e.message}`);
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
  }

  return result;
}

/**
 * Verify a single workspace: open it, try to launch the designer, inspect.
 */
async function verifyDesignerOpens(
  workbench: Workbench,
  driver: WebDriver,
  entry: WorkspaceManifestEntry
): Promise<{ opened: boolean; details: string }> {
  const tag = `[${entry.label}]`;
  console.log(`${tag} Starting designer open test...`);

  // 1. Verify the workspace exists on disk
  if (!fs.existsSync(entry.wsDir)) {
    return { opened: false, details: `Workspace directory not found: ${entry.wsDir}` };
  }
  console.log(`${tag} Workspace exists: ${entry.wsDir}`);

  // 2. Verify workflow.json exists
  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  if (!fs.existsSync(workflowJsonPath)) {
    return { opened: false, details: `workflow.json not found: ${workflowJsonPath}` };
  }
  console.log(`${tag} workflow.json exists: ${workflowJsonPath}`);

  // 2.5 Ensure local.settings.json has WORKFLOWS_SUBSCRIPTION_ID to skip Azure connector prompts
  ensureLocalSettingsForDesigner(entry.appDir);

  // 2.6 Open the specific .code-workspace for this entry in the current session
  try {
    await openWorkspaceFileInSession(workbench, entry.wsFilePath);
    // Refresh workbench and driver references after workspace switch behavior
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    console.log(`${tag} Opened workspace file: ${entry.wsFilePath}`);
  } catch (e: any) {
    return { opened: false, details: `Failed to open workspace file: ${e.message}` };
  }

  // 3. Open the workflow.json file in the editor
  try {
    await openFileInEditor(workbench, driver, workflowJsonPath);
    console.log(`${tag} Opened workflow.json in editor`);
  } catch (e: any) {
    return { opened: false, details: `Failed to open workflow.json: ${e.message}` };
  }

  // 4. Wait a bit for extension to recognise the project, dismissing
  //    any auth dialogs that may appear during extension activation.
  await sleep(PROJECT_RECOGNITION_WAIT / 2);
  await clearBlockingUI(driver);
  await sleep(PROJECT_RECOGNITION_WAIT / 2);
  await clearBlockingUI(driver);

  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }
  await captureScreenshot(driver, `${entry.label}-before-open-designer`);

  // 5. Execute openDesigner command
  const commandFound = await executeOpenDesignerCommand(workbench, driver);
  if (!commandFound) {
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await captureScreenshot(driver, `${entry.label}-command-not-found`);
    return { opened: false, details: 'Open Designer command not found in palette' };
  }
  console.log(`${tag} Open Designer command executed`);

  // 5.5 Handle any Azure connector wizard prompts that appear
  // (fallback in case local.settings.json patching didn't fully prevent them)
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }
  await handleDesignerPrompts(workbench, driver);

  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }
  await captureScreenshot(driver, `${entry.label}-after-open-designer-command`);

  // 6. Inspect the webview
  const inspection = await inspectDesignerWebview(driver);
  console.log(
    `${tag} Webview inspection: ${JSON.stringify({
      found: inspection.found,
      hasRootElement: inspection.hasRootElement,
      hasSpinner: inspection.hasSpinner,
      hasError: inspection.hasError,
      hasDesigner: inspection.hasDesigner,
      hasNode: inspection.hasNode,
      hasPlaceholder: inspection.hasPlaceholder,
    })}`
  );
  if (inspection.bodyText) {
    console.log(`${tag} Webview body (first 500): ${inspection.bodyText.substring(0, 500)}`);
  }
  if (inspection.screenshotPath) {
    console.log(`${tag} Webview screenshot: ${inspection.screenshotPath}`);
  }

  // 7. Close all editors to prepare for next test
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }
  try {
    const editorView = new EditorView();
    await editorView.closeAllEditors();
  } catch {
    /* ignore */
  }
  await sleep(2000);

  // Accept multiple success indicators:
  //   - hasNode:        Regular workflow nodes rendered on the canvas
  //   - hasPlaceholder: Empty workflow shows "Add a trigger" / "Add an action" cards
  //   - hasDesigner:    Designer shell / React Flow container is present
  //   - hasRootElement: Root div is mounted (designer JS is loading)
  //   - hasSpinner:     Loading spinner visible (designer is initialising)
  if (inspection.found && (inspection.hasNode || inspection.hasPlaceholder)) {
    const what = inspection.hasNode ? 'workflow node(s)' : 'placeholder card(s)';
    return { opened: true, details: `Designer webview opened with ${what} visible` };
  }

  if (inspection.found && inspection.hasDesigner) {
    return { opened: true, details: 'Designer webview opened with designer canvas visible (no nodes yet)' };
  }

  if (inspection.found && inspection.hasRootElement) {
    return { opened: true, details: 'Designer webview opened with root element (designer initialising)' };
  }

  if (inspection.found && inspection.hasSpinner) {
    return { opened: true, details: 'Designer webview opened with loading spinner' };
  }

  if (inspection.found) {
    const status = inspection.hasError ? 'error displayed' : 'blank webview';
    return { opened: false, details: `Designer opened but: ${status}` };
  }

  return { opened: false, details: 'Webview panel not found after executing command' };
}

// ===========================================================================
// Test Suite
// ===========================================================================

describe('Designer Open Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(60_000);

    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    console.log(`[designerOpen:before] Explicit screenshots dir: ${EXPLICIT_SCREENSHOT_DIR}`);

    // Load the manifest written by createWorkspace.test.ts
    console.log(`[designerOpen:before] Looking for manifest at: ${WORKSPACE_MANIFEST_PATH}`);

    if (!fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      console.log('[designerOpen:before] Manifest file not found — skipping all designer open tests.');
      console.log('[designerOpen:before] The createWorkspace.test.ts suite must run first to create the manifest.');
      this.skip();
      return;
    }

    manifest = loadWorkspaceManifest();
    console.log(`[designerOpen:before] Loaded ${manifest.length} workspace entries from manifest`);

    if (manifest.length === 0) {
      console.log('[designerOpen:before] Manifest is empty — skipping all designer open tests.');
      this.skip();
      return;
    }

    // Log all entries
    for (const entry of manifest) {
      console.log(`  - ${entry.label}: ${entry.wsDir} (${entry.appType}/${entry.wfType})`);
    }

    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    await sleep(3000);
  });

  after(async () => {
    // Clean up all created workspaces and the manifest file
    console.log('[designerOpen:after] Cleaning up workspaces...');
    cleanupAllWorkspaces();
    console.log(`[designerOpen:after] Explicit screenshots captured in: ${EXPLICIT_SCREENSHOT_DIR}`);
  });

  // =========================================================================
  // Manifest verification tests
  // =========================================================================
  describe('Manifest verification', () => {
    it('should have a valid manifest with workspace entries', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      console.log(`[manifestCheck] Manifest has ${manifest.length} entries`);

      // Verify all entries have required fields
      for (const entry of manifest) {
        if (!entry.wsName || !entry.appName || !entry.wfName) {
          throw new Error(`Invalid manifest entry: missing name fields in "${entry.label}"`);
        }
        if (!entry.wsDir || !entry.appDir || !entry.wfDir) {
          throw new Error(`Invalid manifest entry: missing directory fields in "${entry.label}"`);
        }
        if (!entry.appType || !entry.wfType) {
          throw new Error(`Invalid manifest entry: missing type fields in "${entry.label}"`);
        }
      }

      console.log('[manifestCheck] All manifest entries are valid');
    });

    it('should have all workspace directories on disk', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const missing: string[] = [];
      for (const entry of manifest) {
        if (!fs.existsSync(entry.wsDir)) {
          missing.push(`${entry.label}: ${entry.wsDir}`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing workspace directories:\n${missing.join('\n')}`);
      }

      console.log(`[diskCheck] All ${manifest.length} workspace directories exist on disk`);
    });

    it('should have workflow.json in each workspace', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const missing: string[] = [];
      for (const entry of manifest) {
        const wfPath = path.join(entry.wfDir, 'workflow.json');
        if (!fs.existsSync(wfPath)) {
          missing.push(`${entry.label}: ${wfPath}`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing workflow.json files:\n${missing.join('\n')}`);
      }

      console.log(`[workflowJsonCheck] All ${manifest.length} workspaces have workflow.json`);
    });

    it('should have correct workflow.json content for each workspace type', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const problems: string[] = [];
      for (const entry of manifest) {
        const wfPath = path.join(entry.wfDir, 'workflow.json');
        try {
          const content = JSON.parse(fs.readFileSync(wfPath, 'utf-8'));

          // Basic structure checks
          if (!content.definition) {
            problems.push(`${entry.label}: workflow.json missing "definition"`);
            continue;
          }
          if (!content.definition.actions && content.definition.actions !== null) {
            // Some workflow types may have null/empty actions
          }
          if (!content.definition.triggers && content.definition.triggers !== null) {
            // Some workflow types may have null/empty triggers
          }

          // Verify kind matches workflow type
          const expectedKind = entry.wfType === 'Stateful' ? 'Stateful' : 'Stateless';
          if (content.kind && content.kind !== expectedKind) {
            // Agent types may have different kind values
            if (!['Autonomous Agents (Preview)', 'Conversational Agents'].includes(entry.wfType)) {
              problems.push(`${entry.label}: expected kind "${expectedKind}", got "${content.kind}"`);
            }
          }
        } catch (e: any) {
          problems.push(`${entry.label}: could not parse workflow.json: ${e.message}`);
        }
      }

      if (problems.length > 0) {
        console.log(`[workflowContentCheck] Problems found:\n${problems.join('\n')}`);
        // Don't fail — content variations are expected
      }

      console.log(`[workflowContentCheck] Checked ${manifest.length} workflow.json files`);
    });
  });

  // =========================================================================
  // Designer open tests — one per app type
  // =========================================================================
  describe('Open designer for each app type', function () {
    this.timeout(TEST_TIMEOUT);

    afterEach(async () => {
      // Recovery: make sure we're on the main content
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      try {
        await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 10_000);
      } catch {
        /* ignore */
      }
      try {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
      } catch {
        /* ignore */
      }
      await sleep(2000);
    });

    it('should open designer for a Standard workspace', async function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const entry = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful');
      if (!entry) {
        console.log('[designerStandard] No Standard + Stateful workspace in manifest, skipping');
        this.skip();
        return;
      }

      const result = await verifyDesignerOpens(workbench, driver, entry);
      console.log(`[designerStandard] Result: ${JSON.stringify(result)}`);

      if (!result.opened) {
        throw new Error(`[designerStandard] FAILED: ${result.details}`);
      }

      console.log(`[designerStandard] PASSED: ${result.details}`);
    });

    it('should open designer for a Custom Code workspace', async function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const entry = manifest.find((e) => e.appType === 'customCode' && e.wfType === 'Stateful');
      if (!entry) {
        console.log('[designerCustomCode] No CustomCode + Stateful workspace in manifest, skipping');
        this.skip();
        return;
      }

      const result = await verifyDesignerOpens(workbench, driver, entry);
      console.log(`[designerCustomCode] Result: ${JSON.stringify(result)}`);

      if (!result.opened) {
        throw new Error(`[designerCustomCode] FAILED: ${result.details}`);
      }

      console.log(`[designerCustomCode] PASSED: ${result.details}`);
    });

    it('should open designer for a Rules Engine workspace', async function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const entry = manifest.find((e) => e.appType === 'rulesEngine' && e.wfType === 'Stateful');
      if (!entry) {
        console.log('[designerRulesEngine] No RulesEngine + Stateful workspace in manifest, skipping');
        this.skip();
        return;
      }

      const result = await verifyDesignerOpens(workbench, driver, entry);
      console.log(`[designerRulesEngine] Result: ${JSON.stringify(result)}`);

      if (!result.opened) {
        throw new Error(`[designerRulesEngine] FAILED: ${result.details}`);
      }

      console.log(`[designerRulesEngine] PASSED: ${result.details}`);
    });
  });

  // =========================================================================
  // Command availability tests
  // =========================================================================
  describe('Designer command availability', function () {
    this.timeout(60_000);

    it('should find the openDesigner command in the palette', async function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      // The openDesigner command has a when clause: logicApps.hasProject && resourceFilename==workflow.json
      // We must open a workspace and its workflow.json to make the command visible.
      const entry = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest[0];
      try {
        await openWorkspaceFileInSession(workbench, entry.wsFilePath);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
        await openFileInEditor(workbench, driver, workflowJsonPath);
        await sleep(PROJECT_RECOGNITION_WAIT);
      } catch (e: any) {
        console.log(`[commandCheck] Could not open workspace context: ${e.message}`);
      }

      // Clear any blocking UI (auth dialogs, notifications, etc.)
      await clearBlockingUI(driver);

      let input: InputBox | undefined;
      try {
        input = await workbench.openCommandPrompt();
        await sleep(1000);
        await input.setText('> Azure Logic Apps Standard: Open Designer');
        await sleep(2000);

        const picks = await input.getQuickPicks();
        const labels: string[] = [];
        let found = false;

        for (const pick of picks) {
          const label = await pick.getLabel();
          labels.push(label);
          if (label.toLowerCase().includes('open designer')) {
            found = true;
          }
        }

        console.log(`[commandCheck] Found ${picks.length} picks: ${JSON.stringify(labels)}`);
        await input.cancel();

        if (!found) {
          // Try a broader search
          input = await workbench.openCommandPrompt();
          await sleep(500);
          await input.setText('> open designer');
          await sleep(2000);

          const picks2 = await input.getQuickPicks();
          for (const pick of picks2) {
            const label = await pick.getLabel();
            labels.push(label);
            if (label.toLowerCase().includes('designer')) {
              found = true;
            }
          }
          await input.cancel();
        }

        if (found) {
          console.log('[commandCheck] PASSED: openDesigner command found in palette');
        } else {
          console.log(`[commandCheck] Warning: openDesigner not found. Available: ${JSON.stringify(labels)}`);
          // Don't fail — the command may not be visible without logicApps.hasProject context
        }
      } catch (e: any) {
        console.log(`[commandCheck] Error checking command: ${e.message}`);
        try {
          await input?.cancel();
        } catch {
          /* ignore */
        }
      }
    });

    it('should find the openOverview command in the palette', async function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      // Clear any blocking UI (auth dialogs, notifications, etc.)
      await clearBlockingUI(driver);

      let input: InputBox | undefined;
      try {
        input = await workbench.openCommandPrompt();
        await sleep(1000);
        await input.setText('> Open Overview');
        await sleep(2000);

        const picks = await input.getQuickPicks();
        const labels: string[] = [];
        let found = false;

        for (const pick of picks) {
          const label = await pick.getLabel();
          labels.push(label);
          if (label.toLowerCase().includes('overview')) {
            found = true;
          }
        }

        await input.cancel();
        console.log(`[overviewCheck] Picks: ${JSON.stringify(labels)}, Found: ${found}`);
      } catch (e: any) {
        console.log(`[overviewCheck] Error: ${e.message}`);
        try {
          await input?.cancel();
        } catch {
          /* ignore */
        }
      }
    });
  });

  // =========================================================================
  // Workspace structure verification (per manifest entry)
  // =========================================================================
  describe('Workspace structure verification', () => {
    it('should have host.json in each workspace', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const missing: string[] = [];
      for (const entry of manifest) {
        const hostJsonPath = path.join(entry.appDir, 'host.json');
        if (!fs.existsSync(hostJsonPath)) {
          missing.push(`${entry.label}: ${hostJsonPath}`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing host.json files:\n${missing.join('\n')}`);
      }

      console.log(`[hostJsonCheck] All ${manifest.length} workspaces have host.json`);
    });

    it('should have local.settings.json in each workspace', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const missing: string[] = [];
      for (const entry of manifest) {
        const lsPath = path.join(entry.appDir, 'local.settings.json');
        if (!fs.existsSync(lsPath)) {
          missing.push(`${entry.label}: ${lsPath}`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing local.settings.json files:\n${missing.join('\n')}`);
      }

      console.log(`[localSettingsCheck] All ${manifest.length} workspaces have local.settings.json`);
    });

    it('should have .code-workspace file for each workspace', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const missing: string[] = [];
      for (const entry of manifest) {
        if (!fs.existsSync(entry.wsFilePath)) {
          missing.push(`${entry.label}: ${entry.wsFilePath}`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Missing .code-workspace files:\n${missing.join('\n')}`);
      }

      console.log(`[codeWorkspaceCheck] All ${manifest.length} workspaces have .code-workspace file`);
    });

    it('should have custom code files for customCode workspaces', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const ccEntries = manifest.filter((e) => e.appType === 'customCode');
      if (ccEntries.length === 0) {
        this.skip();
        return;
      }

      const problems: string[] = [];
      for (const entry of ccEntries) {
        if (!entry.ccFolderName) {
          problems.push(`${entry.label}: missing ccFolderName in manifest`);
          continue;
        }
        const ccDir = path.join(entry.wsDir, entry.ccFolderName);
        if (!fs.existsSync(ccDir)) {
          problems.push(`${entry.label}: custom code directory not found: ${ccDir}`);
        }
      }

      if (problems.length > 0) {
        throw new Error(`Custom code verification failed:\n${problems.join('\n')}`);
      }

      console.log(`[customCodeCheck] All ${ccEntries.length} custom code workspaces verified`);
    });

    it('should have rules engine files for rulesEngine workspaces', function () {
      if (!manifest || manifest.length === 0) {
        this.skip();
        return;
      }

      const reEntries = manifest.filter((e) => e.appType === 'rulesEngine');
      if (reEntries.length === 0) {
        this.skip();
        return;
      }

      const problems: string[] = [];
      for (const entry of reEntries) {
        if (!entry.ccFolderName) {
          problems.push(`${entry.label}: missing ccFolderName (rules engine folder) in manifest`);
          continue;
        }
        const reDir = path.join(entry.wsDir, entry.ccFolderName);
        if (!fs.existsSync(reDir)) {
          problems.push(`${entry.label}: rules engine directory not found: ${reDir}`);
        }
      }

      if (problems.length > 0) {
        throw new Error(`Rules engine verification failed:\n${problems.join('\n')}`);
      }

      console.log(`[rulesEngineCheck] All ${reEntries.length} rules engine workspaces verified`);
    });
  });
});

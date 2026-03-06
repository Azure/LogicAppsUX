// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Designer-specific helpers for E2E tests.
 *
 * Contains helpers extracted from designerActions.test.ts and new helpers
 * required for extended test coverage:
 *
 * From designerActions.test.ts:
 *   - ensureLocalSettingsForDesigner: Set WORKFLOWS_SUBSCRIPTION_ID="" in local.settings.json
 *   - handleDesignerPrompts: Dismiss Azure connector wizard QuickPick prompts
 *   - openWorkspaceFileInSession: Open a .code-workspace file in the VS Code session
 *   - openFileInEditor: Open a file in the VS Code editor
 *   - waitForDependencyValidation: Wait for the extension to finish validating runtime dependencies
 *   - waitForDesignerWebviewTab: Poll until a webview tab (iframe) appears
 *   - executeOpenDesignerCommand: Execute the Open Designer command from the command palette
 *   - switchToDesignerWebview: Switch into the designer webview iframe and wait for it to load
 *   - findAddTriggerCard: Find the "Add a trigger" placeholder card
 *   - findAddActionElement: Find the "Add an action" placeholder or drop zone button
 *   - waitForDiscoveryPanel: Poll until the discovery panel is visible
 *   - waitForSearchResults: Poll until search results appear in the discovery panel
 *   - waitForNodeCountIncrease: Poll until the canvas node count increases
 *   - clickAddActionMenuItem: Click the "Add an action" menu item
 *   - inspectDiscoveryPanel: Inspect the discovery panel for details
 *   - searchInDiscoveryPanel: Type a search term into the discovery panel search box
 *   - selectOperation: Find and click an operation card in the discovery panel
 *   - countCanvasNodes: Count the number of workflow nodes on the canvas
 *   - canvasHasNode: Check if the canvas has a specific node by partial text match
 *   - openDesignerForEntry: Full E2E flow to open a workspace's designer
 *   - clickSaveButton: Click the Save button in the designer command bar
 *   - readWorkflowJson: Read and parse workflow.json from disk
 *
 * New helpers:
 *   - fillCodeEditor: Fill inline code / contenteditable editors
 *   - fillActionInput: Fill a parameter field in the action settings panel
 *   - selectDropdownInPanel: Select a dropdown option in the settings panel
 *   - addParallelBranch: Add a parallel branch on the canvas
 *   - openNodeSettingsPanel: Click a node to open its settings
 *   - openRunAfterSettings: Navigate to the Run After section
 *   - configureRunAfter: Toggle run-after status checkboxes
 *   - focusCanvasNode: Click to focus a specific node
 *   - sendKeyboardShortcut: Send a key combination via Selenium Actions
 *   - getFocusedNodeText: Read the text of the currently-focused node
 */

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
  type InputBox,
} from 'vscode-extension-tester';
import {
  sleep,
  captureScreenshot,
  dismissNotifications,
  dismissAllDialogs,
  clearBlockingUI,
  dumpDomState,
  jsDismissDialogs,
  focusEditor,
} from './helpers';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import * as path from 'path';
import * as fs from 'fs';

// ===========================================================================
// Constants
// ===========================================================================

/** Timeout for each individual test */
export const TEST_TIMEOUT = 300_000;

/** Timeout for waiting for elements */
export const ELEMENT_TIMEOUT = 15_000;

/** Time to allow the extension to recognise the project after opening folder */
export const PROJECT_RECOGNITION_WAIT = 4_000;

/**
 * Maximum time to wait for the designer webview tab to appear after executing
 * the Open Designer command. Covers the dotnet build + func host start that
 * happens inside openDesigner for CustomCode workspaces.
 */
export const DESIGNER_TAB_TIMEOUT = 30_000;

/**
 * Maximum time to wait inside the webview for the designer to finish loading.
 * We poll for the spinner to disappear and the canvas/nodes to render.
 * CustomCode workspaces need extra time because the design-time API
 * (func host start) may take 30-60s to become responsive.
 */
export const DESIGNER_READY_TIMEOUT = 75_000;

/**
 * Maximum time to wait for the extension to finish downloading and validating
 * runtime dependencies (func, dotnet, node). On first run in CI, the extension
 * downloads ~500MB of binaries which can take 3-5 minutes on a cold runner.
 * This is a polling ceiling — the function returns as soon as it detects the
 * extension is ready, not after the full timeout.
 */
export const DEPENDENCY_VALIDATION_TIMEOUT = 300_000;

// ===========================================================================
// Helpers from designerActions.test.ts
// ===========================================================================

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
 *
 * NOTE: This causes the else branch in getAzureConnectorDetailsForLocalProject
 * to call getAuthData(). With silentAuth: true in VS Code settings, getAuthData
 * returns undefined which may crash. The test's `waitForDesignerWebviewTab`
 * handles this by dismissing any resulting error dialogs.
 */
export function ensureLocalSettingsForDesigner(appDir: string): void {
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
export async function handleDesignerPrompts(workbench: Workbench, driver: WebDriver): Promise<void> {
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
export async function openWorkspaceFileInSession(workbench: Workbench, wsFilePath: string): Promise<void> {
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

  // Wait for the extension to FULLY re-activate after the workspace switch.
  // Opening a .code-workspace file triggers an extension host restart. On CI
  // (Linux, cold caches), the extension downloads and validates runtime
  // dependencies (NodeJs, FuncCoreTools, DotNetSDK) which takes 30-120s.
  // Without this wait, "Open Designer" is never found in the command palette
  // because the extension hasn't finished registering its commands yet.
  console.log('[openWorkspaceFileInSession] Waiting for extension to re-activate after workspace switch...');
  try {
    await waitForDependencyValidation(driver, DEPENDENCY_VALIDATION_TIMEOUT);
  } catch (e: any) {
    console.log(`[openWorkspaceFileInSession] Warning: extension activation wait failed: ${e.message}`);
    // Don't throw — the extension may still work, just slower than expected
  }

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
export async function openFileInEditor(workbench: Workbench, driver: WebDriver, filePath: string): Promise<void> {
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
export async function waitForDependencyValidation(driver: WebDriver, timeoutMs = DEPENDENCY_VALIDATION_TIMEOUT): Promise<void> {
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

  // Not visible yet — poll until either the notification appears
  // OR the extension finishes activating (commands become available).
  // Extension host may restart during activation. In CI, the first run
  // downloads ~500MB of dependencies which takes 3-5 min.
  const activationDeadline = Date.now() + timeoutMs;
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

  throw new Error(
    `Extension not properly activated after ${Math.round(timeoutMs / 1000)}s: "${VALIDATION_TEXT}" never appeared and "Open Designer" command not found`
  );
}

/**
 * Poll until a webview tab (iframe) appears in the VS Code DOM, indicating
 * the designer panel has opened. Also dismisses any blocking prompts that
 * appear during this wait (Azure connector wizard, auth dialogs).
 */
export async function waitForDesignerWebviewTab(driver: WebDriver): Promise<boolean> {
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
    // Prompt 1: "Use connectors from Azure" / "Skip for now" → click "Skip"
    // Prompt 2: "Managed Service Identity" / "Connection Keys" → click "Connection Keys"
    // IMPORTANT: Skip the command palette (input starts with ">") — only target wizard QuickPicks.
    try {
      const quickPickAction = await driver.executeScript<string | null>(`
        const widget = document.querySelector('.quick-input-widget:not(.hidden)');
        if (!widget) return null;

        // Skip the command palette — its input starts with ">"
        const inputEl = widget.querySelector('.quick-input-box input');
        const inputVal = inputEl ? inputEl.value || '' : '';
        if (inputVal.startsWith('>')) return null;

        const rows = widget.querySelectorAll('.quick-input-list .monaco-list-row');
        if (rows.length === 0) return null;

        // Collect row labels — use the .label-name span for precise text
        const labels = [];
        for (const row of rows) {
          const labelSpan = row.querySelector('.label-name');
          labels.push(labelSpan ? (labelSpan.textContent || '').trim() : (row.textContent || '').trim());
        }

        // Prompt 1: "Use connectors from Azure" / "Skip for now"
        for (let i = 0; i < labels.length; i++) {
          if (labels[i].toLowerCase().includes('skip')) {
            rows[i].click();
            return 'clicked:skip:' + labels[i].substring(0, 80);
          }
        }

        // Prompt 2: "Connection Keys" / "Managed Service Identity"
        for (let i = 0; i < labels.length; i++) {
          const lower = labels[i].toLowerCase();
          if (lower.includes('connection key') || lower.includes('access key')) {
            rows[i].click();
            return 'clicked:connkey:' + labels[i].substring(0, 80);
          }
        }

        // If we have real labels but no match, return them for debugging
        const nonEmpty = labels.filter(l => l.length > 0);
        if (nonEmpty.length > 0) {
          return 'unknown:' + JSON.stringify(nonEmpty.map(l => l.substring(0, 80)));
        }

        return null; // Empty labels — ignore
      `);

      if (quickPickAction) {
        if (quickPickAction.startsWith('clicked:')) {
          console.log(`[waitForDesignerTab] ${quickPickAction}`);
          await sleep(1000);
        } else if (quickPickAction.startsWith('unknown:')) {
          console.log(`[waitForDesignerTab] Unknown QuickPick: ${quickPickAction}`);
          // Press Escape to dismiss unknown QuickPick
          const body = await driver.findElement(By.css('body'));
          await body.sendKeys(Key.ESCAPE);
          await sleep(500);
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
export async function executeOpenDesignerCommand(workbench: Workbench, driver: WebDriver): Promise<boolean> {
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
  for (let attempt = 0; attempt < 10; attempt++) {
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
          console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/10: command selected but webview tab not found, retrying...`);
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
      console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/10: "Open Designer" not found. Available: ${JSON.stringify(available)}`);
      await input.cancel();
      await sleep(5000);
    } catch (e: any) {
      console.log(`[executeOpenDesigner] Attempt ${attempt + 1}/10 failed: ${e.message}`);
      try {
        await input?.cancel();
      } catch {
        /* ignore */
      }
      await sleep(5000);
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
export async function switchToDesignerWebview(driver: WebDriver, timeoutMs = DESIGNER_READY_TIMEOUT): Promise<WebView> {
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
export async function findAddTriggerCard(driver: WebDriver): Promise<WebElement | null> {
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
export async function findAddActionElement(driver: WebDriver): Promise<WebElement | null> {
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
 * Find the LAST "Add an action" placeholder or + button on the canvas.
 * Use this when adding a second action to ensure it goes at the END of
 * the flow rather than between existing nodes.
 */
export async function findLastAddActionElement(driver: WebDriver): Promise<WebElement | null> {
  const selectors = [
    '[data-automation-id^="msla-plus-button-"]',
    '[id^="msla-edge-button-"]',
    '[data-testid="card-Add an action"]',
    '[data-automation-id="card-Add_an_action"]',
    '[aria-label="Add an action"]',
  ];

  for (const selector of selectors) {
    try {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        const last = elements[elements.length - 1];
        console.log(`[findLastAddActionElement] Found ${elements.length} via: ${selector}, using last`);
        return last;
      }
    } catch {
      // Try next selector
    }
  }

  return null;
}

/**
 * Poll until the discovery panel (recommendation panel) is visible.
 * Returns when the panel root or search box appears, or after timeout.
 */
export async function waitForDiscoveryPanel(driver: WebDriver, timeoutMs = 5000): Promise<boolean> {
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
export async function waitForSearchResults(driver: WebDriver, timeoutMs = 5000): Promise<boolean> {
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
export async function waitForNodeCountIncrease(driver: WebDriver, baseline: number, timeoutMs = 10000): Promise<number> {
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

/**
 * Find and click the "Add an action" menu item in the edge contextual menu.
 * This menu appears after clicking the "+" button on an edge.
 */
export async function clickAddActionMenuItem(driver: WebDriver): Promise<boolean> {
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
export async function inspectDiscoveryPanel(driver: WebDriver): Promise<{
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
export async function searchInDiscoveryPanel(driver: WebDriver, searchTerm: string): Promise<boolean> {
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
export async function selectOperation(driver: WebDriver, operationName: string): Promise<boolean> {
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
export async function countCanvasNodes(driver: WebDriver): Promise<number> {
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
export async function canvasHasNode(driver: WebDriver, nodeText: string): Promise<boolean> {
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
export async function openDesignerForEntry(
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

  // 3. Open the workspace file — but SKIP if VS Code was already launched
  //    with this workspace as a startup resource (avoids a costly extension
  //    host restart + dependency re-validation cycle on CI).
  const wsBaseName = path.basename(entry.wsFilePath);
  let skipWorkspaceSwitch = false;
  try {
    const title = await driver.getTitle();
    // VS Code title format: "workspaceName (Workspace) — Visual Studio Code"
    const wsNameFromFile = path.basename(entry.wsFilePath, '.code-workspace');
    if (title.includes(wsNameFromFile) || title.includes('(Workspace)')) {
      console.log(`${tag} VS Code already has workspace open (title: "${title}") — skipping workspace switch`);
      skipWorkspaceSwitch = true;
    }
  } catch {
    /* title check failed — proceed with workspace switch */
  }

  if (!skipWorkspaceSwitch) {
    try {
      await openWorkspaceFileInSession(workbench, entry.wsFilePath);
      driver = VSBrowser.instance.driver;
      workbench = new Workbench();
      console.log(`${tag} Opened workspace: ${entry.wsFilePath}`);
    } catch (e: any) {
      return { success: false, error: `Failed to open workspace: ${e.message}` };
    }
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
export async function clickSaveButton(driver: WebDriver): Promise<boolean> {
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
export function readWorkflowJson(wfDir: string): any {
  const filePath = path.join(wfDir, 'workflow.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// ===========================================================================
// Action panel input helpers
// ===========================================================================

/**
 * Fill an inline code editor (Lexical contentEditable or Monaco) in the
 * currently-open action parameter panel with the given code string.
 *
 * The Logic Apps designer uses Lexical `[contenteditable="true"].editor-input`
 * for most text fields. For code-specific actions there may be a Monaco editor.
 */
export async function fillCodeEditor(driver: WebDriver, code: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Strategy 1: Lexical contenteditable editor
      const editors = await driver.findElements(
        By.css(
          '[contenteditable="true"].editor-input, ' +
            '[data-automation-id*="editor"] [contenteditable="true"], ' +
            '.msla-editor-container [contenteditable="true"], ' +
            '[role="textbox"][contenteditable="true"]'
        )
      );
      if (editors.length > 0) {
        await driver.actions().move({ origin: editors[0] }).click().perform();
        await sleep(300);
        await editors[0].sendKeys(code);
        console.log(`[fillCodeEditor] Typed code into contenteditable (attempt ${attempt + 1})`);
        return true;
      }

      // Strategy 2: Monaco editor textarea (used for code-specific actions)
      const monacoTextareas = await driver.findElements(By.css('.monaco-editor textarea.inputarea'));
      if (monacoTextareas.length > 0) {
        await monacoTextareas[0].click();
        await sleep(300);
        await monacoTextareas[0].sendKeys(code);
        console.log(`[fillCodeEditor] Typed code into Monaco editor (attempt ${attempt + 1})`);
        return true;
      }

      console.log(`[fillCodeEditor] No editor found on attempt ${attempt + 1}`);
      await sleep(1500);
    } catch (e: any) {
      console.log(`[fillCodeEditor] Attempt ${attempt + 1} failed: ${e.message}`);
      await sleep(1000);
    }
  }
  return false;
}

/**
 * Fill a parameter input field in the currently-open action settings panel.
 * Searches by label text or automation-id pattern, then types the value.
 *
 * Works for both plain `<input>` fields and Lexical contenteditable editors.
 */
export async function fillActionInput(driver: WebDriver, inputLabel: string, value: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Strategy 1: Find by label → for → input id
      const labels = await driver.findElements(By.xpath(`//label[contains(text(), "${inputLabel}")]`));
      for (const label of labels) {
        try {
          const forId = await label.getAttribute('for');
          if (forId) {
            const input = await driver.findElement(By.id(forId));
            const tag = await input.getTagName();
            if (tag.toLowerCase() === 'input' || tag.toLowerCase() === 'textarea') {
              await input.click();
              await input.sendKeys(Key.chord(Key.CONTROL, 'a'));
              await input.sendKeys(value);
              console.log(`[fillActionInput] Filled "${inputLabel}" via label-for-id`);
              return true;
            }
          }
        } catch {
          /* try next strategy */
        }

        // Strategy 2: Find sibling/descendant contenteditable near the label
        try {
          const container = await label.findElement(By.xpath('./..'));
          const editables = await container.findElements(By.css('[contenteditable="true"]'));
          if (editables.length > 0) {
            await driver.actions().move({ origin: editables[0] }).click().perform();
            await sleep(200);
            await editables[0].sendKeys(value);
            console.log(`[fillActionInput] Filled "${inputLabel}" via sibling contenteditable`);
            return true;
          }
        } catch {
          /* try next */
        }
      }

      // Strategy 3: Look for aria-label matching input
      const inputs = await driver.findElements(By.css(`input[aria-label*="${inputLabel}"], textarea[aria-label*="${inputLabel}"]`));
      if (inputs.length > 0) {
        await inputs[0].click();
        await inputs[0].sendKeys(Key.chord(Key.CONTROL, 'a'));
        await inputs[0].sendKeys(value);
        console.log(`[fillActionInput] Filled "${inputLabel}" via aria-label`);
        return true;
      }

      // Strategy 4: data-automation-id based lookup (Logic Apps designer pattern)
      // The designer uses data-automation-id like "msla-setting-token-editor-stringeditor-name"
      const labelLower = inputLabel.toLowerCase().replace(/\s+/g, '-');
      const automationSelectors = [
        `[data-automation-id*="${labelLower}"] [contenteditable="true"]`,
        `[data-automation-id*="${labelLower}"] input`,
        `[data-automation-id*="${inputLabel.toLowerCase()}"] [contenteditable="true"]`,
        `[data-automation-id*="${inputLabel.toLowerCase()}"] input`,
      ];
      for (const sel of automationSelectors) {
        try {
          const els = await driver.findElements(By.css(sel));
          if (els.length > 0) {
            await driver.actions().move({ origin: els[0] }).click().perform();
            await sleep(200);
            const tag = await els[0].getTagName();
            if (tag.toLowerCase() === 'input' || tag.toLowerCase() === 'textarea') {
              await els[0].sendKeys(Key.chord(Key.CONTROL, 'a'));
            }
            await els[0].sendKeys(value);
            console.log(`[fillActionInput] Filled "${inputLabel}" via data-automation-id: ${sel}`);
            return true;
          }
        } catch {
          /* try next */
        }
      }

      // Strategy 5: JS-based scan — find any contenteditable or input near text matching the label
      const filled = await driver.executeScript<boolean>(`
        var label = ${JSON.stringify(inputLabel)}.toLowerCase();
        var value = ${JSON.stringify(value)};
        // Scan all elements with data-automation-id
        var aids = document.querySelectorAll('[data-automation-id]');
        for (var i = 0; i < aids.length; i++) {
          var aid = (aids[i].getAttribute('data-automation-id') || '').toLowerCase();
          if (aid.includes(label) || aid.includes(label.replace(/\\s+/g, ''))) {
            var ed = aids[i].querySelector('[contenteditable="true"]');
            if (ed) { ed.focus(); ed.textContent = value; ed.dispatchEvent(new Event('input', {bubbles:true})); return true; }
            var inp = aids[i].querySelector('input');
            if (inp) { inp.focus(); inp.value = value; inp.dispatchEvent(new Event('input', {bubbles:true})); return true; }
          }
        }
        // Scan labels
        var labels = document.querySelectorAll('label, [class*="label"], [class*="Label"]');
        for (var i = 0; i < labels.length; i++) {
          var t = (labels[i].textContent || '').trim().toLowerCase();
          if (t === label || t.includes(label)) {
            var parent = labels[i].parentElement;
            if (!parent) continue;
            var ed = parent.querySelector('[contenteditable="true"]');
            if (ed) { ed.focus(); ed.textContent = value; ed.dispatchEvent(new Event('input', {bubbles:true})); return true; }
            var inp = parent.querySelector('input');
            if (inp) { inp.focus(); inp.value = value; inp.dispatchEvent(new Event('input', {bubbles:true})); return true; }
          }
        }
        return false;
      `);
      if (filled) {
        console.log(`[fillActionInput] Filled "${inputLabel}" via JS scan`);
        return true;
      }

      // Diagnostic: dump what's available in the panel
      if (attempt === 0) {
        try {
          const diag = await driver.executeScript<string>(`
            var aids = [];
            document.querySelectorAll('[data-automation-id]').forEach(function(el) {
              aids.push(el.getAttribute('data-automation-id'));
            });
            var labels = [];
            document.querySelectorAll('label').forEach(function(el) {
              labels.push(el.textContent.trim().substring(0, 40));
            });
            var ariaLabels = [];
            document.querySelectorAll('[aria-label]').forEach(function(el) {
              ariaLabels.push(el.getAttribute('aria-label').substring(0, 40));
            });
            return 'automation-ids: ' + aids.slice(0, 15).join(', ') +
              ' | labels: ' + labels.slice(0, 10).join(', ') +
              ' | aria-labels: ' + ariaLabels.slice(0, 10).join(', ');
          `);
          console.log(`[fillActionInput] Panel DOM: ${diag}`);
        } catch {
          /* ignore */
        }
      }

      console.log(`[fillActionInput] "${inputLabel}" not found on attempt ${attempt + 1}`);
      await sleep(1500);
    } catch (e: any) {
      console.log(`[fillActionInput] Attempt ${attempt + 1} failed: ${e.message}`);
      await sleep(1000);
    }
  }
  return false;
}

/**
 * Select a value from a dropdown/combobox in the action settings panel.
 * The designer uses Fluent UI dropdowns with `[role="combobox"]`.
 */
export async function selectDropdownInPanel(driver: WebDriver, label: string, optionText: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Strategy 1: Find dropdown near a label element
      const labels = await driver.findElements(By.xpath(`//label[contains(text(), "${label}")]`));
      for (const lbl of labels) {
        try {
          const container = await lbl.findElement(By.xpath('./..'));
          const dropdowns = await container.findElements(By.css('button[role="combobox"], [role="combobox"]'));
          if (dropdowns.length > 0) {
            await dropdowns[0].click();
            await sleep(500);

            const options = await driver.findElements(By.css('[role="option"], [role="listbox"] [role="option"]'));
            for (const opt of options) {
              const text = await opt.getText().catch(() => '');
              if (text.toLowerCase().includes(optionText.toLowerCase())) {
                await opt.click();
                console.log(`[selectDropdownInPanel] Selected "${optionText}" for "${label}" via label strategy`);
                await sleep(500);
                return true;
              }
            }
            await driver.actions().sendKeys(Key.ESCAPE).perform();
          }
        } catch {
          /* try next label */
        }
      }

      // Strategy 2: Find dropdown by aria-label directly
      const ariaDropdowns = await driver.findElements(
        By.css(`[role="combobox"][aria-label*="${label}"], button[role="combobox"][aria-label*="${label}"]`)
      );
      if (ariaDropdowns.length > 0) {
        await ariaDropdowns[0].click();
        await sleep(500);
        const options = await driver.findElements(By.css('[role="option"]'));
        for (const opt of options) {
          const text = await opt.getText().catch(() => '');
          if (text.toLowerCase().includes(optionText.toLowerCase())) {
            await opt.click();
            console.log(`[selectDropdownInPanel] Selected "${optionText}" for "${label}" via aria-label`);
            await sleep(500);
            return true;
          }
        }
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      }

      // Strategy 3: data-automation-id based lookup
      const labelLower = label.toLowerCase().replace(/\s+/g, '-');
      const autoDropdowns = await driver.findElements(
        By.css(`[data-automation-id*="${labelLower}"] [role="combobox"], [data-automation-id*="${labelLower}"] select`)
      );
      if (autoDropdowns.length > 0) {
        await autoDropdowns[0].click();
        await sleep(500);
        const options = await driver.findElements(By.css('[role="option"]'));
        for (const opt of options) {
          const text = await opt.getText().catch(() => '');
          if (text.toLowerCase().includes(optionText.toLowerCase())) {
            await opt.click();
            console.log(`[selectDropdownInPanel] Selected "${optionText}" for "${label}" via data-automation-id`);
            await sleep(500);
            return true;
          }
        }
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      }

      // Strategy 4: JS scan for any dropdown/combobox near label text
      const selected = await driver.executeScript<boolean>(`
        var label = ${JSON.stringify(label)}.toLowerCase();
        var option = ${JSON.stringify(optionText)}.toLowerCase();
        // Find combobox by aria-label
        var combos = document.querySelectorAll('[role="combobox"]');
        for (var i = 0; i < combos.length; i++) {
          var al = (combos[i].getAttribute('aria-label') || '').toLowerCase();
          if (al.includes(label)) {
            combos[i].click();
            return true;
          }
        }
        return false;
      `);
      if (selected) {
        await sleep(500);
        const options = await driver.findElements(By.css('[role="option"]'));
        for (const opt of options) {
          const text = await opt.getText().catch(() => '');
          if (text.toLowerCase().includes(optionText.toLowerCase())) {
            await opt.click();
            console.log(`[selectDropdownInPanel] Selected "${optionText}" for "${label}" via JS scan`);
            await sleep(500);
            return true;
          }
        }
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      }

      // Diagnostic: dump available dropdowns
      if (attempt === 0) {
        try {
          const diag = await driver.executeScript<string>(`
            var combos = [];
            document.querySelectorAll('[role="combobox"]').forEach(function(el) {
              combos.push((el.getAttribute('aria-label') || 'no-label') + ' (' + (el.getAttribute('data-automation-id') || 'no-aid') + ')');
            });
            return 'comboboxes: ' + combos.join(', ');
          `);
          console.log(`[selectDropdownInPanel] Panel DOM: ${diag}`);
        } catch {
          /* ignore */
        }
      }

      console.log(`[selectDropdownInPanel] "${label}" → "${optionText}" not found on attempt ${attempt + 1}`);
      await sleep(1000);
    } catch (e: any) {
      console.log(`[selectDropdownInPanel] Attempt ${attempt + 1} failed: ${e.message}`);
      await sleep(1000);
    }
  }
  return false;
}

// ===========================================================================
// Canvas interaction helpers
// ===========================================================================

/**
 * Add a parallel branch alongside an existing action on the canvas.
 * Hovers over the edge below the specified node and clicks "Add a parallel branch".
 */
export async function addParallelBranch(driver: WebDriver, afterNodeText: string): Promise<boolean> {
  try {
    // Find the node by text
    const nodes = await driver.findElements(By.css('.react-flow__node'));
    for (const node of nodes) {
      const text = await node.getText().catch(() => '');
      if (text.toLowerCase().includes(afterNodeText.toLowerCase())) {
        // Find the + button on the edge below this node
        // The edge buttons are siblings in the React Flow viewport
        const plusButtons = await driver.findElements(By.css('[data-automation-id^="msla-plus-button-"], [id^="msla-edge-button-"]'));

        for (const btn of plusButtons) {
          try {
            // Click the + button to open the menu
            await driver.actions().move({ origin: btn }).click().perform();
            await sleep(1000);

            // Look for "Add a parallel branch" in the menu
            const menuItems = await driver.findElements(By.css('[data-automation-id^="msla-add-button-"], [role="menuitem"]'));
            for (const item of menuItems) {
              const itemText = await item.getText().catch(() => '');
              if (itemText.toLowerCase().includes('parallel branch')) {
                await item.click();
                console.log(`[addParallelBranch] Added parallel branch after "${afterNodeText}"`);
                await sleep(2000);
                return true;
              }
            }
            // Close menu and try next button
            await driver.actions().sendKeys(Key.ESCAPE).perform();
            await sleep(500);
          } catch {
            /* try next button */
          }
        }
        break;
      }
    }

    console.log(`[addParallelBranch] Could not add parallel branch after "${afterNodeText}"`);
    return false;
  } catch (e: any) {
    console.log(`[addParallelBranch] Error: ${e.message}`);
    return false;
  }
}

/**
 * Click a node on the canvas to open its settings/parameter panel.
 */
export async function openNodeSettingsPanel(driver: WebDriver, nodeText: string): Promise<boolean> {
  try {
    const nodes = await driver.findElements(By.css('.react-flow__node'));
    for (const node of nodes) {
      const text = await node.getText().catch(() => '');
      if (text.toLowerCase().includes(nodeText.toLowerCase())) {
        await driver.actions().move({ origin: node }).click().perform();
        await sleep(1500);
        console.log(`[openNodeSettingsPanel] Clicked on node "${nodeText}"`);
        return true;
      }
    }
    console.log(`[openNodeSettingsPanel] Node "${nodeText}" not found`);
    return false;
  } catch (e: any) {
    console.log(`[openNodeSettingsPanel] Error: ${e.message}`);
    return false;
  }
}

/**
 * Navigate to the "Run After" section within a node's settings panel.
 * Assumes the node is already selected and its panel is open.
 */
export async function openRunAfterSettings(driver: WebDriver): Promise<boolean> {
  try {
    // Look for a "Settings" tab or "Run After" section header
    const selectors = ['[data-automation-id*="run-after"]', '[aria-label*="Run After"]', '[aria-label*="Settings"]'];

    for (const selector of selectors) {
      const elements = await driver.findElements(By.css(selector));
      if (elements.length > 0) {
        await elements[0].click();
        await sleep(1000);
        console.log('[openRunAfterSettings] Opened Run After settings');
        return true;
      }
    }

    // Try finding by text content
    const buttons = await driver.findElements(By.xpath('//button[contains(text(), "Settings") or contains(text(), "Run After")]'));
    if (buttons.length > 0) {
      await buttons[0].click();
      await sleep(1000);
      console.log('[openRunAfterSettings] Opened settings via text match');
      return true;
    }

    // Try the tab/pivot pattern used in the designer
    const tabs = await driver.findElements(By.css('[role="tab"]'));
    for (const tab of tabs) {
      const text = await tab.getText().catch(() => '');
      if (text.toLowerCase().includes('settings')) {
        await tab.click();
        await sleep(1000);
        console.log('[openRunAfterSettings] Opened Settings tab');
        return true;
      }
    }

    console.log('[openRunAfterSettings] Run After section not found');
    return false;
  } catch (e: any) {
    console.log(`[openRunAfterSettings] Error: ${e.message}`);
    return false;
  }
}

/**
 * Toggle run-after status checkboxes for a given list of statuses.
 * Statuses can be: 'Succeeded', 'Failed', 'Skipped', 'TimedOut'.
 */
export async function configureRunAfter(driver: WebDriver, statuses: string[]): Promise<boolean> {
  try {
    for (const status of statuses) {
      const checkboxes = await driver.findElements(
        By.xpath(`//input[@type="checkbox" and (contains(..//text(), "${status}") or contains(@aria-label, "${status}"))]`)
      );
      if (checkboxes.length > 0) {
        // Check if already checked
        const checked = await checkboxes[0].getAttribute('checked');
        if (!checked) {
          await checkboxes[0].click();
          console.log(`[configureRunAfter] Toggled "${status}"`);
        }
      } else {
        // Try clicking a label that contains the status text
        const labels = await driver.findElements(By.xpath(`//label[contains(text(), "${status}")]`));
        if (labels.length > 0) {
          await labels[0].click();
          console.log(`[configureRunAfter] Clicked label for "${status}"`);
        } else {
          console.log(`[configureRunAfter] Checkbox for "${status}" not found`);
        }
      }
      await sleep(300);
    }
    return true;
  } catch (e: any) {
    console.log(`[configureRunAfter] Error: ${e.message}`);
    return false;
  }
}

// ===========================================================================
// Keyboard navigation helpers
// ===========================================================================

/**
 * Click to focus a specific node on the React Flow canvas.
 */
export async function focusCanvasNode(driver: WebDriver, nodeText: string): Promise<boolean> {
  try {
    const nodes = await driver.findElements(By.css('.react-flow__node'));
    for (const node of nodes) {
      const text = await node.getText().catch(() => '');
      if (text.toLowerCase().includes(nodeText.toLowerCase())) {
        await node.click();
        await sleep(500);
        console.log(`[focusCanvasNode] Focused node "${nodeText}"`);
        return true;
      }
    }
    console.log(`[focusCanvasNode] Node "${nodeText}" not found`);
    return false;
  } catch (e: any) {
    console.log(`[focusCanvasNode] Error: ${e.message}`);
    return false;
  }
}

/**
 * Send a keyboard shortcut (Ctrl+Up, Ctrl+Down, etc.) to the active element.
 * Uses Selenium Actions API for proper modifier key handling.
 *
 * @param modifiers Array of modifier keys (Key.CONTROL, Key.SHIFT, etc.)
 * @param key The main key to press (Key.ARROW_DOWN, Key.ARROW_UP, etc.)
 */
export async function sendKeyboardShortcut(driver: WebDriver, modifiers: string[], key: string): Promise<void> {
  let actions = driver.actions();
  for (const mod of modifiers) {
    actions = actions.keyDown(mod);
  }
  actions = actions.sendKeys(key);
  for (const mod of [...modifiers].reverse()) {
    actions = actions.keyUp(mod);
  }
  await actions.perform();
  await sleep(300);
}

/**
 * Read the text of the currently-focused node on the canvas.
 * Checks for `[data-selected="true"]`, `.selected`, focus ring, or `document.activeElement`.
 */
export async function getFocusedNodeText(driver: WebDriver): Promise<string> {
  try {
    const text = await driver.executeScript<string>(`
      // Check for React Flow's selected/focused node
      var selected = document.querySelector('.react-flow__node.selected, .react-flow__node[data-selected="true"]');
      if (selected) return (selected.textContent || '').trim();

      // Check active element inside a node
      var active = document.activeElement;
      if (active) {
        var node = active.closest('.react-flow__node');
        if (node) return (node.textContent || '').trim();
      }

      // Check for aria-selected
      var ariaSelected = document.querySelector('.react-flow__node[aria-selected="true"]');
      if (ariaSelected) return (ariaSelected.textContent || '').trim();

      return '';
    `);
    return text || '';
  } catch {
    return '';
  }
}

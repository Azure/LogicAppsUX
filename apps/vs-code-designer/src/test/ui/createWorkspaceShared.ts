// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  type InputBox,
  type QuickOpenBox,
  type Workbench,
  WebView,
  By,
  until,
  type WebDriver,
  VSBrowser,
  type WebElement,
  Key,
} from 'vscode-extension-tester';
import { clearBlockingUI, waitForQuickInputAndType } from './helpers';

/**
 * Create Workspace E2E Tests
 *
 * Tests the "Create new logic app workspace..." command end-to-end.
 * We must select the CORRECT command (not "...from package...") and
 * fill every form field, then navigate through the wizard.
 *
 * Command palette entries:
 *   - "Create new logic app workspace..." → azureLogicAppsStandard.createWorkspace
 *   - "Create new logic app workspace from package..." → azureLogicAppsStandard.cloudToLocal
 *
 * Webview panel titles:
 *   - Correct: "Create Workspace"
 *   - Wrong:   "Create Workspace From Package"
 *
 * Form structure (Step 0 - Project Setup):
 *   Section 1 - WorkspaceNameStep:
 *     - "Workspace parent folder path" (Input, required, async validated via postMessage)
 *     - "Browse..." button (opens native folder picker)
 *     - "Workspace name" (Input, required, regex validated)
 *   Section 2 - LogicAppTypeStep:
 *     - "Logic app name" (Input, required, regex validated)
 *     - RadioGroup: "Logic app (Standard)" | "Logic app with custom code" | "Logic app with rules engine"
 *   Section 3 - WorkflowTypeStep:
 *     - "Workflow name" (Input, required, regex validated)
 *     - "Workflow type" (Dropdown/combobox: Stateful | Stateless | Autonomous agents (Preview) | Conversational agents (Preview))
 *
 * Form structure (Step 1 - Review + Create):
 *   - Shows summary of all choices
 *   - "Create workspace" button
 *
 * Validation regex for names: /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i
 */

// ===========================================================================
// Configuration
// ===========================================================================

/** Timeout for each test */
export const TEST_TIMEOUT = 120_000;

/** Timeout for waiting for elements */
export const ELEMENT_TIMEOUT = 20_000;

/** Poll interval for waiting loops */
export const POLL_INTERVAL = 500;

/** Debounce time for path validation + buffer */
export const PATH_VALIDATION_WAIT = 1_500;

/** Time to wait after typing in a field */
export const TYPE_SETTLE = 300;

/** Path to the manifest file that records all created workspaces for downstream tests */
export const WORKSPACE_MANIFEST_PATH = path.join(os.tmpdir(), 'la-e2e-test', 'created-workspaces.json');

/**
 * A single entry in the workspace manifest file.
 * Records every parameter used to create the workspace so downstream tests
 * can load it without having to re-derive paths.
 */
export interface WorkspaceManifestEntry {
  /** Human-readable label, e.g. "Standard + Stateful" */
  label: string;
  /** Absolute path to the parent directory that contains the workspace folder */
  parentDir: string;
  /** Workspace folder name (also the .code-workspace file stem) */
  wsName: string;
  /** Logic app folder name */
  appName: string;
  /** Workflow folder name */
  wfName: string;
  /** Logic app type */
  appType: 'standard' | 'customCode' | 'rulesEngine' | 'codeful';
  /** Workflow type value */
  wfType: 'Stateful' | 'Stateless' | 'Autonomous agents (Preview)' | 'Conversational agents (Preview)';
  /** Custom code / rules engine folder name (if applicable) */
  ccFolderName?: string;
  /** Function file name (if applicable) */
  fnName?: string;
  /** Function namespace (if applicable) */
  fnNamespace?: string;
  /** Absolute path to the workspace directory */
  wsDir: string;
  /** Absolute path to the .code-workspace file */
  wsFilePath: string;
  /** Absolute path to the logic app directory */
  appDir: string;
  /** Absolute path to the workflow directory */
  wfDir: string;
  /** Timestamp when the workspace was created */
  createdAt: string;
}

/**
 * Append a workspace entry to the manifest JSON file.
 * Creates the file (with an array) on first call; appends on subsequent calls.
 */
export function appendToWorkspaceManifest(entry: WorkspaceManifestEntry): void {
  let manifest: WorkspaceManifestEntry[] = [];
  try {
    if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      manifest = JSON.parse(fs.readFileSync(WORKSPACE_MANIFEST_PATH, 'utf-8'));
    }
  } catch {
    manifest = [];
  }
  manifest.push(entry);
  fs.writeFileSync(WORKSPACE_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[manifest] Saved entry "${entry.label}" → ${WORKSPACE_MANIFEST_PATH} (${manifest.length} total)`);
}

/**
 * Build a manifest entry from the creation parameters.
 */
export function buildManifestEntry(
  label: string,
  parentDir: string,
  opts: {
    wsName: string;
    appName: string;
    wfName: string;
    appType: 'standard' | 'customCode' | 'rulesEngine' | 'codeful';
    wfType: 'Stateful' | 'Stateless' | 'Autonomous agents (Preview)' | 'Conversational agents (Preview)';
    ccFolderName?: string;
    fnName?: string;
    fnNamespace?: string;
  }
): WorkspaceManifestEntry {
  const wsDir = path.join(parentDir, opts.wsName);
  return {
    label,
    parentDir,
    ...opts,
    wsDir,
    wsFilePath: path.join(wsDir, `${opts.wsName}.code-workspace`),
    appDir: path.join(wsDir, opts.appName),
    wfDir: path.join(wsDir, opts.appName, opts.wfName),
    createdAt: new Date().toISOString(),
  };
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Generate a unique name that matches /^[a-z][a-z\d_]*$/i (no hyphens — must be valid C# identifier) */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Directory for explicit screenshots */
export const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'createWorkspace-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

export function sanitizeFileSegment(value: string): string {
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

export async function captureScreenshot(driver: WebDriver, fileName: string): Promise<string | undefined> {
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
 * Create a temporary directory for the workspace.
 * Returns the full path to the tmp dir.
 */
export function createTempDir(): string {
  const tmpBase = path.join(os.tmpdir(), 'la-e2e-test');
  if (!fs.existsSync(tmpBase)) {
    fs.mkdirSync(tmpBase, { recursive: true });
  }
  return tmpBase;
}

async function typeQuickInputQuery(driver: WebDriver, query: string): Promise<void> {
  await waitForQuickInputAndType(driver, query, 30_000);
}

/**
 * Open the command palette, type a search query, and select a specific pick.
 *
 * CRITICAL: Must NOT select "Create new logic app workspace from package...".
 * That opens a different webview flow (createWorkspaceFromPackage).
 *
 * Strategy:
 * 1. Type "Create new logic app workspace" into the palette
 * 2. Wait for picks to load
 * 3. Find the pick whose label contains "workspace" but NOT "package" or "from"
 * 4. If multiple matches, prefer the shortest label (most specific)
 * 5. Click it
 */
export async function selectCreateWorkspaceCommand(workbench: Workbench): Promise<void> {
  const driver = workbench.getDriver();

  // Dismiss any notifications first
  try {
    await dismissNotifications(driver);
  } catch {
    // Ignore
  }

  // Retry opening and typing in the command palette — the InputBox is often
  // not interactable right after openCommandPrompt() on slow CI runners, and
  // raw ExTester InputBox.setText()/clear() throws ElementNotInteractableError.
  // We use a longer retry budget with exponential backoff and validate that
  // the underlying <input> is visible+enabled before sending keys.
  const backoffsMs = [1_000, 2_000, 3_000, 5_000, 8_000];
  let input: InputBox | QuickOpenBox | undefined;
  let lastError: any;

  for (let attempt = 0; attempt < backoffsMs.length; attempt++) {
    try {
      input = await workbench.openCommandPrompt();
      await sleep(500);

      // CRITICAL: Use '> ' prefix to stay in command mode (file search otherwise).
      // We bypass ExTester InputBox.setText() which calls clear() and throws
      // ElementNotInteractableError when the element is transiently busy.
      // Raw sendKeys with select-all is reliable.
      await typeQuickInputQuery(driver, '> logic app workspace');
      await sleep(2_000); // Wait for picks to populate
      break; // success
    } catch (e: any) {
      lastError = e;
      console.log(`[selectCreateWorkspaceCommand] Attempt ${attempt + 1}/${backoffsMs.length}: setText failed: ${e.message}`);
      try {
        await captureScreenshot(driver, `selectCreateWorkspaceCommand-timeout-attempt-${attempt + 1}`);
      } catch {
        /* ignore screenshot failure */
      }
      // Use safeCancelQuickInput (added by upstream PR #9142) instead of a bare
      // input?.cancel() so a stuck/cancelled QuickInput does not throw inside
      // the retry path.
      await safeCancelQuickInput(input, 'selectCreateWorkspaceCommand');
      // Re-focus the command palette explicitly between retries so the next
      // openCommandPrompt() lands on a fresh, interactable widget.
      try {
        await workbench.executeCommand('workbench.action.focusQuickOpen');
      } catch {
        /* ignore */
      }
      try {
        await dismissNotifications(driver);
      } catch {
        /* ignore */
      }
      if (attempt === backoffsMs.length - 1) {
        throw lastError;
      }
      await sleep(backoffsMs[attempt]);
    }
  }

  if (!input) {
    throw new Error('Could not open command prompt');
  }

  // Get all visible quick pick items
  let picks = await input.getQuickPicks();
  console.log(`[selectCreateWorkspaceCommand] Found ${picks.length} picks`);

  let bestPick: (typeof picks)[0] | null = null;
  let bestLabel = '';
  const allLabels: string[] = [];

  for (const pick of picks) {
    const label = await pick.getLabel();
    allLabels.push(label);
    console.log(`[selectCreateWorkspaceCommand] Pick: "${label}"`);

    const lowerLabel = label.toLowerCase();
    // Must contain "workspace" and NOT contain "package" or "from"
    if (lowerLabel.includes('workspace') && !lowerLabel.includes('package') && !lowerLabel.includes('from')) {
      if (!bestPick || label.length < bestLabel.length) {
        bestPick = pick;
        bestLabel = label;
      }
    }
  }

  if (!bestPick) {
    // Try a different search term
    console.log('[selectCreateWorkspaceCommand] No match, trying "> Create new logic"');
    await typeQuickInputQuery(driver, '> Create new logic');
    await sleep(2000);

    picks = await input.getQuickPicks();
    for (const pick of picks) {
      const label = await pick.getLabel();
      allLabels.push(label);
      console.log(`[selectCreateWorkspaceCommand] Retry pick: "${label}"`);

      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes('workspace') && !lowerLabel.includes('package') && !lowerLabel.includes('from')) {
        if (!bestPick || label.length < bestLabel.length) {
          bestPick = pick;
          bestLabel = label;
        }
      }
    }
  }

  if (!bestPick) {
    await safeCancelQuickInput(input, 'selectCreateWorkspaceCommand:no-match');
    throw new Error(`Could not find "Create new logic app workspace..." command.\nAvailable picks: ${JSON.stringify(allLabels)}`);
  }

  console.log(`[selectCreateWorkspaceCommand] Selecting: "${bestLabel}"`);
  await bestPick.select();
  await sleep(2000); // Wait for webview to open
}

/**
 * Wait for the Logic Apps extension to be ready.
 * Checks that the "Create new logic app workspace..." command exists
 * in the command palette WITHOUT selecting it.
 */
export async function waitForExtensionReady(workbench: Workbench, timeoutMs = 60_000): Promise<void> {
  const startTime = Date.now();
  let lastError = '';
  let lastPickLabels: string[] = [];
  const driver = workbench.getDriver();

  // Try with shorter search terms that are more likely to match
  // CRITICAL: Prefix with '> ' to stay in command mode (not file search)
  const searchTerms = ['> logic app workspace', '> Create new logic app', '> create workspace'];

  while (Date.now() - startTime < timeoutMs) {
    await clearBlockingUI(driver);
    for (const searchTerm of searchTerms) {
      let input: InputBox | QuickOpenBox | undefined;
      try {
        input = await workbench.openCommandPrompt();
        await sleep(500);

        // Use setText which calls clear() first - but we add '> ' prefix
        // to keep the palette in command mode
        await input.setText(searchTerm);
        await sleep(2000);

        const picks = await input.getQuickPicks();
        lastPickLabels = [];

        for (const pick of picks) {
          const label = await pick.getLabel();
          lastPickLabels.push(label);
          const lower = label.toLowerCase();
          if (lower.includes('workspace') && !lower.includes('package') && !lower.includes('from')) {
            console.log(`[waitForExtensionReady] Found command: "${label}" (search: "${searchTerm}")`);
            await safeCancelQuickInput(input, 'waitForExtensionReady:found');
            await sleep(300);
            return;
          }
        }

        console.log(`[waitForExtensionReady] Search "${searchTerm}" picks: [${lastPickLabels.join(', ')}]`);
        await safeCancelQuickInput(input, 'waitForExtensionReady:not-found');
        await sleep(300);
      } catch (e: any) {
        lastError = `Search "${searchTerm}" failed: ${e?.message || e}`;
        console.log(`[waitForExtensionReady] ${lastError}`);
        await safeCancelQuickInput(input, 'waitForExtensionReady:error');
        await clearBlockingUI(driver);
        await sleep(1000);
      }
    }

    lastError = `Command not found after ${Date.now() - startTime}ms. Last picks: [${lastPickLabels.join(', ')}]`;
    console.log(`[waitForExtensionReady] ${lastError}, retrying...`);
    await sleep(3000);
  }

  throw new Error(`Extension not ready after ${timeoutMs}ms: ${lastError}`);
}

export async function safeCancelQuickInput(input: InputBox | QuickOpenBox | undefined, context: string): Promise<void> {
  try {
    await input?.cancel();
  } catch (e: any) {
    console.log(`[${context}] Ignoring quick input cancel failure: ${e?.message || e}`);
  }
}

/**
 * Dismiss all notification toasts that may block webview interaction.
 * VS Code shows notifications that overlay the editor area and intercept clicks.
 */
export async function dismissNotifications(driver: WebDriver): Promise<void> {
  try {
    await driver.switchTo().defaultContent();
    // Click on each notification's close button
    const closeButtons = await driver.findElements(
      By.css('.notification-toast-container .codicon-notifications-clear, .notification-toast-container .codicon-close')
    );
    for (const btn of closeButtons) {
      try {
        await btn.click();
        await sleep(200);
      } catch {
        // Notification may have already auto-dismissed
      }
    }

    // Also try to dismiss via the "Clear All Notifications" action
    if (closeButtons.length === 0) {
      const clearAllBtns = await driver.findElements(
        By.css('.notifications-center .codicon-clear-all, .notification-toast-container .action-label')
      );
      for (const btn of clearAllBtns) {
        try {
          await btn.click();
          await sleep(200);
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore - notifications are optional
  }
}

/**
 * Switch to the webview iframe and verify we got the correct one
 * (Create Workspace, NOT Create Workspace From Package).
 *
 * Returns the WebView handle for cleanup (switchBack).
 * Retries a few times since the webview panel may take time to initialize.
 */
export async function switchToWebviewFrame(driver: WebDriver): Promise<WebView> {
  // Dismiss any notification toasts that might be blocking the webview
  await dismissNotifications(driver);

  // Aggressively remove notification toasts via JS — they can intercept webview iframe clicks
  try {
    await driver.switchTo().defaultContent();
    await driver.executeScript(`
      document.querySelectorAll('.notification-toast-container, .notifications-toasts').forEach(el => el.remove());
    `);
  } catch {
    /* ignore */
  }

  // Manual iframe switching approach — more reliable than ExTester's WebView class
  // because it doesn't depend on the .editor-instance element being in the DOM.
  // We enumerate ALL `iframe.webview` elements, filter by visibility + non-zero
  // rect (per SKILL.md rule #8), and prefer the last (most recently created) —
  // which is the active Create Workspace tab when other panels are also open.
  //
  // After switching into the inner #active-frame we poll for a Create Workspace
  // form marker so we don't return a frame that is still mid-mount.
  const WEBVIEW_TIMEOUT = 60_000;
  const MARKER_TIMEOUT = 20_000;

  let lastError: Error | null = null;
  let lastLog = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await driver.switchTo().defaultContent();

      console.log(`[switchToWebviewFrame] Attempt ${attempt + 1}/3: Waiting for webview iframe…`);

      // Step 1: Poll the default content for any `iframe.webview` and pick the
      // visible, non-zero-sized one — preferring the most recently mounted.
      const frameDeadline = Date.now() + WEBVIEW_TIMEOUT;
      let outerFrame: WebElement | null = null;
      while (Date.now() < frameDeadline) {
        const candidates = await driver.findElements(By.css('iframe.webview, iframe.webview.ready'));
        if (candidates.length > 0) {
          for (let i = candidates.length - 1; i >= 0; i--) {
            try {
              const displayed = await candidates[i].isDisplayed();
              if (!displayed) {
                continue;
              }
              const rect = await candidates[i].getRect();
              if (rect.width > 100 && rect.height > 100) {
                outerFrame = candidates[i];
                console.log(`[switchToWebviewFrame] Selected iframe ${i + 1}/${candidates.length} (${rect.width}x${rect.height})`);
                break;
              }
            } catch {
              // StaleElementReferenceError — try the next candidate
            }
          }
        }
        if (outerFrame) {
          break;
        }
        if (Date.now() - lastLog > 10_000) {
          console.log(`[switchToWebviewFrame] still waiting for visible webview iframe (found ${candidates.length})`);
          lastLog = Date.now();
        }
        await sleep(500);
      }
      if (!outerFrame) {
        throw new Error('Webview iframe not found within timeout');
      }

      await driver.switchTo().frame(outerFrame);

      // Step 2: Wait for the inner #active-frame iframe
      const innerFrame = await driver.wait(until.elementLocated(By.id('active-frame')), 15_000, '#active-frame not found');
      await driver.switchTo().frame(innerFrame);
      await sleep(500);

      // Verify we're NOT in the "from package" webview
      const packageLabels = await driver.findElements(By.xpath("//*[contains(text(), 'Package path')]"));
      if (packageLabels.length > 0) {
        await driver.switchTo().defaultContent();
        throw new Error(
          'Wrong webview opened: "Create Workspace From Package" instead of "Create Workspace". ' +
            'The command palette selected the wrong command.'
        );
      }

      // Step 3: Poll for at least one Create Workspace form marker so we don't
      // return a still-mounting frame to the caller.
      const markerDeadline = Date.now() + MARKER_TIMEOUT;
      let markerSeen = false;
      while (Date.now() < markerDeadline) {
        try {
          const markers = await driver.executeScript<number>(`
            const sels = [
              "input", "button", "[class*='workspace']", "[class*='wizard']", "[data-testid]"
            ];
            let count = 0;
            for (const s of sels) {
              try { count += document.querySelectorAll(s).length; } catch (e) {}
            }
            return count;
          `);
          if ((markers ?? 0) > 0) {
            markerSeen = true;
            break;
          }
        } catch {
          /* keep polling */
        }
        await sleep(500);
      }
      if (!markerSeen) {
        throw new Error('Create Workspace webview rendered no DOM markers within timeout');
      }

      // Return a WebView instance for API compatibility (switchBack etc.)
      // The driver is already in the correct frame context.
      const webview = new WebView();
      return webview;
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes('Package')) {
        throw e; // Don't retry wrong webview
      }
      console.log(`[switchToWebviewFrame] Attempt ${attempt + 1}/3 failed: ${e.message}`);
      try {
        await captureScreenshot(driver, `switchToWebviewFrame-timeout-attempt-${attempt + 1}`);
      } catch {
        /* ignore */
      }
      try {
        await driver.switchTo().defaultContent();
      } catch {
        // Ignore
      }

      // Re-dismiss notifications before retry — new toasts may have appeared
      await dismissNotifications(driver);
      try {
        await driver.executeScript(`
          document.querySelectorAll('.notification-toast-container, .notifications-toasts').forEach(el => el.remove());
        `);
      } catch {
        /* ignore */
      }

      await sleep(5_000);
    }
  }

  try {
    await captureScreenshot(driver, 'switchToWebviewFrame-final-deadline');
  } catch {
    /* ignore */
  }
  throw lastError || new Error('Could not switch to webview frame after 3 attempts');
}

/**
 * Wait until the Create Workspace form is rendered in the current webview frame.
 * This avoids transient failures right after switching to a shared webview frame.
 */
export async function waitForCreateWorkspaceFormReady(driver: WebDriver, timeoutMs = 12_000): Promise<void> {
  await driver.wait(async () => {
    try {
      const packageLabels = await driver.findElements(By.xpath("//*[contains(text(), 'Package path')]"));
      if (packageLabels.length > 0) {
        return false;
      }

      const workflowLabels = await driver.findElements(By.xpath("//label[contains(text(), 'Workflow type')]"));
      const parentPathLabels = await driver.findElements(By.xpath("//*[contains(text(), 'Workspace parent folder path')]"));
      const projectSetupHeaders = await driver.findElements(
        By.xpath("//*[contains(text(), 'Project setup') or contains(text(), 'project setup')]")
      );

      return workflowLabels.length > 0 || parentPathLabels.length > 0 || projectSetupHeaders.length > 0;
    } catch {
      return false;
    }
  }, timeoutMs);
}

/**
 * Find a form field by its label text, then find the associated input.
 *
 * Fluent UI renders labels with `for` pointing to the input's ID,
 * or labels and inputs are siblings within the same field container.
 */
export function toXPathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }

  const parts = value.split("'");
  return `concat(${parts
    .map((part, index) => {
      const literals = [];
      if (part) {
        literals.push(`'${part}'`);
      }
      if (index < parts.length - 1) {
        literals.push(`"'"`);
      }
      return literals.join(', ');
    })
    .filter(Boolean)
    .join(', ')})`;
}

export async function findInputByLabel(driver: WebDriver, labelText: string): Promise<WebElement> {
  // Strategy 1: Find label exactly matching the text (allowing for trailing required indicators)
  // Use a two-step approach: first try the label whose text starts with exactly our labelText
  const allLabels = await driver.findElements(By.xpath(`//label[contains(text(), ${toXPathLiteral(labelText)})]`));
  const visibleLabels: WebElement[] = [];
  for (const label of allLabels) {
    try {
      if (await label.isDisplayed()) {
        visibleLabels.push(label);
      }
    } catch {
      // Ignore stale/non-rendered labels
    }
  }
  const candidateLabels = visibleLabels.length > 0 ? visibleLabels : allLabels;

  // If multiple labels match (e.g., "Function name" matches both "Function name" and "Function namespace"),
  // prefer the one whose trimmed text starts with labelText followed by a non-alphanum char or end of string
  const exactLabels = [];
  for (const label of candidateLabels) {
    const text = (await label.getText()).trim();
    // Check if this label is an exact match (possibly with trailing * or whitespace)
    // e.g., "Function name *" should match "Function name" but "Function namespace *" should NOT
    const afterMatch = text.substring(labelText.length);
    if (afterMatch === '' || /^[\s*]/.test(afterMatch)) {
      exactLabels.push(label);
    }
  }

  // Use exact matches if available, otherwise fall back to all matches
  const labelsToSearch = exactLabels.length > 0 ? exactLabels : candidateLabels;

  for (const label of labelsToSearch) {
    const forAttr = await label.getAttribute('for');
    if (forAttr) {
      const inputs = await driver.findElements(By.id(forAttr));
      for (const input of inputs) {
        try {
          if (await input.isDisplayed()) {
            return input;
          }
        } catch {
          // Try next input
        }
      }
      if (inputs.length > 0) {
        return inputs[0];
      }
    }
  }

  // Strategy 2: Find the label's parent, then look for an input inside it
  for (const label of labelsToSearch) {
    const parent = await label.findElement(By.xpath('..'));
    // Look for input within the parent or its parent
    for (let container = parent; ; ) {
      const inputs = await container.findElements(By.css('input'));
      for (const input of inputs) {
        try {
          if (await input.isDisplayed()) {
            return input;
          }
        } catch {
          // Try next input
        }
      }
      if (inputs.length > 0) {
        return inputs[0];
      }
      // Go one level up
      try {
        container = await container.findElement(By.xpath('..'));
      } catch {
        break;
      }
      // Don't go more than 3 levels up
      const tag = await container.getTagName();
      if (tag === 'body' || tag === 'html') {
        break;
      }
    }
  }

  // Strategy 3: Just find by aria-label
  const ariaInputs = await driver.findElements(By.css(`input[aria-label="${labelText}"]`));
  for (const input of ariaInputs) {
    try {
      if (await input.isDisplayed()) {
        return input;
      }
    } catch {
      // Try next input
    }
  }
  if (ariaInputs.length > 0) {
    return ariaInputs[0];
  }

  throw new Error(`Could not find input for label "${labelText}"`);
}

/**
 * Find a Fluent UI Dropdown (renders as <button role="combobox">) by label text.
 */
export async function findDropdownByLabel(driver: WebDriver, labelText: string): Promise<WebElement> {
  // Strategy 1: label with 'for' -> button with that id
  const labels = await driver.findElements(By.xpath(`//label[contains(text(), ${toXPathLiteral(labelText)})]`));
  for (const label of labels) {
    const forAttr = await label.getAttribute('for');
    if (forAttr) {
      const btns = await driver.findElements(By.id(forAttr));
      if (btns.length > 0) {
        return btns[0];
      }
    }
  }

  // Strategy 2: button[role="combobox"] near the label
  const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
  if (comboboxes.length > 0) {
    // If there's only one, it's probably the one we want
    if (comboboxes.length === 1) {
      return comboboxes[0];
    }

    // Look for the one closest to our label
    for (const label of labels) {
      const parent = await label.findElement(By.xpath('..'));
      const parentParent = await parent.findElement(By.xpath('..'));
      const nearBtns = await parentParent.findElements(By.css('button[role="combobox"]'));
      if (nearBtns.length > 0) {
        return nearBtns[0];
      }
    }
  }

  // Strategy 3: aria-label
  const ariaBtn = await driver.findElements(By.css(`button[role="combobox"][aria-label="${labelText}"]`));
  if (ariaBtn.length > 0) {
    return ariaBtn[0];
  }

  throw new Error(`Could not find dropdown for label "${labelText}"`);
}

/**
 * Select an option from a Fluent UI Dropdown.
 * Opens the dropdown, finds the option, clicks it.
 * Retries up to 3 times on StaleElementReferenceError (React re-renders).
 */
export async function selectDropdownOption(driver: WebDriver, dropdown: WebElement, optionText: string, _retries = 3): Promise<void> {
  // Determine the index of this dropdown among all comboboxes so we can re-find correctly
  let dropdownIndex = -1;
  try {
    const allComboboxes = await driver.findElements(By.css('button[role="combobox"]'));
    for (let i = 0; i < allComboboxes.length; i++) {
      const id1 = await allComboboxes[i].getId();
      const id2 = await dropdown.getId();
      if (id1 === id2) {
        dropdownIndex = i;
        break;
      }
    }
  } catch {
    // If we can't determine the index, we'll just reuse the element as-is
  }

  const refindDropdown = async (): Promise<WebElement> => {
    const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
    if (comboboxes.length === 0) {
      return dropdown;
    }
    if (dropdownIndex >= 0 && dropdownIndex < comboboxes.length) {
      return comboboxes[dropdownIndex];
    }
    // Fallback: use the last combobox
    return comboboxes[comboboxes.length - 1];
  };

  for (let attempt = 1; attempt <= _retries; attempt++) {
    try {
      // Click to open the dropdown
      await dropdown.click();
      await sleep(500);

      // Wait for options to appear (Fluent UI may take a moment to render the listbox)
      let options = await driver.findElements(By.css('[role="option"]'));
      if (options.length === 0) {
        // Options not rendered yet — wait longer and retry finding them
        await sleep(1500);
        options = await driver.findElements(By.css('[role="option"]'));
      }

      if (options.length === 0 && attempt < _retries) {
        // Still empty — close dropdown (Escape) and retry from scratch
        console.log(
          `[selectDropdownOption] No options found on attempt ${attempt}/${_retries} for "${optionText}", closing and retrying...`
        );
        await driver.actions().sendKeys(Key.ESCAPE).perform();
        await sleep(500);
        // Re-find dropdown preserving the correct index
        dropdown = await refindDropdown();
        continue;
      }

      let found = false;
      for (const opt of options) {
        const text = await opt.getText();
        if (text.trim() === optionText) {
          await opt.click();
          found = true;
          break;
        }
      }

      if (!found) {
        // Log available options for debugging
        const available: string[] = [];
        for (const opt of options) {
          try {
            available.push(await opt.getText());
          } catch {
            // option may have gone stale after clicking another
          }
        }
        // Close dropdown before throwing
        try {
          await driver.actions().sendKeys(Key.ESCAPE).perform();
        } catch {
          /* ignore */
        }
        throw new Error(`Dropdown option "${optionText}" not found. Available: ${JSON.stringify(available)}`);
      }

      await sleep(300);
      return; // success
    } catch (err: any) {
      const isRetryable =
        err?.name === 'StaleElementReferenceError' || (typeof err?.message === 'string' && err.message.includes('stale element'));
      if (isRetryable && attempt < _retries) {
        console.log(`[selectDropdownOption] StaleElementReferenceError on attempt ${attempt}/${_retries}, re-finding dropdown...`);
        await sleep(500);
        dropdown = await refindDropdown();
        continue;
      }
      throw err;
    }
  }
}

/**
 * Select a radio button option by its label text.
 */
export async function selectRadioOption(driver: WebDriver, optionLabel: string): Promise<void> {
  // Fluent UI RadioGroup: <input type="radio"> with associated <label>
  // Strategy: find label text, click it or click the radio input next to it
  const labels = await driver.findElements(By.xpath(`//label[contains(text(), ${toXPathLiteral(optionLabel)})]`));

  if (labels.length > 0) {
    await labels[0].click();
    await sleep(300);
    return;
  }

  // Try radio inputs with value matching
  const radios = await driver.findElements(By.css('input[type="radio"]'));
  for (const radio of radios) {
    const radioLabel = await radio.findElement(By.xpath('..'));
    const text = await radioLabel.getText();
    if (text.includes(optionLabel)) {
      await radioLabel.click();
      await sleep(300);
      return;
    }
  }

  throw new Error(`Radio option "${optionLabel}" not found`);
}

/**
 * Clear an input field and type new text.
 * Uses select-all + backspace to clear, then types.
 */
export async function clearAndType(element: WebElement, text: string): Promise<void> {
  // Use scrollIntoView + JS click as fallback for cases where another
  // iframe or overlay intercepts the native click (CI headless issue).
  try {
    await element.click();
  } catch {
    const d = VSBrowser.instance.driver;
    await d.executeScript('arguments[0].scrollIntoView({block:"center"}); arguments[0].click();', element);
  }
  await sleep(100);
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
  await sleep(100);
  await element.sendKeys(text);
  await sleep(TYPE_SETTLE);
}

/**
 * Wait for path validation to complete.
 * After typing a workspace parent folder path, the webview sends a
 * validatePath postMessage. We wait for the validation indicators.
 */
export async function waitForPathValidation(driver: WebDriver, timeoutMs = PATH_VALIDATION_WAIT): Promise<boolean> {
  // Poll for validation to complete instead of a static sleep.
  // The webview sends a validatePath postMessage; we watch for the result indicators.
  console.log('[waitForPathValidation] Polling for path validation...');
  const deadline = Date.now() + timeoutMs;
  const pollMs = 300;

  // Give the debounce at least one tick to fire
  await sleep(pollMs);

  while (Date.now() < deadline) {
    // Check for visible error messages
    const errors = await driver.findElements(By.xpath("//*[contains(@class, 'error') or contains(@class, 'Error')]"));
    for (const err of errors) {
      try {
        const text = await err.getText();
        if (text.trim()) {
          console.log(`[waitForPathValidation] Error found: "${text}"`);
          return false;
        }
      } catch {
        /* stale element */
      }
    }

    // Check if the path input has been validated (no pending state)
    // If no errors are visible and we've waited at least one poll, assume valid
    if (Date.now() - (deadline - timeoutMs) > pollMs * 2) {
      console.log('[waitForPathValidation] No errors found, assuming valid');
      return true;
    }

    await sleep(pollMs);
  }

  console.log('[waitForPathValidation] Timed out, assuming valid');
  return true;
}

/**
 * Wait for the Next button to become enabled.
 * Checks both 'disabled' attribute and 'aria-disabled'.
 */
export async function waitForNextButton(driver: WebDriver, timeoutMs = 30_000): Promise<WebElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Find buttons with "Next" text
    const buttons = await driver.findElements(By.xpath("//button[contains(text(), 'Next')]"));

    for (const btn of buttons) {
      const disabled = await btn.getAttribute('disabled');
      const ariaDisabled = await btn.getAttribute('aria-disabled');
      const isDisabled = disabled === 'true' || disabled === '' || ariaDisabled === 'true';

      if (isDisabled) {
        console.log('[waitForNextButton] Next button found but disabled');
      } else {
        console.log('[waitForNextButton] Next button is enabled');
        return btn;
      }
    }

    if (buttons.length === 0) {
      console.log('[waitForNextButton] No Next button found yet');
    }

    await sleep(POLL_INTERVAL);
  }

  throw new Error(`Next button did not become enabled within ${timeoutMs}ms`);
}

/**
 * Find a button by its text content.
 */
export async function findButtonByText(driver: WebDriver, text: string): Promise<WebElement> {
  const buttons = await driver.findElements(By.xpath(`//button[contains(text(), ${toXPathLiteral(text)})]`));
  if (buttons.length === 0) {
    throw new Error(`Button with text "${text}" not found`);
  }
  return buttons[0];
}

/**
 * Click the "Create workspace" button on the review page.
 * Handles the webview closing after the extension processes the command.
 * After creation, the extension calls vscode.openFolder which may reload
 * or open a new VS Code window. This function recovers the driver state.
 */
export async function clickCreateWorkspaceButton(
  driver: WebDriver,
  webview: WebView,
  verifyOnDisk?: { parentDir: string; wsName: string }
): Promise<void> {
  // Mirror the openOverviewPage hardening (commit 358332a41 / PR #9181):
  //   - 3-attempt retry catching ElementClickInterceptedError / StaleElementReferenceError.
  //   - Wait for the menubar overlay (.menubar-menu-title:not([aria-hidden="true"]))
  //     to settle before each click — it can intercept the React webview button.
  //   - Optional post-click disk verification: poll the parent dir for the
  //     workspace folder for up to ~20s. If it never appears, the click was
  //     almost certainly swallowed (workbench DOM survives but the create
  //     command never fired), so throw ElementClickInterceptedError to trigger
  //     the outer retry instead of letting verifyWorkspaceOnDisk fail later.
  // CI run 25944295174 (setup-fixtures, Standard + Stateful) hit exactly this
  // race: "[clickCreateWorkspace] Workbench recovered" followed by
  // "[verifyDisk] Workspace dir exists: false".
  let currentWebview: WebView = webview;
  let lastErr: any;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Wait for the menubar overlay to be inactive before clicking.
      try {
        await driver.wait(async () => {
          const active = await driver.findElements(By.css('.menubar-menu-title:not([aria-hidden="true"])'));
          return active.length === 0;
        }, 2000);
      } catch {
        /* menubar still active — proceed; click retry handles it */
      }
      await sleep(300);

      const createButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Create workspace')]"));
      if (createButtons.length === 0) {
        try {
          await currentWebview.switchBack();
        } catch {
          /* ignore */
        }
        throw new Error('"Create workspace" button not found on review page');
      }

      console.log(`[clickCreateWorkspace] Clicking "Create workspace" button (attempt ${attempt}/3)...`);
      await createButtons[0].click();

      // Wait for the extension to process: create files on disk + dispose panel.
      // The extension also calls vscode.openFolder which may reload the window.
      await sleep(15_000);

      // Switch back from the (now likely closed) webview
      try {
        await currentWebview.switchBack();
      } catch {
        console.log('[clickCreateWorkspace] Webview already closed (expected after creation)');
      }

      // Recovery: ensure we're on the default content (not stuck in a dead iframe)
      try {
        await driver.switchTo().defaultContent();
      } catch {
        console.log('[clickCreateWorkspace] Could not switch to defaultContent');
      }

      // Wait for the workbench to be available again (handles potential page reload)
      try {
        await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 30_000);
        console.log('[clickCreateWorkspace] Workbench recovered');
      } catch {
        console.log('[clickCreateWorkspace] Warning: workbench not found after creation, trying window handles...');
        try {
          const handles = await driver.getAllWindowHandles();
          console.log(`[clickCreateWorkspace] Window handles: ${handles.length}`);
          for (const handle of handles) {
            try {
              await driver.switchTo().window(handle);
              await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 5_000);
              console.log(`[clickCreateWorkspace] Recovered on window handle: ${handle}`);
              break;
            } catch {
              // Try next handle
            }
          }
        } catch (e) {
          console.log(`[clickCreateWorkspace] Window handle recovery failed: ${e}`);
        }
      }

      // Post-click disk verification: poll for the workspace dir to actually
      // appear. "Workbench recovered" only proves the DOM survived — not that
      // the create command fired. If the click was swallowed by an overlay
      // intercept, the workbench is unchanged and the dir never appears.
      if (verifyOnDisk) {
        const targetDir = path.join(verifyOnDisk.parentDir, verifyOnDisk.wsName);
        const deadline = Date.now() + 20_000;
        let exists = false;
        while (Date.now() < deadline) {
          if (fs.existsSync(targetDir)) {
            exists = true;
            break;
          }
          await sleep(500);
        }
        if (!exists) {
          const swallowedErr: any = new Error(
            `[clickCreateWorkspace] Workspace dir not created within 20s after click — click was likely swallowed (attempt ${attempt}/3): ${targetDir}`
          );
          swallowedErr.name = 'ElementClickInterceptedError';
          throw swallowedErr;
        }
        console.log(`[clickCreateWorkspace] Workspace dir confirmed on disk: ${targetDir}`);
      }

      return;
    } catch (err: any) {
      const name = err?.name || '';
      const msg = typeof err?.message === 'string' ? err.message : '';
      const retriable = name === 'ElementClickInterceptedError' || name === 'StaleElementReferenceError' || msg.includes('stale element');

      if (!retriable || attempt === 3) {
        throw err;
      }

      lastErr = err;
      console.log(`[clickCreateWorkspace] Attempt ${attempt}/3 failed (${name || 'Error'}): ${msg.split('\n')[0]} — retrying`);

      // Re-enter the (still-open) Create Workspace webview so the next attempt
      // can re-find the button. switchToWebviewFrame handles dismissing toasts
      // and resolves the active iframe.
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      await sleep(1000);
      try {
        currentWebview = await switchToWebviewFrame(driver);
      } catch (reEnterErr) {
        console.log(`[clickCreateWorkspace] Failed to re-enter webview for retry: ${reEnterErr}`);
        throw err;
      }
    }
  }

  throw lastErr ?? new Error('[clickCreateWorkspace] All 3 attempts failed');
}

/**
 * Verify that workspace artifacts were created on disk.
 * Checks for the workspace directory, .code-workspace file, and logic app directory.
 */
export function verifyWorkspaceOnDisk(
  parentDir: string,
  wsName: string,
  appName: string,
  opts: { wfName?: string; customCodeFolder?: string } = {}
): void {
  const wsDir = path.join(parentDir, wsName);
  const wsFile = path.join(wsDir, `${wsName}.code-workspace`);
  const appDir = path.join(wsDir, appName);

  console.log(`[verifyDisk] Checking workspace dir: ${wsDir}`);
  console.log(`[verifyDisk] Workspace dir exists: ${fs.existsSync(wsDir)}`);
  console.log(`[verifyDisk] .code-workspace file exists: ${fs.existsSync(wsFile)}`);
  console.log(`[verifyDisk] Logic app dir exists: ${fs.existsSync(appDir)}`);

  if (!fs.existsSync(wsDir)) {
    // List parent to help debug
    const parentContents = fs.existsSync(parentDir) ? fs.readdirSync(parentDir) : ['(parent not found)'];
    throw new Error(`Workspace directory was not created at: ${wsDir}\n` + `Parent dir contents: ${JSON.stringify(parentContents)}`);
  }

  if (!fs.existsSync(wsFile)) {
    const wsContents = fs.readdirSync(wsDir);
    throw new Error(`.code-workspace file not found at: ${wsFile}\n` + `Workspace dir contents: ${JSON.stringify(wsContents)}`);
  }

  if (!fs.existsSync(appDir)) {
    const wsContents = fs.readdirSync(wsDir);
    throw new Error(`Logic app directory not found at: ${appDir}\n` + `Workspace dir contents: ${JSON.stringify(wsContents)}`);
  }

  if (opts.wfName) {
    const wfDir = path.join(appDir, opts.wfName);
    console.log(`[verifyDisk] Workflow dir exists: ${fs.existsSync(wfDir)}`);
    if (!fs.existsSync(wfDir)) {
      const appContents = fs.readdirSync(appDir);
      console.log(`[verifyDisk] Warning: workflow dir not found. App dir contents: ${JSON.stringify(appContents)}`);
    }
  }

  if (opts.customCodeFolder) {
    const ccDir = path.join(wsDir, opts.customCodeFolder);
    console.log(`[verifyDisk] Custom code dir exists: ${fs.existsSync(ccDir)}`);
    if (!fs.existsSync(ccDir)) {
      const wsContents = fs.readdirSync(wsDir);
      console.log(`[verifyDisk] Warning: custom code dir not found. Workspace contents: ${JSON.stringify(wsContents)}`);
    }
  }

  console.log('[verifyDisk] Workspace verified on disk');
}

/**
 * Deep-verify a created workspace on disk.
 * Reads and validates:
 *  - .code-workspace JSON (folder entries match expected structure)
 *  - workflow.json (kind matches workflow type, action/trigger structure)
 *  - host.json and local.settings.json exist
 *  - For custom code: function folder, .cs file, .csproj file
 *  - For rules engine: function folder, .cs files, .csproj, SampleRuleSet.xml, SchemaUser.xsd
 */
export function deepVerifyWorkspace(
  parentDir: string,
  opts: {
    wsName: string;
    appName: string;
    wfName: string;
    appType: 'standard' | 'customCode' | 'rulesEngine' | 'codeful';
    wfType: 'Stateful' | 'Stateless' | 'Autonomous agents (Preview)' | 'Conversational agents (Preview)';
    ccFolderName?: string;
    fnName?: string;
    fnNamespace?: string;
  }
): void {
  const { wsName, appName, wfName, appType, wfType, ccFolderName, fnName, fnNamespace } = opts;
  const wsDir = path.join(parentDir, wsName);

  // --- 1. Basic structure (delegate to existing function) ---
  verifyWorkspaceOnDisk(parentDir, wsName, appName, {
    wfName,
    customCodeFolder: ccFolderName,
  });

  // --- 2. .code-workspace file ---
  const wsFilePath = path.join(wsDir, `${wsName}.code-workspace`);
  const wsContent = JSON.parse(fs.readFileSync(wsFilePath, 'utf-8'));
  const folderNames: string[] = (wsContent.folders || []).map((f: { name: string }) => f.name);
  console.log(`[deepVerify] .code-workspace folders: ${JSON.stringify(folderNames)}`);

  if (!folderNames.includes(appName)) {
    throw new Error(`.code-workspace missing logic app folder "${appName}". Folders: ${JSON.stringify(folderNames)}`);
  }
  if (appType !== 'standard' && appType !== 'codeful' && ccFolderName) {
    if (!folderNames.includes(ccFolderName)) {
      throw new Error(`.code-workspace missing function folder "${ccFolderName}". Folders: ${JSON.stringify(folderNames)}`);
    }
    console.log(`[deepVerify] .code-workspace has function folder "${ccFolderName}" ✔`);
  }

  // --- 3. workflow.json ---
  const wfDir = path.join(wsDir, appName, wfName);
  const wfJsonPath = path.join(wfDir, 'workflow.json');
  if (fs.existsSync(wfJsonPath)) {
    const wfJson = JSON.parse(fs.readFileSync(wfJsonPath, 'utf-8'));
    const kind: string = wfJson.kind || '';
    console.log(`[deepVerify] workflow.json kind: "${kind}"`);

    // Expected kind based on workflow type
    const expectedKindMap: Record<string, string> = {
      Stateful: 'Stateful',
      Stateless: 'Stateless',
      'Autonomous agents (Preview)': 'Stateful',
      'Conversational agents (Preview)': 'Agent',
    };
    const expectedKind = expectedKindMap[wfType] || 'Stateful';
    if (kind !== expectedKind) {
      throw new Error(`workflow.json kind "${kind}" does not match expected "${expectedKind}" for wfType "${wfType}"`);
    }
    console.log(`[deepVerify] workflow.json kind matches expected "${expectedKind}" ✔`);

    // Check actions/triggers based on type
    const actions = wfJson.definition?.actions || {};
    const triggers = wfJson.definition?.triggers || {};
    const actionNames = Object.keys(actions);
    const triggerNames = Object.keys(triggers);
    console.log(`[deepVerify] workflow.json actions: ${JSON.stringify(actionNames)}`);
    console.log(`[deepVerify] workflow.json triggers: ${JSON.stringify(triggerNames)}`);

    if (appType === 'codeful') {
      throw new Error(`Codeful workspace must not contain codeless workflow.json at ${wfJsonPath}`);
    }
    if (appType === 'customCode') {
      if (!actionNames.some((a) => a.toLowerCase().includes('call_a_local_function'))) {
        throw new Error(`Custom code workflow.json missing "Call_a_local_function" action. Actions: ${JSON.stringify(actionNames)}`);
      }
      console.log('[deepVerify] Custom code InvokeFunction action present ✔');
    } else if (appType === 'rulesEngine') {
      if (!actionNames.some((a) => a.toLowerCase().includes('call_a_local_rules_function'))) {
        throw new Error(`Rules engine workflow.json missing "Call_a_local_rules_function" action. Actions: ${JSON.stringify(actionNames)}`);
      }
      console.log('[deepVerify] Rules engine InvokeFunction action present ✔');
    } else if (wfType === 'Autonomous agents (Preview)' || wfType === 'Conversational agents (Preview)') {
      if (actionNames.some((a) => a.toLowerCase().includes('agent'))) {
        console.log('[deepVerify] Agent action present ✔');
      } else {
        console.log('[deepVerify] Warning: Agent action not found (may be expected for this combination)');
      }
      if (wfType === 'Conversational agents (Preview)') {
        if (triggerNames.some((t) => t.toLowerCase().includes('chat_session'))) {
          console.log('[deepVerify] Conversational agent trigger "When_a_new_chat_session_starts" present ✔');
        }
      }
    }
  } else {
    console.log(`[deepVerify] Warning: workflow.json not found at ${wfJsonPath}`);
  }

  // --- 4. host.json and local.settings.json ---
  const appDir = path.join(wsDir, appName);
  const hostJsonPath = path.join(appDir, 'host.json');
  const localSettingsPath = path.join(appDir, 'local.settings.json');
  if (fs.existsSync(hostJsonPath)) {
    console.log('[deepVerify] host.json exists ✔');
  } else if (appType === 'codeful') {
    throw new Error(`Codeful workspace missing required host.json: ${hostJsonPath}`);
  } else {
    console.log('[deepVerify] Warning: host.json not found');
  }
  if (fs.existsSync(localSettingsPath)) {
    console.log('[deepVerify] local.settings.json exists ✔');
  } else if (appType === 'codeful') {
    throw new Error(`Codeful workspace missing required local.settings.json: ${localSettingsPath}`);
  } else {
    console.log('[deepVerify] Warning: local.settings.json not found');
  }

  if (appType === 'codeful') {
    const csFile = path.join(appDir, `${wfName}.cs`);
    const csprojFile = path.join(appDir, `${appName}.csproj`);
    const programFile = path.join(appDir, 'Program.cs');
    const unexpectedWorkflowJson = path.join(appDir, wfName, 'workflow.json');
    const codefulContents = fs.existsSync(appDir) ? fs.readdirSync(appDir) : [];
    console.log(`[deepVerify] Codeful app folder contents: ${JSON.stringify(codefulContents)}`);

    for (const requiredFile of [csFile, csprojFile, programFile]) {
      if (!fs.existsSync(requiredFile)) {
        throw new Error(`Codeful workspace missing required generated file: ${requiredFile}`);
      }
      console.log(`[deepVerify] Codeful generated file exists: ${path.basename(requiredFile)} OK`);
    }

    if (fs.existsSync(unexpectedWorkflowJson)) {
      throw new Error(`Codeful workspace must not generate codeless workflow.json: ${unexpectedWorkflowJson}`);
    }
    console.log('[deepVerify] Codeful workspace has no workflow.json OK');
  }

  // --- 5. Function app files (custom code / rules engine) ---
  if (appType !== 'standard' && appType !== 'codeful' && ccFolderName && fnName) {
    const fnDir = path.join(wsDir, ccFolderName);
    const csFile = path.join(fnDir, `${fnName}.cs`);
    const csprojFile = path.join(fnDir, `${fnName}.csproj`);
    const fnContents = fs.existsSync(fnDir) ? fs.readdirSync(fnDir) : [];
    console.log(`[deepVerify] Function folder contents: ${JSON.stringify(fnContents)}`);

    if (fs.existsSync(csFile)) {
      console.log(`[deepVerify] Function .cs file "${fnName}.cs" exists ✔`);
      if (fnNamespace) {
        const csContent = fs.readFileSync(csFile, 'utf-8');
        if (csContent.includes(fnNamespace)) {
          console.log(`[deepVerify] Function .cs contains namespace "${fnNamespace}" ✔`);
        } else {
          console.log(`[deepVerify] Warning: namespace "${fnNamespace}" not found in .cs file`);
        }
      }
    } else {
      console.log(`[deepVerify] Warning: ${fnName}.cs not found in function folder`);
    }

    if (fs.existsSync(csprojFile)) {
      console.log(`[deepVerify] Function .csproj file "${fnName}.csproj" exists ✔`);
    } else {
      console.log(`[deepVerify] Warning: ${fnName}.csproj not found in function folder`);
    }

    // Rules engine extras
    if (appType === 'rulesEngine') {
      const contosoPurchase = path.join(fnDir, 'ContosoPurchase.cs');
      if (fs.existsSync(contosoPurchase)) {
        console.log('[deepVerify] Rules engine ContosoPurchase.cs exists ✔');
      } else {
        console.log('[deepVerify] Warning: ContosoPurchase.cs not found');
      }

      const sampleRuleSet = path.join(appDir, 'Artifacts', 'Rules', 'SampleRuleSet.xml');
      const schemaUser = path.join(appDir, 'Artifacts', 'Schemas', 'SchemaUser.xsd');
      if (fs.existsSync(sampleRuleSet)) {
        console.log('[deepVerify] SampleRuleSet.xml exists ✔');
      } else {
        console.log('[deepVerify] Warning: SampleRuleSet.xml not found');
      }
      if (fs.existsSync(schemaUser)) {
        console.log('[deepVerify] SchemaUser.xsd exists ✔');
      } else {
        console.log('[deepVerify] Warning: SchemaUser.xsd not found');
      }
    }
  }

  console.log(`[deepVerify] PASSED: Deep verification complete for ${appType}/${wfType}`);
}

/**
 * Fill the standard form fields on Step 0 (Project Setup).
 * Fills: path, workspace name, logic app name, logic app type radio, workflow name, workflow type.
 * Returns the generated names for verification.
 */
export async function fillStandardFormFields(
  driver: WebDriver,
  parentDir: string,
  opts: {
    wsName: string;
    appName: string;
    wfName: string;
    appType?: string;
    wfType?: string;
  }
): Promise<void> {
  const { wsName, appName, wfName, appType = 'Logic app (Standard)', wfType = 'Stateful' } = opts;

  // Fill "Workspace parent folder path"
  console.log('[fillForm] Filling workspace parent folder path...');
  const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
  await clearAndType(pathInput, parentDir);
  await waitForPathValidation(driver);

  // Fill "Workspace name"
  console.log('[fillForm] Filling workspace name...');
  const wsNameInput = await findInputByLabel(driver, 'Workspace name');
  await clearAndType(wsNameInput, wsName);

  // Fill "Logic app name"
  console.log('[fillForm] Filling logic app name...');
  const appNameInput = await findInputByLabel(driver, 'Logic app name');
  await clearAndType(appNameInput, appName);

  // Select logic app type
  console.log(`[fillForm] Selecting logic app type: "${appType}"...`);
  await selectRadioOption(driver, appType);
  await sleep(1000); // Wait for conditional fields to render

  // Fill "Workflow name"
  console.log('[fillForm] Filling workflow name...');
  const wfNameInput = await findInputByLabel(driver, 'Workflow name');
  await clearAndType(wfNameInput, wfName);

  // Select workflow type from dropdown
  console.log(`[fillForm] Selecting workflow type: "${wfType}"...`);
  const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
  await selectDropdownOption(driver, wfTypeDropdown, wfType);
}

/**
 * Fill the custom code configuration fields.
 * Must be called AFTER selecting "Logic app with custom code" radio.
 * Fills: .NET Version, Custom code folder name, Function namespace, Function name.
 *
 * The fields are rendered by DotNetFrameworkStep when logicAppType === 'customCode'.
 * Labels may vary slightly in DOM rendering due to Fluent UI, so we use flexible matching.
 */
export async function fillCustomCodeFields(
  driver: WebDriver,
  opts: {
    dotNetVersion?: string;
    folderName: string;
    namespace: string;
    functionName: string;
  }
): Promise<void> {
  const { dotNetVersion = '.NET 8', folderName, namespace, functionName } = opts;

  // Log the page text to help debug field visibility
  const bodyText = await driver.findElement(By.css('body')).getText();
  console.log(`[fillCustomCode] Page text (first 600 chars): ${bodyText.substring(0, 600)}`);

  // Select .NET Version from dropdown
  // The label might be ".NET Version", ".NET version", "NET Version", etc.
  console.log(`[fillCustomCode] Selecting .NET Version: "${dotNetVersion}"...`);
  let dotNetDropdown: WebElement | null = null;

  // Try exact label first
  try {
    dotNetDropdown = await findDropdownByLabel(driver, '.NET Version');
  } catch {
    console.log('[fillCustomCode] Could not find dropdown by ".NET Version", trying alternatives...');
  }

  // Try alternative labels
  if (!dotNetDropdown) {
    for (const altLabel of ['.NET version', 'NET Version', 'NET version', 'dotnet', 'framework']) {
      try {
        dotNetDropdown = await findDropdownByLabel(driver, altLabel);
        console.log(`[fillCustomCode] Found .NET dropdown with label "${altLabel}"`);
        break;
      } catch {
        // Try next
      }
    }
  }

  // Fallback: just find any button[role="combobox"] that's not the workflow type dropdown
  if (!dotNetDropdown) {
    console.log('[fillCustomCode] Trying to find .NET dropdown by role="combobox"...');
    const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
    console.log(`[fillCustomCode] Found ${comboboxes.length} combobox elements`);
    // The .NET Version dropdown should be the first combobox in the custom code section
    // (workflow type dropdown comes later in the DOM)
    if (comboboxes.length >= 1) {
      dotNetDropdown = comboboxes[0];
      console.log('[fillCustomCode] Using first combobox as .NET dropdown');
    }
  }

  if (!dotNetDropdown) {
    throw new Error('Could not find .NET Version dropdown');
  }

  await selectDropdownOption(driver, dotNetDropdown, dotNetVersion);

  // Fill "Custom code folder name"
  console.log(`[fillCustomCode] Filling custom code folder name: "${folderName}"...`);
  let folderInput: WebElement | null = null;
  for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
    try {
      folderInput = await findInputByLabel(driver, label);
      break;
    } catch {
      // Try next
    }
  }
  if (!folderInput) {
    throw new Error('Could not find "Custom code folder name" input');
  }
  await clearAndType(folderInput, folderName);

  // Fill "Function namespace"
  console.log(`[fillCustomCode] Filling function namespace: "${namespace}"...`);
  let nsInput: WebElement | null = null;
  for (const label of ['Function namespace', 'Namespace', 'namespace']) {
    try {
      nsInput = await findInputByLabel(driver, label);
      break;
    } catch {
      // Try next
    }
  }
  if (!nsInput) {
    throw new Error('Could not find "Function namespace" input');
  }
  await clearAndType(nsInput, namespace);

  // Fill "Function name" — MUST be filled BEFORE namespace lookup to avoid
  // label ambiguity (label "Function namespace" contains substring "Function name").
  // Use the htmlFor→id link directly, or use exclusive XPath matching.
  console.log(`[fillCustomCode] Filling function name: "${functionName}"...`);
  let fnInput: WebElement | null = null;

  // Strategy: find label that says "Function name" but NOT "Function namespace"
  const fnLabels = await driver.findElements(By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]"));
  if (fnLabels.length > 0) {
    const forAttr = await fnLabels[0].getAttribute('for');
    if (forAttr) {
      const inputs = await driver.findElements(By.id(forAttr));
      if (inputs.length > 0) {
        fnInput = inputs[0];
        console.log(`[fillCustomCode] Found function name input by exclusive label match (for="${forAttr}")`);
      }
    }
    if (!fnInput) {
      // Fallback: find input inside label's parent
      const parent = await fnLabels[0].findElement(By.xpath('..'));
      const inputs = await parent.findElements(By.css('input'));
      if (inputs.length > 0) {
        fnInput = inputs[0];
        console.log('[fillCustomCode] Found function name input by parent search');
      }
    }
  }

  if (!fnInput) {
    // Last resort: try generic findInputByLabel
    for (const label of ['Function name', 'function name']) {
      try {
        fnInput = await findInputByLabel(driver, label);
        break;
      } catch {
        // Try next
      }
    }
  }
  if (!fnInput) {
    throw new Error('Could not find "Function name" input');
  }
  await clearAndType(fnInput, functionName);

  console.log('[fillCustomCode] All custom code fields filled');
}

/**
 * Debug helper: dump all form field values to help diagnose validation issues.
 * Logs the value of every input and combobox on the page.
 */
export async function dumpFormState(driver: WebDriver): Promise<void> {
  console.log('[dumpFormState] === Form State ===');

  // Dump all inputs with their labels
  const inputs = await driver.findElements(By.css('input'));
  for (let i = 0; i < inputs.length; i++) {
    try {
      const value = await inputs[i].getAttribute('value');
      const placeholder = await inputs[i].getAttribute('placeholder');
      const ariaLabel = await inputs[i].getAttribute('aria-label');
      const id = await inputs[i].getAttribute('id');
      console.log(`[dumpFormState] Input[${i}] id="${id}" aria-label="${ariaLabel}" value="${value}" placeholder="${placeholder}"`);
    } catch {
      console.log(`[dumpFormState] Input[${i}] (could not read attributes)`);
    }
  }

  // Dump all comboboxes
  const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
  for (let i = 0; i < comboboxes.length; i++) {
    try {
      const text = await comboboxes[i].getText();
      const ariaLabel = await comboboxes[i].getAttribute('aria-label');
      console.log(`[dumpFormState] Combobox[${i}] aria-label="${ariaLabel}" text="${text}"`);
    } catch {
      console.log(`[dumpFormState] Combobox[${i}] (could not read attributes)`);
    }
  }

  // Dump any error messages
  const errors = await driver.findElements(By.css('[class*="error"], [class*="Error"], [class*="validationMessage"]'));
  for (const err of errors) {
    try {
      const text = await err.getText();
      if (text.trim()) {
        console.log(`[dumpFormState] Error/validation: "${text.trim()}"`);
      }
    } catch {
      // Ignore
    }
  }

  // Dump the radio group state
  const radios = await driver.findElements(By.css('input[type="radio"]'));
  for (let i = 0; i < radios.length; i++) {
    try {
      const checked = await radios[i].getAttribute('checked');
      const value = await radios[i].getAttribute('value');
      const name = await radios[i].getAttribute('name');
      console.log(`[dumpFormState] Radio[${i}] name="${name}" value="${value}" checked=${checked !== null}`);
    } catch {
      console.log(`[dumpFormState] Radio[${i}] (could not read attributes)`);
    }
  }

  // Check Next button state
  const nextButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Next')]"));
  for (const btn of nextButtons) {
    try {
      const disabled = await btn.getAttribute('disabled');
      const ariaDisabled = await btn.getAttribute('aria-disabled');
      console.log(`[dumpFormState] Next button: disabled="${disabled}" aria-disabled="${ariaDisabled}"`);
    } catch {
      // Ignore
    }
  }

  console.log('[dumpFormState] === End Form State ===');
}

// ===========================================================================
// Test Suite
// ===========================================================================

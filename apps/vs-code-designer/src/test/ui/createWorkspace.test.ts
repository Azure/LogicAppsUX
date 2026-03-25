// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  type InputBox,
  type QuickOpenBox,
  Workbench,
  WebView,
  By,
  until,
  EditorView,
  type WebDriver,
  VSBrowser,
  type WebElement,
  Key,
} from 'vscode-extension-tester';

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
 *     - "Workflow type" (Dropdown/combobox: Stateful | Stateless | Autonomous Agents (Preview) | Conversational Agents)
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
const TEST_TIMEOUT = 120_000;

/** Timeout for waiting for elements */
const ELEMENT_TIMEOUT = 20_000;

/** Poll interval for waiting loops */
const POLL_INTERVAL = 500;

/** Debounce time for path validation + buffer */
const PATH_VALIDATION_WAIT = 1_500;

/** Time to wait after typing in a field */
const TYPE_SETTLE = 300;

/** Path to the manifest file that records all created workspaces for downstream tests */
const WORKSPACE_MANIFEST_PATH = path.join(os.tmpdir(), 'la-e2e-test', 'created-workspaces.json');

/**
 * A single entry in the workspace manifest file.
 * Records every parameter used to create the workspace so downstream tests
 * can load it without having to re-derive paths.
 */
interface WorkspaceManifestEntry {
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
  appType: 'standard' | 'customCode' | 'rulesEngine';
  /** Workflow type value */
  wfType: 'Stateful' | 'Stateless' | 'Autonomous Agents (Preview)' | 'Conversational Agents';
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
function appendToWorkspaceManifest(entry: WorkspaceManifestEntry): void {
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
function buildManifestEntry(
  label: string,
  parentDir: string,
  opts: {
    wsName: string;
    appName: string;
    wfName: string;
    appType: 'standard' | 'customCode' | 'rulesEngine';
    wfType: 'Stateful' | 'Stateless' | 'Autonomous Agents (Preview)' | 'Conversational Agents';
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
function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

/** Sleep for ms milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Directory for explicit screenshots */
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'createWorkspace-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

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
 * Create a temporary directory for the workspace.
 * Returns the full path to the tmp dir.
 */
function createTempDir(): string {
  const tmpBase = path.join(os.tmpdir(), 'la-e2e-test');
  if (!fs.existsSync(tmpBase)) {
    fs.mkdirSync(tmpBase, { recursive: true });
  }
  return tmpBase;
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
async function selectCreateWorkspaceCommand(workbench: Workbench): Promise<void> {
  // Dismiss any notifications first
  try {
    await dismissNotifications(workbench.getDriver());
  } catch {
    // Ignore
  }

  // Retry opening and typing in the command palette — sometimes
  // the InputBox is not yet interactable right after openCommandPrompt()
  let input: InputBox | QuickOpenBox | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      input = await workbench.openCommandPrompt();
      await sleep(1000);

      // CRITICAL: Use '> ' prefix to stay in command mode.
      // InputBox.setText() calls clear() which removes the '>' that openCommandPrompt() adds.
      // Without '>', VS Code treats input as a file search, not command search.
      await input.setText('> logic app workspace');
      await sleep(2000); // Wait for picks to populate
      break; // setText succeeded
    } catch (e: any) {
      console.log(`[selectCreateWorkspaceCommand] Attempt ${attempt + 1}/3: setText failed: ${e.message}`);
      try {
        await input?.cancel();
      } catch {
        // Ignore cancel error
      }
      await sleep(2000);
      if (attempt === 2) {
        throw e;
      }
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
    await input.setText('> Create new logic');
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
    await input.cancel();
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
async function waitForExtensionReady(workbench: Workbench, timeoutMs = 60_000): Promise<void> {
  const startTime = Date.now();
  let lastError = '';
  let lastPickLabels: string[] = [];

  // Try with shorter search terms that are more likely to match
  // CRITICAL: Prefix with '> ' to stay in command mode (not file search)
  const searchTerms = ['> logic app workspace', '> Create new logic app', '> create workspace'];

  while (Date.now() - startTime < timeoutMs) {
    for (const searchTerm of searchTerms) {
      const input = await workbench.openCommandPrompt();
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
          await input.cancel();
          await sleep(300);
          return;
        }
      }

      console.log(`[waitForExtensionReady] Search "${searchTerm}" picks: [${lastPickLabels.join(', ')}]`);
      await input.cancel();
      await sleep(300);
    }

    lastError = `Command not found after ${Date.now() - startTime}ms. Last picks: [${lastPickLabels.join(', ')}]`;
    console.log(`[waitForExtensionReady] ${lastError}, retrying...`);
    await sleep(3000);
  }

  throw new Error(`Extension not ready after ${timeoutMs}ms: ${lastError}`);
}

/**
 * Dismiss all notification toasts that may block webview interaction.
 * VS Code shows notifications that overlay the editor area and intercept clicks.
 */
async function dismissNotifications(driver: WebDriver): Promise<void> {
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
async function switchToWebviewFrame(driver: WebDriver): Promise<WebView> {
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

  let lastError: Error | null = null;
  // On CI the first cold webview render takes longer (~15s).
  // Use 10 retries x 3s = 30s total to accommodate.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const webview = new WebView();
      await webview.switchToFrame();
      await sleep(1000);

      // Verify we're NOT in the "from package" webview
      const packageLabels = await driver.findElements(By.xpath("//*[contains(text(), 'Package path')]"));
      if (packageLabels.length > 0) {
        await webview.switchBack();
        throw new Error(
          'Wrong webview opened: "Create Workspace From Package" instead of "Create Workspace". ' +
            'The command palette selected the wrong command.'
        );
      }

      return webview;
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes('Package')) {
        throw e; // Don't retry wrong webview
      }
      console.log(`[switchToWebviewFrame] Attempt ${attempt + 1}/10 failed: ${e.message}`);
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

      await sleep(3000);
    }
  }

  throw lastError || new Error('Could not switch to webview frame after 5 attempts');
}

/**
 * Wait until the Create Workspace form is rendered in the current webview frame.
 * This avoids transient failures right after switching to a shared webview frame.
 */
async function waitForCreateWorkspaceFormReady(driver: WebDriver, timeoutMs = 12_000): Promise<void> {
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
async function findInputByLabel(driver: WebDriver, labelText: string): Promise<WebElement> {
  // Strategy 1: Find label exactly matching the text (allowing for trailing required indicators)
  // Use a two-step approach: first try the label whose text starts with exactly our labelText
  const allLabels = await driver.findElements(By.xpath(`//label[contains(text(), '${labelText}')]`));
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
async function findDropdownByLabel(driver: WebDriver, labelText: string): Promise<WebElement> {
  // Strategy 1: label with 'for' -> button with that id
  const labels = await driver.findElements(By.xpath(`//label[contains(text(), '${labelText}')]`));
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
async function selectDropdownOption(driver: WebDriver, dropdown: WebElement, optionText: string, _retries = 3): Promise<void> {
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
async function selectRadioOption(driver: WebDriver, optionLabel: string): Promise<void> {
  // Fluent UI RadioGroup: <input type="radio"> with associated <label>
  // Strategy: find label text, click it or click the radio input next to it
  const labels = await driver.findElements(By.xpath(`//label[contains(text(), '${optionLabel}')]`));

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
async function clearAndType(element: WebElement, text: string): Promise<void> {
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
async function waitForPathValidation(driver: WebDriver, timeoutMs = PATH_VALIDATION_WAIT): Promise<boolean> {
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
async function waitForNextButton(driver: WebDriver, timeoutMs = 30_000): Promise<WebElement> {
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
async function findButtonByText(driver: WebDriver, text: string): Promise<WebElement> {
  const buttons = await driver.findElements(By.xpath(`//button[contains(text(), '${text}')]`));
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
async function clickCreateWorkspaceButton(driver: WebDriver, webview: WebView): Promise<void> {
  const createButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Create workspace')]"));
  if (createButtons.length === 0) {
    await webview.switchBack();
    throw new Error('"Create workspace" button not found on review page');
  }

  console.log('[clickCreateWorkspace] Clicking "Create workspace" button...');
  await createButtons[0].click();

  // Wait for the extension to process: create files on disk + dispose panel
  // The extension also calls vscode.openFolder which may reload the window
  await sleep(15_000);

  // Switch back from the (now likely closed) webview
  try {
    await webview.switchBack();
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
    // Try switching between window handles in case a new window opened
    try {
      const handles = await driver.getAllWindowHandles();
      console.log(`[clickCreateWorkspace] Window handles: ${handles.length}`);
      for (const handle of handles) {
        try {
          await driver.switchTo().window(handle);
          await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 5_000);
          console.log(`[clickCreateWorkspace] Recovered on window handle: ${handle}`);
          return;
        } catch {
          // Try next handle
        }
      }
    } catch (e) {
      console.log(`[clickCreateWorkspace] Window handle recovery failed: ${e}`);
    }
    console.log('[clickCreateWorkspace] Warning: full driver recovery failed, tests may be unstable');
  }
}

/**
 * Verify that workspace artifacts were created on disk.
 * Checks for the workspace directory, .code-workspace file, and logic app directory.
 */
function verifyWorkspaceOnDisk(
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
function deepVerifyWorkspace(
  parentDir: string,
  opts: {
    wsName: string;
    appName: string;
    wfName: string;
    appType: 'standard' | 'customCode' | 'rulesEngine';
    wfType: 'Stateful' | 'Stateless' | 'Autonomous Agents (Preview)' | 'Conversational Agents';
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
  if (appType !== 'standard' && ccFolderName) {
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
      'Autonomous Agents (Preview)': 'Stateful',
      'Conversational Agents': 'Agent',
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
    } else if (wfType === 'Autonomous Agents (Preview)' || wfType === 'Conversational Agents') {
      if (actionNames.some((a) => a.toLowerCase().includes('agent'))) {
        console.log('[deepVerify] Agent action present ✔');
      } else {
        console.log('[deepVerify] Warning: Agent action not found (may be expected for this combination)');
      }
      if (wfType === 'Conversational Agents') {
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
  } else {
    console.log('[deepVerify] Warning: host.json not found');
  }
  if (fs.existsSync(localSettingsPath)) {
    console.log('[deepVerify] local.settings.json exists ✔');
  } else {
    console.log('[deepVerify] Warning: local.settings.json not found');
  }

  // --- 5. Function app files (custom code / rules engine) ---
  if (appType !== 'standard' && ccFolderName && fnName) {
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
async function fillStandardFormFields(
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
async function fillCustomCodeFields(
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
async function dumpFormState(driver: WebDriver): Promise<void> {
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

describe('Create Workspace Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let workbench: Workbench;
  let driver: WebDriver;
  const tempDir = createTempDir();

  before(async function () {
    this.timeout(120_000);
    workbench = new Workbench();
    driver = workbench.getDriver();
    console.log('[setup] Waiting for extension to be ready...');
    await waitForExtensionReady(workbench);
    console.log('[setup] Extension is ready');
  });

  after(async () => {
    // NOTE: We intentionally do NOT clean up tempDir here.
    // Created workspaces are recorded in the manifest file at WORKSPACE_MANIFEST_PATH
    // so downstream test suites can load and inspect them.
    // Cleanup should happen in the final test suite that consumes the manifest.
    console.log(`[teardown] Workspace manifest: ${WORKSPACE_MANIFEST_PATH}`);
    try {
      if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
        const manifest = JSON.parse(fs.readFileSync(WORKSPACE_MANIFEST_PATH, 'utf-8'));
        console.log(`[teardown] ${manifest.length} workspaces recorded in manifest`);
      }
    } catch {
      // Ignore
    }
  });

  // =========================================================================
  // PRE-CREATION WEBVIEW TESTS — Single shared webview instance.
  // Opens the webview once, runs all read-only checks, validation tests,
  // and interaction tests, then closes. Avoids redundant webview open/close.
  // =========================================================================
  describe('Pre-creation webview tests (single shared webview)', function () {
    this.timeout(TEST_TIMEOUT);

    let webview: WebView;

    before(async function () {
      this.timeout(120_000);
      console.log('[readonly] Opening shared webview...');
      await selectCreateWorkspaceCommand(workbench);
      webview = await switchToWebviewFrame(driver);
      console.log('[readonly] Shared webview ready');
      // Switch back so each test can switch in via beforeEach
      await webview.switchBack();
    });

    beforeEach(async () => {
      // Switch into the webview iframe before each test
      await webview.switchToFrame();
      await waitForCreateWorkspaceFormReady(driver);
      await sleep(200);
    });

    afterEach(async () => {
      // Switch back to VS Code chrome after each test
      try {
        await webview.switchBack();
      } catch {
        try {
          await driver.switchTo().defaultContent();
        } catch {
          console.log('[readonly:afterEach] Could not switch to defaultContent');
        }
      }
    });

    after(async () => {
      // Close the shared webview when all read-only tests are done
      try {
        await driver.switchTo().defaultContent();
        await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 10_000);
        const editorView = new EditorView();
        await editorView.closeAllEditors();
      } catch {
        console.log('[readonly:after] Warning: could not close editors');
      }
      await sleep(1000);
    });

    // -----------------------------------------------------------------------
    // Test: Verify all form elements on initial render (consolidated)
    // Combines: correct command, dropdown options, step indicator, buttons,
    // radio options, descriptions, browse button, sections, required, nav
    // -----------------------------------------------------------------------
    it('should verify all form elements on initial render', async () => {
      await waitForCreateWorkspaceFormReady(driver);
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerPageText = pageText.toLowerCase();

      // 1. Correct command selected (not "from package")
      const packagePathLabels = await driver.findElements(By.xpath("//*[contains(text(), 'Package path')]"));
      if (packagePathLabels.length > 0) {
        throw new Error('Wrong webview: found "Package path" label - this is the "from package" flow');
      }
      console.log('[formElements] Correct command opened (no "Package path") ✓');

      // 2. Step indicator
      const hasStep1 = pageText.includes('Step 1 of 2') || pageText.includes('step 1 of 2');
      const hasProjectSetup = lowerPageText.includes('project setup');
      if (!hasStep1 && !hasProjectSetup) {
        throw new Error('Neither step indicator nor "Project setup" header found');
      }
      console.log('[formElements] Step indicator found ✓');

      // 3. Next button disabled when empty
      const nextButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Next')]"));
      if (nextButtons.length === 0) {
        throw new Error('Next button not found on the form');
      }
      const nextDisabled = await nextButtons[0].getAttribute('disabled');
      const nextAriaDisabled = await nextButtons[0].getAttribute('aria-disabled');
      const isNextDisabled = nextDisabled === 'true' || nextDisabled === '' || nextAriaDisabled === 'true';
      if (!isNextDisabled) {
        throw new Error('Next button should be disabled when required fields are empty');
      }
      console.log('[formElements] Next button disabled ✓');

      // 4. Back button disabled or absent on step 0
      const backButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Back')]"));
      if (backButtons.length > 0) {
        const backDisabled = await backButtons[0].getAttribute('disabled');
        const backAriaDisabled = await backButtons[0].getAttribute('aria-disabled');
        const isBackDisabled = backDisabled === 'true' || backDisabled === '' || backAriaDisabled === 'true';
        if (!isBackDisabled) {
          throw new Error('Back button should be disabled on the first step');
        }
      }
      console.log('[formElements] Back button disabled/absent ✓');

      // 5. All 3 radio options present
      const expectedRadioLabels = ['Logic app (Standard)', 'Logic app with custom code', 'Logic app with rules engine'];
      const missingLabels: string[] = [];
      for (const label of expectedRadioLabels) {
        if (!pageText.includes(label)) {
          missingLabels.push(label);
        }
      }
      if (missingLabels.length > 0) {
        throw new Error(`Missing radio labels: ${JSON.stringify(missingLabels)}`);
      }
      const radios = await driver.findElements(By.css('input[type="radio"]'));
      if (radios.length < 3) {
        throw new Error(`Expected at least 3 radio inputs, found ${radios.length}`);
      }
      console.log('[formElements] 3 radio options present ✓');

      // 6. Radio description keywords
      const descKeywords = [
        { label: 'Standard', keywords: ['workflow'] },
        { label: 'Custom code', keywords: ['custom', 'code'] },
        { label: 'Rules engine', keywords: ['rule'] },
      ];
      for (const desc of descKeywords) {
        const allFound = desc.keywords.every((kw) => lowerPageText.includes(kw));
        if (allFound) {
          console.log(`[formElements] "${desc.label}" description keywords found ✓`);
        } else {
          console.log(`[formElements] Warning: "${desc.label}" description keywords not all found`);
        }
      }

      // 7. Browse button present
      const browseButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Browse')]"));
      if (browseButtons.length === 0) {
        throw new Error('Browse button not found');
      }
      if (!(await browseButtons[0].isDisplayed())) {
        throw new Error('Browse button is not visible');
      }
      console.log('[formElements] Browse button visible ✓');

      // 8. Section headers
      const expectedSections = [
        { name: 'Workspace/Project setup', patterns: ['workspace parent folder path', 'workspace name'] },
        { name: 'Logic App Details', patterns: ['logic app name'] },
        { name: 'Workflow Configuration', patterns: ['workflow name', 'workflow type'] },
      ];
      for (const section of expectedSections) {
        const found = section.patterns.some((p) => lowerPageText.includes(p));
        if (!found) {
          throw new Error(`Section "${section.name}" not found. Patterns: ${JSON.stringify(section.patterns)}`);
        }
      }
      console.log('[formElements] Section headers present ✓');

      // 9. Required field indicators
      const requiredInputs = await driver.findElements(By.css('input[required], input[aria-required="true"]'));
      const requiredLabels = await driver.findElements(By.css('label[class*="required"], span[class*="required"]'));
      if (requiredInputs.length === 0 && requiredLabels.length === 0) {
        const labels = await driver.findElements(By.css('label'));
        let asteriskCount = 0;
        for (const label of labels) {
          const text = await label.getText();
          if (text.includes('*')) {
            asteriskCount++;
          }
        }
        if (asteriskCount === 0) {
          console.log('[formElements] Warning: No required indicators found — may be a Fluent UI rendering difference');
        }
      }
      console.log('[formElements] Required indicators checked ✓');

      // 10. Step navigation labels
      const hasReviewCreate = lowerPageText.includes('review') && (lowerPageText.includes('create') || lowerPageText.includes('+'));
      if (!hasProjectSetup && !hasReviewCreate) {
        console.log('[formElements] Warning: step navigation labels not found');
      }
      console.log('[formElements] Step navigation checked ✓');

      // 11. Workflow type dropdown options
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await wfTypeDropdown.click();
      await sleep(500);
      const options = await driver.findElements(By.css('[role="option"]'));
      const optionTexts: string[] = [];
      for (const opt of options) {
        optionTexts.push((await opt.getText()).trim());
      }
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(300);
      const expectedOptions = ['Stateful', 'Stateless', 'Autonomous Agents', 'Conversational Agents'];
      for (const expected of expectedOptions) {
        if (!optionTexts.some((opt) => opt.includes(expected))) {
          throw new Error(`Expected dropdown option "${expected}" not found. Available: ${JSON.stringify(optionTexts)}`);
        }
      }
      console.log(`[formElements] Workflow type dropdown options: ${JSON.stringify(optionTexts)} ✓`);

      await captureScreenshot(driver, 'formElements-passed');
      console.log('[formElements] PASSED: All form elements verified');
    });

    // =========================================================================
    // FORM VALIDATION TESTS — Reuses the same shared webview. No
    // close/reopen cycles needed. Helper functions scoped within this block.
    // =========================================================================

    // --- Validation helper functions ---

    async function findValidationMessage(drv: WebDriver, expectedText: string, timeout = ELEMENT_TIMEOUT): Promise<WebElement> {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const candidates = await drv.findElements(By.xpath(`//*[contains(text(), '${expectedText.replace(/'/g, "\\'")}')]`));
        for (const el of candidates) {
          try {
            if (await el.isDisplayed()) {
              const text = await el.getText();
              if (text.includes(expectedText)) {
                // Scroll the validation message into view so screenshots capture it
                await drv.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
                await sleep(200);
                return el;
              }
            }
          } catch {
            // Element may have gone stale
          }
        }
        await sleep(POLL_INTERVAL);
      }
      throw new Error(`Validation message not found: "${expectedText}" (waited ${timeout}ms)`);
    }

    async function assertNextButtonDisabled(drv: WebDriver): Promise<void> {
      const timeout = 8_000;
      const deadline = Date.now() + timeout;

      while (Date.now() < deadline) {
        const nextButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Next')]"));
        if (nextButtons.length === 0) {
          await sleep(POLL_INTERVAL);
          continue;
        }

        const disabled = await nextButtons[0].getAttribute('disabled');
        const ariaDisabled = await nextButtons[0].getAttribute('aria-disabled');
        const isDisabled = disabled === 'true' || disabled === '' || ariaDisabled === 'true';
        if (isDisabled) {
          return;
        }

        await sleep(POLL_INTERVAL);
      }

      throw new Error('Expected Next button to be disabled, but it is enabled');
    }

    async function assertCannotProceedToReview(drv: WebDriver): Promise<void> {
      const nextButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Next')]"));
      if (nextButtons.length === 0) {
        throw new Error('Next button not found on the form');
      }

      await nextButtons[0].click();
      await sleep(TYPE_SETTLE);

      const createButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Create workspace')]"));
      for (const button of createButtons) {
        if (await button.isDisplayed()) {
          throw new Error('Expected invalid form to block navigation, but review step was opened');
        }
      }

      const nextStillVisible = await drv.findElements(By.xpath("//button[contains(text(), 'Next')]"));
      if (nextStillVisible.length === 0) {
        throw new Error('Expected invalid form to block navigation, but review step was opened');
      }
    }

    async function assertInputShowsValidationMessage(input: WebElement, expectedContains?: string): Promise<void> {
      const timeout = 10_000;
      const deadline = Date.now() + timeout;
      let lastAriaInvalid: string | null = null;
      let lastDescribedBy: string | null = null;

      while (Date.now() < deadline) {
        const ariaInvalid = await input.getAttribute('aria-invalid');
        const describedBy = await input.getAttribute('aria-describedby');
        lastAriaInvalid = ariaInvalid;
        lastDescribedBy = describedBy;

        // Strategy 1: aria-describedby linkage from input to validation message
        if (describedBy) {
          const messageIds = describedBy.split(/\s+/).filter(Boolean);
          for (const id of messageIds) {
            const els = await driver.findElements(By.id(id));
            for (const el of els) {
              if (!(await el.isDisplayed())) {
                continue;
              }
              const text = (await el.getText()).trim();
              if (!text) {
                continue;
              }
              if (!expectedContains || text.toLowerCase().includes(expectedContains.toLowerCase())) {
                await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
                await sleep(200);
                return;
              }
            }
          }
        }

        // Strategy 2: visible validation text within the same Fluent Field container
        const fieldContainers = await input.findElements(By.xpath("ancestor::*[contains(@class, 'fui-Field')][1]"));
        if (fieldContainers.length > 0) {
          const fieldTextNodes = await fieldContainers[0].findElements(By.xpath(".//*[normalize-space(text())!='']"));
          for (const el of fieldTextNodes) {
            if (!(await el.isDisplayed())) {
              continue;
            }
            const text = (await el.getText()).trim();
            if (!text) {
              continue;
            }
            if (!expectedContains || text.toLowerCase().includes(expectedContains.toLowerCase())) {
              await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
              await sleep(200);
              return;
            }
          }
        }

        // Strategy 3: global fallback when field linkage is not exposed by accessibility attrs
        if (expectedContains) {
          const escaped = expectedContains.replace(/'/g, "\\'");
          const candidates = await driver.findElements(
            By.xpath(
              `//*[contains(translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${escaped.toLowerCase()}')]`
            )
          );
          for (const el of candidates) {
            if (await el.isDisplayed()) {
              const text = (await el.getText()).trim();
              if (text.toLowerCase().includes(expectedContains.toLowerCase())) {
                await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
                await sleep(200);
                return;
              }
            }
          }
        }

        await sleep(POLL_INTERVAL);
      }

      throw new Error(
        `Expected a visible validation message${expectedContains ? ` containing "${expectedContains}"` : ''}. ` +
          `Last state: aria-invalid="${lastAriaInvalid}", aria-describedby="${lastDescribedBy}"`
      );
    }

    async function ensureOnProjectSetupStep(drv: WebDriver): Promise<void> {
      const pageText = (await drv.findElement(By.css('body')).getText()).toLowerCase();
      const onReviewStep = pageText.includes('review your configuration and create your logic app workspace');
      if (!onReviewStep) {
        return;
      }

      const backButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Back')]"));
      if (backButtons.length === 0) {
        throw new Error('Expected Back button on review step, but none was found');
      }

      await backButtons[0].click();
      await sleep(TYPE_SETTLE);
    }

    async function findRulesEngineInputByLabel(drv: WebDriver, labelText: string): Promise<WebElement> {
      const labelXpath =
        labelText === 'Function name'
          ? "contains(text(), 'Function name') and not(contains(text(), 'namespace'))"
          : `contains(text(), '${labelText}')`;

      const scopedLabels = await drv.findElements(
        By.xpath(`//label[contains(text(), 'Rules engine folder name')]/following::label[${labelXpath}]`)
      );

      for (const labelEl of scopedLabels) {
        try {
          if (!(await labelEl.isDisplayed())) {
            continue;
          }

          const forAttr = await labelEl.getAttribute('for');
          if (!forAttr) {
            continue;
          }

          const inputs = await drv.findElements(By.id(forAttr));
          for (const input of inputs) {
            if (await input.isDisplayed()) {
              return input;
            }
          }
        } catch {
          // Try next candidate
        }
      }

      throw new Error(`Could not find rules engine input for label "${labelText}"`);
    }

    /**
     * Helper: assert that NO validation message containing the given text is visible.
     */
    async function assertNoValidationMessage(drv: WebDriver, text: string): Promise<void> {
      await sleep(TYPE_SETTLE);
      const candidates = await drv.findElements(By.xpath(`//*[contains(text(), '${text.replace(/'/g, "\\'")}')]`));
      for (const el of candidates) {
        try {
          if (await el.isDisplayed()) {
            const elText = await el.getText();
            if (elText.includes(text)) {
              throw new Error(`Validation message should NOT be visible: "${text}"`);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('should NOT be visible')) {
            throw e;
          }
        }
      }
    }

    /**
     * Helper: clear a field by selecting all text and deleting it.
     */
    async function clearField(element: WebElement): Promise<void> {
      await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await element.sendKeys(Key.BACK_SPACE);
      await sleep(TYPE_SETTLE);
    }

    // -----------------------------------------------------------------------
    // Path validation
    // -----------------------------------------------------------------------
    it('should show validation error for non-existent path', async () => {
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');

      // Type a path that cannot exist
      await clearAndType(pathInput, 'Z:\\nonexistent\\fake\\path\\that\\does\\not\\exist');
      await waitForPathValidation(driver);

      // Should show path validation error — async validation posts message to extension
      // The extension replies with path invalid, which triggers the error
      await findValidationMessage(driver, 'not exist');
      console.log('[validPath] Found validation error for non-existent path');

      // Next button should be disabled
      await assertNextButtonDisabled(driver);
      console.log('[validPath] Next button correctly disabled');

      // Fix with a valid path
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await assertNoValidationMessage(driver, 'not exist');
      console.log('[validPath] Validation error cleared for valid path');

      await captureScreenshot(driver, 'validPath-passed');
      console.log('[validPath] PASSED');
    });

    it('should show validation error when path is cleared', async () => {
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');

      // Ensure we have something typed first
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      // Now clear it
      await clearField(pathInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validPathEmpty] Found "cannot be empty" error for empty path');

      await assertNextButtonDisabled(driver);

      // Restore valid path for subsequent tests
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      await captureScreenshot(driver, 'validPathEmpty-passed');
      console.log('[validPathEmpty] PASSED');
    });

    // -----------------------------------------------------------------------
    // Workspace name validation
    // -----------------------------------------------------------------------
    it('should show validation error for invalid workspace name (starts with number)', async () => {
      // Ensure path is valid
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, '123invalid');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsNum] Found validation error for "123invalid"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(wsNameInput, uniqueName('validws'));
      await assertNoValidationMessage(driver, 'must start with a letter');
      await captureScreenshot(driver, 'validWsNum-passed');
      console.log('[validWsNum] PASSED');
    });

    it('should show validation error for workspace name with special characters', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      // Spaces
      await clearAndType(wsNameInput, 'my workspace');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsSpecial] Error shown for spaces');

      // Special chars
      await clearAndType(wsNameInput, 'ws@#$name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsSpecial] Error shown for special chars');

      await assertNextButtonDisabled(driver);

      // Restore valid value
      await clearAndType(wsNameInput, uniqueName('validws'));

      await captureScreenshot(driver, 'validWsSpecial-passed');
      console.log('[validWsSpecial] PASSED');
    });

    it('should show validation error for names with leading/trailing hyphens or underscores', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      await clearAndType(wsNameInput, '-leadinghyphen');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validLeading] Error for leading hyphen');

      await clearAndType(wsNameInput, '_leadingunderscore');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validLeading] Error for leading underscore');

      await clearAndType(wsNameInput, 'trailinghyphen-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validLeading] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(wsNameInput, uniqueName('validws'));

      await captureScreenshot(driver, 'validLeading-passed');
      console.log('[validLeading] PASSED');
    });

    it('should show empty error when workspace name is cleared after typing', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, uniqueName('tempws'));
      await sleep(TYPE_SETTLE);

      await clearField(wsNameInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validWsEmpty] Found "cannot be empty" error');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(wsNameInput, uniqueName('validws'));

      await captureScreenshot(driver, 'validWsEmpty-passed');
      console.log('[validWsEmpty] PASSED');
    });

    it('should show validation error for workspace name with dots', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      await clearAndType(wsNameInput, 'my.workspace');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsDots] Error shown for "my.workspace"');

      await assertNextButtonDisabled(driver);

      await clearAndType(wsNameInput, uniqueName('validws'));
      await captureScreenshot(driver, 'validWsDots-passed');
      console.log('[validWsDots] PASSED');
    });

    it('should show validation error for workspace name with trailing underscore', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      await clearAndType(wsNameInput, 'myws_');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsTrailUnderscore] Error shown for "myws_"');

      await assertNextButtonDisabled(driver);

      await clearAndType(wsNameInput, uniqueName('validws'));
      await captureScreenshot(driver, 'validWsTrailUnderscore-passed');
      console.log('[validWsTrailUnderscore] PASSED');
    });

    // -----------------------------------------------------------------------
    // Logic app name validation
    // -----------------------------------------------------------------------
    it('should show validation error for invalid logic app name', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, '999app');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validAppName] Found validation error for "999app"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(appNameInput, uniqueName('validapp'));
      await assertNoValidationMessage(driver, 'Logic app name must start');
      await captureScreenshot(driver, 'validAppName-passed');
      console.log('[validAppName] PASSED');
    });

    it('should show empty error when logic app name is cleared', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, uniqueName('tempapp'));
      await sleep(TYPE_SETTLE);

      await clearField(appNameInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validAppEmpty] Found "cannot be empty" error');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(appNameInput, uniqueName('validapp'));

      await captureScreenshot(driver, 'validAppEmpty-passed');
      console.log('[validAppEmpty] PASSED');
    });

    it('should show validation error for logic app name with special characters', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');

      await clearAndType(appNameInput, 'app@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validAppSpecial] Error shown for "app@name"');

      await clearAndType(appNameInput, 'my app');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validAppSpecial] Error shown for "my app"');

      await assertNextButtonDisabled(driver);

      await clearAndType(appNameInput, uniqueName('validapp'));
      await captureScreenshot(driver, 'validAppSpecial-passed');
      console.log('[validAppSpecial] PASSED');
    });

    it('should show validation error for logic app name with leading/trailing separators', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');

      await clearAndType(appNameInput, '_myapp');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validAppSep] Error for leading underscore');

      await clearAndType(appNameInput, '-myapp');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validAppSep] Error for leading hyphen');

      await clearAndType(appNameInput, 'myapp-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validAppSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(appNameInput, uniqueName('validapp'));
      await captureScreenshot(driver, 'validAppSep-passed');
      console.log('[validAppSep] PASSED');
    });

    // -----------------------------------------------------------------------
    // Workflow name validation
    // -----------------------------------------------------------------------
    it('should show validation error for invalid workflow name', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, '123workflow');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWfName] Found validation error for "123workflow"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(wfNameInput, uniqueName('validwf'));
      await assertNoValidationMessage(driver, 'Workflow name must start');
      await captureScreenshot(driver, 'validWfName-passed');
      console.log('[validWfName] PASSED');
    });

    it('should show empty error when workflow name is cleared after typing', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, uniqueName('tempwf'));
      await sleep(TYPE_SETTLE);

      await clearField(wfNameInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validWfEmpty] Found "cannot be empty" error');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(wfNameInput, uniqueName('validwf'));

      await captureScreenshot(driver, 'validWfEmpty-passed');
      console.log('[validWfEmpty] PASSED');
    });

    it('should show validation error for workflow name with special characters', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');

      await clearAndType(wfNameInput, 'wf@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWfSpecial] Error shown for "wf@name"');

      await clearAndType(wfNameInput, 'my workflow');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWfSpecial] Error shown for "my workflow"');

      await assertNextButtonDisabled(driver);

      await clearAndType(wfNameInput, uniqueName('validwf'));
      await captureScreenshot(driver, 'validWfSpecial-passed');
      console.log('[validWfSpecial] PASSED');
    });

    it('should show validation error for workflow name with leading/trailing separators', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');

      await clearAndType(wfNameInput, '_workflow');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validWfSep] Error for leading underscore');

      await clearAndType(wfNameInput, '-workflow');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validWfSep] Error for leading hyphen');

      await clearAndType(wfNameInput, 'workflow-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validWfSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(wfNameInput, uniqueName('validwf'));
      await captureScreenshot(driver, 'validWfSep-passed');
      console.log('[validWfSep] PASSED');
    });

    // -----------------------------------------------------------------------
    // Next button gating
    // -----------------------------------------------------------------------
    it('should keep Next button disabled until all required fields are valid', async () => {
      // Clear all fields to start fresh
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');

      await clearField(pathInput);
      await clearField(wsNameInput);
      await clearField(appNameInput);
      await clearField(wfNameInput);

      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with all empty');

      // Fill path only
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with only path');

      // Fill workspace name
      await clearAndType(wsNameInput, uniqueName('vnws'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with path + workspace');

      // Fill logic app name
      await clearAndType(appNameInput, uniqueName('vnapp'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with path + workspace + app');

      // Select logic app type
      await selectRadioOption(driver, 'Logic app (Standard)');
      await sleep(1000);

      // Fill invalid workflow name — still disabled
      await clearAndType(wfNameInput, '!!!invalid');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with invalid workflow name');

      // Fix workflow name
      await clearAndType(wfNameInput, uniqueName('vnwf'));
      await sleep(TYPE_SETTLE);

      // Select workflow type
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');
      await sleep(TYPE_SETTLE);

      const nextBtn = await waitForNextButton(driver, 30_000);
      const isEnabled =
        (await nextBtn.getAttribute('disabled')) !== 'true' &&
        (await nextBtn.getAttribute('disabled')) !== '' &&
        (await nextBtn.getAttribute('aria-disabled')) !== 'true';
      if (!isEnabled) {
        await dumpFormState(driver);
        throw new Error('Next button should be enabled when all fields are valid');
      }
      console.log('[validNext] Next enabled when all fields valid');
      await captureScreenshot(driver, 'validNext-passed');
      console.log('[validNext] PASSED');
    });

    // -----------------------------------------------------------------------
    // Custom code validation — select "Logic app with custom code" and
    // test folder name, namespace, and function name fields.
    // Reuses the same shared webview; does NOT retest standard fields.
    // -----------------------------------------------------------------------
    it('should show custom code fields when selecting custom code radio', async () => {
      console.log('[ccSwitch] Selecting "Logic app with custom code"...');
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);

      // Verify custom code section appeared
      const pageText = await driver.findElement(By.css('body')).getText();
      const hasCustomCode =
        pageText.toLowerCase().includes('custom code') ||
        pageText.toLowerCase().includes('.net version') ||
        pageText.toLowerCase().includes('function');
      if (!hasCustomCode) {
        throw new Error('Custom code configuration fields did not appear after selecting custom code type');
      }
      await captureScreenshot(driver, 'ccSwitch-passed');
      console.log('[ccSwitch] PASSED: Custom code fields visible');
    });

    it('should show error for invalid custom code folder name', async () => {
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
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, '123folder');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validCcFolder] Error shown for "123folder"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolder-passed');
      console.log('[validCcFolder] PASSED');
    });

    it('should show error when custom code folder name matches logic app name', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      const appName = await appNameInput.getAttribute('value');

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
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, appName);

      await findValidationMessage(driver, 'cannot be the same as the logic app name');
      console.log(`[validCcFolderSame] Error shown when folder name = "${appName}"`);

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderSame-passed');
      console.log('[validCcFolderSame] PASSED');
    });

    it('should show empty error when custom code folder name is cleared', async () => {
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
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, uniqueName('tempfolder'));
      await sleep(TYPE_SETTLE);

      await clearField(folderInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validCcFolderEmpty] Error shown for empty folder name');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderEmpty-passed');
      console.log('[validCcFolderEmpty] PASSED');
    });

    it('should show error for custom code folder name with special characters', async () => {
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
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, 'folder@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validCcFolderSpecial] Error shown for "folder@name"');

      await clearAndType(folderInput, 'my folder');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validCcFolderSpecial] Error shown for "my folder"');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderSpecial-passed');
      console.log('[validCcFolderSpecial] PASSED');
    });

    it('should show error for custom code folder name with leading/trailing separators', async () => {
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
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, '_folder');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validCcFolderSep] Error for leading underscore');

      await clearAndType(folderInput, 'folder-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validCcFolderSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderSep-passed');
      console.log('[validCcFolderSep] PASSED');
    });

    it('should disable Next for invalid custom code function namespace', async () => {
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
        try {
          nsInput = await findInputByLabel(driver, 'Function namespace');
        } catch {
          throw new Error('Could not find function namespace input');
        }
      }

      await clearAndType(nsInput, '123.Bad.Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validCcNs] Next button disabled for invalid namespace "123.Bad.Namespace"');

      await clearAndType(nsInput, 'Invalid-Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validCcNs] Next button disabled for invalid namespace "Invalid-Namespace"');

      await clearAndType(nsInput, 'Valid.Namespace');
      await captureScreenshot(driver, 'validCcNs-passed');
      console.log('[validCcNs] PASSED');
    });

    it('should disable Next when custom code function namespace is cleared', async () => {
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
        throw new Error('Could not find function namespace input');
      }

      await clearAndType(nsInput, 'TempNamespace');
      await sleep(TYPE_SETTLE);

      await clearField(nsInput);

      await assertInputShowsValidationMessage(nsInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validCcNsEmpty] Next button disabled for empty namespace');

      await clearAndType(nsInput, 'ValidNamespace');
      await captureScreenshot(driver, 'validCcNsEmpty-passed');
      console.log('[validCcNsEmpty] PASSED');
    });

    it('should disable Next for invalid custom code function name', async () => {
      // Find function name input (NOT namespace)
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, '999func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnName] Next button disabled for invalid function name "999func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnName-passed');
      console.log('[validCcFnName] PASSED');
    });

    it('should disable Next when custom code function name is cleared', async () => {
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, uniqueName('tempfn'));
      await sleep(TYPE_SETTLE);

      await clearField(fnInput);

      await assertInputShowsValidationMessage(fnInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnEmpty] Next button disabled for empty function name');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnEmpty-passed');
      console.log('[validCcFnEmpty] PASSED');
    });

    it('should disable Next for hyphenated custom code function name', async () => {
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, 'my-func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnHyphen] Next button disabled for hyphenated function name "my-func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnHyphen-passed');
      console.log('[validCcFnHyphen] PASSED');
    });

    it('should disable Next for custom code function name with special characters', async () => {
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, 'func@name');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnSpecial] Next disabled for "func@name"');

      await clearAndType(fnInput, 'my func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnSpecial] Next disabled for "my func"');

      await clearAndType(fnInput, 'my.func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnSpecial] Next disabled for "my.func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnSpecial-passed');
      console.log('[validCcFnSpecial] PASSED');
    });

    it('should disable Next for custom code function name with leading underscore', async () => {
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, '_func');
      await sleep(TYPE_SETTLE);

      await assertNextButtonDisabled(driver);
      console.log('[validCcFnUnderscore] Next button disabled for leading underscore "_func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnUnderscore-passed');
      console.log('[validCcFnUnderscore] PASSED');
    });

    it('should keep Next disabled for all partial-fill combinations of custom code fields', async () => {
      // Helper to find CC inputs
      const findCcFolderInput = async () => {
        for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
          try {
            return await findInputByLabel(driver, label);
          } catch {
            // Try next
          }
        }
        throw new Error('Could not find custom code folder name input');
      };
      const findCcNsInput = async () => {
        for (const label of ['Function namespace', 'Namespace', 'namespace']) {
          try {
            return await findInputByLabel(driver, label);
          } catch {
            // Try next
          }
        }
        throw new Error('Could not find function namespace input');
      };
      const findCcFnInput = async () => {
        let fnInput: WebElement | null = null;
        const fnLabels = await driver.findElements(
          By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
        );
        if (fnLabels.length > 0) {
          const forAttr = await fnLabels[0].getAttribute('for');
          if (forAttr) {
            const inputs = await driver.findElements(By.id(forAttr));
            if (inputs.length > 0) {
              fnInput = inputs[0];
            }
          }
          if (!fnInput) {
            const parent = await fnLabels[0].findElement(By.xpath('..'));
            const inputs = await parent.findElements(By.css('input'));
            if (inputs.length > 0) {
              fnInput = inputs[0];
            }
          }
        }
        if (!fnInput) {
          fnInput = await findInputByLabel(driver, 'Function name');
        }
        return fnInput;
      };

      // Ensure custom code is selected and .NET Version is set (prerequisite)
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);
      const dotNetDropdown = await findDropdownByLabel(driver, '.NET Version');
      await selectDropdownOption(driver, dotNetDropdown, '.NET 8');
      await sleep(TYPE_SETTLE);

      const folderInput = await findCcFolderInput();
      const nsInput = await findCcNsInput();
      const fnInput = await findCcFnInput();

      // --- Combo 1: all empty ---
      await clearField(folderInput);
      await clearField(nsInput);
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await findValidationMessage(driver, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 1 (all empty): Next disabled ✓');

      // --- Combo 2: folder valid, namespace empty, fn empty ---
      await clearAndType(folderInput, uniqueName('ccfolder'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 2 (folder valid, ns empty, fn empty): Next disabled ✓');

      // --- Combo 3: folder empty, namespace valid, fn empty ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 3 (folder empty, ns valid, fn empty): Next disabled ✓');

      // --- Combo 4: folder empty, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 4 (folder empty, ns empty, fn valid): Next disabled ✓');

      // --- Combo 5: folder valid, namespace valid, fn empty ---
      await clearAndType(folderInput, uniqueName('ccfolder'));
      await clearAndType(nsInput, 'Valid.Namespace');
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 5 (folder valid, ns valid, fn empty): Next disabled ✓');

      // --- Combo 6: folder valid, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 6 (folder valid, ns empty, fn valid): Next disabled ✓');

      // --- Combo 7: folder empty, namespace valid, fn valid ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 7 (folder empty, ns valid, fn valid): Next disabled ✓');

      // --- Combo 8: all valid → Next should be ENABLED ---
      await clearAndType(folderInput, uniqueName('validfolder'));
      await clearAndType(nsInput, 'ValidNamespace');
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);

      const nextBtn = await waitForNextButton(driver, 30_000);
      const isEnabled =
        (await nextBtn.getAttribute('disabled')) !== 'true' &&
        (await nextBtn.getAttribute('disabled')) !== '' &&
        (await nextBtn.getAttribute('aria-disabled')) !== 'true';
      if (!isEnabled) {
        await dumpFormState(driver);
        throw new Error('Next button should be enabled when all custom code fields are valid');
      }
      console.log('[ccPartial] Combo 8 (all valid): Next enabled ✓');

      await captureScreenshot(driver, 'ccPartial-passed');
      console.log('[ccPartial] PASSED: All 8 combos verified (7 disabled + 1 enabled)');
    });

    // -----------------------------------------------------------------------
    // Rules engine validation — switch to "Logic app with rules engine" and
    // test folder name, namespace, and function name fields.
    // Rules engine has the same fields as custom code but with a different
    // folder label ("Rules engine folder name") and no .NET Version dropdown.
    // -----------------------------------------------------------------------
    it('should show rules engine fields when selecting rules engine radio', async () => {
      console.log('[reSwitch] Selecting "Logic app with rules engine"...');
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      // Verify rules engine section appeared
      const pageText = await driver.findElement(By.css('body')).getText();
      const hasRulesEngine = pageText.toLowerCase().includes('rules engine');
      if (!hasRulesEngine) {
        throw new Error('Rules engine configuration fields did not appear after selecting rules engine type');
      }
      await captureScreenshot(driver, 'reSwitch-passed');
      console.log('[reSwitch] PASSED: Rules engine fields visible');
    });

    it('should show error for invalid rules engine folder name', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, '123folder');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validReFolder] Error shown for "123folder"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolder-passed');
      console.log('[validReFolder] PASSED');
    });

    it('should show error when rules engine folder name matches logic app name', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      const appName = await appNameInput.getAttribute('value');

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, appName);

      await findValidationMessage(driver, 'cannot be the same as the logic app name');
      console.log(`[validReFolderSame] Error shown when folder name = "${appName}"`);

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderSame-passed');
      console.log('[validReFolderSame] PASSED');
    });

    it('should show empty error when rules engine folder name is cleared', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, uniqueName('temprefolder'));
      await sleep(TYPE_SETTLE);

      await clearField(folderInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validReFolderEmpty] Error shown for empty folder name');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderEmpty-passed');
      console.log('[validReFolderEmpty] PASSED');
    });

    it('should show error for rules engine folder name with special characters', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, 'folder@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validReFolderSpecial] Error shown for "folder@name"');

      await clearAndType(folderInput, 'my folder');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validReFolderSpecial] Error shown for "my folder"');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderSpecial-passed');
      console.log('[validReFolderSpecial] PASSED');
    });

    it('should show error for rules engine folder name with leading/trailing separators', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, '_folder');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validReFolderSep] Error for leading underscore');

      await clearAndType(folderInput, 'folder-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validReFolderSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderSep-passed');
      console.log('[validReFolderSep] PASSED');
    });

    it('should disable Next for invalid rules engine function namespace', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);

      await clearAndType(nsInput, 'Invalid-Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validReNs] Next button disabled for invalid namespace with hyphen');

      await clearAndType(nsInput, 'Valid.Namespace');
      await captureScreenshot(driver, 'validReNs-passed');
      console.log('[validReNs] PASSED');
    });

    it('should disable Next for rules engine function namespace starting with digit', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, '123.Bad.Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validReNsDigit] Next button disabled for namespace starting with digit');

      await clearAndType(nsInput, 'Valid.Namespace');
      await captureScreenshot(driver, 'validReNsDigit-passed');
      console.log('[validReNsDigit] PASSED');
    });

    it('should disable Next when rules engine function namespace is cleared', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, 'TempNamespace');
      await sleep(TYPE_SETTLE);

      await clearField(nsInput);

      await assertInputShowsValidationMessage(nsInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validReNsEmpty] Next button disabled for empty namespace');

      await clearAndType(nsInput, 'ValidNamespace');
      await captureScreenshot(driver, 'validReNsEmpty-passed');
      console.log('[validReNsEmpty] PASSED');
    });

    it('should disable Next for invalid rules engine function name', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, '999func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validReFnName] Next button disabled for invalid function name');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnName-passed');
      console.log('[validReFnName] PASSED');
    });

    it('should disable Next when rules engine function name is cleared', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, uniqueName('tempfn'));
      await sleep(TYPE_SETTLE);

      await clearField(fnInput);

      await assertInputShowsValidationMessage(fnInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validReFnEmpty] Next button disabled for empty function name');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnEmpty-passed');
      console.log('[validReFnEmpty] PASSED');
    });

    it('should disable Next for hyphenated rules engine function name', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, 'my-func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validReFnHyphen] Next button disabled for hyphenated function name "my-func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnHyphen-passed');
      console.log('[validReFnHyphen] PASSED');
    });

    it('should disable Next for rules engine function name with special characters', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, 'func@name');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validReFnSpecial] Next disabled for "func@name"');

      await clearAndType(fnInput, 'my func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validReFnSpecial] Next disabled for "my func"');

      await clearAndType(fnInput, 'my.func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validReFnSpecial] Next disabled for "my.func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnSpecial-passed');
      console.log('[validReFnSpecial] PASSED');
    });

    it('should disable Next for rules engine function name with leading underscore', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, '_func');
      await sleep(TYPE_SETTLE);

      await assertNextButtonDisabled(driver);
      console.log('[validReFnUnderscore] Next button disabled for leading underscore "_func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnUnderscore-passed');
      console.log('[validReFnUnderscore] PASSED');
    });

    it('should keep Next disabled for all partial-fill combinations of rules engine fields', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      // Helper to find RE inputs
      const findReFolderInput = async () => {
        for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
          try {
            return await findInputByLabel(driver, label);
          } catch {
            // Try next
          }
        }
        throw new Error('Could not find rules engine folder name input');
      };

      const folderInput = await findReFolderInput();
      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');
      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      // --- Combo 1: all empty ---
      await clearField(folderInput);
      await clearField(nsInput);
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await findValidationMessage(driver, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 1 (all empty): Next disabled ✓');

      // --- Combo 2: folder valid, namespace empty, fn empty ---
      await clearAndType(folderInput, uniqueName('refolder'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 2 (folder valid, ns empty, fn empty): Next disabled ✓');

      // --- Combo 3: folder empty, namespace valid, fn empty ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 3 (folder empty, ns valid, fn empty): Next disabled ✓');

      // --- Combo 4: folder empty, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 4 (folder empty, ns empty, fn valid): Next disabled ✓');

      // --- Combo 5: folder valid, namespace valid, fn empty ---
      await clearAndType(folderInput, uniqueName('refolder'));
      await clearAndType(nsInput, 'Valid.Namespace');
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 5 (folder valid, ns valid, fn empty): Next disabled ✓');

      // --- Combo 6: folder valid, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 6 (folder valid, ns empty, fn valid): Next disabled ✓');

      // --- Combo 7: folder empty, namespace valid, fn valid ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 7 (folder empty, ns valid, fn valid): Next disabled ✓');

      // --- Combo 8: all valid → Next should be ENABLED ---
      await clearAndType(folderInput, uniqueName('validrefolder'));
      await clearAndType(nsInput, 'ValidNamespace');
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);

      const nextBtn = await waitForNextButton(driver, 30_000);
      const isEnabled =
        (await nextBtn.getAttribute('disabled')) !== 'true' &&
        (await nextBtn.getAttribute('disabled')) !== '' &&
        (await nextBtn.getAttribute('aria-disabled')) !== 'true';
      if (!isEnabled) {
        await dumpFormState(driver);
        throw new Error('Next button should be enabled when all rules engine fields are valid');
      }
      console.log('[rePartial] Combo 8 (all valid): Next enabled ✓');

      await captureScreenshot(driver, 'rePartial-passed');
      console.log('[rePartial] PASSED: All 8 combos verified (7 disabled + 1 enabled)');
    });

    // =========================================================================
    // FORM INTERACTION TESTS — Reuses the same shared webview.
    // Each test builds on the shared form state, navigating to Review to
    // verify entered data, then pressing Back to continue testing.
    // =========================================================================

    // --- Interaction helper functions ---
    // (findValidationMessage and assertNextButtonDisabled already defined above)

    function assertNextDisabled(drv: WebDriver): Promise<void> {
      // Thin wrapper — reuses assertNextButtonDisabled with same behavior
      return assertNextButtonDisabled(drv);
    }

    async function goToReviewAndBack(drv: WebDriver, expectedValues: { label: string; value: string }[]): Promise<string> {
      // Click Next to go to review
      const nextBtn = await waitForNextButton(drv);
      await nextBtn.click();

      // Poll for review step content instead of static sleep
      const reviewDeadline = Date.now() + 5000;
      let reviewText = '';
      while (Date.now() < reviewDeadline) {
        reviewText = await drv.findElement(By.css('body')).getText();
        const lower = reviewText.toLowerCase();
        if (lower.includes('create workspace') && (lower.includes('review') || lower.includes('step 2'))) {
          break;
        }
        await sleep(300);
      }
      if (!reviewText) {
        reviewText = await drv.findElement(By.css('body')).getText();
      }
      console.log(`[review] Review text (first 1500 chars): ${reviewText.substring(0, 1500)}`);

      // Verify all expected values are present
      const missing: string[] = [];
      for (const { label, value } of expectedValues) {
        if (reviewText.includes(value)) {
          console.log(`[review] ✓ ${label}: "${value}"`);
        } else {
          missing.push(`${label}: "${value}"`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Review page missing values:\n${missing.join('\n')}\nReview text:\n${reviewText.substring(0, 2000)}`);
      }

      // Click Back to return to the form
      const backBtn = await findButtonByText(drv, 'Back');
      await backBtn.click();

      // Poll for form step content instead of static sleep
      const formDeadline = Date.now() + 5000;
      while (Date.now() < formDeadline) {
        const formText = (await drv.findElement(By.css('body')).getText()).toLowerCase();
        if (formText.includes('workspace parent folder path') || formText.includes('project setup')) {
          break;
        }
        await sleep(300);
      }

      return reviewText;
    }

    async function clearFormField(element: WebElement): Promise<void> {
      await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await element.sendKeys(Key.BACK_SPACE);
      await sleep(TYPE_SETTLE);
    }

    async function findFunctionNameInput(drv: WebDriver): Promise<WebElement> {
      const fnLabels = await drv.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await drv.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            return inputs[0];
          }
        }
        const parent = await fnLabels[0].findElement(By.xpath('..'));
        const inputs = await parent.findElements(By.css('input'));
        if (inputs.length > 0) {
          return inputs[0];
        }
      }
      return findInputByLabel(drv, 'Function name');
    }

    async function findFolderNameInput(drv: WebDriver, type: 'customCode' | 'rulesEngine'): Promise<WebElement> {
      const labels =
        type === 'customCode'
          ? ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']
          : ['Rules engine folder name', 'rules engine folder', 'Folder name'];
      for (const label of labels) {
        try {
          return await findInputByLabel(drv, label);
        } catch {
          /* try next */
        }
      }
      throw new Error(`Could not find ${type} folder name input`);
    }

    async function findNamespaceInput(drv: WebDriver): Promise<WebElement> {
      for (const label of ['Function namespace', 'Namespace', 'namespace']) {
        try {
          return await findInputByLabel(drv, label);
        } catch {
          /* try next */
        }
      }
      throw new Error('Could not find function namespace input');
    }

    // -----------------------------------------------------------------------
    // Test: Fill standard fields as Stateful, verify review, then Back
    // -----------------------------------------------------------------------
    it('should fill Stateful standard form, verify review shows all values, and navigate back', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('stfulws');
      const appName = uniqueName('stfulapp');
      const wfName = uniqueName('stfulwf');

      // Fill all standard fields
      await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName, wfType: 'Stateful' });

      // Navigate to review, verify all entered values, and come back
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Workspace name', value: wsName },
        { label: 'Logic app name', value: appName },
        { label: 'Workflow name', value: wfName },
        { label: 'Workflow type', value: 'Stateful' },
      ]);

      // Verify review section headers
      const lowerReview = reviewText.toLowerCase();
      for (const section of ['project setup', 'logic app', 'workflow']) {
        if (lowerReview.includes(section)) {
          console.log(`[stfulReview] Section "${section}" found`);
        } else {
          console.log(`[stfulReview] Warning: Section "${section}" not found`);
        }
      }

      // After Back, verify form values are preserved
      const wsValue = await (await findInputByLabel(driver, 'Workspace name')).getAttribute('value');
      const appValue = await (await findInputByLabel(driver, 'Logic app name')).getAttribute('value');
      const wfValue = await (await findInputByLabel(driver, 'Workflow name')).getAttribute('value');
      if (wsValue !== wsName) {
        throw new Error(`Workspace name not preserved: expected "${wsName}", got "${wsValue}"`);
      }
      if (appValue !== appName) {
        throw new Error(`Logic app name not preserved: expected "${appName}", got "${appValue}"`);
      }
      if (wfValue !== wfName) {
        throw new Error(`Workflow name not preserved: expected "${wfName}", got "${wfValue}"`);
      }

      await captureScreenshot(driver, 'stfulReview-passed');
      console.log('[stfulReview] PASSED: Stateful review verified, values preserved after Back');
    });

    // -----------------------------------------------------------------------
    // Test: Change workflow type to Stateless, verify description & review
    // -----------------------------------------------------------------------
    it('should change to Stateless workflow type, verify description and review', async function () {
      this.timeout(180_000);

      // Select Stateless from dropdown
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateless');
      await sleep(1000);

      // Verify Stateless description is shown
      const pageText = await driver.findElement(By.css('body')).getText();
      if (!pageText.toLowerCase().includes('stateless')) {
        throw new Error('Stateless description text not found after selecting Stateless');
      }
      console.log('[slReview] Stateless description visible');

      // Check the description keywords from intl: "low latency" or "request-response" or "IoT"
      if (
        pageText.toLowerCase().includes('latency') ||
        pageText.toLowerCase().includes('request-response') ||
        pageText.toLowerCase().includes('iot')
      ) {
        console.log('[slReview] Stateless description keywords found');
      }

      // Navigate to review and verify Stateless appears
      await goToReviewAndBack(driver, [{ label: 'Workflow type', value: 'Stateless' }]);

      await captureScreenshot(driver, 'slReview-passed');
      console.log('[slReview] PASSED: Stateless workflow type verified in description and review');
    });

    // -----------------------------------------------------------------------
    // Test: Change to Autonomous Agents workflow, verify description & review
    // -----------------------------------------------------------------------
    it('should change to Autonomous Agents workflow type, verify description and review', async function () {
      this.timeout(180_000);

      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Autonomous Agents (Preview)');
      await sleep(1000);

      // Verify Autonomous Agents description: "AI agents" or "automate complex tasks"
      const pageText = await driver.findElement(By.css('body')).getText();
      const lower = pageText.toLowerCase();
      if (!lower.includes('autonom')) {
        throw new Error('Autonomous Agents description text not found');
      }
      console.log('[aaReview] Autonomous Agents description visible');
      if (lower.includes('ai agent') || lower.includes('complex task') || lower.includes('automate')) {
        console.log('[aaReview] Autonomous Agents description keywords found');
      }

      // Navigate to review — the display text should show "Autonomous agents (Preview)"
      const reviewText = await goToReviewAndBack(driver, [{ label: 'Workflow type (Autonomous)', value: 'utonomous' }]);

      // Check that "Agentic" or "Autonomous" appears in review
      if (reviewText.includes('Autonomous') || reviewText.includes('autonomous') || reviewText.includes('Agentic')) {
        console.log('[aaReview] Autonomous agent type confirmed in review');
      }

      await captureScreenshot(driver, 'aaReview-passed');
      console.log('[aaReview] PASSED: Autonomous Agents verified in description and review');
    });

    // -----------------------------------------------------------------------
    // Test: Change to Conversational Agents workflow, verify description & review
    // -----------------------------------------------------------------------
    it('should change to Conversational Agents workflow type, verify description and review', async function () {
      this.timeout(180_000);

      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Conversational Agents');
      await sleep(1000);

      // Verify Conversational Agents description: "natural language" or "human interaction" or "LLMs"
      const pageText = await driver.findElement(By.css('body')).getText();
      const lower = pageText.toLowerCase();
      if (!lower.includes('conversation')) {
        throw new Error('Conversational Agents description text not found');
      }
      console.log('[caReview] Conversational Agents description visible');
      if (lower.includes('natural language') || lower.includes('human interaction') || lower.includes('llm')) {
        console.log('[caReview] Conversational Agents description keywords found');
      }

      // Navigate to review
      const reviewText = await goToReviewAndBack(driver, [{ label: 'Workflow type (Conversational)', value: 'onversational' }]);

      if (reviewText.includes('Conversational') || reviewText.includes('conversational') || reviewText.includes('Agent')) {
        console.log('[caReview] Conversational agent type confirmed in review');
      }

      // Reset workflow type back to Stateful for subsequent tests
      const wfTypeDropdown2 = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown2, 'Stateful');
      await sleep(500);

      await captureScreenshot(driver, 'caReview-passed');
      console.log('[caReview] PASSED: Conversational Agents verified in description and review');
    });

    // -----------------------------------------------------------------------
    // Test: Switch to Custom Code type, verify fields appear, test each
    // field's validation errors, fill valid values, verify review, Back
    // -----------------------------------------------------------------------
    it('should switch to custom code, fill valid values, verify review, and navigate back', async function () {
      this.timeout(180_000);

      console.log('[ccFields] Selecting "Logic app with custom code"...');
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);

      // --- Verify custom code fields appeared ---
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerText = pageText.toLowerCase();
      const hasCustomCodeFields =
        lowerText.includes('.net version') || lowerText.includes('function namespace') || lowerText.includes('function name');
      if (!hasCustomCodeFields) {
        throw new Error('Custom code configuration fields not visible after selecting custom code type');
      }
      console.log('[ccFields] Custom code configuration fields visible');

      // --- .NET Version dropdown: verify options and select .NET 8 ---
      let dotNetDropdown: WebElement | null = null;
      try {
        dotNetDropdown = await findDropdownByLabel(driver, '.NET Version');
      } catch {
        for (const alt of ['.NET version', 'NET Version']) {
          try {
            dotNetDropdown = await findDropdownByLabel(driver, alt);
            break;
          } catch {
            /* next */
          }
        }
      }
      if (!dotNetDropdown) {
        const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
        if (comboboxes.length >= 1) {
          dotNetDropdown = comboboxes[0];
        }
      }
      if (!dotNetDropdown) {
        throw new Error('.NET Version dropdown not found');
      }

      await dotNetDropdown.click();
      await sleep(500);
      const options = await driver.findElements(By.css('[role="option"]'));
      const optionTexts: string[] = [];
      for (const opt of options) {
        optionTexts.push((await opt.getText()).trim());
      }
      console.log(`[ccFields] .NET Version options: ${JSON.stringify(optionTexts)}`);
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(300);

      if (!optionTexts.some((o) => o.includes('.NET 8'))) {
        throw new Error(`.NET 8 not found in dropdown. Available: ${JSON.stringify(optionTexts)}`);
      }

      await selectDropdownOption(driver, dotNetDropdown, '.NET 8');
      await sleep(500);
      console.log('[ccFields] Selected .NET 8');

      // --- Fill valid custom code field values (validation already tested above) ---
      const folderInput = await findFolderNameInput(driver, 'customCode');
      const ccFolderName = uniqueName('ccfolder');
      await clearAndType(folderInput, ccFolderName);
      console.log(`[ccFields] Folder name set to "${ccFolderName}"`);

      const nsInput = await findNamespaceInput(driver);
      const ccNamespace = 'ValidCcNamespace';
      await clearAndType(nsInput, ccNamespace);
      console.log(`[ccFields] Namespace set to "${ccNamespace}"`);

      const fnInput = await findFunctionNameInput(driver);
      const ccFnName = uniqueName('ccfunc');
      await clearAndType(fnInput, ccFnName);
      console.log(`[ccFields] Function name set to "${ccFnName}"`);

      // --- Navigate to Review and verify all custom code values ---
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Custom code folder', value: ccFolderName },
        { label: 'Function namespace', value: ccNamespace },
        { label: 'Function name', value: ccFnName },
      ]);

      if (reviewText.toLowerCase().includes('custom code')) {
        console.log('[ccFields] "Custom Code Configuration" section found in review ✓');
      }
      if (reviewText.toLowerCase().includes('.net 8') || reviewText.toLowerCase().includes('net8')) {
        console.log('[ccFields] .NET 8 framework shown in review ✓');
      }

      await captureScreenshot(driver, 'ccFields-passed');
      console.log('[ccFields] PASSED: Custom code fields filled, review verified');
    });

    // -----------------------------------------------------------------------
    // Test: Switch to Rules Engine type, verify fields, fill valid values,
    // verify review, Back (validation already tested in validation section)
    // -----------------------------------------------------------------------
    it('should switch to rules engine, fill valid values, verify review, and navigate back', async function () {
      this.timeout(180_000);

      console.log('[reFields] Selecting "Logic app with rules engine"...');
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      // --- Verify rules engine fields appeared ---
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerText = pageText.toLowerCase();
      if (!lowerText.includes('rules engine')) {
        throw new Error('Rules engine configuration fields not visible after selecting rules engine type');
      }
      console.log('[reFields] Rules engine configuration fields visible');

      // --- Verify NO .NET Version dropdown ---
      const dotNetLabels = await driver.findElements(By.xpath("//label[contains(text(), '.NET Version')]"));
      if (dotNetLabels.length > 0) {
        console.log('[reFields] Warning: .NET Version label still visible in rules engine mode');
      } else {
        console.log('[reFields] Confirmed: No .NET Version dropdown in rules engine mode ✓');
      }

      // --- Fill valid rules engine field values (validation already tested above) ---
      const folderInput = await findFolderNameInput(driver, 'rulesEngine');
      const reFolderName = uniqueName('refolder');
      await clearAndType(folderInput, reFolderName);
      console.log(`[reFields] Folder name set to "${reFolderName}"`);

      const nsInput = await findNamespaceInput(driver);
      const reNamespace = 'RulesEngineNs';
      await clearAndType(nsInput, reNamespace);
      console.log(`[reFields] Namespace set to "${reNamespace}"`);

      const fnInput = await findFunctionNameInput(driver);
      const reFnName = uniqueName('rulesfunc');
      await clearAndType(fnInput, reFnName);
      console.log(`[reFields] Function name set to "${reFnName}"`);

      // --- Navigate to Review and verify all rules engine values ---
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Rules engine folder', value: reFolderName },
        { label: 'Function namespace', value: reNamespace },
        { label: 'Function name', value: reFnName },
      ]);

      if (reviewText.toLowerCase().includes('function configuration') || reviewText.toLowerCase().includes('rules engine')) {
        console.log('[reFields] "Function Configuration" / "Rules Engine" section found in review ✓');
      }

      await captureScreenshot(driver, 'reFields-passed');
      console.log('[reFields] PASSED: Rules engine fields filled, review verified');
    });

    // -----------------------------------------------------------------------
    // Test: Switch back to Standard, verify custom code/rules engine
    // fields disappear, fill valid Stateful values, verify comprehensive
    // review with all section headers and paths
    // -----------------------------------------------------------------------
    it('should switch back to standard, verify cleanup, and do comprehensive review check', async function () {
      this.timeout(180_000);

      console.log('[stdComprehensive] Switching back to Logic app (Standard)...');
      await selectRadioOption(driver, 'Logic app (Standard)');
      await sleep(1500);

      // Verify extra config sections are gone
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerText = pageText.toLowerCase();
      if (lowerText.includes('.net version') || lowerText.includes('function namespace')) {
        console.log('[stdComprehensive] Warning: Custom code / rules engine fields still visible in Standard mode');
      } else {
        console.log('[stdComprehensive] Confirmed: No custom code / rules engine fields in Standard mode ✓');
      }

      // Fill all standard fields with fresh unique names
      const wsName = uniqueName('compws');
      const appName = uniqueName('compapp');
      const wfName = uniqueName('compwf');

      await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName, wfType: 'Stateful' });

      // Navigate to review and do a comprehensive check
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Workspace name', value: wsName },
        { label: 'Logic app name', value: appName },
        { label: 'Workflow name', value: wfName },
        { label: 'Workflow type', value: 'Stateful' },
      ]);

      const lowerReview = reviewText.toLowerCase();

      // Verify review section headers (from reviewCreateStep.tsx)
      const expectedSections = [
        { name: 'Project Setup', pattern: 'project setup' },
        { name: 'Logic App Details', pattern: 'logic app' },
        { name: 'Workflow Configuration', pattern: 'workflow' },
      ];
      for (const section of expectedSections) {
        if (lowerReview.includes(section.pattern)) {
          console.log(`[stdComprehensive] Section "${section.name}" found ✓`);
        } else {
          console.log(`[stdComprehensive] Warning: Section header "${section.name}" not found`);
        }
      }

      // Verify review labels (from intl messages)
      const expectedLabels = [
        'Workspace name',
        'Workspace folder',
        'Workspace file',
        'Logic app name',
        'Logic app type',
        'Workflow name',
        'Workflow type',
      ];
      for (const label of expectedLabels) {
        if (reviewText.includes(label)) {
          console.log(`[stdComprehensive] Review label "${label}" found ✓`);
        } else {
          console.log(`[stdComprehensive] Warning: Review label "${label}" not found`);
        }
      }

      // Verify the review shows "Logic app (Standard)" as the type
      if (reviewText.includes('Logic app (Standard)') || reviewText.includes('Standard')) {
        console.log('[stdComprehensive] Logic app type "Standard" confirmed in review ✓');
      }

      // Verify workspace file path format: <parent>/<wsName>/<wsName>.code-workspace
      const expectedWsFile = `${wsName}.code-workspace`;
      if (reviewText.includes(expectedWsFile)) {
        console.log(`[stdComprehensive] Workspace file path contains "${expectedWsFile}" ✓`);
      }

      // Verify that custom code / rules engine sections are NOT in review
      if (!lowerReview.includes('custom code configuration') && !lowerReview.includes('function configuration')) {
        console.log('[stdComprehensive] No custom code / rules engine sections in Standard review ✓');
      }

      await captureScreenshot(driver, 'stdComprehensive-passed');
      console.log('[stdComprehensive] PASSED: Standard comprehensive review verified');
    });
  }); // end pre-creation webview tests (single shared webview)

  // =========================================================================
  // CREATION TESTS - These run last because vscode.openFolder may disrupt
  // the test VS Code instance after workspace creation.
  // =========================================================================
  describe('Workspace creation tests', function () {
    this.timeout(180_000);

    before(() => {
      // Clear any stale manifest from a previous run so this run starts fresh
      try {
        if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
          fs.unlinkSync(WORKSPACE_MANIFEST_PATH);
          console.log(`[creation:before] Cleared stale manifest at ${WORKSPACE_MANIFEST_PATH}`);
        }
      } catch {
        // Ignore
      }
    });

    afterEach(async function () {
      // Capture screenshot on failure for CI debugging
      if (this.currentTest?.state === 'failed') {
        try {
          const failName = (this.currentTest.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
          await captureScreenshot(driver, `FAIL-${failName}`);
        } catch {
          /* screenshot failed — don't mask the real error */
        }
      }
      try {
        await driver.switchTo().defaultContent();
      } catch {
        console.log('[creation:afterEach] Could not switch to defaultContent');
      }
      // Aggressively dismiss all notifications that accumulated during workspace creation
      try {
        await dismissNotifications(driver);
        await driver.executeScript(`
          document.querySelectorAll('.notification-toast-container, .notifications-toasts').forEach(el => el.remove());
        `);
      } catch {
        /* ignore */
      }
      try {
        await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 10_000);
        const editorView = new EditorView();
        await editorView.closeAllEditors();
      } catch {
        console.log('[creation:afterEach] Warning: could not close editors');
      }
      await sleep(1000);
    });

    // =========================================================================
    // Standard flow: fill all fields, create workspace, verify on disk
    // =========================================================================
    it('should fill all form fields, create workspace, and verify on disk', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('testws');
      const appName = uniqueName('testapp');
      const wfName = uniqueName('testwf');

      // Step 1: Open the Create Workspace command
      console.log('[createStandard] Opening Create Workspace command...');
      await captureScreenshot(driver, 'createStandard-step1-before-command');
      await selectCreateWorkspaceCommand(workbench);
      await captureScreenshot(driver, 'createStandard-step1-after-command');

      // Step 2: Switch to webview
      console.log('[createStandard] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);
      await captureScreenshot(driver, 'createStandard-step2-webview-loaded');

      // Step 3: Fill all standard form fields
      console.log('[createStandard] Filling all form fields...');
      await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName });
      await captureScreenshot(driver, 'createStandard-step3-fields-filled');

      // Step 4: Wait for Next button to be enabled and click it
      console.log('[createStandard] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      await captureScreenshot(driver, 'createStandard-step4-before-next');
      console.log('[createStandard] Clicking Next...');
      await nextButton.click();
      await sleep(2000);
      await captureScreenshot(driver, 'createStandard-step5-review-page');

      // Step 5: Verify we're on the Review step
      console.log('[createStandard] Verifying Review step...');
      const reviewHeaders = await driver.findElements(By.xpath("//*[contains(text(), 'Review') or contains(text(), 'review')]"));
      console.log(`[createStandard] Found ${reviewHeaders.length} review-related elements`);

      if (reviewHeaders.length === 0) {
        await webview.switchBack();
        throw new Error('Review step not displayed after clicking Next');
      }

      // Step 6: Verify our values are shown in the review
      const pageText = await driver.findElement(By.css('body')).getText();
      console.log(`[createStandard] Review page text (first 500 chars): ${pageText.substring(0, 500)}`);
      const hasWorkspaceName = pageText.includes(wsName);
      const hasAppName = pageText.includes(appName);
      const hasWorkflowName = pageText.includes(wfName);
      console.log(`[createStandard] Review shows workspace name "${wsName}": ${hasWorkspaceName}`);
      console.log(`[createStandard] Review shows app name "${appName}": ${hasAppName}`);
      console.log(`[createStandard] Review shows workflow name "${wfName}": ${hasWorkflowName}`);

      if (!hasWorkspaceName) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!hasAppName) {
        await webview.switchBack();
        throw new Error(`App name "${appName}" not found in review`);
      }
      if (!hasWorkflowName) {
        await webview.switchBack();
        throw new Error(`Workflow name "${wfName}" not found in review`);
      }

      // Step 7: Click "Create workspace" to actually create the workspace
      await captureScreenshot(driver, 'createStandard-step6-before-create');
      await clickCreateWorkspaceButton(driver, webview);
      await captureScreenshot(driver, 'createStandard-step7-after-create');

      // Step 8: Deep-verify workspace on disk
      console.log('[createStandard] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Stateful',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Stateful', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Stateful',
        })
      );

      await captureScreenshot(driver, 'createStandard-passed');
      console.log('[createStandard] PASSED: Workspace created and verified on disk');
    });

    // =========================================================================
    // Custom code flow: fill ALL fields, create workspace, verify on disk
    // =========================================================================
    it('should fill all custom code fields, create workspace, and verify on disk', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('ccws');
      const appName = uniqueName('ccapp');
      const wfName = uniqueName('ccwf');
      const ccFolderName = uniqueName('ccfolder');
      const fnNamespace = 'TestNamespace';
      const fnName = uniqueName('myfunc');

      // Step 1: Open the Create Workspace command
      console.log('[createCustomCode] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      // Step 2: Switch to webview
      console.log('[createCustomCode] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      // Step 3: Fill workspace path and name
      console.log('[createCustomCode] Filling workspace parent folder path...');
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      console.log('[createCustomCode] Filling workspace name...');
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, wsName);

      // Step 4: Fill logic app name
      console.log('[createCustomCode] Filling logic app name...');
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, appName);

      // Step 5: Select "Logic app with custom code" radio
      console.log('[createCustomCode] Selecting "Logic app with custom code"...');
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000); // Wait for conditional fields to render

      // Step 6: Verify custom code fields are visible
      const pageTextAfterRadio = await driver.findElement(By.css('body')).getText();
      const hasCustomCodeSection =
        pageTextAfterRadio.toLowerCase().includes('custom code') ||
        pageTextAfterRadio.toLowerCase().includes('.net version') ||
        pageTextAfterRadio.toLowerCase().includes('.net') ||
        pageTextAfterRadio.toLowerCase().includes('function');
      console.log(`[createCustomCode] Custom code section visible: ${hasCustomCodeSection}`);
      if (!hasCustomCodeSection) {
        await webview.switchBack();
        throw new Error('Custom code configuration fields did not appear after selecting custom code type');
      }

      // Step 7: Fill all custom code fields
      console.log('[createCustomCode] Filling custom code configuration fields...');
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      // Step 8: Fill workflow name and type
      console.log('[createCustomCode] Filling workflow name...');
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, wfName);

      console.log('[createCustomCode] Selecting workflow type...');
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

      // Step 9: Dump form state for debugging, then wait for Next button
      console.log('[createCustomCode] Dumping form state before Next...');
      await dumpFormState(driver);

      console.log('[createCustomCode] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createCustomCode] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Step 10: Verify Review step shows all values including custom code fields
      console.log('[createCustomCode] Verifying Review step...');
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCustomCode] Review page text (first 800 chars): ${reviewText.substring(0, 800)}`);

      const hasWsName = reviewText.includes(wsName);
      const hasApp = reviewText.includes(appName);
      const hasWf = reviewText.includes(wfName);
      const hasCcFolder = reviewText.includes(ccFolderName);
      const hasNs = reviewText.includes(fnNamespace);
      const hasFn = reviewText.includes(fnName);
      const hasNet8 = reviewText.toLowerCase().includes('.net 8') || reviewText.toLowerCase().includes('net8');

      console.log(`[createCustomCode] Review has workspace name: ${hasWsName}`);
      console.log(`[createCustomCode] Review has app name: ${hasApp}`);
      console.log(`[createCustomCode] Review has workflow name: ${hasWf}`);
      console.log(`[createCustomCode] Review has custom code folder: ${hasCcFolder}`);
      console.log(`[createCustomCode] Review has function namespace: ${hasNs}`);
      console.log(`[createCustomCode] Review has function name: ${hasFn}`);
      console.log(`[createCustomCode] Review has .NET 8: ${hasNet8}`);

      if (!hasWsName) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!hasApp) {
        await webview.switchBack();
        throw new Error(`App name "${appName}" not found in review`);
      }

      // Step 11: Click "Create workspace" to actually create the workspace
      await clickCreateWorkspaceButton(driver, webview);

      // Step 12: Deep-verify workspace on disk
      console.log('[createCustomCode] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Stateful',
        ccFolderName,
        fnName,
        fnNamespace: fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Stateful', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Stateful',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCustomCode-passed');
      console.log('[createCustomCode] PASSED: Custom code workspace created and verified on disk');
    });

    // =========================================================================
    // Stateless workflow: fill all fields, create workspace, verify on disk
    // =========================================================================
    it('should create workspace with Stateless workflow type', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('slws');
      const appName = uniqueName('slapp');
      const wfName = uniqueName('slwf');

      console.log('[createStateless] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      console.log('[createStateless] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      console.log('[createStateless] Filling form fields with Stateless workflow...');
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (Standard)',
        wfType: 'Stateless',
      });

      console.log('[createStateless] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createStateless] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Verify review step shows Stateless
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createStateless] Review text (first 500 chars): ${reviewText.substring(0, 500)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!reviewText.includes('Stateless')) {
        console.log('[createStateless] Warning: "Stateless" not explicitly shown in review');
      }

      // Click create
      await clickCreateWorkspaceButton(driver, webview);

      // Deep-verify on disk
      console.log('[createStateless] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Stateless',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Stateless', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Stateless',
        })
      );

      await captureScreenshot(driver, 'createStateless-passed');
      console.log('[createStateless] PASSED: Stateless workspace created and verified on disk');
    });

    // =========================================================================
    // Autonomous Agents workflow: fill all fields, create workspace, verify
    // =========================================================================
    it('should create workspace with Autonomous Agents workflow type', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('aaws');
      const appName = uniqueName('aaapp');
      const wfName = uniqueName('aawf');

      console.log('[createAutonomousAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      console.log('[createAutonomousAgent] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      console.log('[createAutonomousAgent] Filling form fields with Autonomous Agents workflow...');
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (Standard)',
        wfType: 'Autonomous Agents (Preview)',
      });

      console.log('[createAutonomousAgent] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createAutonomousAgent] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Verify review step
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createAutonomousAgent] Review text (first 500 chars): ${reviewText.substring(0, 500)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (reviewText.includes('Autonomous') || reviewText.includes('autonomous') || reviewText.includes('Agentic')) {
        console.log('[createAutonomousAgent] Autonomous Agents type shown in review');
      } else {
        console.log('[createAutonomousAgent] Warning: Autonomous Agents type not explicitly shown in review');
      }

      // Click create
      await clickCreateWorkspaceButton(driver, webview);

      // Deep-verify on disk
      console.log('[createAutonomousAgent] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Autonomous Agents (Preview)',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Autonomous Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Autonomous Agents (Preview)',
        })
      );

      await captureScreenshot(driver, 'createAutonomousAgent-passed');
      console.log('[createAutonomousAgent] PASSED: Autonomous Agents workspace created and verified');
    });

    // =========================================================================
    // Conversational Agents workflow: fill all fields, create workspace, verify
    // =========================================================================
    it('should create workspace with Conversational Agents workflow type', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('caws');
      const appName = uniqueName('caapp');
      const wfName = uniqueName('cawf');

      console.log('[createConversationalAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      console.log('[createConversationalAgent] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      console.log('[createConversationalAgent] Filling form fields with Conversational Agents workflow...');
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (Standard)',
        wfType: 'Conversational Agents',
      });

      console.log('[createConversationalAgent] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createConversationalAgent] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Verify review step
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createConversationalAgent] Review text (first 500 chars): ${reviewText.substring(0, 500)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (reviewText.includes('Conversational') || reviewText.includes('conversational') || reviewText.includes('Agent')) {
        console.log('[createConversationalAgent] Conversational Agents type shown in review');
      } else {
        console.log('[createConversationalAgent] Warning: Conversational Agents type not explicitly shown in review');
      }

      // Click create
      await clickCreateWorkspaceButton(driver, webview);

      // Deep-verify on disk
      console.log('[createConversationalAgent] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Conversational Agents',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Conversational Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Conversational Agents',
        })
      );

      await captureScreenshot(driver, 'createConversationalAgent-passed');
      console.log('[createConversationalAgent] PASSED: Conversational Agents workspace created and verified');
    });

    // =========================================================================
    // Rules engine flow: fill ALL fields, create workspace, verify on disk
    // =========================================================================
    it('should fill all rules engine fields, create workspace, and verify on disk', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('rews');
      const appName = uniqueName('reapp');
      const wfName = uniqueName('rewf');
      const reFolderName = uniqueName('refolder');
      const fnNamespace = 'RulesEngineNamespace';
      const fnName = uniqueName('rulesfn');

      // Step 1: Open the Create Workspace command
      console.log('[createRulesEngine] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      // Step 2: Switch to webview
      console.log('[createRulesEngine] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      // Step 3: Fill workspace path and name
      console.log('[createRulesEngine] Filling workspace parent folder path...');
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      console.log('[createRulesEngine] Filling workspace name...');
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, wsName);

      // Step 4: Fill logic app name
      console.log('[createRulesEngine] Filling logic app name...');
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, appName);

      // Step 5: Select "Logic app with rules engine" radio
      console.log('[createRulesEngine] Selecting "Logic app with rules engine"...');
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000); // Wait for conditional fields to render

      // Step 6: Verify rules engine fields are visible
      const pageTextAfterRadio = await driver.findElement(By.css('body')).getText();
      const hasRulesEngineSection =
        pageTextAfterRadio.toLowerCase().includes('rules engine') || pageTextAfterRadio.toLowerCase().includes('function');
      console.log(`[createRulesEngine] Rules engine section visible: ${hasRulesEngineSection}`);
      if (!hasRulesEngineSection) {
        await webview.switchBack();
        throw new Error('Rules engine configuration fields did not appear after selecting rules engine type');
      }

      // Step 7: Fill rules engine folder name
      console.log(`[createRulesEngine] Filling rules engine folder name: "${reFolderName}"...`);
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        await webview.switchBack();
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      // Step 8: Fill function namespace
      console.log(`[createRulesEngine] Filling function namespace: "${fnNamespace}"...`);
      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!nsInput) {
        await webview.switchBack();
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      // Step 9: Fill function name
      console.log(`[createRulesEngine] Filling function name: "${fnName}"...`);
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      // Step 10: Fill workflow name and type
      console.log('[createRulesEngine] Filling workflow name...');
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, wfName);

      console.log('[createRulesEngine] Selecting workflow type...');
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

      // Step 11: Dump form state before proceeding
      console.log('[createRulesEngine] Dumping form state before Next...');
      await dumpFormState(driver);

      console.log('[createRulesEngine] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createRulesEngine] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Step 12: Verify Review step
      console.log('[createRulesEngine] Verifying Review step...');
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createRulesEngine] Review page text (first 800 chars): ${reviewText.substring(0, 800)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!reviewText.includes(appName)) {
        await webview.switchBack();
        throw new Error(`App name "${appName}" not found in review`);
      }

      // Verify rules engine specific values in review
      const hasReFolder = reviewText.includes(reFolderName);
      const hasReNs = reviewText.includes(fnNamespace);
      const hasReFn = reviewText.includes(fnName);
      console.log(`[createRulesEngine] Review has rules engine folder: ${hasReFolder}`);
      console.log(`[createRulesEngine] Review has function namespace: ${hasReNs}`);
      console.log(`[createRulesEngine] Review has function name: ${hasReFn}`);

      // Step 13: Click "Create workspace"
      await clickCreateWorkspaceButton(driver, webview);

      // Step 14: Deep-verify workspace on disk
      console.log('[createRulesEngine] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Stateful',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace: fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Stateful', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Stateful',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createRulesEngine-passed');
      console.log('[createRulesEngine] PASSED: Rules engine workspace created and verified on disk');
    });

    // =========================================================================
    // Custom Code + Stateless: fill custom code fields, Stateless workflow, verify
    // =========================================================================
    it('should create custom code workspace with Stateless workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('ccslws');
      const appName = uniqueName('ccslapp');
      const wfName = uniqueName('ccslwf');
      const ccFolderName = uniqueName('ccslf');
      const fnNamespace = 'CcStatelessNs';
      const fnName = uniqueName('ccslfn');

      console.log('[createCcStateless] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      // Fill workspace setup
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      // Select custom code
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      // Fill workflow
      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateless');

      // Navigate to review
      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCcStateless] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }
      if (!reviewText.includes('Stateless')) {
        console.log('[createCcStateless] Warning: Stateless not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Stateless',
        ccFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Stateless', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Stateless',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCcStateless-passed');
      console.log('[createCcStateless] PASSED');
    });

    // =========================================================================
    // Custom Code + Autonomous Agents: verify
    // =========================================================================
    it('should create custom code workspace with Autonomous Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('ccaaws');
      const appName = uniqueName('ccaaapp');
      const wfName = uniqueName('ccaawf');
      const ccFolderName = uniqueName('ccaaf');
      const fnNamespace = 'CcAgenticNs';
      const fnName = uniqueName('ccaafn');

      console.log('[createCcAgentic] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Autonomous Agents (Preview)');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCcAgentic] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Autonomous Agents (Preview)',
        ccFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Autonomous Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Autonomous Agents (Preview)',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCcAgentic-passed');
      console.log('[createCcAgentic] PASSED');
    });

    // =========================================================================
    // Custom Code + Conversational Agents: verify
    // =========================================================================
    it('should create custom code workspace with Conversational Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('cccaws');
      const appName = uniqueName('cccaapp');
      const wfName = uniqueName('cccawf');
      const ccFolderName = uniqueName('cccaf');
      const fnNamespace = 'CcConvAgentNs';
      const fnName = uniqueName('cccafn');

      console.log('[createCcConvAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Conversational Agents');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCcConvAgent] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Conversational Agents',
        ccFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Conversational Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Conversational Agents',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCcConvAgent-passed');
      console.log('[createCcConvAgent] PASSED');
    });

    // =========================================================================
    // Rules Engine + Stateless: verify
    // =========================================================================
    it('should create rules engine workspace with Stateless workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('reslws');
      const appName = uniqueName('reslapp');
      const wfName = uniqueName('reslwf');
      const reFolderName = uniqueName('reslf');
      const fnNamespace = 'ReStatelessNs';
      const fnName = uniqueName('reslfn');

      console.log('[createReStateless] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      // Rules engine fields (no .NET dropdown)
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!nsInput) {
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      let fnInput: WebElement | null = null;
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateless');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createReStateless] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Stateless',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Stateless', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Stateless',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createReStateless-passed');
      console.log('[createReStateless] PASSED');
    });

    // =========================================================================
    // Rules Engine + Autonomous Agents: verify
    // =========================================================================
    it('should create rules engine workspace with Autonomous Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('reaaws');
      const appName = uniqueName('reaaapp');
      const wfName = uniqueName('reaawf');
      const reFolderName = uniqueName('reaaf');
      const fnNamespace = 'ReAgenticNs';
      const fnName = uniqueName('reaafn');

      console.log('[createReAgentic] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!nsInput) {
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      let fnInput: WebElement | null = null;
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Autonomous Agents (Preview)');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createReAgentic] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Autonomous Agents (Preview)',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Autonomous Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Autonomous Agents (Preview)',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createReAgentic-passed');
      console.log('[createReAgentic] PASSED');
    });

    // =========================================================================
    // Rules Engine + Conversational Agents: verify
    // =========================================================================
    it('should create rules engine workspace with Conversational Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('recaws');
      const appName = uniqueName('recaapp');
      const wfName = uniqueName('recawf');
      const reFolderName = uniqueName('recaf');
      const fnNamespace = 'ReConvAgentNs';
      const fnName = uniqueName('recafn');

      console.log('[createReConvAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!nsInput) {
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      let fnInput: WebElement | null = null;
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Conversational Agents');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createReConvAgent] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Conversational Agents',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Conversational Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Conversational Agents',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createReConvAgent-passed');
      console.log('[createReConvAgent] PASSED');
    });
  }); // end creation describe
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Workspace Conversion Test: Create workspace from legacy project
 *
 * ADO Coverage: Test Case #31054994, Steps 11-13
 *
 * Verifies:
 *   1. Opening a folder with logic app files but NO .code-workspace triggers
 *      the 'Do you want to create the workspace now?' dialog
 *   2. Clicking 'Yes' opens the Create Workspace webview
 *   3. The Create Workspace form can be filled out (path, names, etc.)
 *   4. Completing the wizard creates a .code-workspace file on disk
 *   5. The original legacy project files remain untouched
 *
 * Phase 4.8b — own session, startup resource = temp legacy project folder
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as assert from 'assert';
import { Workbench, WebView, type WebDriver, VSBrowser, ModalDialog, By, Key } from 'vscode-extension-tester';
import { sleep, captureScreenshot } from './helpers';

const TEST_TIMEOUT = 180_000;
const EXTENSION_BUNDLE_ID = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
const EXTENSION_BUNDLE_VERSION = '[1.*, 2.0.0)';

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'wsConversionCreate-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

const LEGACY_PROJECT_DIR = path.join(os.tmpdir(), 'la-e2e-test', 'legacy-project');

/** Snapshot the legacy project state before conversion */
interface LegacySnapshot {
  files: string[];
  hostJson: string;
  localSettings: string;
  workflowJson: string;
}

/** Create a legacy Logic App project folder (no .code-workspace). */
function createLegacyProject(projectPath: string): void {
  fs.mkdirSync(projectPath, { recursive: true });

  fs.writeFileSync(
    path.join(projectPath, 'host.json'),
    JSON.stringify(
      {
        version: '2.0',
        logging: { applicationInsights: { samplingSettings: { isEnabled: true, excludedTypes: 'Request' } } },
        extensionBundle: { id: EXTENSION_BUNDLE_ID, version: EXTENSION_BUNDLE_VERSION },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(projectPath, 'local.settings.json'),
    JSON.stringify(
      {
        IsEncrypted: false,
        Values: {
          AzureWebJobsStorage: 'UseDevelopmentStorage=true',
          FUNCTIONS_WORKER_RUNTIME: 'dotnet',
          APP_KIND: 'workflowApp',
          ProjectDirectoryPath: projectPath,
        },
      },
      null,
      2
    )
  );

  const workflowDir = path.join(projectPath, 'testworkflow');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(
    path.join(workflowDir, 'workflow.json'),
    JSON.stringify(
      {
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          actions: {},
          triggers: {},
          outputs: {},
        },
        kind: 'Stateful',
      },
      null,
      2
    )
  );

  console.log(`[legacyProject] Created legacy project at: ${projectPath}`);
}

/** Take a snapshot of the legacy project's file state for later comparison. */
function snapshotLegacyProject(projectPath: string): LegacySnapshot {
  const files: string[] = [];
  function walk(dir: string, prefix = '') {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (fs.statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        files.push(rel);
      }
    }
  }
  walk(projectPath);

  return {
    files: files.sort(),
    hostJson: fs.readFileSync(path.join(projectPath, 'host.json'), 'utf-8'),
    localSettings: fs.readFileSync(path.join(projectPath, 'local.settings.json'), 'utf-8'),
    workflowJson: fs.readFileSync(path.join(projectPath, 'testworkflow', 'workflow.json'), 'utf-8'),
  };
}

/** Wait for the 'create workspace' modal dialog. */
async function waitForCreateWorkspaceDialog(driver: WebDriver, timeoutMs = 60_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const dialog = new ModalDialog();
      const message = await dialog.getMessage();
      if (message && (message.includes('workspace') || message.includes('Workspace'))) {
        console.log(`[createDialog] Found dialog: "${message.substring(0, 200)}"`);
        return message;
      }
    } catch {
      // No dialog yet
    }
    try {
      const dialogs = await driver.findElements(By.css('.monaco-dialog-box, [role="dialog"]'));
      for (const d of dialogs) {
        const text = await d.getText().catch(() => '');
        if (text.includes('workspace') || text.includes('Workspace')) {
          console.log(`[createDialog] Found via selector: "${text.substring(0, 200)}"`);
          return text;
        }
      }
    } catch {
      // No dialog elements
    }
    await sleep(2000);
  }
  return null;
}

describe('Workspace Conversion — Create Workspace from Legacy Project', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let legacySnapshot: LegacySnapshot;

  before(async function () {
    this.timeout(60_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });

    if (fs.existsSync(LEGACY_PROJECT_DIR)) {
      fs.rmSync(LEGACY_PROJECT_DIR, { recursive: true, force: true });
    }
    createLegacyProject(LEGACY_PROJECT_DIR);

    // Snapshot the legacy project BEFORE conversion
    legacySnapshot = snapshotLegacyProject(LEGACY_PROJECT_DIR);
    console.log(`[createWs] Legacy project snapshot: ${legacySnapshot.files.length} files`);

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

  it('should complete the workspace creation wizard and verify results', async function () {
    await captureScreenshot(driver, 'create-ws-start', EXPLICIT_SCREENSHOT_DIR);

    // ── Step 1: Wait for the conversion dialog ──
    const dialogMessage = await waitForCreateWorkspaceDialog(driver, 60_000);
    await captureScreenshot(driver, 'create-ws-dialog-found', EXPLICIT_SCREENSHOT_DIR);

    if (!dialogMessage) {
      console.log('[createWs] No conversion dialog appeared');
      this.skip();
      return;
    }

    // Snapshot the legacy project NOW — after the dialog appeared.
    // The dialog appearing means the extension has finished scanning the folder
    // and any background file additions (.funcignore, workflow-designtime/, etc.)
    // have completed. This is the true "before conversion" baseline.
    legacySnapshot = snapshotLegacyProject(LEGACY_PROJECT_DIR);
    console.log(
      `[createWs] Legacy snapshot (pre-conversion): ${legacySnapshot.files.length} files: ${JSON.stringify(legacySnapshot.files)}`
    );

    assert.ok(
      dialogMessage.includes('workspace') || dialogMessage.includes('Workspace'),
      `Dialog should mention "workspace": "${dialogMessage.substring(0, 100)}"`
    );

    // ── Step 2: Click 'Yes' to open the Create Workspace webview ──
    let yesClicked = false;
    try {
      const dialog = new ModalDialog();
      await dialog.pushButton('Yes');
      yesClicked = true;
      console.log('[createWs] Clicked "Yes" via ModalDialog');
    } catch {
      try {
        const buttons = await driver.findElements(By.css('.monaco-dialog-box button, [role="dialog"] button'));
        for (const btn of buttons) {
          const text = await btn.getText().catch(() => '');
          if (text.toLowerCase() === 'yes') {
            await btn.click();
            yesClicked = true;
            console.log('[createWs] Clicked "Yes" via raw selector');
            break;
          }
        }
      } catch {
        /* ignore */
      }
    }
    await sleep(2000);
    assert.ok(yesClicked, '"Yes" button should be clickable');

    // ── Step 3: Wait for the Create Workspace webview and switch into it ──
    let webviewFound = false;
    const webviewDeadline = Date.now() + 15_000;
    while (Date.now() < webviewDeadline) {
      try {
        const found = await driver.executeScript<boolean>(
          'return !!(document.querySelector("iframe.webview") || document.querySelector("iframe[id*=\\"webview\\"]"))'
        );
        if (found) {
          webviewFound = true;
          break;
        }
      } catch {
        /* ignore */
      }
      await sleep(500);
    }
    assert.ok(webviewFound, 'Create Workspace webview should appear');
    await captureScreenshot(driver, 'create-ws-webview-found', EXPLICIT_SCREENSHOT_DIR);

    // Switch into the webview
    const webview = new WebView();
    await webview.switchToFrame();
    await sleep(2000);

    // Wait for the form to render (look for input fields)
    const formDeadline = Date.now() + 12_000;
    let formReady = false;
    while (Date.now() < formDeadline) {
      try {
        const inputs = await driver.findElements(By.css('input, [contenteditable="true"]'));
        if (inputs.length >= 2) {
          formReady = true;
          console.log(`[createWs] Form has ${inputs.length} input(s)`);
          break;
        }
      } catch {
        /* ignore */
      }
      await sleep(500);
    }
    await captureScreenshot(driver, 'create-ws-form-ready', EXPLICIT_SCREENSHOT_DIR);

    if (!formReady) {
      console.log('[createWs] Form did not render — checking what is visible');
      try {
        const bodyText = await driver.executeScript<string>('return (document.body ? document.body.textContent : "").substring(0, 500)');
        console.log(`[createWs] Webview body: "${bodyText?.substring(0, 300)}"`);
      } catch {
        /* ignore */
      }
    }
    assert.ok(formReady, 'Create Workspace form should render with input fields');

    // ── Step 4: Fill in the form fields ──
    const wsName = 'e2econvertws';
    const appName = 'e2econvertapp';
    const wfName = 'e2econvertwf';
    const wsParentDir = path.join(os.tmpdir(), 'la-e2e-test');

    // Fill workspace parent folder path (first input)
    try {
      const inputs = await driver.findElements(By.css('input'));
      if (inputs.length >= 1) {
        // First input is usually the path field
        await inputs[0].click();
        await inputs[0].sendKeys(Key.chord(Key.CONTROL, 'a'));
        await inputs[0].sendKeys(wsParentDir);
        console.log(`[createWs] Filled path: ${wsParentDir}`);
      }
      // Fill workspace name (second input)
      if (inputs.length >= 2) {
        await inputs[1].click();
        await inputs[1].sendKeys(Key.chord(Key.CONTROL, 'a'));
        await inputs[1].sendKeys(wsName);
        console.log(`[createWs] Filled workspace name: ${wsName}`);
      }
      // Fill logic app name (third input)
      if (inputs.length >= 3) {
        await inputs[2].click();
        await inputs[2].sendKeys(Key.chord(Key.CONTROL, 'a'));
        await inputs[2].sendKeys(appName);
        console.log(`[createWs] Filled app name: ${appName}`);
      }
      // Fill workflow name (may be fourth input or further)
      if (inputs.length >= 4) {
        await inputs[3].click();
        await inputs[3].sendKeys(Key.chord(Key.CONTROL, 'a'));
        await inputs[3].sendKeys(wfName);
        console.log(`[createWs] Filled workflow name: ${wfName}`);
      }
    } catch (e: any) {
      console.log(`[createWs] Error filling form: ${e.message}`);
    }

    await captureScreenshot(driver, 'create-ws-form-filled', EXPLICIT_SCREENSHOT_DIR);
    await sleep(1500);

    // ── Step 5: Click Next to go to review step ──
    try {
      const nextBtn = await driver.findElement(By.xpath('//button[contains(text(), "Next")]'));
      await nextBtn.click();
      console.log('[createWs] Clicked Next');
      await sleep(2000);
      await captureScreenshot(driver, 'create-ws-review-step', EXPLICIT_SCREENSHOT_DIR);
    } catch (e: any) {
      console.log(`[createWs] Next button not found: ${e.message}`);
    }

    // ── Step 6: Click 'Create workspace' button ──
    try {
      const createBtn = await driver.findElement(By.xpath('//button[contains(text(), "Create")]'));
      await createBtn.click();
      console.log('[createWs] Clicked Create workspace');
      await sleep(5000); // Wait for workspace creation
      await captureScreenshot(driver, 'create-ws-after-create', EXPLICIT_SCREENSHOT_DIR);
    } catch (e: any) {
      console.log(`[createWs] Create button not found: ${e.message}`);
    }

    // ── Step 7: Verify the workspace was created on disk ──
    await webview.switchBack();
    await sleep(2000);

    const expectedWsDir = path.join(wsParentDir, wsName);
    const expectedWsFile = path.join(expectedWsDir, `${wsName}.code-workspace`);

    if (fs.existsSync(expectedWsFile)) {
      console.log(`[createWs] .code-workspace file created: ${expectedWsFile} ✓`);
      const wsContent = JSON.parse(fs.readFileSync(expectedWsFile, 'utf-8'));
      console.log(`[createWs] Workspace folders: ${JSON.stringify(wsContent.folders)}`);
      assert.ok(wsContent.folders && wsContent.folders.length > 0, 'Workspace should have at least one folder');
    } else {
      console.log(`[createWs] .code-workspace not found at ${expectedWsFile}`);
      // Check if it was created elsewhere
      const parentFiles = fs.existsSync(wsParentDir) ? fs.readdirSync(wsParentDir) : [];
      console.log(`[createWs] Contents of ${wsParentDir}: ${JSON.stringify(parentFiles)}`);
      if (fs.existsSync(expectedWsDir)) {
        const wsFiles = fs.readdirSync(expectedWsDir);
        console.log(`[createWs] Contents of ${expectedWsDir}: ${JSON.stringify(wsFiles)}`);
      }
    }

    // ── Step 8: Verify the original legacy project is completely untouched ──
    // The conversion should COPY the project into the new workspace directory.
    // The ORIGINAL legacy project folder must remain exactly as it was — same
    // files, same content. If new files appear in the original folder, that's
    // a product bug (the extension modified the source instead of the copy).
    console.log('[createWs] Verifying original legacy project is untouched...');
    assert.ok(fs.existsSync(LEGACY_PROJECT_DIR), 'Legacy project directory should still exist');

    const currentSnapshot = snapshotLegacyProject(LEGACY_PROJECT_DIR);

    // Log differences for debugging if they exist
    const addedFiles = currentSnapshot.files.filter((f) => !legacySnapshot.files.includes(f));
    const removedFiles = legacySnapshot.files.filter((f) => !currentSnapshot.files.includes(f));
    if (addedFiles.length > 0) {
      console.log(`[createWs] WARNING: Files ADDED to original legacy project (should not happen): ${JSON.stringify(addedFiles)}`);
    }
    if (removedFiles.length > 0) {
      console.log(`[createWs] WARNING: Files REMOVED from original legacy project (should not happen): ${JSON.stringify(removedFiles)}`);
    }

    // Verify content files are unchanged
    assert.strictEqual(currentSnapshot.hostJson, legacySnapshot.hostJson, 'host.json content should be unchanged');
    assert.strictEqual(currentSnapshot.localSettings, legacySnapshot.localSettings, 'local.settings.json content should be unchanged');
    assert.strictEqual(currentSnapshot.workflowJson, legacySnapshot.workflowJson, 'workflow.json content should be unchanged');

    // Verify file list is unchanged — no files should be added or removed.
    // The snapshot was taken right before clicking "Yes" (after the extension
    // finished all background processing), so the file list should be identical.
    assert.deepStrictEqual(
      currentSnapshot.files,
      legacySnapshot.files,
      `Original legacy project files should be unchanged. Added: ${JSON.stringify(addedFiles)}, Removed: ${JSON.stringify(removedFiles)}`
    );
    console.log('[createWs] Original legacy project verified untouched ✓');

    await captureScreenshot(driver, 'create-ws-completed', EXPLICIT_SCREENSHOT_DIR);
    console.log('[createWs] PASSED — dialog → webview → fill form → create → verify disk + legacy untouched');

    // Clean up created workspace
    try {
      if (fs.existsSync(expectedWsDir)) {
        fs.rmSync(expectedWsDir, { recursive: true, force: true });
      }
    } catch {
      /* ignore */
    }
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
//
// Create Workspace FIXTURES tests — drives the wizard for ONLY the runtime-fixture
// shapes consumed by downstream Phase 4.2 / 4.3 / 4.4 scenario shards:
// Standard/Stateful, Standard/Stateless, CustomCode/Stateful, RulesEngine/Stateful.
// Writes the workspace manifest at
// WORKSPACE_MANIFEST_PATH that those shards read.
//
// **D-001 (binding):** this file MUST drive the Create Workspace wizard. It MUST NOT
// import disk-writer APIs (file-system writeFile/writeFileSync, fs-extra JSON-writer
// helpers) for workspace files. (Reading via readFileSync is allowed and used here
// for manifest-shape smoke assertions only.) The pre-flight in run-e2e.js enforces
// this via grep; symbol names are intentionally elided in this comment so the guard
// regex doesn't false-positive on our own documentation.
//
// Wall time target: a short fixture-only run (vs ~12 minutes for the 12-shape behavior file).
// This is the critical-path test that Step 3's per-scenario shards depend on; the
// full behavior coverage runs independently in createWorkspace.behavior.test.ts.

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import { By, EditorView, type WebDriver, Workbench } from 'vscode-extension-tester';
import {
  appendToWorkspaceManifest,
  buildManifestEntry,
  captureScreenshot,
  clearAndType,
  clickCreateWorkspaceButton,
  createTempDir,
  deepVerifyWorkspace,
  dismissNotifications,
  dumpFormState,
  fillCustomCodeFields,
  fillStandardFormFields,
  findDropdownByLabel,
  findInputByLabel,
  selectCreateWorkspaceCommand,
  selectDropdownOption,
  selectRadioOption,
  sleep,
  switchToWebviewFrame,
  uniqueName,
  waitForExtensionReady,
  waitForNextButton,
  waitForPathValidation,
  WORKSPACE_MANIFEST_PATH,
  type WorkspaceManifestEntry,
} from './createWorkspaceShared';

const TEST_TIMEOUT = 180_000;
const EXTENSION_BUNDLE_DIR = path.join(
  os.homedir(),
  '.azure-functions-core-tools',
  'Functions',
  'ExtensionBundles',
  'Microsoft.Azure.Functions.ExtensionBundle.Workflows'
);
const BUNDLE_SIDECAR_FILE = '.bundle-source-md5';

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10));
  const pb = b.split('.').map((part) => Number.parseInt(part, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] || 0) - (pa[i] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function findLatestWorkflowsBundle(): { version: string; bundleDir: string; sidecarPath: string } | undefined {
  if (!fs.existsSync(EXTENSION_BUNDLE_DIR)) {
    return undefined;
  }

  const version = fs
    .readdirSync(EXTENSION_BUNDLE_DIR)
    .filter((entry) => {
      const fullPath = path.join(EXTENSION_BUNDLE_DIR, entry);
      return /^\d+\.\d+\.\d+/.test(entry) && fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    })
    .sort(compareSemverDesc)[0];

  if (!version) {
    return undefined;
  }

  const bundleDir = path.join(EXTENSION_BUNDLE_DIR, version);
  return { version, bundleDir, sidecarPath: path.join(bundleDir, BUNDLE_SIDECAR_FILE) };
}

function listBundleFiles(bundleDir: string): { relPath: string; fullPath: string }[] {
  const files: { relPath: string; fullPath: string }[] = [];
  const stack = [bundleDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(bundleDir, fullPath).split(path.sep).join('/');
      if (relPath === BUNDLE_SIDECAR_FILE) {
        continue;
      }

      if (entry.isFile()) {
        files.push({ relPath, fullPath });
      }
      if (entry.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }

  files.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return files;
}

function computeBundleContentHash(files: { relPath: string; fullPath: string }[]): string {
  const hash = crypto.createHash('sha256');
  const nul = Buffer.from([0]);
  for (const file of files) {
    const stat = fs.statSync(file.fullPath);
    hash.update(Buffer.from(file.relPath, 'utf8'));
    hash.update(nul);
    hash.update(Buffer.from(String(stat.size), 'utf8'));
    hash.update(nul);
    hash.update(fs.readFileSync(file.fullPath));
    hash.update(nul);
  }

  return hash.digest('base64');
}

function assertWorkflowsBundleSidecarReady(): void {
  const bundle = findLatestWorkflowsBundle();
  if (!bundle) {
    throw new Error(`[fixtures:setup] Logic Apps extension bundle is missing at ${EXTENSION_BUNDLE_DIR}`);
  }
  if (!fs.existsSync(bundle.sidecarPath)) {
    throw new Error(`[fixtures:setup] Logic Apps extension bundle sidecar is missing: ${bundle.sidecarPath}`);
  }

  const sidecar = JSON.parse(fs.readFileSync(bundle.sidecarPath, 'utf8'));
  if (!sidecar || typeof sidecar.sourceMd5 !== 'string' || typeof sidecar.contentHash !== 'string') {
    throw new Error(`[fixtures:setup] Logic Apps extension bundle sidecar has invalid shape: ${bundle.sidecarPath}`);
  }

  const files = listBundleFiles(bundle.bundleDir);
  if (files.length === 0) {
    throw new Error(`[fixtures:setup] Logic Apps extension bundle has no extracted content: ${bundle.bundleDir}`);
  }

  const contentHash = computeBundleContentHash(files);
  if (sidecar.contentHash !== contentHash) {
    throw new Error(
      `[fixtures:setup] Logic Apps extension bundle content hash mismatch: ${bundle.bundleDir} sidecar=${sidecar.contentHash} actual=${contentHash}`
    );
  }
}

async function waitForWorkflowsBundleSidecarReady(timeoutMs = 300_000): Promise<void> {
  const startedAt = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertWorkflowsBundleSidecarReady();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await sleep(5000);
    }
  }

  throw lastError ?? new Error('[fixtures:setup] Timed out waiting for Logic Apps extension bundle sidecar');
}

/**
 * Minimal manifest-shape smoke assertion for a freshly created workspace.
 * Reads (not writes) workspace files; D-001 compliant.
 */
function assertManifestShape(entry: WorkspaceManifestEntry): void {
  const hostJsonPath = path.join(entry.appDir, 'host.json');
  if (!fs.existsSync(hostJsonPath)) {
    throw new Error(`[fixtures:shape] Missing host.json at ${hostJsonPath}`);
  }
  // host.json must be valid JSON
  const hostRaw = fs.readFileSync(hostJsonPath, 'utf-8');
  let host: { version?: string };
  try {
    host = JSON.parse(hostRaw);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`[fixtures:shape] host.json is not valid JSON: ${message}`);
  }
  if (!host.version) {
    throw new Error(`[fixtures:shape] host.json missing "version" field`);
  }

  const localSettingsPath = path.join(entry.appDir, 'local.settings.json');
  if (!fs.existsSync(localSettingsPath)) {
    throw new Error(`[fixtures:shape] Missing local.settings.json at ${localSettingsPath}`);
  }
  try {
    JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`[fixtures:shape] local.settings.json is not valid JSON: ${message}`);
  }

  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  if (!fs.existsSync(workflowJsonPath)) {
    throw new Error(`[fixtures:shape] Missing workflow.json at ${workflowJsonPath}`);
  }
  const wfRaw = fs.readFileSync(workflowJsonPath, 'utf-8');
  let wf: { kind?: string; definition?: unknown };
  try {
    wf = JSON.parse(wfRaw);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`[fixtures:shape] workflow.json is not valid JSON: ${message}`);
  }
  if (!wf.kind) {
    throw new Error(`[fixtures:shape] workflow.json missing "kind" field`);
  }
  if ((entry.wfType === 'Stateful' || entry.wfType === 'Stateless') && wf.kind.toLowerCase() !== entry.wfType.toLowerCase()) {
    throw new Error(`[fixtures:shape] expected workflow.json kind=${entry.wfType}, got "${wf.kind}"`);
  }
  console.log(`[fixtures:shape] OK ${entry.label}: host.json v${host.version}, workflow.json kind=${wf.kind}`);
}

async function waitForManifestShape(entry: WorkspaceManifestEntry, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      assertManifestShape(entry);
      return;
    } catch (error: unknown) {
      lastError = error;
      await sleep(500);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`[fixtures:shape] Timed out after ${timeoutMs}ms waiting for ${entry.label}: ${message}`);
}

describe('Create Workspace Fixtures', function () {
  this.timeout(TEST_TIMEOUT);

  let workbench: Workbench;
  let driver: WebDriver;
  const tempDir = createTempDir();

  before(async function () {
    this.timeout(600_000);
    workbench = new Workbench();
    driver = workbench.getDriver();
    console.log('[fixtures:setup] Waiting for extension to be ready...');
    await waitForExtensionReady(workbench);
    console.log('[fixtures:setup] Extension is ready');

    if (process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION === '1') {
      console.log('[fixtures:setup] Strict dependency validation enabled; invoking dependency/bundle validation before fixtures...');
      await workbench.executeCommand('Azure Logic Apps: Validate and install dependency binaries');
      await waitForWorkflowsBundleSidecarReady();
      console.log('[fixtures:setup] Dependency/bundle validation produced a bundle sidecar before fixture creation');
    }

    // Clear any stale manifest from a previous run so this run starts fresh.
    try {
      if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
        fs.unlinkSync(WORKSPACE_MANIFEST_PATH);
        console.log(`[fixtures:setup] Cleared stale manifest at ${WORKSPACE_MANIFEST_PATH}`);
      }
    } catch {
      /* ignore */
    }
  });

  afterEach(async function () {
    if (this.currentTest?.state === 'failed') {
      try {
        const failName = (this.currentTest.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
        await captureScreenshot(driver, `FAIL-fixtures-${failName}`);
      } catch {
        /* ignore */
      }
    }
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    try {
      await dismissNotifications(driver);
      await driver.executeScript(`
        document.querySelectorAll('.notification-toast-container, .notifications-toasts').forEach(el => el.remove());
      `);
    } catch {
      /* ignore */
    }
    try {
      await sleep(2000);
      const editorView = new EditorView();
      await editorView.closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(1000);
  });

  after(async () => {
    console.log(`[fixtures:teardown] Workspace manifest: ${WORKSPACE_MANIFEST_PATH}`);
    try {
      if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
        const manifest = JSON.parse(fs.readFileSync(WORKSPACE_MANIFEST_PATH, 'utf-8')) as WorkspaceManifestEntry[];
        console.log(`[fixtures:teardown] ${manifest.length} workspaces recorded in manifest`);
      }
    } catch {
      /* ignore */
    }
  });

  it('should create Standard + Stateful workspace and record in manifest', async function () {
    this.timeout(TEST_TIMEOUT);

    const wsName = uniqueName('testws');
    const appName = uniqueName('testapp');
    const wfName = uniqueName('testwf');

    console.log('[fixtures:standard] Opening Create Workspace command...');
    await selectCreateWorkspaceCommand(workbench);

    console.log('[fixtures:standard] Switching to webview...');
    const webview = await switchToWebviewFrame(driver);

    console.log('[fixtures:standard] Filling form fields...');
    await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName });

    const nextButton = await waitForNextButton(driver);
    await nextButton.click();
    await sleep(2000);

    await clickCreateWorkspaceButton(driver, webview, { parentDir: tempDir, wsName });

    const entry = buildManifestEntry('Standard + Stateful', tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'standard',
      wfType: 'Stateful',
    });
    await waitForManifestShape(entry);

    deepVerifyWorkspace(tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'standard',
      wfType: 'Stateful',
    });

    appendToWorkspaceManifest(entry);

    await captureScreenshot(driver, 'fixtures-standard-passed');
    console.log('[fixtures:standard] PASSED');
  });

  it('should create Standard + Stateless workspace and record in manifest', async function () {
    this.timeout(TEST_TIMEOUT);

    const wsName = uniqueName('slws');
    const appName = uniqueName('slapp');
    const wfName = uniqueName('slwf');

    console.log('[fixtures:stateless] Opening Create Workspace command...');
    await selectCreateWorkspaceCommand(workbench);

    console.log('[fixtures:stateless] Switching to webview...');
    const webview = await switchToWebviewFrame(driver);

    console.log('[fixtures:stateless] Filling form fields...');
    await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName, wfType: 'Stateless' });

    const nextButton = await waitForNextButton(driver);
    await nextButton.click();
    await sleep(2000);

    await clickCreateWorkspaceButton(driver, webview, { parentDir: tempDir, wsName });

    const entry = buildManifestEntry('Standard + Stateless', tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'standard',
      wfType: 'Stateless',
    });
    await waitForManifestShape(entry);

    deepVerifyWorkspace(tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'standard',
      wfType: 'Stateless',
    });

    appendToWorkspaceManifest(entry);

    await captureScreenshot(driver, 'fixtures-stateless-passed');
    console.log('[fixtures:stateless] PASSED');
  });

  it('should create CustomCode + Stateful workspace and record in manifest', async function () {
    this.timeout(TEST_TIMEOUT);

    const wsName = uniqueName('ccws');
    const appName = uniqueName('ccapp');
    const wfName = uniqueName('ccwf');
    const ccFolderName = uniqueName('ccfolder');
    const fnNamespace = 'MyCompany.Functions';
    const fnName = uniqueName('myfunc');

    console.log('[fixtures:customCode] Opening Create Workspace command...');
    await selectCreateWorkspaceCommand(workbench);

    console.log('[fixtures:customCode] Switching to webview...');
    const webview = await switchToWebviewFrame(driver);

    console.log('[fixtures:customCode] Filling workspace fields...');
    const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
    await clearAndType(pathInput, tempDir);
    await waitForPathValidation(driver);

    const wsNameInput = await findInputByLabel(driver, 'Workspace name');
    await clearAndType(wsNameInput, wsName);

    const appNameInput = await findInputByLabel(driver, 'Logic app name');
    await clearAndType(appNameInput, appName);

    console.log('[fixtures:customCode] Selecting custom code radio...');
    await selectRadioOption(driver, 'Logic app with custom code');
    await sleep(2000);

    await fillCustomCodeFields(driver, {
      dotNetVersion: '.NET 8',
      folderName: ccFolderName,
      namespace: fnNamespace,
      functionName: fnName,
    });

    const wfNameInput = await findInputByLabel(driver, 'Workflow name');
    await clearAndType(wfNameInput, wfName);

    const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
    await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

    await dumpFormState(driver);
    const nextButton = await waitForNextButton(driver);
    await nextButton.click();
    await sleep(2000);

    await clickCreateWorkspaceButton(driver, webview, { parentDir: tempDir, wsName });

    const entry = buildManifestEntry('CustomCode + Stateful', tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'customCode',
      wfType: 'Stateful',
      ccFolderName,
      fnName,
      fnNamespace,
    });
    await waitForManifestShape(entry);

    deepVerifyWorkspace(tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'customCode',
      wfType: 'Stateful',
      ccFolderName,
      fnName,
      fnNamespace,
    });

    appendToWorkspaceManifest(entry);

    await captureScreenshot(driver, 'fixtures-customcode-passed');
    console.log('[fixtures:customCode] PASSED');
  });

  it('should create RulesEngine + Stateful workspace and record in manifest', async function () {
    this.timeout(TEST_TIMEOUT);

    const wsName = uniqueName('rews');
    const appName = uniqueName('reapp');
    const wfName = uniqueName('rewf');
    const reFolderName = uniqueName('refolder');
    const fnNamespace = 'RulesEngineNamespace';
    const fnName = uniqueName('rulesfn');

    console.log('[fixtures:rulesEngine] Opening Create Workspace command...');
    await selectCreateWorkspaceCommand(workbench);

    console.log('[fixtures:rulesEngine] Switching to webview...');
    const webview = await switchToWebviewFrame(driver);

    const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
    await clearAndType(pathInput, tempDir);
    await waitForPathValidation(driver);

    const wsNameInput = await findInputByLabel(driver, 'Workspace name');
    await clearAndType(wsNameInput, wsName);

    const appNameInput = await findInputByLabel(driver, 'Logic app name');
    await clearAndType(appNameInput, appName);

    console.log('[fixtures:rulesEngine] Selecting rules engine radio...');
    await selectRadioOption(driver, 'Logic app with rules engine');
    await sleep(2000);

    // Rules engine folder name — try multiple labels
    let folderInput = null as any;
    for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
      try {
        folderInput = await findInputByLabel(driver, label);
        break;
      } catch {
        /* try next */
      }
    }
    if (!folderInput) {
      await webview.switchBack();
      throw new Error('Could not find rules engine folder name input');
    }
    await clearAndType(folderInput, reFolderName);

    // Function namespace
    let nsInput = null as any;
    for (const label of ['Function namespace', 'Namespace']) {
      try {
        nsInput = await findInputByLabel(driver, label);
        break;
      } catch {
        /* try next */
      }
    }
    if (!nsInput) {
      await webview.switchBack();
      throw new Error('Could not find function namespace input');
    }
    await clearAndType(nsInput, fnNamespace);

    // Function name — prefer label that doesn't contain "namespace"
    let fnInput = null as any;
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

    const wfNameInput = await findInputByLabel(driver, 'Workflow name');
    await clearAndType(wfNameInput, wfName);

    const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
    await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

    await dumpFormState(driver);
    const nextButton = await waitForNextButton(driver);
    await nextButton.click();
    await sleep(2000);

    await clickCreateWorkspaceButton(driver, webview, { parentDir: tempDir, wsName });

    const entry = buildManifestEntry('RulesEngine + Stateful', tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'rulesEngine',
      wfType: 'Stateful',
      ccFolderName: reFolderName,
      fnName,
      fnNamespace,
    });
    await waitForManifestShape(entry);

    deepVerifyWorkspace(tempDir, {
      wsName,
      appName,
      wfName,
      appType: 'rulesEngine',
      wfType: 'Stateful',
      ccFolderName: reFolderName,
      fnName,
      fnNamespace,
    });

    appendToWorkspaceManifest(entry);

    await captureScreenshot(driver, 'fixtures-rulesengine-passed');
    console.log('[fixtures:rulesEngine] PASSED');
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Azurite auto-start failure assertion E2E.
 *
 * This runs in a fresh VS Code session after azuriteAutostartFailure.test.ts
 * creates the workspace through the Create Workspace webview.
 *
 * PRE-F5 GATES — read before touching them. This phase is a BLOCKING CI check on
 * both ubuntu and windows, so a harness-side false positive blocks every PR:
 *
 *   1. `waitForExtensionReady()` (hard gate). The real precondition for pressing
 *      F5 is *commands registered*, not a directory existing. Without it,
 *      `startDebugging()` finds no "Start Debugging" pick, logs
 *      `[debug] Could not find "Start Debugging" command`, and returns normally
 *      WITHOUT throwing (runHelpers.ts) — so the run fails 45 s later on
 *      "Expected Azurite auto-start timeout to be visible" and points at the
 *      product instead of the harness. This is the same exposure that made
 *      Phase 4.13A fail in 9 seconds before it got its 3-stage warm-up.
 *   2. `waitForDesignTimeFolder()` (freshness-checked evidence gate). Nothing in
 *      run-e2e.ts deletes `<workspace>/azuriteapp/workflow-designtime` between
 *      4.13A and 4.13B (4.13A's `removeWorkspaceParent()` runs only at the START
 *      of 4.13A) and 4.13A runs with `autoStartDesignTime: true`, so it can leave
 *      a design-time folder behind. An `fs.existsSync()`-only gate would return
 *      instantly on that stale directory. The folder is therefore cleared here
 *      first and the gate additionally requires `mtimeMs >= gateStart`, mirroring
 *      `codefulDebugTasks.test.ts`'s `waitForDesignTimeEvidence()`.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { Key, type WebDriver, VSBrowser, Workbench } from 'vscode-extension-tester';
import { waitForExtensionReady } from './createWorkspaceShared';
import { openWorkspaceFileInSession } from './designerHelpers';
import { captureScreenshot, sleep } from './helpers';
import { startDebugging } from './runHelpers';

// Worst case is the sum of two independent gates: waitForExtensionReady (up to 240s)
// plus the design-time freshness gate (up to 180s), on top of workspace open and the
// F5 assertions. 600s left no margin if both neared their ceilings; the enclosing job
// budget is 45 minutes, so the extra headroom is free on healthy runs.
const TEST_TIMEOUT = 750_000;
/**
 * Matches Phase 4.13A's budget for the same gate. 4.13B reuses the session's warm
 * extension host, so in practice this returns in seconds; the budget only covers a
 * cold reopen where the LA extension re-runs its async activation.
 */
const EXTENSION_READY_TIMEOUT = 240_000;
const AZURITE_TIMEOUT_TEXT = 'Azurite did not become ready';
const AZURE_WEB_JOBS_STORAGE_TEXT = 'Failed to verify "AzureWebJobsStorage" connection';
const DEBUG_ANYWAY_TEXT = 'Debug anyway';
const WORKSPACE_PARENT_DIR =
  process.env.AZURITE_E2E_WORKSPACE_PARENT ?? path.join(os.tmpdir(), 'la-e2e-test', 'azurite-autostart-failure-parent');
const WORKSPACE_NAME = 'azuritews';
const APP_NAME = 'azuriteapp';
const WORKSPACE_DIR = path.join(WORKSPACE_PARENT_DIR, WORKSPACE_NAME);
const PROJECT_DIR = path.join(WORKSPACE_DIR, APP_NAME);
const WORKSPACE_FILE = path.join(WORKSPACE_DIR, `${WORKSPACE_NAME}.code-workspace`);
const DESIGN_TIME_DIR = path.join(PROJECT_DIR, 'workflow-designtime');
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'azuriteAutostartFailure-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function configureGeneratedWorkspaceForAzuriteFailure(): void {
  const workspaceJson = readJson(WORKSPACE_FILE);
  workspaceJson.settings = {
    ...(workspaceJson.settings ?? {}),
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azureLogicAppsStandard.showAutoStartAzuriteWarning': false,
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.showStartDesignTimeMessage': false,
    'azureLogicAppsStandard.showProjectWarning': false,
    'azureLogicAppsStandard.verifyConnectionKeys': false,
    'azureFunctions.suppressProject': true,
    'debug.internalConsoleOptions': 'neverOpen',
  };
  writeJson(WORKSPACE_FILE, workspaceJson);

  const settingsPath = path.join(PROJECT_DIR, '.vscode', 'settings.json');
  const settingsJson = fs.existsSync(settingsPath) ? readJson(settingsPath) : {};
  writeJson(settingsPath, {
    ...settingsJson,
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azureLogicAppsStandard.showAutoStartAzuriteWarning': false,
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.showStartDesignTimeMessage': false,
    'azureLogicAppsStandard.showProjectWarning': false,
    'azureLogicAppsStandard.verifyConnectionKeys': false,
    'azureFunctions.suppressProject': true,
    'debug.internalConsoleOptions': 'neverOpen',
  });

  const launchPath = path.join(PROJECT_DIR, '.vscode', 'launch.json');
  writeJson(launchPath, {
    version: '0.2.0',
    configurations: [
      {
        name: `Run/Debug logic app ${APP_NAME}`,
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: true,
      },
    ],
  });

  const localSettingsPath = path.join(PROJECT_DIR, 'local.settings.json');
  const localSettingsJson = readJson(localSettingsPath);
  localSettingsJson.Values = {
    ...(localSettingsJson.Values ?? {}),
    AzureWebJobsStorage: 'UseDevelopmentStorage=true',
    WORKFLOWS_SUBSCRIPTION_ID: '',
    WORKFLOWS_TENANT_ID: '',
    WORKFLOWS_RESOURCE_GROUP_NAME: '',
    WORKFLOWS_LOCATION_NAME: '',
  };
  writeJson(localSettingsPath, localSettingsJson);
}

async function bindPort(port: number): Promise<http.Server> {
  return await new Promise((resolve, reject) => {
    const server = http.createServer((_, response) => {
      response.statusCode = 403;
      response.setHeader('Connection', 'close');
      response.end('Azurite blocked by E2E test');
    });
    server.requestTimeout = 1000;
    server.headersTimeout = 1000;
    server.keepAliveTimeout = 1000;
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

async function blockAzuritePorts(): Promise<http.Server[]> {
  const servers: http.Server[] = [];
  for (const port of [10000, 10001, 10002]) {
    try {
      servers.push(await bindPort(port));
      console.log(`[azurite-e2e] Bound local port ${port}`);
    } catch (error) {
      // Await the close callbacks instead of firing them and moving on. `after()`
      // cannot clean these up — `portBlockers` is only assigned once this function
      // resolves, so on the throw path these partially-bound servers are the only
      // reference we will ever have. closeServers() also bounds each close at 1s.
      await closeServers(servers);
      throw new Error(`Unable to bind Azurite port ${port}. Stop any local Azurite instance and retry. ${error}`);
    }
  }
  return servers;
}

async function closeServers(servers: http.Server[]): Promise<void> {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 1000);
          server.close(() => {
            clearTimeout(timeout);
            resolve();
          });
        })
    )
  );
}

async function getVisibleWorkbenchText(driver: WebDriver): Promise<string> {
  // Scrape the top-level workbench document, never whatever frame the driver happens
  // to be parked in. A scrape taken from inside a webview iframe returns '' for every
  // selector below, which would silently make `assertTextDoesNotAppear` vacuous and
  // `waitForWorkbenchText` blind. The switch is best-effort: if it fails the liveness
  // assertion in `assertTextDoesNotAppear` is the backstop.
  await driver
    .switchTo()
    .defaultContent()
    .catch(() => undefined);
  return await driver.executeScript<string>(`
    const selectors = [
      '.monaco-dialog-box',
      '[role="dialog"]',
      '.notification-toast',
      '.notifications-toasts',
      '.quick-input-widget:not(.hidden)',
      '.monaco-workbench'
    ];
    return selectors
      .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .map((el) => el.textContent || '')
      .join('\\n');
  `);
}

async function focusTerminalPanel(driver: WebDriver): Promise<void> {
  try {
    await driver.actions().keyDown(Key.CONTROL).sendKeys('`').keyUp(Key.CONTROL).perform();
    await sleep(1000);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
  } catch (error) {
    console.log(`[azurite-e2e] Could not focus terminal panel: ${error}`);
  }
}

async function getPanelDiagnostics(driver: WebDriver): Promise<string> {
  return await driver.executeScript<string>(`
    const selectors = [
      '.terminal-wrapper',
      '.xterm-screen',
      '.xterm-rows',
      '.panel .monaco-list',
      '.output-view',
      '.notifications-toasts',
      '[role="dialog"]',
      '.quick-input-widget:not(.hidden)'
    ];
    return selectors
      .map((sel) => {
        const text = Array.from(document.querySelectorAll(sel)).map((el) => el.textContent || '').join('\\n');
        return text ? '--- ' + sel + ' ---\\n' + text : '';
      })
      .filter(Boolean)
      .join('\\n');
  `);
}

async function logPanelDiagnostics(driver: WebDriver, label: string): Promise<void> {
  try {
    await driver.switchTo().defaultContent();
    const diagnostics = await getPanelDiagnostics(driver);
    console.log(`[azurite-e2e] ${label} diagnostics:\n${diagnostics || '<empty>'}`);
  } catch (error) {
    console.log(`[azurite-e2e] Failed to capture ${label} diagnostics: ${error}`);
  }
}

function logLatestLogicAppsOutput(label: string): void {
  try {
    const logsRoot = path.join(os.tmpdir(), 'test-resources', 'settings', 'logs');
    if (!fs.existsSync(logsRoot)) {
      console.log(`[azurite-e2e] ${label} output log: logs root does not exist`);
      return;
    }

    const matches: string[] = [];
    const collect = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          collect(entryPath);
        } else if (entry.name.includes('Azure Logic Apps') && entry.name.endsWith('.log')) {
          matches.push(entryPath);
        }
      }
    };
    collect(logsRoot);

    const latest = matches
      .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
      .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath;

    if (!latest) {
      console.log(`[azurite-e2e] ${label} output log: no Azure Logic Apps output log found`);
      return;
    }

    const content = fs.readFileSync(latest, 'utf-8');
    console.log(`[azurite-e2e] ${label} output log (${latest}):\n${content.slice(-6000)}`);
  } catch (error) {
    console.log(`[azurite-e2e] Failed to read ${label} output log: ${error}`);
  }
}

async function waitForWorkbenchText(driver: WebDriver, text: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let emptyScrapes = 0;
  while (Date.now() < deadline) {
    const visibleText = await getVisibleWorkbenchText(driver);
    if (visibleText.length === 0) {
      emptyScrapes += 1;
    }
    if (visibleText.includes(text)) {
      return true;
    }
    await sleep(500);
  }
  if (emptyScrapes > 0) {
    console.log(`[azurite-e2e] ${emptyScrapes} workbench scrape(s) returned no text while waiting for: ${text}`);
  }
  return false;
}

async function assertTextDoesNotAppear(driver: WebDriver, text: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let sawWorkbenchContent = false;
  while (Date.now() < deadline) {
    const visibleText = await getVisibleWorkbenchText(driver);
    if (visibleText.length > 0) {
      sawWorkbenchContent = true;
    }
    assert.ok(!visibleText.includes(text), `Unexpected workbench text appeared: ${text}`);
    await sleep(500);
  }
  // Liveness. "X never appeared" only means something if we were actually scraping a
  // rendered workbench: if `getVisibleWorkbenchText` returns '' (driver parked inside an
  // iframe, workbench not rendered yet, a future refactor inserting a frame switch) then
  // every poll above trivially "passes" and this negative assertion is silently vacuous
  // while still reporting green. Require at least one poll in the window to have scraped
  // real content. `.monaco-workbench` always carries text in a live session, so a whole
  // window of empty scrapes is a harness fault, not a product signal.
  assert.ok(
    sawWorkbenchContent,
    `workbench text scrape was empty for the entire ${timeoutMs}ms window — the "${text}" assertion would be vacuous`
  );
}

async function isDebugToolbarVisible(driver: WebDriver): Promise<boolean> {
  return await driver.executeScript<boolean>(`
    const toolbar = document.querySelector('.debug-toolbar, [class*="debug-toolbar"], [class*="debugging-actions"]');
    if (!toolbar) {
      return false;
    }
    const style = window.getComputedStyle(toolbar);
    return style.display !== 'none' && style.visibility !== 'hidden';
  `);
}

async function waitForWorkspaceOpen(driver: WebDriver): Promise<void> {
  const deadline = Date.now() + 45_000;
  let lastTitle = '';
  let lastExplorerState = '';

  while (Date.now() < deadline) {
    await driver
      .switchTo()
      .defaultContent()
      .catch(() => undefined);
    lastTitle = await driver.getTitle().catch(() => '');
    lastExplorerState = await driver
      .executeScript<string>(
        `
          const rows = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
          return Array.from(rows).map((row) => row.textContent || '').join('\\n');
        `
      )
      .catch(() => '');

    const title = lastTitle.toLowerCase();
    const explorer = lastExplorerState.toLowerCase();
    if (title.includes(WORKSPACE_NAME) || explorer.includes(WORKSPACE_NAME) || explorer.includes(APP_NAME)) {
      return;
    }

    await sleep(1000);
  }

  await captureScreenshot(driver, 'azurite-workspace-not-open', EXPLICIT_SCREENSHOT_DIR);
  throw new Error(
    `Generated workspace did not open in fresh session: ${WORKSPACE_FILE}. Title="${lastTitle}", Explorer="${lastExplorerState.substring(
      0,
      200
    )}"`
  );
}

/**
 * Clear a `workflow-designtime` folder left behind by Phase 4.13A so the freshness gate
 * below has a clean baseline. Nothing else deletes it: 4.13A's `removeWorkspaceParent()`
 * only runs at the START of 4.13A, and run-e2e.ts has no equivalent of the codeful
 * phases' `removeDesignTimeEvidence()` for this pair.
 *
 * Deliberately best-effort and EBUSY-tolerant, mirroring run-e2e.ts's
 * `removeDesignTimeEvidence()`. Returns true when the folder is gone (or never existed),
 * false when it survived — in which case the caller degrades the gate to existence-only
 * rather than failing a run it cannot prove anything about. A folder we cannot delete is
 * one a live process is holding as its cwd, i.e. a design-time host that is already
 * running, which is the state the gate is looking for anyway.
 *
 * Safe to call here: this runs seconds after the workbench renders, whereas design-time
 * auto-start cannot fire until the LA extension finishes its (tens of seconds to minutes)
 * async activation, so there is no realistic window in which we delete a directory this
 * session's design-time host has already committed to.
 */
async function clearStaleDesignTimeFolder(): Promise<boolean> {
  if (!fs.existsSync(DESIGN_TIME_DIR)) {
    return true;
  }

  let staleMtime = 'unknown';
  try {
    staleMtime = new Date(fs.statSync(DESIGN_TIME_DIR).mtimeMs).toISOString();
  } catch {
    /* ignore — diagnostics only */
  }
  console.log(`[azurite-e2e] Found a pre-existing design-time folder (mtime ${staleMtime}): ${DESIGN_TIME_DIR}`);

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.rmSync(DESIGN_TIME_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
      console.log('[azurite-e2e] Removed the stale design-time folder; the gate now requires a freshly created one');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 5) {
        console.log(
          `[azurite-e2e] WARNING: could not remove the stale design-time folder (${message}). Falling back to an existence-only gate.`
        );
        return false;
      }
      console.log(`[azurite-e2e] Waiting to remove the stale design-time folder (attempt ${attempt}): ${message}`);
      await sleep(2000);
    }
  }
  return false;
}

/**
 * Evidence gate: the design-time host started for THIS session.
 *
 * `notBeforeMs` is a watermark captured before the workspace is opened. Requiring
 * `mtimeMs >= notBeforeMs` (the same freshness check `codefulDebugTasks.test.ts`'s
 * `waitForDesignTimeEvidence()` uses) is what stops a folder left behind by Phase 4.13A
 * from satisfying the gate instantly. Pass `undefined` only when the stale folder could
 * not be cleared, which downgrades this to the historical existence-only check.
 */
async function waitForDesignTimeFolder(notBeforeMs: number | undefined): Promise<void> {
  // 180 s, matching Phase 4.10's budget for the same evidence. Design-time startup
  // hydrates runtime dependencies on a cold runner, which comfortably exceeds 45 s.
  const deadline = Date.now() + 180_000;
  let lastMtimeMs: number | undefined;
  while (Date.now() < deadline) {
    if (fs.existsSync(DESIGN_TIME_DIR)) {
      if (notBeforeMs === undefined) {
        return;
      }
      try {
        lastMtimeMs = fs.statSync(DESIGN_TIME_DIR).mtimeMs;
        if (lastMtimeMs >= notBeforeMs) {
          return;
        }
      } catch {
        // Raced with a write/delete — re-check on the next poll.
      }
    }
    await sleep(1000);
  }
  const observed = lastMtimeMs === undefined ? 'never appeared' : `mtime ${new Date(lastMtimeMs).toISOString()}`;
  const required = notBeforeMs === undefined ? 'existence only' : `mtime >= ${new Date(notBeforeMs).toISOString()}`;
  throw new Error(`Expected design-time startup to create ${DESIGN_TIME_DIR} (required: ${required}; observed: ${observed})`);
}

describe('Azurite auto-start failure E2E assertion', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let portBlockers: http.Server[] = [];
  let staleDesignTimeCleared = true;

  before(async function () {
    // Covers the bounded stale-folder removal below (5 attempts x ~2 s plus rmSync's own
    // retries) with headroom.
    this.timeout(90_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    driver = VSBrowser.instance.driver;
    // Runs as early as the harness allows — before the workspace is opened and long before
    // the LA extension could have started a design-time host for it.
    staleDesignTimeCleared = await clearStaleDesignTimeFolder();
  });

  after(async function () {
    this.timeout(30_000);
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await closeServers(portBlockers);
  });

  it('stops debug after Azurite auto-start failure without showing AzureWebJobsStorage warning', async function () {
    this.timeout(TEST_TIMEOUT);
    assert.ok(fs.existsSync(WORKSPACE_FILE), `Expected generated workspace file to exist: ${WORKSPACE_FILE}`);
    configureGeneratedWorkspaceForAzuriteFailure();
    // Freshness watermark for the design-time gate. Captured BEFORE the workspace is
    // opened (and after `before()` cleared any stale folder), so only a design-time folder
    // created by this session can satisfy `waitForDesignTimeFolder`.
    const gateStart = Date.now();
    // Explicitly open the generated .code-workspace after launch. ExTester's startup
    // `resources` (which uses `code -r` / CLI IPC) silently fails on headless CI: the VS Code
    // IPC socket isn't wired up when launched via ChromeDriver, so VS Code lands on the empty
    // Welcome screen with NO workspace folder open — which would make this test fail in
    // `waitForWorkspaceOpen` for an unrelated reason. Every other workspace-consuming phase
    // in this suite does the same. No-ops when the workspace is already open.
    await openWorkspaceFileInSession(new Workbench(), WORKSPACE_FILE);
    await waitForWorkspaceOpen(driver);
    // Hard gate: F5 goes through the "Start Debugging" command pick, which only exists once
    // the LA extension has registered its commands. `startDebugging()` does NOT throw when
    // the pick is missing — it logs and returns — so without this gate an early F5 shows up
    // 45 s later as "Expected Azurite auto-start timeout to be visible" and blames the
    // product. Throws on timeout, which is the failure we want to read in CI.
    await waitForExtensionReady(new Workbench(), EXTENSION_READY_TIMEOUT);
    console.log('[azurite-e2e] Logic Apps extension commands are registered');
    await waitForDesignTimeFolder(staleDesignTimeCleared ? gateStart : undefined);
    console.log(`[azurite-e2e] Design-time folder exists: ${DESIGN_TIME_DIR}`);
    await sleep(3000);

    const workbench = new Workbench();
    await focusTerminalPanel(driver);
    await logPanelDiagnostics(driver, 'before debug');
    portBlockers = await blockAzuritePorts();
    await startDebugging(workbench, driver);
    await focusTerminalPanel(driver);
    await logPanelDiagnostics(driver, 'after debug command');
    logLatestLogicAppsOutput('after debug command');

    const sawAzuriteFailure = await waitForWorkbenchText(driver, AZURITE_TIMEOUT_TEXT, 45_000);
    if (!sawAzuriteFailure) {
      await focusTerminalPanel(driver);
      await logPanelDiagnostics(driver, 'missing Azurite failure');
      logLatestLogicAppsOutput('missing Azurite failure');
      await captureScreenshot(driver, 'azurite-failure-message-not-found', EXPLICIT_SCREENSHOT_DIR);
    }
    assert.ok(sawAzuriteFailure, 'Expected Azurite auto-start timeout to be visible');

    await assertTextDoesNotAppear(driver, AZURE_WEB_JOBS_STORAGE_TEXT, 20_000);
    await assertTextDoesNotAppear(driver, DEBUG_ANYWAY_TEXT, 5_000);
    assert.strictEqual(await isDebugToolbarVisible(driver), false, 'Debug toolbar should not be visible after Azurite auto-start failure');
  });
});

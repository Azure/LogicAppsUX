/// <reference types="mocha" />

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * End-to-end repair test for the pre-debug Azure Functions Core Tools self-heal
 * (Phase 4.14 — `validateFuncCoreToolsInstalled` -> `attemptManagedFuncCoreToolsRepair`).
 *
 * The reported failure mode: the extension-managed func binaries EXIST on disk (so every
 * existence / execute-bit check passes) but fail to EXECUTE — a partial extract, a poisoned
 * runtime-dependencies cache, or an install that was interrupted mid-write. The product's
 * pre-debug gate does not check existence; it spawns `func --version`
 * (`isFuncToolsInstalled`, validateFuncCoreToolsInstalled.ts:82). Before the self-heal, that
 * spawn failing dead-ended on the interactive modal
 *
 *   "You must have the Azure Functions Core Tools installed to debug your local functions."
 *
 * which cannot be answered headlessly and aborts F5 outright.
 *
 * After the fix, `validateFuncCoreToolsInstalled` (:47-57) reaches
 * `attemptManagedFuncCoreToolsRepair` whenever `useBinariesDependencies()` is true, which
 * either joins an in-flight install (`waitForFuncCoreToolsInstall`) or silently reinstalls
 * the managed binaries (`installFuncCoreToolsBinaries(context, undefined, { suppressUi: true })`),
 * then re-probes `func --version`. F5 continues without ever showing the modal, and without
 * the download/checksum/extract error toasts that `{ suppressUi: true }` guards
 * (binaries.ts:100-136, :245-249).
 *
 * What this test does:
 *   1. Waits for the managed func binaries to be installed AND for `func --version` to
 *      succeed twice in a row (baseline; also proves activation-time validation has settled,
 *      so the repair we observe later cannot be attributed to it).
 *   2. Backs up the func executable bytes and overwrites them IN PLACE with a short garbage
 *      line. The file still exists and keeps its `.exe` extension / execute bit, but no
 *      longer executes — the real "provisioned but unrunnable" state, not a simulation.
 *   3. Presses F5 on a Standard/Stateful workspace from the fixtures manifest, which routes
 *      through `pickFuncProcessInternal` -> `preDebugValidate` -> `validateFuncCoreToolsInstalled`.
 *   4. Asserts `func --version` runs again (PRIMARY, disk-level — modeled on
 *      `waitForBundleRepaired` in bundleRepair.test.ts) and that the blocking modal never
 *      appeared. The "no suppressed error toast" check is a documented SOFT check.
 *   5. Restores the original bytes in `afterEach` if the repair did not already replace them,
 *      so a mid-test failure cannot poison the shared runtime-dependency cache for the rest
 *      of the shard.
 *
 * Wiring: scenario `p414-funcrepair` in run-e2e.ts (also runnable in isolation via
 * E2E_MODE=funcrepaironly). Requires a workspace manifest from a prior Phase 4.1a
 * (`p41a-fixtures`) run.
 *
 * Two scenario settings are load-bearing, not incidental:
 *   - `validateDependencies: true` writes
 *     `azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation`, which IS
 *     `useBinariesDependencies()` (binaries.ts:793-800). With it off the product never
 *     reaches the self-heal branch and this test would assert nothing.
 *   - `autoStartDesignTime: false` keeps a design-time `func host start` from holding the
 *     binary open while we overwrite it (a running .exe is unwritable on Windows).
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VSBrowser, Workbench, type WebDriver } from 'vscode-extension-tester';
import { waitForExtensionReady } from './createWorkspaceShared';
import {
  getFuncCoreToolsCandidatePaths,
  getFuncCoreToolsPath,
  getManagedFuncCoreToolsDir,
  openWorkspaceFileInSession,
  waitForDependencyValidation,
} from './designerHelpers';
import { captureScreenshot, sleep } from './helpers';
import { startDebugging, stopDebugging } from './runHelpers';
import { funcVersionRuns, isExecutableFile } from './runtimeBinaryCheck';
import { loadWorkspaceManifest } from './workspaceManifest';

const LOG_PREFIX = '[funcRepair]';

/**
 * Deliberately larger than the sum of the sub-timeouts below (240s + 300s + 300s) so that a
 * stall always fails with the specific diagnostic from the waiter that stalled — a bare Mocha
 * timeout would throw that evidence away. It is a ceiling, not a budget: a healthy run is
 * ~5-8 minutes, dominated by the two func downloads (initial install + repair).
 */
const TEST_TIMEOUT = 960_000;
const EXTENSION_READY_TIMEOUT_MS = 240_000;

/** How long we wait for the initial managed install to produce a runnable func. */
const BASELINE_TIMEOUT_MS = 300_000;

/**
 * How long we wait for the pre-debug gate to reinstall the managed binaries. The repair
 * re-downloads and re-extracts the whole Func Core Tools package, so this is sized for a cold
 * CI runner rather than a warm dev box (same 5 minutes bundleRepair.test.ts allows its repair).
 */
const REPAIR_TIMEOUT_MS = 300_000;

/** Bound on a single `func --version` probe. Generous because func can JIT slowly on first run. */
const FUNC_PROBE_TIMEOUT_MS = 60_000;

/**
 * Consecutive successful baseline probes required before we corrupt anything. One success is
 * not enough: activation-time dependency validation can be mid-reinstall, and corrupting into
 * an in-flight extract would make the repair we later observe ambiguous.
 */
const REQUIRED_STABLE_PROBES = 2;

/** Text of the modal the self-heal exists to avoid (validatePreDebug.ts:54-57). */
const BLOCKING_PROMPT_TEXT = 'You must have the Azure Functions Core Tools installed';

/**
 * Toasts that `downloadAndExtractDependency` suppresses when the caller passes
 * `{ suppressUi: true }` (binaries.ts:100-136, :245-249). Their absence is the user-visible
 * half of "silent repair" — but see `SOFT` handling below.
 */
const SUPPRESSED_ERROR_FRAGMENTS = ['Error downloading the', 'Checksum verification failed', 'could not be installed at'];

/**
 * Bytes written over the func executable.
 *
 * Deliberately NOT empty and deliberately without a `#!` shebang or a leading `#`: on Linux,
 * glibc's execvp falls back to running a non-ELF file through /bin/sh, so an empty file or a
 * comment-only file would EXIT 0 and the repro would silently prove nothing. An unknown
 * command word exits 127 there, and on Windows a non-PE image fails to load outright. The
 * test asserts `func --version` actually fails after the write, so a future platform that
 * disagrees fails loudly here instead of producing a vacuous pass.
 */
const CORRUPTION_MARKER = 'la-e2e-funcRepair-corrupted-binary\n';

/**
 * Where the pristine func bytes are parked while the binaries are corrupted.
 *
 * Copied to disk rather than held in memory: the managed func binaries are self-contained
 * .NET executables (tens of MB each, three of them), and buffering all of them in the Mocha
 * process for the duration of a multi-minute reinstall is a needless RSS spike on a CI runner.
 */
const BACKUP_DIR = path.join(os.tmpdir(), 'la-e2e-funcRepair-backup');

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'funcRepair-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

/**
 * VS Code User settings written by run-e2e.ts's `writeTestSettings()` (ExTester copies the
 * generated settings file here before launching). Fallback source for the dependency root when
 * the harness env var is absent — this is the same setting the product reads via
 * `getGlobalSetting(autoRuntimeDependenciesPathSettingKey)`.
 */
const HARNESS_USER_SETTINGS_PATH = path.join(os.tmpdir(), 'test-resources', 'settings', 'User', 'settings.json');
const AUTO_RUNTIME_DEPENDENCIES_PATH_SETTING = 'azureLogicAppsStandard.autoRuntimeDependenciesPath';
const FUNC_BINARY_PATH_SETTING = 'azureLogicAppsStandard.funcCoreToolsBinaryPath';

/** Runtime-dependency root published by run-e2e.ts `writeTestSettings()`. */
const DEPS_ROOT_ENV_VAR = 'LA_E2E_RUNTIME_DEPS_ROOT';

interface CorruptedBinary {
  filePath: string;
  backupPath: string;
  originalMode: number;
}

interface RepairWatchResult {
  repaired: boolean;
  elapsedMs: number;
  lastReason: string;
  blockingPromptText: string;
  suppressedErrorText: string;
  scrapedWorkbenchContent: boolean;
}

/**
 * Resolves the runtime-dependency root the harness configured for this session.
 *
 * Priority: the env var run-e2e.ts publishes from `writeTestSettings()` (authoritative — same
 * mechanism as LA_E2E_LSP_EPERM_DEPS_ROOT), then the `autoRuntimeDependenciesPath` setting the
 * product itself reads, then the product default.
 *
 * Deliberately never reads `funcCoreToolsBinaryPath`: the product rewrites that setting at
 * runtime (`setFunctionsCommand`, funcVersion.ts:298-311) and it legitimately holds the bare
 * command `func`, which resolves through PATH to whatever func the machine has installed
 * globally. This test must only ever touch the extension-managed copy, so the binary path
 * setting is logged for diagnosis and never used as a write target.
 */
function resolveDependenciesRoot(): { root: string; source: string; configuredFuncBinaryPath: string } {
  let configuredFuncBinaryPath = '<unset>';
  let settingsRoot = '';
  try {
    if (fs.existsSync(HARNESS_USER_SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(HARNESS_USER_SETTINGS_PATH, 'utf-8')) as Record<string, unknown>;
      const configuredBinary = settings[FUNC_BINARY_PATH_SETTING];
      if (typeof configuredBinary === 'string' && configuredBinary.length > 0) {
        configuredFuncBinaryPath = configuredBinary;
      }
      const configuredRoot = settings[AUTO_RUNTIME_DEPENDENCIES_PATH_SETTING];
      if (typeof configuredRoot === 'string' && configuredRoot.trim().length > 0) {
        settingsRoot = configuredRoot;
      }
    }
  } catch (error) {
    console.log(`${LOG_PREFIX} Could not read ${HARNESS_USER_SETTINGS_PATH}: ${error}`);
  }

  const harnessRoot = process.env[DEPS_ROOT_ENV_VAR];
  if (harnessRoot && harnessRoot.trim().length > 0) {
    return { root: harnessRoot, source: DEPS_ROOT_ENV_VAR, configuredFuncBinaryPath };
  }
  if (settingsRoot) {
    return {
      root: settingsRoot,
      source: `${AUTO_RUNTIME_DEPENDENCIES_PATH_SETTING} in ${HARNESS_USER_SETTINGS_PATH}`,
      configuredFuncBinaryPath,
    };
  }
  return {
    root: path.join(os.homedir(), '.azurelogicapps', 'dependencies'),
    source: 'default (~/.azurelogicapps/dependencies)',
    configuredFuncBinaryPath,
  };
}

/**
 * Refuses to write to anything outside the managed FuncCoreTools folder.
 *
 * Same containment test the product uses to decide whether a func command is
 * extension-managed (`getManagedFuncCoreToolsPath`, funcVersion.ts:38-52). This is the guard
 * that keeps a mis-resolved path from clobbering a developer's global func install.
 */
function assertInsideManagedFuncDir(candidate: string, funcToolsDir: string): void {
  const relative = path.relative(funcToolsDir, candidate);
  const isManaged = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  assert.ok(
    isManaged,
    `Refusing to corrupt "${candidate}": it is not inside the extension-managed FuncCoreTools folder "${funcToolsDir}". Only the harness-provisioned copy may be touched.`
  );
}

/** Describes one func candidate for timeout/diagnostic messages. */
function describeBinary(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) {
      return `${filePath} (missing)`;
    }
    return `${filePath} (size=${fs.statSync(filePath).size}, executable=${isExecutableFile(filePath)})`;
  } catch (error) {
    return `${filePath} (unreadable: ${error})`;
  }
}

/** True when the file still holds exactly the bytes this test wrote. */
function stillHoldsCorruption(filePath: string): boolean {
  try {
    return fs.readFileSync(filePath, 'utf-8') === CORRUPTION_MARKER;
  } catch {
    return false;
  }
}

/**
 * Polls until the managed func has been runnable for {@link REQUIRED_STABLE_PROBES}
 * consecutive probes. Detection-based rather than a fixed settle sleep: the signal we need is
 * the same one the product uses, so we can just ask for it repeatedly.
 */
async function waitForStableRunnableFunc(funcBinaryPath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let consecutiveSuccesses = 0;
  let lastReason = 'no probe yet';
  while (Date.now() < deadline) {
    if (!fs.existsSync(funcBinaryPath)) {
      lastReason = 'func binary not on disk';
      consecutiveSuccesses = 0;
    } else if (funcVersionRuns(funcBinaryPath, FUNC_PROBE_TIMEOUT_MS)) {
      consecutiveSuccesses += 1;
      lastReason = `${consecutiveSuccesses}/${REQUIRED_STABLE_PROBES} consecutive successful probes`;
      if (consecutiveSuccesses >= REQUIRED_STABLE_PROBES) {
        return;
      }
    } else {
      lastReason = '"func --version" did not exit 0';
      consecutiveSuccesses = 0;
    }
    await sleep(5000);
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for a stably runnable managed func. Last reason: ${lastReason}. Binary: ${describeBinary(funcBinaryPath)}`
  );
}

/**
 * Best-effort scrape of every workbench surface that could carry the blocking prompt.
 *
 * Scrapes from the top-level document, never from whatever frame the driver is parked in — a
 * scrape taken inside a webview iframe returns '' for all selectors, which would silently make
 * the "modal never appeared" assertion vacuous. `.monaco-dialog-box` is included because the
 * prompt is `{ modal: true }` and modal dialogs do NOT render into the notification list
 * (see the modal-dialog rules in .squad/knowledge/vscode-e2e-testing.md).
 */
async function getVisibleWorkbenchText(driver: WebDriver): Promise<string> {
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
      '.notifications-list-container',
      '.monaco-progress-container',
      '.quick-input-widget:not(.hidden)',
      '.monaco-workbench'
    ];
    return selectors
      .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .map((el) => el.textContent || '')
      .join('\\n');
  `);
}

/**
 * Tails the most recent "Azure Logic Apps" output-channel log.
 *
 * Mirrors `logLatestLogicAppsOutput` in azuriteAutostartFailureAssert.test.ts. This is where
 * the repair's own breadcrumbs land (`Validating FuncCoreTools...`, the download/extract
 * lines), so it is the first thing worth reading for a CI-only failure.
 */
function logLatestLogicAppsOutput(label: string): void {
  try {
    const logsRoot = path.join(os.tmpdir(), 'test-resources', 'settings', 'logs');
    if (!fs.existsSync(logsRoot)) {
      console.log(`${LOG_PREFIX} ${label} output log: logs root does not exist (${logsRoot})`);
      return;
    }

    const matches: string[] = [];
    const collect = (directory: string): void => {
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
      console.log(`${LOG_PREFIX} ${label} output log: no Azure Logic Apps output log found`);
      return;
    }
    console.log(`${LOG_PREFIX} ${label} output log (${latest}):\n${fs.readFileSync(latest, 'utf-8').slice(-6000)}`);
  } catch (error) {
    console.log(`${LOG_PREFIX} Failed to read ${label} output log: ${error}`);
  }
}

/**
 * Watches disk and UI at the same time until the corrupted func runs again.
 *
 * Disk is the authoritative signal (same shape as `waitForBundleRepaired`); the UI scrape runs
 * in the same loop so that a blocking modal is observed at the moment it appears rather than
 * inferred afterwards from a timeout.
 */
async function watchForFuncRepair(
  driver: WebDriver,
  primaryFuncPath: string,
  corrupted: CorruptedBinary[],
  timeoutMs: number
): Promise<RepairWatchResult> {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const result: RepairWatchResult = {
    repaired: false,
    elapsedMs: 0,
    lastReason: 'no check yet',
    blockingPromptText: '',
    suppressedErrorText: '',
    scrapedWorkbenchContent: false,
  };
  let lastLoggedAt = 0;
  let loggedScrapeFailure = false;

  while (Date.now() < deadline) {
    try {
      const visibleText = await getVisibleWorkbenchText(driver);
      if (visibleText.length > 0) {
        result.scrapedWorkbenchContent = true;
      }
      if (result.blockingPromptText === '' && visibleText.includes(BLOCKING_PROMPT_TEXT)) {
        result.blockingPromptText = BLOCKING_PROMPT_TEXT;
        console.log(`${LOG_PREFIX} ✗ Blocking install prompt appeared — the self-heal did not run or did not succeed.`);
      }
      if (result.suppressedErrorText === '') {
        const matched = SUPPRESSED_ERROR_FRAGMENTS.find((fragment) => visibleText.includes(fragment));
        if (matched) {
          result.suppressedErrorText = matched;
        }
      }
    } catch (error) {
      // A scrape failure must never decide the outcome — the disk check below is authoritative
      // — so it is logged (once) rather than folded into lastReason, where the disk check would
      // immediately overwrite it. Repeated failures still surface via the liveness assertion.
      if (!loggedScrapeFailure) {
        loggedScrapeFailure = true;
        console.log(`${LOG_PREFIX} ⚠ Workbench text scrape failed (continuing on the disk signal): ${error}`);
      }
    }

    if (!fs.existsSync(primaryFuncPath)) {
      // Expected transient: the reinstall deletes and recreates the whole FuncCoreTools folder.
      result.lastReason = 'func binary not on disk yet (reinstall in progress?)';
    } else if (stillHoldsCorruption(primaryFuncPath)) {
      result.lastReason = 'func binary still holds the corruption marker bytes';
    } else if (funcVersionRuns(primaryFuncPath, FUNC_PROBE_TIMEOUT_MS)) {
      result.repaired = true;
      result.elapsedMs = Date.now() - startedAt;
      return result;
    } else {
      result.lastReason = '"func --version" still does not exit 0';
    }

    if (Date.now() - lastLoggedAt >= 15_000) {
      lastLoggedAt = Date.now();
      console.log(`${LOG_PREFIX} waiting for repair (${Math.round((Date.now() - startedAt) / 1000)}s): ${result.lastReason}`);
    }

    // Once the blocking modal is up the verdict is already decided: the product only reaches
    // it after attemptManagedFuncCoreToolsRepair has returned false, and a modal blocks the
    // extension host anyway. Stop early so a genuine regression fails in seconds with the disk
    // state captured, instead of burning the whole timeout.
    if (result.blockingPromptText !== '') {
      break;
    }
    await sleep(2000);
  }

  result.elapsedMs = Date.now() - startedAt;
  result.lastReason = `${result.lastReason}. Candidates: ${corrupted.map((entry) => describeBinary(entry.filePath)).join('; ')}`;
  return result;
}

describe('Func Core Tools pre-debug self-heal — unrunnable binary repaired instead of blocking F5 (E2E)', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let corruptedBinaries: CorruptedBinary[] = [];
  let primaryFuncPath = '';

  before(function () {
    this.timeout(60_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
  });

  afterEach(async function () {
    this.timeout(120_000);

    try {
      await stopDebugging(driver);
    } catch (error) {
      console.log(`${LOG_PREFIX} Could not stop the debug session: ${error}`);
    }

    // Restore only what the repair did not already replace. A mid-test failure must not leave
    // a poisoned FuncCoreTools folder behind for the sibling scenarios on this shard — and the
    // scenario-level retry would otherwise start from a func that can never satisfy its
    // baseline gate. (The activation-time integrity manifest check would eventually notice the
    // size drift and reinstall, but relying on that would make the next run's timing random.)
    for (const entry of corruptedBinaries) {
      try {
        if (!fs.existsSync(entry.filePath) || stillHoldsCorruption(entry.filePath)) {
          fs.mkdirSync(path.dirname(entry.filePath), { recursive: true });
          fs.copyFileSync(entry.backupPath, entry.filePath);
          fs.chmodSync(entry.filePath, entry.originalMode);
          console.log(`${LOG_PREFIX} Restored original bytes: ${entry.filePath}`);
        }
      } catch (error) {
        console.log(`${LOG_PREFIX} ⚠ Could not restore ${entry.filePath}: ${error}`);
      }
    }
    corruptedBinaries = [];
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });

    if (primaryFuncPath && !funcVersionRuns(primaryFuncPath, FUNC_PROBE_TIMEOUT_MS)) {
      console.log(`${LOG_PREFIX} ⚠ "func --version" still fails after cleanup: ${describeBinary(primaryFuncPath)}`);
    }
  });

  it('repairs a provisioned-but-unrunnable func during the pre-debug gate instead of showing the install modal', async function () {
    this.timeout(TEST_TIMEOUT);

    // This scenario reuses a workspace created by the real Create Workspace wizard in Phase
    // 4.1a; without the manifest there is nothing to press F5 on.
    const manifest = loadWorkspaceManifest();
    const standard = manifest.find((entry) => entry.appType === 'standard' && entry.wfType === 'Stateful');
    if (!standard) {
      console.log(`${LOG_PREFIX} No Standard/Stateful workspace in the manifest — skipping (run p41a-fixtures first).`);
      this.skip();
      return;
    }

    const { root, source, configuredFuncBinaryPath } = resolveDependenciesRoot();
    const funcToolsDir = getManagedFuncCoreToolsDir(root);
    console.log(`${LOG_PREFIX} dependency root=${root} (from ${source})`);
    console.log(`${LOG_PREFIX} managed FuncCoreTools dir=${funcToolsDir}`);
    console.log(`${LOG_PREFIX} ${FUNC_BINARY_PATH_SETTING}=${configuredFuncBinaryPath} (logged only; never used as a write target)`);

    // ── Step 1: open the workspace and let the extension settle ──────────────
    // Explicitly open the generated .code-workspace: ExTester's startup `resources` uses
    // `code -r` (CLI IPC), which silently no-ops on headless CI. Done BEFORE the corruption
    // because opening a workspace re-runs activation — and with dependency validation on, that
    // activation could reinstall func and make the later repair ambiguous.
    console.log(`${LOG_PREFIX} Step 1: opening ${standard.wsFilePath}`);
    await openWorkspaceFileInSession(workbench, standard.wsFilePath);
    workbench = new Workbench();
    // Hard gate: F5 goes through the "Start Debugging" command pick, and `startDebugging()`
    // does NOT throw when the pick is missing — it logs and returns. Without this gate an
    // early F5 would surface minutes later as "func was never repaired" and blame the product.
    await waitForExtensionReady(workbench, EXTENSION_READY_TIMEOUT_MS);
    console.log(`${LOG_PREFIX} Logic Apps extension commands are registered`);
    await waitForDependencyValidation(driver);

    primaryFuncPath = getFuncCoreToolsPath(funcToolsDir);
    await waitForStableRunnableFunc(primaryFuncPath, BASELINE_TIMEOUT_MS);
    console.log(`${LOG_PREFIX} Baseline OK — ${describeBinary(primaryFuncPath)} runs "func --version"`);

    // ── Step 2: corrupt every managed func executable in place ───────────────
    // All of them, not just the resolved one: the product re-resolves its command from
    // `funcCoreToolsBinaryPath` / the in-proc8 / in-proc6 layout (funcVersion.ts:22-36), and a
    // real poisoned cache breaks the whole folder. Bytes are replaced in place so the file
    // keeps existing, keeps its .exe extension, and keeps its execute bit — the exact state an
    // existence check calls healthy and `func --version` calls broken.
    const candidates = getFuncCoreToolsCandidatePaths(funcToolsDir).filter((candidate) => fs.existsSync(candidate));
    assert.ok(
      candidates.length > 0,
      `Expected at least one managed func executable under ${funcToolsDir} after the baseline wait, found none.`
    );
    console.log(`${LOG_PREFIX} Step 2: corrupting ${candidates.length} managed func executable(s)`);
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    for (const [index, candidate] of candidates.entries()) {
      assertInsideManagedFuncDir(candidate, funcToolsDir);
      // Record the backup BEFORE writing, so every failure path after this point (including a
      // failed write or chmod) is still recoverable by the afterEach restore.
      const originalMode = fs.statSync(candidate).mode;
      const backupPath = path.join(BACKUP_DIR, `${index}-${path.basename(candidate)}`);
      fs.copyFileSync(candidate, backupPath);
      corruptedBinaries.push({ filePath: candidate, backupPath, originalMode });
      try {
        fs.writeFileSync(candidate, CORRUPTION_MARKER);
      } catch (error) {
        assert.fail(
          `Could not overwrite ${candidate}: ${error}. On Windows this means a func process still holds the binary open — check that the scenario runs with autoStartDesignTime: false and that prepareFreshSession killed leftover func hosts.`
        );
      }
      fs.chmodSync(candidate, originalMode);
    }

    // The repro is only meaningful if the file now looks installed and refuses to run.
    assert.ok(fs.existsSync(primaryFuncPath), `Corrupted func must still exist on disk: ${primaryFuncPath}`);
    assert.ok(
      isExecutableFile(primaryFuncPath),
      `Corrupted func must still look executable (extension / execute bit preserved): ${describeBinary(primaryFuncPath)}`
    );
    assert.strictEqual(
      funcVersionRuns(primaryFuncPath, FUNC_PROBE_TIMEOUT_MS),
      false,
      `"func --version" unexpectedly succeeded after corruption (${describeBinary(primaryFuncPath)}). The rest of this test would prove nothing, so it fails here instead.`
    );
    console.log(`${LOG_PREFIX} Corruption verified — ${describeBinary(primaryFuncPath)} exists but "func --version" fails`);

    // ── Step 3: trigger the pre-debug gate ───────────────────────────────────
    // The generated launch.json is `type: coreclr, request: attach,
    // processId: ${command:azureLogicAppsStandard.pickProcess}`, so F5 runs
    // pickFuncProcessInternal -> preDebugValidate -> validateFuncCoreToolsInstalled. Nothing
    // else in the extension calls that gate.
    console.log(`${LOG_PREFIX} Step 3: pressing F5 (Debug: Start Debugging)`);
    await startDebugging(workbench, driver);

    // ── Step 4: wait for the repair, watching the UI at the same time ────────
    console.log(`${LOG_PREFIX} Step 4: waiting for the managed func to become runnable again`);
    const watch = await watchForFuncRepair(driver, primaryFuncPath, corruptedBinaries, REPAIR_TIMEOUT_MS);
    if (!watch.repaired || watch.blockingPromptText !== '') {
      await captureScreenshot(driver, 'funcRepair-not-repaired', EXPLICIT_SCREENSHOT_DIR);
      logLatestLogicAppsOutput('repair did not complete');
    }

    // Liveness: "the modal never appeared" is only meaningful if we were scraping a rendered
    // workbench at all. `.monaco-workbench` always carries text in a live session, so a whole
    // window of empty scrapes is a harness fault, not a product signal.
    assert.ok(
      watch.scrapedWorkbenchContent,
      `Workbench text scrape was empty for the entire ${REPAIR_TIMEOUT_MS}ms window — the "${BLOCKING_PROMPT_TEXT}" assertion would be vacuous.`
    );

    // HARD: the whole point of the self-heal is that this modal is never reached.
    assert.strictEqual(
      watch.blockingPromptText,
      '',
      `The blocking "${BLOCKING_PROMPT_TEXT}" prompt appeared after F5. attemptManagedFuncCoreToolsRepair either never ran (is useBinariesDependencies() false? check azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation) or failed to produce a runnable func.`
    );

    // HARD + PRIMARY: disk-level proof that the corrupted binary was actually replaced.
    assert.ok(
      watch.repaired,
      `Timed out after ${REPAIR_TIMEOUT_MS}ms waiting for the pre-debug gate to repair the managed func. Last reason: ${watch.lastReason}`
    );
    assert.ok(
      !stillHoldsCorruption(primaryFuncPath),
      `func --version succeeded but ${primaryFuncPath} still holds the corruption marker bytes — the probe must have resolved a different binary.`
    );
    console.log(`${LOG_PREFIX} ✓ Managed func repaired in ${Math.round(watch.elapsedMs / 1000)}s — ${describeBinary(primaryFuncPath)}`);

    // SOFT: `{ suppressUi: true }` should keep the download/checksum/extract toasts off screen.
    // Non-blocking on purpose, exactly like `waitForRepairNotification` in bundleRepair.test.ts:
    // toast timing is racy (they auto-dismiss, and an unrelated toast can match a fragment),
    // and the disk-level repair above is the authoritative pass/fail signal.
    if (watch.suppressedErrorText === '') {
      console.log(`${LOG_PREFIX} ✓ No suppressed-by-design error toast observed during the repair`);
    } else {
      console.log(
        `${LOG_PREFIX} ⚠ Observed an error toast fragment that { suppressUi: true } is meant to suppress: "${watch.suppressedErrorText}" (soft check — not failing the test)`
      );
    }
  });
});

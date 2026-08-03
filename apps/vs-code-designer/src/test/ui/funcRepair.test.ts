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
 *   3. Starts debugging through the recorder extension's marker-file trigger (see
 *      `triggerDebugViaRecorder`), which routes through `pickFuncProcessInternal` ->
 *      `preDebugValidate` -> `validateFuncCoreToolsInstalled`.
 *   4. Gates on evidence that the product actually reacted BEFORE settling in to wait for the
 *      repair, so "the harness never triggered the product" can never masquerade as "the
 *      product failed to repair". Every polling wait from that point on also answers the Azure
 *      connectors QuickPick, which `refreshConnectionKeys` raises two statements before the gate
 *      and which otherwise parks the whole flow (see `dismissConnectorsPromptIfVisible`).
 *   5. Asserts `func --version` runs again (PRIMARY, disk-level — modeled on
 *      `waitForBundleRepaired` in bundleRepair.test.ts) and that the blocking modal never
 *      appeared. The "no suppressed error toast" check is a documented SOFT check.
 *   6. Restores the original bytes in `afterEach` if the repair did not already replace them,
 *      so a mid-test failure cannot poison the shared runtime-dependency cache for the rest
 *      of the shard.
 *
 * WHY NOT F5 FROM THE COMMAND PALETTE: `startDebugging()` resolves the launch configuration
 * from whatever editor happens to be active, and a headless CI session does not settle that
 * reliably. Run 30549543233 debugged with an auto-opened markdown preview focused; run
 * 30554041131 debugged with `settings.json` focused even after closing all editors and opening
 * `workflow.json` via Quick Open three times. Both produced the same useless outcome: VS Code
 * never resolved the Logic App folder's launch.json, `pickProcess` never ran, and the test
 * timed out blaming the product. The recorder extension calls
 * `vscode.debug.startDebugging(folder, configName)` with an EXPLICIT folder, so the trigger has
 * no dependency on focus at all. See SKILL.md rule 18.
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
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
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
import { captureScreenshot, dismissQuickPickIfVisible, sleep } from './helpers';
import { stopDebugging } from './runHelpers';
import { funcVersionRuns, isExecutableFile } from './runtimeBinaryCheck';
import { loadWorkspaceManifest } from './workspaceManifest';

const LOG_PREFIX = '[funcRepair]';

/**
 * Deliberately larger than the sum of the sub-timeouts below (180s extension-ready + 240s
 * baseline + 60s recorder + 60s dispatch + 60s liveness gate + 300s repair = 900s) so that a
 * stall always fails with the specific diagnostic from the waiter that stalled — a bare Mocha
 * timeout would throw that evidence away.
 *
 * BUDGET: the `func-selfheal` job is `timeout-minutes: 35` with `LA_E2E_SCENARIO_RETRIES: '1'`,
 * so it must fit `p41a-fixtures` plus up to two attempts of this scenario. The 900s figure is a
 * worst-case ceiling that only binds on an already-failing attempt; a healthy run is ~5-8
 * minutes, dominated by the two Func Core Tools downloads (initial managed install + repair).
 * Do not raise the sub-timeouts without re-checking that arithmetic.
 */
const TEST_TIMEOUT = 960_000;
const EXTENSION_READY_TIMEOUT_MS = 180_000;

/** How long we wait for the initial managed install to produce a runnable func. */
const BASELINE_TIMEOUT_MS = 240_000;

/**
 * How long we wait for the pre-debug gate to reinstall the managed binaries. The repair
 * re-downloads and re-extracts the whole Func Core Tools package, so this is sized for a cold
 * CI runner rather than a warm dev box (same 5 minutes bundleRepair.test.ts allows its repair).
 */
const REPAIR_TIMEOUT_MS = 300_000;

/**
 * How long the recorder extension has to prove it is alive (an `activate` or `ping` event).
 * It activates on `onStartupFinished`, and by the time we get here the Logic Apps extension has
 * already activated and installed its dependencies, so this is only ever a fast sanity check.
 */
const RECORDER_READY_TIMEOUT_MS = 60_000;

/**
 * How long the recorder has to consume the `start-debug` marker and reach
 * `vscode.debug.startDebugging`. The marker is polled every 500ms and the recorder's own
 * command-registration wait is already satisfied, so a healthy run takes a couple of seconds.
 */
const DEBUG_DISPATCH_TIMEOUT_MS = 60_000;

/**
 * How long we allow for the product to visibly react to the debug start before declaring that
 * the harness, not the product, is at fault. Sized off the slowest pre-gate step:
 * `activateAzurite` starts the emulator and `waitForAzuriteReady` polls it, and the repair's own
 * first download line only lands after a version lookup over the network. 60s is comfortably
 * past both on a cold runner while still failing ~5x faster than the repair wait it protects.
 */
const GATE_EVIDENCE_TIMEOUT_MS = 60_000;

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
 * Output-channel lines that only the debug-start -> `pickFuncProcessInternal` path can produce.
 *
 * Ordered by how far into that path they prove we got. Everything here is written
 * unconditionally by its own step (none of them are gated on `suppressUi`, which only guards
 * `showErrorMessage`), and all of them precede or belong to the repair itself:
 *   - `activateAzurite` runs FIRST in pickFuncProcessInternal (pickFuncProcess.ts:87-106).
 *   - `refreshConnectionKeys` runs SECOND (:112-116) and logs one of these two lines whenever
 *     the fixture has no Azure connectors, which is the case for a wizard-generated workspace.
 *   - `Downloading dependency from` is `downloadAndExtractDependency`'s first line
 *     (binaries.ts:92) — reached only via the self-heal branch of the gate itself.
 *
 * Any one of them is sufficient: this is a liveness gate, not a behavioural assertion. A false
 * positive only costs us the ordinary repair wait; a false negative would fail a run in which
 * the product actually did its job, so the set is deliberately broad.
 */
const GATE_EVIDENCE_MARKERS = [
  'Downloading dependency from',
  'Successfully downloaded',
  'Successfully installed',
  'Azurite is setup to auto start',
  'Could not start Azurite',
  'Azure connectors are disabled',
  'No connection keys found',
];

/**
 * Output-channel lines that prove execution got PAST `refreshConnectionKeys` — i.e. past the
 * last step before the gate we are actually testing.
 *
 * Both are terminal `return`s of `refreshConnectionKeys` (connectionKeys.ts:22 and :29), and
 * both are what a wizard-generated fixture produces: with no Azure account, answering the
 * connectors prompt with "Skip for now" (or Escape, which `azureConnectorWizard.ts:59-62` maps
 * to the same `{ data: 'no' }`) leaves `azureConnectorDetails.enabled` false and logs
 * "Azure connectors are disabled. Skipping connection key refresh."
 *
 * WHY THIS IS A SEPARATE SET FROM {@link GATE_EVIDENCE_MARKERS}, even though the two overlap:
 * the two sets answer different questions and must not be conflated.
 *   - `GATE_EVIDENCE_MARKERS` answers "did the harness reach the product at all?" It is
 *     deliberately broad and its earliest member, the Azurite line, is written by
 *     `activateAzurite` — pickFuncProcessInternal's FIRST step (pickFuncProcess.ts:87-106).
 *   - This set answers "did the product get far enough to reach the func gate?"
 *     `refreshConnectionKeys` runs at :112-116 and `preDebugValidate` — the gate — at :119.
 *
 * That gap is not hypothetical. In run 30557613214 the flow logged the Azurite line, so the
 * liveness gate correctly reported "reached", and then parked on the unanswered connectors
 * QuickPick two steps before the gate. The repair therefore never ran, and with only one set we
 * reported it as a repair failure. Tracking these separately lets the failure message say which
 * of the two happened.
 */
const PAST_CONNECTION_KEYS_MARKERS = ['Azure connectors are disabled', 'No connection keys found'];

/**
 * Identifies the connectors QuickPick from `GetSubscriptionDetailsStep.prompt`
 * (azureConnectorWizard.ts:50-68). Matched case-insensitively against the visible
 * `.quick-input-widget` text before anything is clicked — see `dismissConnectorsPromptIfVisible`.
 */
const CONNECTORS_PROMPT_FRAGMENTS = ['enable connectors in azure', 'use connectors from azure', 'skip for now'];

/**
 * Azurite blob port. `activateAzurite` starts the emulator before the gate runs, so a listener
 * appearing here after the debug start is independent proof that `pickFuncProcessInternal`
 * executed — no log parsing involved. Only counted when nothing was listening beforehand (see
 * `isPortListening`), otherwise the signal would be vacuous.
 */
const AZURITE_BLOB_PORT = 10000;

/**
 * JSONL written by the codeful task recorder extension (`codefulTaskRecorderExtension/main.js`),
 * and the directory it polls for marker files. Both are configured per attempt by
 * `configureCodefulRecorderEnvironment()` in run-e2e.ts, which is wired to this scenario by
 * `recorder: true`. The fallbacks mirror the recorder's own so a hand-run still lines up.
 */
const EVENTS_FILE =
  process.env.LA_E2E_TASK_EVENTS_JSONL ||
  process.env.CODEFUL_TASK_EVENTS_JSONL ||
  path.join(os.tmpdir(), 'la-e2e-test', 'codeful-events.jsonl');
const TRIGGER_DIR = process.env.LA_E2E_TRIGGER_DIR || path.join(os.tmpdir(), 'la-e2e-test', 'triggers');

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
  /** True once the output channel shows `refreshConnectionKeys` returned — i.e. the flow reached the gate. */
  pastConnectionKeys: boolean;
  /** How many times the connectors QuickPick had to be answered. Normally 1; 0 means it never appeared. */
  connectorsPromptDismissals: number;
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

/**
 * Windows-only: names the processes that can be holding a func executable open.
 *
 * A running `.exe` is unwritable on Windows, so the in-place corruption in step 2 is the one
 * step of this test that a live func host can break — and it is a failure mode Linux
 * structurally cannot reproduce, because there an executable can be overwritten while it runs.
 * Printing the actual process list turns an otherwise blind EPERM/EBUSY on the platform with
 * the least history behind this scenario into a self-explaining failure.
 *
 * Best-effort and never throws: it only ever runs on a path that is already failing.
 */
function describeRunningFuncProcesses(): string {
  if (process.platform !== 'win32') {
    return '';
  }
  try {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        'Get-Process -Name func -ErrorAction SilentlyContinue | Select-Object -First 10 Id,Path | Format-Table -AutoSize | Out-String',
      ],
      { timeout: 15_000, encoding: 'utf-8' }
    );
    const text = String(output).trim();
    return text === ''
      ? ' No running "func" processes were found, so the handle is held by something else (check for a read-only attribute on the file).'
      : ` Running func processes:\n${text}`;
  } catch (error) {
    return ` (could not list running func processes: ${error})`;
  }
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
 * Locates and reads the most recent "Azure Logic Apps" output-channel log.
 *
 * Mirrors the log discovery in azuriteAutostartFailureAssert.test.ts. This is where the
 * repair's own breadcrumbs land (`Validating FuncCoreTools...`, the download/extract lines),
 * so it backs both the failure diagnostics and the post-F5 liveness gate. Returns `undefined`
 * rather than throwing: every caller treats a missing log as "no evidence", never as an error.
 */
function readLatestLogicAppsOutput(): { filePath: string; content: string } | undefined {
  try {
    const logsRoot = path.join(os.tmpdir(), 'test-resources', 'settings', 'logs');
    if (!fs.existsSync(logsRoot)) {
      return undefined;
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
      return undefined;
    }
    return { filePath: latest, content: fs.readFileSync(latest, 'utf-8') };
  } catch {
    return undefined;
  }
}

/**
 * Marks how much output-channel log already existed, so the liveness gate can only ever match
 * on lines written AFTER the debug start. Without this watermark the gate would happily match
 * the initial install's own download lines and pass no matter what the debug start did.
 */
interface OutputWatermark {
  filePath: string;
  length: number;
}

function captureOutputWatermark(): OutputWatermark | undefined {
  const log = readLatestLogicAppsOutput();
  return log ? { filePath: log.filePath, length: log.content.length } : undefined;
}

/**
 * Returns only the output written since the watermark.
 *
 * PINNED TO `watermark.filePath` ON PURPOSE. The previous version re-ran the "newest log by
 * mtime" search on every call, which is not stable: the logs tree contains many `*.log` files
 * and a different one can become the newest at any moment, at which point this returned that
 * unrelated file's entire contents as "new output". That is how the failing run at
 * https://github.com/Azure/LogicAppsUX/actions/runs/30557613214 printed a node tarball listing
 * instead of the extension's own log and hid a `refreshConnectionKeys` stall for a whole CI
 * cycle. Once the watermark is taken we read that exact file and nothing else.
 *
 * With no watermark at all there is nothing to pin to, so we fall back to the latest file and
 * treat all of it as new — the same behaviour as before, but now only on that one path.
 */
function readOutputSinceWatermark(watermark: OutputWatermark | undefined): string {
  if (!watermark) {
    return readLatestLogicAppsOutput()?.content ?? '';
  }
  try {
    const content = fs.readFileSync(watermark.filePath, 'utf-8');
    // A shorter file means it was rotated or truncated under us; everything in it is new.
    return content.length < watermark.length ? content : content.slice(watermark.length);
  } catch {
    return '';
  }
}

/**
 * Dumps the output the extension wrote SINCE the watermark, pinned to the watermarked file.
 *
 * This is the diagnostic every failure path should use: the whole point is to show what the
 * product did in response to the debug start, and unwatermarked tails of a re-resolved "latest"
 * file answer a different (and, as the run above showed, useless) question. Bounded to the last
 * 8 KB so a chatty install cannot bury the tail that matters.
 */
function logOutputSinceWatermark(label: string, watermark: OutputWatermark | undefined): void {
  if (!watermark) {
    const log = readLatestLogicAppsOutput();
    console.log(
      log
        ? `${LOG_PREFIX} ${label} — no watermark was taken; tail of the latest log (${log.filePath}):\n${log.content.slice(-8000)}`
        : `${LOG_PREFIX} ${label} — no watermark and no Azure Logic Apps output log found`
    );
    return;
  }
  const newOutput = readOutputSinceWatermark(watermark);
  if (newOutput.trim().length === 0) {
    console.log(
      `${LOG_PREFIX} ${label} — the extension wrote NOTHING to ${watermark.filePath} after the debug start (watermark ${watermark.length} bytes). Execution is parked somewhere that does not log.`
    );
    return;
  }
  console.log(
    `${LOG_PREFIX} ${label} — ${newOutput.length} bytes written to ${watermark.filePath} since the debug start (last 8 KB):\n${newOutput.slice(-8000)}`
  );
}

/**
 * Lists every "Azure Logic Apps" output log with its size, newest first.
 *
 * The liveness gate reads one pinned file on purpose (see `readOutputSinceWatermark`), but that
 * pinning has a blind spot on the failure path: if VS Code starts a new `output_logging_*` folder
 * — an extension-host restart does this — the product keeps logging into a file the watermark
 * never sees, and "the extension wrote NOTHING" becomes a false statement that costs a whole CI
 * cycle to disprove. Only used for diagnostics, never for assertions.
 */
function logAllLogicAppsOutputFiles(label: string, watermark: OutputWatermark | undefined): void {
  try {
    const logsRoot = path.join(os.tmpdir(), 'test-resources', 'settings', 'logs');
    if (!fs.existsSync(logsRoot)) {
      return;
    }
    const matches: { filePath: string; size: number; mtimeMs: number }[] = [];
    const collect = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          collect(entryPath);
        } else if (entry.name.includes('Azure Logic Apps') && entry.name.endsWith('.log')) {
          const stat = fs.statSync(entryPath);
          matches.push({ filePath: entryPath, size: stat.size, mtimeMs: stat.mtimeMs });
        }
      }
    };
    collect(logsRoot);
    if (matches.length === 0) {
      console.log(`${LOG_PREFIX} ${label} — no Azure Logic Apps output logs exist at all under ${logsRoot}`);
      return;
    }
    matches.sort((left, right) => right.mtimeMs - left.mtimeMs);
    console.log(
      `${LOG_PREFIX} ${label} — ${matches.length} Azure Logic Apps output log(s), newest first (watermarked file marked <-- PINNED):`
    );
    for (const match of matches) {
      const pinned = watermark && match.filePath === watermark.filePath ? '  <-- PINNED' : '';
      console.log(`${LOG_PREFIX}     ${match.size} bytes  ${match.filePath}${pinned}`);
    }
    // If the product logged into a file the watermark never saw, that file's tail is the evidence.
    const unpinnedNewest = matches.find((match) => !watermark || match.filePath !== watermark.filePath);
    if (unpinnedNewest) {
      try {
        const content = fs.readFileSync(unpinnedNewest.filePath, 'utf-8');
        console.log(`${LOG_PREFIX} ${label} — tail of the newest NON-pinned log ${unpinnedNewest.filePath}:\n${content.slice(-4000)}`);
      } catch {
        // Diagnostics only.
      }
    }
  } catch {
    // Diagnostics only.
  }
}

/** Non-throwing TCP liveness probe used to notice Azurite coming up after F5. */
async function isPortListening(port: number, timeoutMs = 1000): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    const finish = (listening: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, '127.0.0.1');
  });
}

/**
 * One line of the recorder extension's JSONL. Only the debug-lifecycle phases matter here; the
 * task phases belong to Phase 4.10 and are ignored.
 */
interface RecorderEvent {
  phase: string;
  taskName?: string;
  scopeFsPath?: string | null;
  timestamp?: string;
}

/** Reads the recorder's JSONL, skipping partially-flushed trailing lines. */
function readRecorderEvents(): RecorderEvent[] {
  try {
    if (!fs.existsSync(EVENTS_FILE)) {
      return [];
    }
    return fs
      .readFileSync(EVENTS_FILE, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as RecorderEvent];
        } catch {
          // A line the recorder was still appending when we read. It will parse next poll.
          return [];
        }
      });
  } catch {
    return [];
  }
}

/** Drops a marker file for the recorder's 500ms trigger poll to consume. */
function dropRecorderTrigger(name: 'start-debug' | 'stop-debug' | 'ping'): void {
  fs.mkdirSync(TRIGGER_DIR, { recursive: true });
  fs.writeFileSync(path.join(TRIGGER_DIR, name), '');
}

/** Compact JSONL dump for failure messages. */
function describeRecorderEvents(events: RecorderEvent[]): string {
  if (events.length === 0) {
    return '(no recorder events)';
  }
  return events.map((event) => `${event.phase}${event.taskName ? `:${event.taskName}` : ''}`).join(', ');
}

/**
 * Waits until the recorder extension proves it is alive.
 *
 * It writes an `activate` line on `onStartupFinished`, so in practice this returns on the first
 * poll; the `ping` marker is a second chance in case activation raced the events-file
 * truncation that run-e2e.ts performs per attempt.
 */
async function waitForRecorderReady(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (readRecorderEvents().some((event) => event.phase === 'activate' || event.phase === 'ping')) {
      return true;
    }
    try {
      dropRecorderTrigger('ping');
    } catch {
      // Trigger dir may not be writable yet — retried on the next poll.
    }
    await sleep(2000);
  }
  return false;
}

/**
 * Starts debugging the Logic App and confirms the request actually reached
 * `vscode.debug.startDebugging`.
 *
 * WHY NOT THE COMMAND PALETTE: `startDebugging()` in runHelpers resolves whichever launch
 * configuration the ACTIVE EDITOR belongs to, and it does not throw when that resolves to
 * nothing. Two consecutive CI runs proved that unfixable from the test side — the first had an
 * auto-opened markdown preview focused, the second had `settings.json` focused even after
 * closing all editors and re-opening `workflow.json` through Quick Open three times. Both
 * silently skipped the product entirely. The recorder reads `.vscode/launch.json` off disk and
 * calls `vscode.debug.startDebugging(folder, configName)` with an EXPLICIT folder, so the
 * trigger is independent of focus, of the Quick Open file index, and of the palette.
 *
 * The product path is unchanged: `startDebugging` runs the same resolution pipeline as F5,
 * including `${command:azureLogicAppsStandard.pickProcess}` substitution, which is what invokes
 * `pickFuncProcessInternal -> preDebugValidate -> validateFuncCoreToolsInstalled`.
 *
 * Returns once the recorder has logged `debugInvoke` (it is INSIDE `startDebugging` at that
 * point). We deliberately do NOT wait for `debugStarted` here: for the codeless `attach`
 * configuration, `startDebugging` only resolves after `pickProcess` has finished — which
 * includes the repair we are here to measure — so waiting for it would collapse the fast-fail
 * gate back into the slow one.
 */
async function triggerDebugViaRecorder(timeoutMs: number): Promise<{ dispatched: boolean; reason: string; events: RecorderEvent[] }> {
  dropRecorderTrigger('start-debug');
  console.log(`${LOG_PREFIX} Dropped start-debug marker in ${TRIGGER_DIR}`);

  const deadline = Date.now() + timeoutMs;
  let events: RecorderEvent[] = [];
  while (Date.now() < deadline) {
    events = readRecorderEvents();
    if (events.some((event) => event.phase === 'debugStartFailed')) {
      return { dispatched: false, reason: 'the recorder logged debugStartFailed', events };
    }
    const invoked = events.find((event) => event.phase === 'debugInvoke');
    if (invoked) {
      return {
        dispatched: true,
        reason: `the recorder logged debugInvoke (config "${invoked.taskName ?? ''}" in ${invoked.scopeFsPath ?? '?'})`,
        events,
      };
    }
    if (events.some((event) => event.phase === 'debugStarted')) {
      return { dispatched: true, reason: 'the recorder logged debugStarted', events };
    }
    await sleep(1000);
  }
  return { dispatched: false, reason: `no debugInvoke within ${timeoutMs}ms`, events };
}

/**
 * Answers the Azure connectors QuickPick if it is on screen, and does nothing otherwise.
 *
 * WHY THIS IS NEEDED: `pickFuncProcessInternal` calls `refreshConnectionKeys` (:112-116) BEFORE
 * `preDebugValidate` (:119), and with no Azure account `refreshConnectionKeys` ->
 * `getAzureConnectorDetailsForLocalProject` runs `GetSubscriptionDetailsStep.prompt`
 * (azureConnectorWizard.ts:50-68). That is a `showQuickPick`, so it parks the whole flow until
 * somebody answers it. In run 30557613214 nobody did: the screenshot shows the prompt still open
 * after 300s with the output channel frozen at the Azurite line, so `validateFuncCoreToolsInstalled`
 * was never called and the test reported a repair failure for a gate that never ran.
 *
 * It is NOT a one-off: `prepareFreshSession()` wipes the settings `User` dir every attempt, and
 * the choice is cached in `ext.context.globalState` (app/state/connectors.ts:13-22), so the
 * prompt is guaranteed on every run. It also appears several seconds after the debug start, so
 * a single pre-emptive dismissal before the trigger would race it — every polling caller must
 * call this on each iteration.
 *
 * "Skip for now" is the correct answer, not merely a convenient one: this test asserts on the
 * func binary, not on connectors, and the skip path is what the fixture's own configuration
 * implies. Escape is equally safe — `azureConnectorWizard.ts:59-62` catches
 * `isUserCancelledError` and resolves to the same `{ data: 'no' }`.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * WHY THIS CANNOT SWALLOW THE MODAL UNDER TEST. Verified, not assumed:
 *
 *   a. The prompt this test asserts on is
 *      `innerContext.ui.showWarningMessage(message, { modal: true }, ...items)`
 *      (validateFuncCoreToolsInstalled.ts:135 and :164). VS Code renders `modal: true` message
 *      boxes as `.monaco-dialog-box`, a different widget from the `.quick-input-widget` that
 *      `showQuickPick` renders.
 *   b. `dismissQuickPickIfVisible` (helpers.ts:740-778) only ever queries
 *      `.quick-input-widget:not(.hidden)` and only ever clicks a `.monaco-list-row` inside it.
 *      It has no selector that can reach a dialog button, so it cannot click "Install" or
 *      "Learn more".
 *   c. Its one non-scoped action is the Escape fallback on `body`, which fires when a QuickPick
 *      is visible but no row matched. Escape CAN dismiss a modal dialog, so we do not rely on
 *      (a)+(b) alone: this wrapper reads the widget text first and returns without touching
 *      anything unless it matches {@link CONNECTORS_PROMPT_FRAGMENTS}. The func modal's text
 *      contains none of them.
 *   d. Belt and braces: both callers refuse to invoke this once the blocking prompt has been
 *      observed, so the dismisser and the modal are mutually exclusive in time as well.
 *
 * A non-matching QuickPick is logged (once per distinct text) and deliberately left alone —
 * swallowing an unexpected prompt would hide the next bug of exactly this class.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */
async function dismissConnectorsPromptIfVisible(driver: WebDriver, seenOtherPrompts: Set<string>): Promise<boolean> {
  let widgetText: string;
  try {
    // Both this probe and `dismissQuickPickIfVisible` run raw `executeScript` against whatever
    // frame the driver is parked in. Inside a webview iframe the selector finds nothing, so the
    // prompt would go unanswered forever and look exactly like the bug we are fixing. Switch
    // explicitly rather than relying on the caller having just scraped the workbench.
    await driver
      .switchTo()
      .defaultContent()
      .catch(() => undefined);
    widgetText =
      (await driver.executeScript<string | null>(`
        const widget = document.querySelector('.quick-input-widget:not(.hidden)');
        if (!widget) { return null; }
        // The placeholder ("Enable connectors in Azure for Logic App <name>") lives in an
        // <input placeholder> ATTRIBUTE, which contributes nothing to textContent, so read it
        // explicitly. The row labels ("Use connectors from Azure" / "Skip for now") do come
        // through textContent, which is why matching stays correct even if VS Code changes how
        // the placeholder is rendered.
        const input = widget.querySelector('.quick-input-box input');
        const placeholder = input ? (input.getAttribute('placeholder') || '') : '';
        return placeholder + '\\n' + (widget.textContent || '');
      `)) ?? '';
  } catch {
    // A transient DOM/CDP hiccup. The caller polls, so the next pass retries.
    return false;
  }

  if (widgetText.trim().length === 0) {
    return false;
  }

  const normalized = widgetText.toLowerCase();
  if (!CONNECTORS_PROMPT_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    const summary = widgetText.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!seenOtherPrompts.has(summary)) {
      seenOtherPrompts.add(summary);
      console.log(`${LOG_PREFIX} ⚠ A QuickPick is open that is NOT the connectors prompt — leaving it alone: "${summary}"`);
    }
    return false;
  }

  console.log(`${LOG_PREFIX} Connectors QuickPick detected (blocks refreshConnectionKeys before the gate) — answering it`);
  const dismissed = await dismissQuickPickIfVisible(driver);
  console.log(
    dismissed
      ? `${LOG_PREFIX} ✓ Answered the connectors prompt; refreshConnectionKeys should now log "Azure connectors are disabled"`
      : `${LOG_PREFIX} ⚠ dismissQuickPickIfVisible did not act on the connectors prompt — retrying on the next poll`
  );
  return dismissed;
}

/**
 * Proves that the debug start actually reached the product before we commit to the long repair
 * wait.
 *
 * WHY THIS EXISTS: "repair absent" and "modal absent" together mean the gate never ran, but the
 * original shape of this test could only discover that by burning the full 300s repair timeout
 * and then reporting it as a repair failure. A wrong diagnosis is worse than a slow one, so
 * this gate separates "the product failed to repair" from "the harness never triggered the
 * product". `triggerDebugViaRecorder` proves the REQUEST was dispatched; this proves the
 * extension actually started executing it.
 *
 * What it keys off, in order of directness — all of them are things ONLY the debug path
 * produces, and all of them are watermarked or pre-checked so they cannot match earlier state:
 *   1. New output-channel lines matching {@link GATE_EVIDENCE_MARKERS}.
 *   2. Azurite's blob port opening, which `activateAzurite` does as step 1 of
 *      `pickFuncProcessInternal` (only counted if nothing was listening beforehand).
 *   3. The blocking prompt on screen — the gate ran and took the branch this feature exists to
 *      avoid. Reported as "reached" on purpose: `watchForFuncRepair` owns that assertion and
 *      will fail with the right message immediately.
 *   4. The corruption marker disappearing from the binary — the extract already landed.
 *   5. `debugStartFailed` arriving late — VS Code rejected the configuration after dispatch.
 *
 * It also polls {@link dismissConnectorsPromptIfVisible} each iteration, because the connectors
 * QuickPick lands two statements before the gate and can therefore block inside this window.
 *
 * Deliberately NOT used: the debug toolbar, debug terminals and the func host port. Those only
 * appear AFTER `preDebugValidate` returns (pickFuncProcess.ts:143-165), i.e. on the far side of
 * a repair that can take minutes, so they cannot distinguish "not yet" from "never".
 *
 * CAUTION: "reached" here is a LIVENESS verdict, not a progress verdict. Its earliest marker is
 * the Azurite line, which `activateAzurite` writes as pickFuncProcessInternal's first step — so
 * this can legitimately report "reached" while execution later parks on the connectors prompt,
 * two steps short of the gate. `watchForFuncRepair` tracks {@link PAST_CONNECTION_KEYS_MARKERS}
 * to tell those two apart.
 */
async function waitForPreDebugGateEvidence(
  driver: WebDriver,
  options: {
    watermark: OutputWatermark | undefined;
    azuriteWasListening: boolean;
    funcBinaryPath: string;
    timeoutMs: number;
    seenOtherPrompts: Set<string>;
  }
): Promise<{ reached: boolean; evidence: string; newOutput: string; debugStartFailed: boolean; dismissedConnectorsPrompt: boolean }> {
  const deadline = Date.now() + options.timeoutMs;
  const startedAt = Date.now();
  let newOutput = '';
  let dismissedConnectorsPrompt = false;

  while (Date.now() < deadline) {
    newOutput = readOutputSinceWatermark(options.watermark);
    const marker = GATE_EVIDENCE_MARKERS.find((candidate) => newOutput.includes(candidate));
    if (marker) {
      return {
        reached: true,
        evidence: `output channel logged "${marker}" after the debug start`,
        newOutput,
        debugStartFailed: false,
        dismissedConnectorsPrompt,
      };
    }

    if (!options.azuriteWasListening && (await isPortListening(AZURITE_BLOB_PORT))) {
      return {
        reached: true,
        evidence: `Azurite started listening on port ${AZURITE_BLOB_PORT} (activateAzurite runs first in pickFuncProcessInternal)`,
        newOutput,
        debugStartFailed: false,
        dismissedConnectorsPrompt,
      };
    }

    if (!stillHoldsCorruption(options.funcBinaryPath)) {
      return {
        reached: true,
        evidence: 'the corruption marker was already overwritten (repair extract landed)',
        newOutput,
        debugStartFailed: false,
        dismissedConnectorsPrompt,
      };
    }

    const visibleText = await getVisibleWorkbenchText(driver).catch(() => '');
    if (visibleText.includes(BLOCKING_PROMPT_TEXT)) {
      return {
        reached: true,
        evidence: 'the blocking install prompt appeared (the gate ran and chose the prompt branch)',
        newOutput,
        debugStartFailed: false,
        dismissedConnectorsPrompt,
      };
    }

    // The connectors QuickPick can already be up inside this window (it is only two statements
    // before the gate), so poll for it here too rather than waiting for `watchForFuncRepair`.
    // Runs only after the blocking-prompt check above has cleared for this iteration, so the
    // modal under test can never be on screen when the dismisser fires.
    if (await dismissConnectorsPromptIfVisible(driver, options.seenOtherPrompts)) {
      dismissedConnectorsPrompt = true;
    }

    // VS Code rejected the configuration after the recorder dispatched it (e.g. an unsupported
    // debug type). Harness-side, and worth reporting distinctly from "nothing happened".
    if (readRecorderEvents().some((event) => event.phase === 'debugStartFailed')) {
      return { reached: false, evidence: 'none', newOutput, debugStartFailed: true, dismissedConnectorsPrompt };
    }

    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `${LOG_PREFIX} waiting for evidence that the debug start reached the product (${elapsedSeconds}s/${options.timeoutMs / 1000}s)`
    );
    await sleep(3000);
  }

  return { reached: false, evidence: 'none', newOutput, debugStartFailed: false, dismissedConnectorsPrompt };
}

/**
 * Watches disk and UI at the same time until the corrupted func runs again.
 *
 * Disk is the authoritative signal (same shape as `waitForBundleRepaired`); the UI scrape runs
 * in the same loop so that a blocking modal is observed at the moment it appears rather than
 * inferred afterwards from a timeout.
 *
 * The same loop also (a) answers the connectors QuickPick that otherwise parks
 * `refreshConnectionKeys` two steps before the gate, and (b) records whether the flow ever got
 * past that step, so a timeout can say WHICH of the two failures happened instead of always
 * blaming the repair.
 */
async function watchForFuncRepair(
  driver: WebDriver,
  primaryFuncPath: string,
  corrupted: CorruptedBinary[],
  timeoutMs: number,
  watermark: OutputWatermark | undefined,
  seenOtherPrompts: Set<string>
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
    pastConnectionKeys: false,
    connectorsPromptDismissals: 0,
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

    // Progress probe, distinct from the disk state above: did the flow get past
    // `refreshConnectionKeys` (pickFuncProcess.ts:112-116) and therefore actually reach the gate
    // at :119? Latched, because the line is written once and this loop runs for minutes.
    if (!result.pastConnectionKeys) {
      const sinceDebugStart = readOutputSinceWatermark(watermark);
      if (PAST_CONNECTION_KEYS_MARKERS.some((marker) => sinceDebugStart.includes(marker))) {
        result.pastConnectionKeys = true;
        console.log(`${LOG_PREFIX} ✓ refreshConnectionKeys returned — execution reached preDebugValidate (the gate under test)`);
      }
    }

    // Answer the connectors QuickPick if it is up. Placed AFTER the blocking-prompt scrape above
    // and guarded on it: `dismissConnectorsPromptIfVisible` only ever acts on a
    // `.quick-input-widget` whose text matches the connectors prompt, and the modal under test is
    // a `.monaco-dialog-box` from `showWarningMessage({ modal: true })` — but this guard makes the
    // two mutually exclusive in time as well, so no future change to the helper can make the
    // dismisser swallow the assertion this test exists for.
    if (result.blockingPromptText === '' && (await dismissConnectorsPromptIfVisible(driver, seenOtherPrompts))) {
      result.connectorsPromptDismissals += 1;
    }

    if (Date.now() - lastLoggedAt >= 15_000) {
      lastLoggedAt = Date.now();
      const progress = result.pastConnectionKeys ? 'past refreshConnectionKeys' : 'NOT yet past refreshConnectionKeys';
      console.log(`${LOG_PREFIX} waiting for repair (${Math.round((Date.now() - startedAt) / 1000)}s, ${progress}): ${result.lastReason}`);
    }

    // Once the blocking modal is up the verdict is already decided: the product only reaches
    // it after attemptManagedFuncCoreToolsRepair has returned false, and a modal blocks the
    // extension host anyway. Stop early so a genuine regression fails in seconds with the disk
    // state captured, instead of burning the whole timeout.
    if (result.blockingPromptText !== '') {
      break;
    }

    // The same early-bail logic for the harness-side failure: if VS Code gave up on the debug
    // configuration there will never be a repair, so stop rather than time out silently. The
    // reason is recorded so the assertion message names the real cause.
    if (readRecorderEvents().some((event) => event.phase === 'debugStartFailed')) {
      result.lastReason = 'the recorder logged debugStartFailed — VS Code abandoned the debug session, so the gate never completed';
      break;
    }
    await sleep(2000);
  }

  result.elapsedMs = Date.now() - startedAt;

  // Name the failure precisely. Timing out WITHOUT ever seeing refreshConnectionKeys return
  // means execution never reached preDebugValidate at all, so this is not a repair failure —
  // it is a stall in an earlier, unrelated step (historically: an unanswered prompt).
  const stallDiagnosis = result.pastConnectionKeys
    ? 'The flow DID get past refreshConnectionKeys, so preDebugValidate -> validateFuncCoreToolsInstalled was reached and this is a genuine repair failure.'
    : `The flow NEVER got past refreshConnectionKeys (no ${JSON.stringify(PAST_CONNECTION_KEYS_MARKERS)} line after the debug start), so preDebugValidate was never called and the self-heal was never given a chance. This is a STALL BEFORE THE GATE, not a repair failure — check the screenshot for an unanswered prompt (connectors QuickPick dismissals so far: ${result.connectorsPromptDismissals}).`;
  result.lastReason = `${result.lastReason}. ${stallDiagnosis} Candidates: ${corrupted.map((entry) => describeBinary(entry.filePath)).join('; ')}`;
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

    // Stop the session the same way we started it — the recorder calls
    // vscode.debug.stopDebugging() directly, which does not depend on the palette or on the
    // debug toolbar being visible. The palette path stays as a fallback because the recorder
    // marker is only consumed if the recorder is alive.
    try {
      dropRecorderTrigger('stop-debug');
      await sleep(2000);
    } catch (error) {
      console.log(`${LOG_PREFIX} Could not drop the stop-debug marker: ${error}`);
    }
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
    // Hard gate before anything else touches the binaries: the recorder's own
    // `waitForLogicAppsExtension()` is bounded at 360s, and if the LA extension were still
    // activating when we drop the start-debug marker the recorder would sit in that wait while
    // our (much shorter) dispatch timeout expired. Confirming command registration here means
    // the recorder's wait is already satisfied when it runs, so a dispatch timeout can only
    // mean the recorder itself is wedged — a genuinely different failure.
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
          `Could not overwrite ${candidate}: ${error}. On Windows this means a func process still holds the binary open — check that the scenario runs with autoStartDesignTime: false and that prepareFreshSession killed leftover func hosts.${describeRunningFuncProcesses()}`
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
    // processId: ${command:azureLogicAppsStandard.pickProcess}` (vscodeLaunch.ts:50-55), so
    // starting this configuration runs pickFuncProcessInternal -> preDebugValidate ->
    // validateFuncCoreToolsInstalled. Nothing else in the extension calls that gate.
    //
    // The recorder resolves the folder and configuration itself and calls
    // vscode.debug.startDebugging(folder, name) — no editor focus, no Quick Open, no palette.
    // See triggerDebugViaRecorder for the two CI runs that proved the palette path unusable.
    console.log(`${LOG_PREFIX} Step 3: starting the debug session via the recorder extension`);
    assert.ok(
      await waitForRecorderReady(RECORDER_READY_TIMEOUT_MS),
      `The task recorder extension never reported activate/ping within ${RECORDER_READY_TIMEOUT_MS}ms (events file ${EVENTS_FILE}, trigger dir ${TRIGGER_DIR}). Without it there is no way to start debugging deterministically — check that the p414-funcrepair scenario still has recorder: true in run-e2e.ts.`
    );

    // Take the readings the liveness gate diffs against, as late as possible before the trigger.
    const outputWatermark = captureOutputWatermark();
    const azuriteWasListening = await isPortListening(AZURITE_BLOB_PORT);
    console.log(
      `${LOG_PREFIX} Pre-debug watermark: log=${outputWatermark?.filePath ?? '(none)'} at ${outputWatermark?.length ?? 0} bytes, azurite:${AZURITE_BLOB_PORT} listening=${azuriteWasListening}`
    );

    const dispatch = await triggerDebugViaRecorder(DEBUG_DISPATCH_TIMEOUT_MS);
    if (!dispatch.dispatched) {
      await captureScreenshot(driver, 'funcRepair-debug-not-dispatched', EXPLICIT_SCREENSHOT_DIR);
      logOutputSinceWatermark('debug start was never dispatched', outputWatermark);
      assert.fail(
        `THE DEBUG START WAS NEVER DISPATCHED — this run proves nothing about the product. ${dispatch.reason}. This is a HARNESS failure, not a repair failure: vscode.debug.startDebugging was never entered, so pickFuncProcessInternal -> preDebugValidate never ran. Check the recorder's own [la-e2e-recorder] lines in the VS Code stdout above — it logs the workspace folders it saw and the launch configuration it chose. Recorder events: ${describeRecorderEvents(dispatch.events)}. Events file: ${EVENTS_FILE}`
      );
    }
    console.log(`${LOG_PREFIX} ✓ Debug start dispatched — ${dispatch.reason}`);

    // ── Step 3b: fail fast if the product never started executing it ─────────
    // Dispatch proves the REQUEST reached VS Code; this proves the EXTENSION started running.
    // Without it, a harness-side no-op is indistinguishable from a product-side repair failure
    // until 300s have elapsed — which is exactly how the first CI run of this scenario wasted a
    // whole shard to discover that F5 had done nothing at all.
    //
    // From here on, every polling wait also answers the connectors QuickPick — see
    // `dismissConnectorsPromptIfVisible` for why that is mandatory and why it cannot swallow the
    // modal this test asserts on. `seenOtherPrompts` is shared across both waits so an
    // unexpected prompt is reported once, not once per poll.
    const seenOtherPrompts = new Set<string>();
    const gate = await waitForPreDebugGateEvidence(driver, {
      watermark: outputWatermark,
      azuriteWasListening,
      funcBinaryPath: primaryFuncPath,
      timeoutMs: GATE_EVIDENCE_TIMEOUT_MS,
      seenOtherPrompts,
    });
    if (!gate.reached) {
      await captureScreenshot(driver, 'funcRepair-gate-never-reached', EXPLICIT_SCREENSHOT_DIR);
      logOutputSinceWatermark('pre-debug gate never reached', outputWatermark);
      const rejected = gate.debugStartFailed
        ? 'VS Code REJECTED the debug configuration after it was dispatched (the recorder logged debugStartFailed) — check that the coreclr debug adapter (ms-dotnettools.csdevkit) is installed in the E2E extensions dir.'
        : 'The debug configuration was dispatched but the extension never started executing it.';
      assert.fail(
        `THE PRE-DEBUG GATE WAS NEVER REACHED — this run proves nothing about the product. ${rejected} Within ${GATE_EVIDENCE_TIMEOUT_MS}ms of the debug start there was no sign that the extension reacted: no new output-channel line from ${JSON.stringify(GATE_EVIDENCE_MARKERS)}, no Azurite listener on port ${AZURITE_BLOB_PORT}, no install prompt, and the func binary still held the corruption marker. This is a HARNESS failure, not a repair failure. Recorder events: ${describeRecorderEvents(readRecorderEvents())}. New output since the debug start: ${JSON.stringify(gate.newOutput.slice(-1500))}`
      );
    }
    console.log(
      `${LOG_PREFIX} ✓ The debug start reached the product — ${gate.evidence}${gate.dismissedConnectorsPrompt ? ' (connectors prompt already answered)' : ''}`
    );

    // ── Step 4: wait for the repair, watching the UI at the same time ────────
    console.log(`${LOG_PREFIX} Step 4: waiting for the managed func to become runnable again`);
    const watch = await watchForFuncRepair(
      driver,
      primaryFuncPath,
      corruptedBinaries,
      REPAIR_TIMEOUT_MS,
      outputWatermark,
      seenOtherPrompts
    );
    console.log(
      `${LOG_PREFIX} Repair watch finished: repaired=${watch.repaired}, pastConnectionKeys=${watch.pastConnectionKeys}, connectorsPromptDismissals=${watch.connectorsPromptDismissals}`
    );
    if (!watch.repaired || watch.blockingPromptText !== '') {
      await captureScreenshot(driver, 'funcRepair-not-repaired', EXPLICIT_SCREENSHOT_DIR);
      // Watermarked and pinned: this must show what the extension did AFTER the debug start, in
      // the file we watermarked. The un-watermarked "latest log" tail this replaced printed an
      // unrelated node tarball listing in run 30557613214 and hid the real cause (a
      // refreshConnectionKeys stall) for a whole CI cycle.
      logOutputSinceWatermark('repair did not complete', outputWatermark);
      logAllLogicAppsOutputFiles('repair did not complete', outputWatermark);
      const funcProcesses = describeRunningFuncProcesses();
      if (funcProcesses) {
        console.log(`${LOG_PREFIX} ${funcProcesses}`);
      }
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
      `The blocking "${BLOCKING_PROMPT_TEXT}" prompt appeared after the debug start. attemptManagedFuncCoreToolsRepair either never ran (is useBinariesDependencies() false? check azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation) or failed to produce a runnable func.`
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

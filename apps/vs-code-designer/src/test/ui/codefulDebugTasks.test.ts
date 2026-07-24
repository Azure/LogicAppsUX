// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/// <reference types="mocha" />

/**
 * Phase 4.10: Codeful debug F5 task-event regression test.
 *
 * Guards two related codeful debug regressions:
 *
 * 1. "Double clean+build": pressing F5 on a codeful Logic App used to run
 *    `pickFuncProcessInternal` → `publishCodefulProject` (`clean release` →
 *    `publish` Release) AND `startFuncTask` → `func: host start`
 *    (`dependsOn: build` → `dependsOn: clean` → `clean` → `build` Debug).
 *    For modern codeful project templates (commit `8b1bd1764`, 2025-11-11) the
 *    `CopyToCodefulFolder` and `ReplaceLanguageNetCore` MSBuild targets carry
 *    `AfterTargets="Build;Publish"`. A Debug `Build` alone populates
 *    `lib/codeful/`, so the explicit Release `publish` is redundant. Legacy
 *    templates with `AfterTargets="Publish"` still need the explicit publish
 *    (otherwise `listCallbackUrl` and `runs` APIs return 404). The fix in
 *    `pickFuncProcess.ts` passes `{ skipIfBuildPopulatesCodeful: true }` to
 *    `publishCodefulProject`, which inspects the `.csproj` and skips publish
 *    only when both targets hook `Build`.
 *
 * 2. "lib/codeful file lock" (MSB3026): the codeful design-time host used to run
 *    the in-process .NET 8 worker (`FUNCTIONS_WORKER_RUNTIME=dotnet` +
 *    `FUNCTIONS_INPROC_NET8_ENABLED=true`, introduced by #9410). That worker
 *    loads the compiled workflow assemblies out of `lib/codeful` and on Windows
 *    locks those DLLs. Pressing F5 rebuilds the project and the
 *    `CopyToCodefulFolder` target must overwrite `lib/codeful`; that copy failed
 *    with MSB3026 ("the file is locked by .NET Host"). The fix (Option B) forces
 *    the codeful design-time host onto the **Node** worker, which never loads the
 *    project's .NET assemblies, so it can never lock `lib/codeful` — no per-debug
 *    kill/restart of the design-time host is needed. This test asserts the
 *    codeful design-time `local.settings.json` uses `FUNCTIONS_WORKER_RUNTIME=node`
 *    with no `FUNCTIONS_INPROC_NET8_ENABLED` (a deterministic, cross-platform
 *    signal that runs on the existing ubuntu CI) and that the F5 Debug `build`
 *    still exits 0; a dotnet/in-proc-net8 design-time worker or a non-zero `build`
 *    exit is the regression signal.
 *
 * This test:
 *   1. Boots VS Code with a real codeful workspace created by Phase 4.10A's
 *      Create Workspace webview session and reopened via `.code-workspace`.
 *   2. Waits for the design-time host to start and asserts its
 *      `local.settings.json` selected the Node worker.
 *   3. Triggers F5 via the `la-e2e.startDebug` command contributed by the
 *      bundled `codefulTaskRecorderExtension`. The recorder also subscribes
 *      to all `vscode.tasks.*` events and appends them as JSON lines to a file
 *      pointed to by `process.env.LA_E2E_TASK_EVENTS_JSONL` /
 *      `process.env.CODEFUL_TASK_EVENTS_JSONL`.
 *   4. Waits for the Debug `build` task to end.
 *   5. Stops debug.
 *   6. Reads the JSONL, filters by `scopeFsPath === <codeful project>`,
 *      and asserts the expected task pattern per variant, including
 *      `build` exiting 0 (the file-lock guard).
 *
 * The negative controls:
 *   - Reverting the publish-skip fix (`publishCodefulProject` without options)
 *     makes the modern-template `it` block fail with `publish start events = 1`.
 *   - Reverting the Node-worker fix (codeful design-time back on dotnet + in-proc
 *     .NET 8) makes the `FUNCTIONS_WORKER_RUNTIME=node` assertion fail, and on
 *     Windows makes `build` exit non-zero (MSB3026) because the design-time host
 *     holds `lib/codeful` locks.
 *
 * Notes on flakiness:
 *   - `func: host start` may exit non-zero on machines without a working
 *     Azurite / port 7071. We only assert that the task started; we tolerate
 *     a non-zero exit code on `func: host start`. We do require `build` and
 *     `clean` to exit 0 because they are the signal we are guarding.
 *   - We stop debug as soon as `build` ends to keep the test bounded.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EditorView, VSBrowser, Workbench, type WebDriver } from 'vscode-extension-tester';
import { captureScreenshot, sleep } from './helpers';
import { openWorkspaceFileInSession } from './designerHelpers';

const TEST_TIMEOUT = 1500_000;

const EVENTS_FILE =
  process.env.LA_E2E_TASK_EVENTS_JSONL ||
  process.env.CODEFUL_TASK_EVENTS_JSONL ||
  path.join(os.tmpdir(), 'la-e2e-test', 'la-e2e-task-events.jsonl');

const TRIGGER_DIR = process.env.LA_E2E_TRIGGER_DIR || path.join(os.tmpdir(), 'la-e2e-test', 'triggers');

const SCREENSHOT_DIR = path.join(
  process.env.TEMP || os.tmpdir(),
  'test-resources',
  'screenshots',
  'codefulDebugTasks',
  new Date().toISOString().replace(/[:.]/g, '-')
);

interface TaskEvent {
  phase: 'activate' | 'taskStart' | 'taskEnd' | 'processStart' | 'processEnd' | 'ping' | 'debugStart' | 'debugStarted' | 'debugStartFailed';
  taskName: string;
  scopeFsPath: string | null;
  processId: number | null;
  exitCode: number | null;
  timestamp: string;
}

function getWorkspaceDir(envVar: string): string {
  const value = process.env[envVar];
  if (!value || !fs.existsSync(value)) {
    throw new Error(
      `[codefulDebugTasks] Missing or invalid workspace: env ${envVar}=${value ?? '<unset>'}. Phase 4.10 must set this in run-e2e.js before launching the test.`
    );
  }
  return value;
}

function getWorkspaceForVariant(variant: 'modern' | 'legacy'): string {
  const envVar = variant === 'modern' ? 'LA_E2E_CODEFUL_MODERN_WORKSPACE' : 'LA_E2E_CODEFUL_LEGACY_WORKSPACE';
  return getWorkspaceDir(envVar);
}

function readEvents(): TaskEvent[] {
  if (!fs.existsSync(EVENTS_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
  const events: TaskEvent[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      events.push(JSON.parse(trimmed) as TaskEvent);
    } catch {
      // Skip malformed lines (should not happen but never throw from a reader).
    }
  }
  return events;
}

function normalizeFsPath(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return path.normalize(value).toLowerCase();
}

function truncateEventsFile(): void {
  fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
  fs.writeFileSync(EVENTS_FILE, '');
  console.log(`[codefulDebugTasks] Truncated events file: ${EVENTS_FILE}`);
}

function dropTrigger(name: 'start-debug' | 'stop-debug' | 'ping'): void {
  fs.mkdirSync(TRIGGER_DIR, { recursive: true });
  fs.writeFileSync(path.join(TRIGGER_DIR, name), '');
}

async function waitForRecorder(driver: WebDriver, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    // Always look for evidence the recorder activated — the extension's
    // activate() hook writes an "activate" entry into the JSONL file before
    // any test code runs.
    const events = readEvents();
    if (events.some((e) => e.phase === 'ping' || e.phase === 'activate')) {
      return true;
    }
    // Also drop a ping trigger so the recorder appends a 'ping' entry. This
    // is file-watcher-based so it works even when the command palette isn't
    // interactable (e.g. immediately after a workspace switch).
    try {
      dropTrigger('ping');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt <= 3 || attempt % 5 === 0) {
        console.log(`[codefulDebugTasks] waitForRecorder: trigger ${attempt} failed: ${message}`);
      }
    }
    await sleep(2000);
  }
  await captureScreenshot(driver, 'recorder-not-ready', SCREENSHOT_DIR);
  return false;
}

async function startDebug(): Promise<void> {
  dropTrigger('start-debug');
}

async function stopDebug(): Promise<void> {
  dropTrigger('stop-debug');
}

interface WaitResult {
  buildEnded: boolean;
  publishEnded: boolean;
  funcHostStarted: boolean;
  timedOut: boolean;
}

async function waitForTaskChain(variant: 'modern' | 'legacy', workspaceScope: string, timeoutMs: number): Promise<WaitResult> {
  const deadline = Date.now() + timeoutMs;
  const target = normalizeFsPath(workspaceScope);
  while (Date.now() < deadline) {
    const events = readEvents();
    const matchScope = events.filter((e) => normalizeFsPath(e.scopeFsPath) === target);
    const buildEnded = matchScope.some((e) => e.phase === 'processEnd' && e.taskName === 'build');
    const publishEnded = matchScope.some((e) => e.phase === 'processEnd' && e.taskName === 'publish');
    const funcHostStarted = matchScope.some((e) => e.phase === 'taskStart' && e.taskName === 'func: host start');
    const expectedChainEnded = variant === 'legacy' ? buildEnded && publishEnded && funcHostStarted : buildEnded && funcHostStarted;
    if (expectedChainEnded) {
      return { buildEnded, publishEnded, funcHostStarted, timedOut: false };
    }
    if (events.some((e) => e.phase === 'debugStartFailed')) {
      console.log('[codefulDebugTasks] waitForTaskChain: debugStartFailed event observed, bailing out');
      return { buildEnded, publishEnded, funcHostStarted, timedOut: true };
    }
    await sleep(1000);
  }
  return { buildEnded: false, publishEnded: false, funcHostStarted: false, timedOut: true };
}

async function waitForDesignTimeEvidence(workspaceScope: string, notBeforeMs: number, timeoutMs = 180_000): Promise<boolean> {
  const designTimeDir = path.join(workspaceScope, 'workflow-designtime');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(designTimeDir) && fs.statSync(designTimeDir).mtimeMs >= notBeforeMs) {
      console.log(`[codefulDebugTasks] Design-time evidence found: ${designTimeDir}`);
      return true;
    }
    await sleep(2000);
  }
  console.log(`[codefulDebugTasks] Design-time evidence not found within ${timeoutMs}ms: ${designTimeDir}`);
  return false;
}

/**
 * Reads the codeful design-time `workflow-designtime/local.settings.json` and returns its `Values`
 * map, or null when the file is missing / unparseable. Cross-platform: the Option B fix forces the
 * codeful design-time host onto the Node worker (never in-process .NET 8), so the regression signal
 * is now the worker runtime recorded here rather than a Windows-only `lib/codeful` file lock. Never
 * throws — a missing/unreadable file is logged and reported as null so callers can assert on it.
 */
function readDesignTimeValues(projectDir: string): Record<string, string> | null {
  const settingsPath = path.join(projectDir, 'workflow-designtime', 'local.settings.json');
  if (!fs.existsSync(settingsPath)) {
    console.log(`[codefulDebugTasks] Design-time settings not found: ${settingsPath}`);
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return (parsed?.Values ?? {}) as Record<string, string>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[codefulDebugTasks] Failed to parse design-time settings ${settingsPath}: ${message}`);
    return null;
  }
}

interface ScenarioSummary {
  cleanStart: number;
  cleanReleaseStart: number;
  buildStart: number;
  publishStart: number;
  funcHostStartStart: number;
  cleanExit: number | null;
  buildExit: number | null;
  publishExit: number | null;
  cleanReleaseExit: number | null;
}

function summarize(events: TaskEvent[], workspaceScope: string): ScenarioSummary {
  const target = normalizeFsPath(workspaceScope);
  const scoped = events.filter((e) => normalizeFsPath(e.scopeFsPath) === target);

  const countStart = (name: string) =>
    scoped.filter((e) => e.taskName === name && (e.phase === 'processStart' || e.phase === 'taskStart')).length;

  const firstExit = (name: string): number | null => {
    const ev = scoped.find((e) => e.taskName === name && e.phase === 'processEnd');
    return ev ? ev.exitCode : null;
  };

  // For "task start" semantics we prefer processStart (only fires for `type: process|shell`
  // tasks, not for dependency-only entries). Fall back to taskStart when no processStart
  // is recorded (older VS Code or compound tasks).
  const cleanStartProcess = scoped.filter((e) => e.taskName === 'clean' && e.phase === 'processStart').length;
  const cleanReleaseStartProcess = scoped.filter((e) => e.taskName === 'clean release' && e.phase === 'processStart').length;
  const buildStartProcess = scoped.filter((e) => e.taskName === 'build' && e.phase === 'processStart').length;
  const publishStartProcess = scoped.filter((e) => e.taskName === 'publish' && e.phase === 'processStart').length;
  const funcHostStartProcess = scoped.filter((e) => e.taskName === 'func: host start' && e.phase === 'processStart').length;

  return {
    cleanStart: cleanStartProcess || countStart('clean'),
    cleanReleaseStart: cleanReleaseStartProcess || countStart('clean release'),
    buildStart: buildStartProcess || countStart('build'),
    publishStart: publishStartProcess || countStart('publish'),
    funcHostStartStart: funcHostStartProcess || countStart('func: host start'),
    cleanExit: firstExit('clean'),
    buildExit: firstExit('build'),
    publishExit: firstExit('publish'),
    cleanReleaseExit: firstExit('clean release'),
  };
}

describe('Phase 4.10: Codeful debug F5 task pattern', function () {
  this.timeout(TEST_TIMEOUT);

  const selectedVariant = process.env.LA_E2E_CODEFUL_VARIANT as 'modern' | 'legacy' | undefined;
  let driver: WebDriver;

  before(async function () {
    this.timeout(120_000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    driver = VSBrowser.instance.driver;

    // Give the extension host a moment to finish activating before we begin.
    await sleep(8000);

    const recorderReady = await waitForRecorder(driver, 90_000);
    if (!recorderReady) {
      throw new Error(
        '[codefulDebugTasks] Recorder extension did not respond to ping. ' +
          'Verify la-e2e.la-e2e-codeful-task-recorder is installed in extDir and activated.'
      );
    }
    console.log('[codefulDebugTasks] Recorder is ready.');
  });

  async function runVariant(variant: 'modern' | 'legacy', workspaceDir: string): Promise<void> {
    console.log(`\n[codefulDebugTasks] ===== Variant: ${variant} =====`);
    console.log(`[codefulDebugTasks] Workspace: ${workspaceDir}`);

    // Close any open editors before asserting against the startup workspace.
    try {
      await new EditorView().closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(1000);

    const workspaceFile = getWorkspaceForVariant(variant);
    console.log(`[codefulDebugTasks] Startup .code-workspace: ${workspaceFile}`);

    // Freshness watermark for design-time evidence. Anchored in run-e2e.js right after the
    // stale folder is cleared and before launch (env var), so a folder created during the
    // before() hook (Windows) or after the explicit workspace open (Linux) both count as
    // fresh. Falls back to a local estimate only if the env var is missing.
    const notBeforeEnv = Number(process.env.LA_E2E_CODEFUL_EVIDENCE_NOT_BEFORE);
    const phaseStartTime = Number.isFinite(notBeforeEnv) && notBeforeEnv > 0 ? notBeforeEnv : Date.now() - 1000;

    // Explicitly open the generated .code-workspace after launch. ExTester's startup
    // `resources` (which uses `code -r` / CLI IPC) silently fails on headless CI: the VS Code
    // IPC socket isn't wired up when launched via ChromeDriver, so VS Code lands on the empty
    // Welcome screen with NO workspace folder open. With no folder open,
    // getWorkspaceLogicAppFolders() is empty, codeful design-time auto-start correctly no-ops,
    // and no `workflow-designtime` evidence is ever produced — exactly the failure the CI
    // screenshots showed. Opening via the command palette (the same proven path the codeless
    // designer phases use) makes the workspace load deterministically so codeful onboarding
    // auto-start can fire. No-ops when the workspace is already open (e.g. on Windows).
    await openWorkspaceFileInSession(new Workbench(), workspaceFile);

    // Re-verify the recorder after the workspace open reloads the extension host.
    const ready = await waitForRecorder(driver, 90_000);
    if (!ready) {
      throw new Error('[codefulDebugTasks] Recorder not ready after workspace switch');
    }

    const designTimeReady = await waitForDesignTimeEvidence(workspaceDir, phaseStartTime);
    if (!designTimeReady) {
      await captureScreenshot(driver, `${variant}-design-time-not-ready`, SCREENSHOT_DIR);
      assert.fail(`[${variant}] Design-time startup evidence was not created before debug assertions.`);
    }

    // Regression guard for the codeful debug file-lock issue (Option B fix). The codeful
    // design-time host used to run the in-process .NET 8 worker, which loads the compiled workflow
    // assemblies out of `lib/codeful` and (on Windows) locks those DLLs, so F5's
    // `CopyToCodefulFolder` build failed with MSB3026. The fix forces the codeful design-time host
    // onto the Node worker, which never loads the project's .NET assemblies. Assert that
    // deterministically here (cross-platform, so it bites on the ubuntu CI); the `buildExit === 0`
    // assertion later is the end-to-end signal.
    const designTimeValues = readDesignTimeValues(workspaceDir);
    assert.ok(designTimeValues, `[${variant}] Design-time local.settings.json was not created/readable.`);
    const workerRuntime = designTimeValues['FUNCTIONS_WORKER_RUNTIME'];
    assert.strictEqual(
      (workerRuntime ?? '').toLowerCase(),
      'node',
      `[${variant}] codeful design-time must use the Node worker (FUNCTIONS_WORKER_RUNTIME=node), got '${workerRuntime}'. Under the in-process .NET 8 worker the design-time host loads and locks lib/codeful, breaking F5 debug with MSB3026.`
    );
    assert.strictEqual(
      designTimeValues['FUNCTIONS_INPROC_NET8_ENABLED'],
      undefined,
      `[${variant}] codeful design-time must NOT set FUNCTIONS_INPROC_NET8_ENABLED (got '${designTimeValues['FUNCTIONS_INPROC_NET8_ENABLED']}'); in-process .NET 8 is exactly what loads and locks lib/codeful.`
    );
    console.log(`[codefulDebugTasks] [${variant}] codeful design-time worker runtime: ${workerRuntime}`);

    truncateEventsFile();

    console.log('[codefulDebugTasks] Starting debug...');
    await startDebug();

    // Note: `vscode.debug.startDebugging` for the `logicapp` type goes
    // through `pickFuncProcessInternal`, which runs
    // `tryBuildCustomCodeFunctionsProject`, `publishCodefulProject`, and
    // `tasks.fetchTasks()` BEFORE executing any task. Plus the recorder
    // must wait for `azureLogicAppsStandard.debugLogicApp` to be
    // registered — that requires the LA extension's full async
    // activation, including the await on `getResourceGroupsApi()` which
    // depends on the Azure Resource Groups extension API and can take
    // 8-10 minutes on first launch under ExTester. The task chain
    // itself (clean -> build -> func: host start, plus clean release ->
    // publish for legacy) can take several minutes with the real generated
    // codeful project. Allow up to 12 minutes total to absorb
    // LA extension cold-start while still failing fast if the chain
    // never starts.
    const wait = await waitForTaskChain(variant, workspaceDir, 720_000);
    console.log(`[codefulDebugTasks] waitForTaskChain: ${JSON.stringify(wait)}`);

    // Give func host start a chance to spawn so we capture its taskStart event.
    if (!wait.funcHostStarted) {
      await sleep(15_000);
    }

    console.log('[codefulDebugTasks] Stopping debug...');
    await stopDebug();
    // Allow a generous tail for the chain to finish writing events after
    // we time out / stop debug. The chain itself takes ~8s and any
    // straggling processEnd events should arrive within 30s.
    await sleep(30_000);

    const events = readEvents();
    console.log(`[codefulDebugTasks] Collected ${events.length} events. Sample (first 20):`);
    for (const e of events.slice(0, 20)) {
      console.log(`   ${e.phase} ${e.taskName} scope=${e.scopeFsPath ?? ''} exit=${e.exitCode ?? ''}`);
    }

    const summary = summarize(events, workspaceDir);
    console.log(`[codefulDebugTasks] Summary: ${JSON.stringify(summary)}`);

    // The wait timeout is an upper bound on cold-start latency; the post-
    // stopDebug sleep gives any in-flight task chain time to flush its
    // final events. The actual pass/fail signal is in the summary, not
    // the wait result. We only bail out if NO task events were captured
    // at all — that means F5 never reached `executeTask` and the
    // recorder has nothing useful to assert on.
    if (
      events.length <= 1 ||
      (variant === 'modern' && summary.cleanStart === 0) ||
      (variant === 'legacy' && summary.cleanReleaseStart === 0)
    ) {
      await captureScreenshot(driver, `${variant}-no-tasks`, SCREENSHOT_DIR);
      assert.fail(
        `[${variant}] F5 never reached the codeful task chain. ` +
          `Wait result=${JSON.stringify(wait)}; Summary=${JSON.stringify(summary)}; events captured=${events.length}.`
      );
    }

    if (variant === 'modern') {
      assert.strictEqual(summary.publishStart, 0, `[modern] publish task must NOT start (got ${summary.publishStart})`);
      assert.strictEqual(summary.cleanReleaseStart, 0, `[modern] 'clean release' task must NOT start (got ${summary.cleanReleaseStart})`);
      assert.strictEqual(summary.buildStart, 1, `[modern] build task must run exactly once (got ${summary.buildStart})`);
      assert.strictEqual(summary.cleanStart, 1, `[modern] clean task must run exactly once (got ${summary.cleanStart})`);
      assert.ok(
        summary.funcHostStartStart >= 1,
        `[modern] 'func: host start' must start at least once (got ${summary.funcHostStartStart})`
      );
      assert.strictEqual(summary.cleanExit, 0, `[modern] clean must exit 0 (got ${summary.cleanExit})`);
      assert.strictEqual(
        summary.buildExit,
        0,
        `[modern] build must exit 0 (got ${summary.buildExit}). A non-zero exit here is the codeful debug file-lock regression: the design-time host ran the in-process .NET 8 worker and held lib/codeful locks so CopyToCodefulFolder failed with MSB3026. The codeful design-time host must run the Node worker.`
      );
    } else {
      assert.strictEqual(summary.publishStart, 1, `[legacy] publish task must run exactly once (got ${summary.publishStart})`);
      assert.strictEqual(
        summary.cleanReleaseStart,
        1,
        `[legacy] 'clean release' task must run exactly once (got ${summary.cleanReleaseStart})`
      );
      assert.strictEqual(summary.buildStart, 1, `[legacy] build task must run exactly once (got ${summary.buildStart})`);
      assert.ok(
        summary.funcHostStartStart >= 1,
        `[legacy] 'func: host start' must start at least once (got ${summary.funcHostStartStart})`
      );
      assert.strictEqual(summary.cleanExit, 0, `[legacy] clean must exit 0 (got ${summary.cleanExit})`);
      assert.strictEqual(
        summary.buildExit,
        0,
        `[legacy] build must exit 0 (got ${summary.buildExit}). A non-zero exit here is the codeful debug file-lock regression: the design-time host ran the in-process .NET 8 worker and held lib/codeful locks so CopyToCodefulFolder failed with MSB3026. The codeful design-time host must run the Node worker.`
      );
      assert.strictEqual(summary.cleanReleaseExit, 0, `[legacy] 'clean release' must exit 0 (got ${summary.cleanReleaseExit})`);
      assert.strictEqual(summary.publishExit, 0, `[legacy] publish must exit 0 (got ${summary.publishExit})`);
    }
  }

  if (!selectedVariant || selectedVariant === 'modern') {
    it('modern template (AfterTargets="Build;Publish"): publish task is skipped', async () => {
      const workspaceDir = getWorkspaceDir('LA_E2E_CODEFUL_MODERN_DIR');
      await runVariant('modern', workspaceDir);
    });
  }

  if (!selectedVariant || selectedVariant === 'legacy') {
    it('legacy template (AfterTargets="Publish" only): publish task still runs', async () => {
      const workspaceDir = getWorkspaceDir('LA_E2E_CODEFUL_LEGACY_DIR');
      await runVariant('legacy', workspaceDir);
    });
  }
});

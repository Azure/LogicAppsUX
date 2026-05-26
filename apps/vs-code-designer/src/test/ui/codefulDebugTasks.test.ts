// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/// <reference types="mocha" />

/**
 * Phase 4.10: Codeful debug F5 task-event regression test.
 *
 * Guards against the "double clean+build" regression where pressing F5 on a
 * codeful Logic App ran:
 *   - `pickFuncProcessInternal` → `publishCodefulProject` (`clean release` → `publish` Release)
 * AND
 *   - `startFuncTask` → `func: host start` (`dependsOn: build` → `dependsOn: clean` → `clean` → `build` Debug)
 *
 * For modern codeful project templates (commit `8b1bd1764`, 2025-11-11) the
 * `CopyToCodefulFolder` and `ReplaceLanguageNetCore` MSBuild targets carry
 * `AfterTargets="Build;Publish"`. A Debug `Build` alone populates `lib/codeful/`,
 * so the explicit Release `publish` is redundant. Legacy templates with
 * `AfterTargets="Publish"` still need the explicit publish (otherwise
 * `listCallbackUrl` and `runs` APIs return 404).
 *
 * The fix in `pickFuncProcess.ts:99` passes
 *   `{ skipIfBuildPopulatesCodeful: true }`
 * to `publishCodefulProject`. The implementation inspects the project's
 * `.csproj` and skips publish only when both targets hook `Build`.
 *
 * This test:
 *   1. Boots VS Code with a real codeful workspace created by Phase 4.10A's
 *      Create Workspace webview session and reopened via `.code-workspace`.
 *   2. Triggers F5 via the `la-e2e.startDebug` command contributed by the
 *      bundled `codefulTaskRecorderExtension`. The recorder also subscribes
 *      to all `vscode.tasks.*` events and appends them as JSON lines to a file
 *      pointed to by `process.env.LA_E2E_TASK_EVENTS_JSONL` /
 *      `process.env.CODEFUL_TASK_EVENTS_JSONL`.
 *   3. Waits for the Debug `build` task to end.
 *   4. Stops debug.
 *   5. Reads the JSONL, filters by `scopeFsPath === <codeful project>`,
 *      and asserts the expected task pattern per variant.
 *
 * The negative control: temporarily reverting the fix in `pickFuncProcess.ts`
 * (calling `publishCodefulProject` without options) makes the modern-template
 * `it` block fail with `publish start events = 1` instead of `0`.
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
import { EditorView, VSBrowser, type WebDriver } from 'vscode-extension-tester';
import { captureScreenshot, sleep } from './helpers';

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

    // The generated .code-workspace is passed as the runPhase startup resource.
    // Re-verify the recorder after workspace activation before triggering F5.
    const ready = await waitForRecorder(driver, 60_000);
    if (!ready) {
      throw new Error('[codefulDebugTasks] Recorder not ready after workspace switch');
    }

    const phaseStartTime = Date.now() - 1000;
    const designTimeReady = await waitForDesignTimeEvidence(workspaceDir, phaseStartTime);
    if (!designTimeReady) {
      await captureScreenshot(driver, `${variant}-design-time-not-ready`, SCREENSHOT_DIR);
      assert.fail(`[${variant}] Design-time startup evidence was not created before debug assertions.`);
    }

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
      assert.strictEqual(summary.buildExit, 0, `[modern] build must exit 0 (got ${summary.buildExit})`);
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
      assert.strictEqual(summary.buildExit, 0, `[legacy] build must exit 0 (got ${summary.buildExit})`);
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

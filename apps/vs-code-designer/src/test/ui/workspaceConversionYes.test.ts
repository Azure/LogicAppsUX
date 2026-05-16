// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Workspace Conversion Test: Click "Yes" on workspace open dialog
 *
 * ADO Coverage: Test Case #31054994, Steps 5-7
 *
 * Verifies:
 *   1. Pre-click filesystem invariants (A1-A7): .code-workspace, host.json,
 *      launch.json with a logic-app debug configuration, tasks.json with
 *      a "func: host start" task, workflow.json all exist & parse.
 *   2. The convertToWorkspace prompt is shown as a **modal** dialog
 *      (convertToWorkspace.ts:119-121 — `{ modal: true }`), so detection
 *      uses ExTester's ModalDialog only. No notification fallback.
 *   3. Clicking the localized "Yes" button (en-US locale locked via run-e2e.js;
 *      label matches `DialogResponses.yes.title` from `@microsoft/vscode-azext-utils`)
 *      either reloads the window (session ends or title flips to
 *      "(Workspace)") or, if reload is deferred, returns successfully.
 *   4. Post-reload (when session survives): no extension-error.log,
 *      .code-workspace mtime did not regress, A1-A7 still hold, no
 *      .code-workspace text editor is open, Azure activity-bar item is
 *      present, no error notifications.
 *
 * Phase 4.8d — own session, startup resource = workspace directory.
 *
 * Hardening applied (R1-R9 — Track 3 of the e2e-optimizations effort):
 *   R1 drop notification-scanning (prompt is modal)
 *   R2 single ModalDialog handle with stale-element retry
 *   R3 force-focus + Tab+Enter fallback for xvfb-robust click
 *   R4 locale-lock via en-US LANG/LC_ALL (label matches DialogResponses.yes.title)
 *   R5 safeCancelAnyQuickInput pre-flight cleanup
 *   R6 elementIsVisible wait before click (inside pushDialogButtonWithRetry)
 *   R7 timeout bumps: phase 60s -> 120s, prompt 30s -> 45s
 *   R8 dumpDialogDiagnostics on click failure
 *   R9 milestone screenshots
 *
 * NOTE: `allowFailure: true` remains at run-e2e.js:932 pending 3 consecutive
 * green CI runs (R10 gate). Do not remove until validated.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { type WebDriver, VSBrowser, ModalDialog, By, EditorView, Workbench, NotificationType } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import {
  sleep,
  captureScreenshot,
  openFolderInSession,
  pushDialogButtonWithRetry,
  isSessionEnded,
  safeCancelAnyQuickInput,
  dumpDialogDiagnostics,
} from './helpers';

const TEST_TIMEOUT = 120_000;
const PROMPT_DEADLINE_MS = 45_000;
const RELOAD_DEADLINE_MS = 30_000;

/**
 * Localized title of `DialogResponses.yes` from `@microsoft/vscode-azext-utils`
 * (defined as `vscode_1.l10n.t('Yes')`). We cannot import DialogResponses
 * directly because that module does `require('vscode')` at load time, and
 * ExTester runs Mocha as a separate process where the `vscode` module is not
 * available. R4 locks the CI runner locale to en-US via LANG/LC_ALL in
 * run-e2e.js so this literal is stable across runs.
 */
const YES_BUTTON_LABEL = 'Yes';

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'wsConversionYes-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

const DIAGNOSTICS_DIR = path.join(EXPLICIT_SCREENSHOT_DIR, 'diagnostics');

/** Strip a UTF-8 BOM that VS Code sometimes writes on Windows. */
function readJsonFile<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

/**
 * Wait for the convertToWorkspace modal dialog. The prompt is created with
 * `{ modal: true }` (convertToWorkspace.ts:119-121), so we only ever look at
 * ExTester's ModalDialog page object. Returns the message text or null.
 */
async function waitForWorkspacePrompt(driver: WebDriver, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const dialog = new ModalDialog();
      const message = await dialog.getMessage();
      if (message && /workspace/i.test(message)) {
        console.log(`[conversionYes] Found modal dialog: "${message.substring(0, 150)}"`);
        return message;
      }
    } catch {
      /* no modal yet */
    }
    await sleep(1000);
  }
  // On timeout, dump diagnostics so CI artifacts contain the DOM snapshot.
  await dumpDialogDiagnostics(driver, 'waitForWorkspacePrompt-timeout', DIAGNOSTICS_DIR);
  return null;
}

/** Detect whether VS Code reloaded the workbench after pushing "Yes". */
async function waitForReloadOrTitleChange(
  driver: WebDriver,
  titleBefore: string | null,
  timeoutMs: number
): Promise<{ kind: 'session-ended' | 'title-changed' | 'url-changed' | 'none' }> {
  const deadline = Date.now() + timeoutMs;
  const urlBefore = await driver.getCurrentUrl().catch(() => null);
  while (Date.now() < deadline) {
    try {
      const titleNow = await driver.getTitle();
      if (titleBefore && !titleBefore.includes('(Workspace)') && titleNow.includes('(Workspace)')) {
        return { kind: 'title-changed' };
      }
      const urlNow = await driver.getCurrentUrl();
      if (urlBefore && urlNow !== urlBefore) {
        return { kind: 'url-changed' };
      }
    } catch (e) {
      if (isSessionEnded(e)) {
        return { kind: 'session-ended' };
      }
      throw e;
    }
    await sleep(1000);
  }
  return { kind: 'none' };
}

/** Validate filesystem invariants A1-A7 for a manifest entry. */
function assertWorkspaceFsInvariants(entry: WorkspaceManifestEntry, phase: string): void {
  // A1: .code-workspace exists.
  assert.ok(fs.existsSync(entry.wsFilePath), `[${phase}] .code-workspace must exist at ${entry.wsFilePath}`);

  // A2: parses as JSON with folders[].
  const ws = readJsonFile<{ folders?: Array<{ path: string }> }>(entry.wsFilePath);
  assert.ok(Array.isArray(ws.folders) && ws.folders.length >= 1, `[${phase}] .code-workspace must list folders[]`);

  // A3: folder path resolves to appDir.
  const wsDir = path.dirname(entry.wsFilePath);
  const matchesAppDir = (ws.folders ?? []).some((f) => path.resolve(wsDir, f.path) === path.resolve(entry.appDir));
  assert.ok(matchesAppDir, `[${phase}] .code-workspace folders must include the logic app folder ${entry.appDir}`);

  // A4: host.json.
  assert.ok(fs.existsSync(path.join(entry.appDir, 'host.json')), `[${phase}] host.json must exist`);

  // A5: launch.json with a logic-app debug configuration.
  const launchPath = path.join(entry.appDir, '.vscode', 'launch.json');
  assert.ok(fs.existsSync(launchPath), `[${phase}] launch.json must exist at ${launchPath}`);
  const launch = readJsonFile<{ configurations?: Array<{ type?: string }> }>(launchPath);
  assert.ok(
    Array.isArray(launch.configurations) &&
      launch.configurations.some((c) => typeof c.type === 'string' && /logicapp|pwa-node|coreclr/i.test(c.type)),
    `[${phase}] launch.json must include a logic-app debug configuration (logicapp/pwa-node/coreclr)`
  );

  // A6: tasks.json with "func: host start".
  const tasksPath = path.join(entry.appDir, '.vscode', 'tasks.json');
  assert.ok(fs.existsSync(tasksPath), `[${phase}] tasks.json must exist at ${tasksPath}`);
  const tasks = readJsonFile<{ tasks?: Array<{ label?: string }> }>(tasksPath);
  assert.ok(
    Array.isArray(tasks.tasks) && tasks.tasks.some((t) => typeof t.label === 'string' && /func:\s*host start/i.test(t.label)),
    `[${phase}] tasks.json must include a "func: host start" task`
  );

  // A7: workflow.json.
  assert.ok(fs.existsSync(path.join(entry.wfDir, 'workflow.json')), `[${phase}] workflow.json must exist at ${entry.wfDir}`);
}

describe('Workspace Conversion — Click Yes', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(30_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
    if (!fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      assert.fail(`Workspace manifest not found at ${WORKSPACE_MANIFEST_PATH} - Phase 4.1 must run first`);
      return;
    }
    manifest = loadWorkspaceManifest();
    if (manifest.length === 0) {
      assert.fail('Workspace manifest is empty - Phase 4.1 must create workspaces first');
      return;
    }
    driver = VSBrowser.instance.driver;
  });

  it('should show workspace prompt and successfully click Yes', async () => {
    const entry = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest[0];
    assert.ok(entry, 'No workspace entry found in manifest');

    // R9: milestone screenshot — test start.
    await captureScreenshot(driver, 'conversion-yes-start', EXPLICIT_SCREENSHOT_DIR);

    // A1-A7: pre-click FS invariants. If these fail the test never had a
    // chance — Phase 4.1 didn't produce a usable workspace.
    assertWorkspaceFsInvariants(entry, 'pre-click');
    const preWsMtime = fs.statSync(entry.wsFilePath).mtimeMs;

    // R5: defensive pre-flight — make sure no leftover quick-input from an
    // earlier phase eats our Ctrl+Shift+P keystrokes.
    await safeCancelAnyQuickInput(driver);

    await openFolderInSession(driver, entry.wsDir);

    // Phase 4.1 p48d fix: close any auto-opened editors (e.g. WBD-hybrid
    // announcement.md preview) that steal focus into a webview iframe and
    // delay the ModalDialog page-object from becoming queryable. Cheap no-op
    // for p48a/p48e which don't auto-open previews.
    await new EditorView().closeAllEditors().catch(() => {
      // ignore — best-effort focus reset
    });
    await driver
      .switchTo()
      .defaultContent()
      .catch(() => {
        // ignore — best-effort focus reset
      });
    await sleep(1000);

    // Wait for the modal prompt to appear (R1: modal-only detection; R7: 45s).
    const promptMessage = await waitForWorkspacePrompt(driver, PROMPT_DEADLINE_MS);
    await captureScreenshot(driver, 'conversion-yes-prompt-found', EXPLICIT_SCREENSHOT_DIR);

    assert.ok(promptMessage, 'workspace conversion modal dialog must appear within 45s');
    assert.ok(/workspace/i.test(promptMessage), `prompt should mention "workspace": "${promptMessage.substring(0, 150)}"`);

    // Capture the pre-click title so we can detect "(Workspace)" flip after click.
    const titleBefore = await driver.getTitle().catch(() => null);

    // R9: milestone — about to focus + click.
    await captureScreenshot(driver, 'conversion-yes-focus-applied', EXPLICIT_SCREENSHOT_DIR);

    // R2 + R3 + R4 + R6: single retrying handle, force-focus + visibility wait
    // + Tab+Enter fallback, using the locale-locked Yes label (see
    // YES_BUTTON_LABEL constant) instead of scanning a fallback list.
    let clickThrew: unknown;
    try {
      await pushDialogButtonWithRetry(driver, YES_BUTTON_LABEL, 3, DIAGNOSTICS_DIR);
    } catch (e) {
      clickThrew = e;
      if (!isSessionEnded(e)) {
        await dumpDialogDiagnostics(driver, 'conversion-yes-click-failed', DIAGNOSTICS_DIR);
        throw e;
      }
      // Session-ended during click = reload raced ahead of the click ACK. That's success.
      console.log('[conversionYes] Selenium session ended during click — VS Code reloaded');
    }

    // R9: milestone — post-click (may fail if session already gone).
    try {
      await captureScreenshot(driver, 'conversion-yes-post-click', EXPLICIT_SCREENSHOT_DIR);
    } catch (e) {
      if (!isSessionEnded(e)) {
        throw e;
      }
    }

    // B1-B3: detect reload. If click threw session-ended we already know.
    let reloaded: Awaited<ReturnType<typeof waitForReloadOrTitleChange>>;
    if (clickThrew && isSessionEnded(clickThrew)) {
      reloaded = { kind: 'session-ended' };
    } else {
      try {
        reloaded = await waitForReloadOrTitleChange(driver, titleBefore, RELOAD_DEADLINE_MS);
      } catch (e) {
        if (isSessionEnded(e)) {
          reloaded = { kind: 'session-ended' };
        } else {
          throw e;
        }
      }
    }

    console.log(`[conversionYes] reload detection result: ${reloaded.kind}`);
    assert.ok(reloaded.kind !== 'none', 'window must reload, title must flip to "(Workspace)", or the Selenium session must end');

    // ---- Post-click filesystem reassertions (C1-C3). FS is reachable in
    // every reload-kind, even after session-ended, because Node fs is local.
    // C1: no extension-error.log.
    const errorLog = path.join(entry.wsDir, '.vscode', 'extension-error.log');
    assert.ok(!fs.existsSync(errorLog), `no extension error log should be written (saw ${errorLog})`);
    // C2: .code-workspace mtime must not regress.
    assert.ok(fs.statSync(entry.wsFilePath).mtimeMs >= preWsMtime, '.code-workspace must not be rewritten with an older mtime');
    // C3: A1-A7 still hold.
    assertWorkspaceFsInvariants(entry, 'post-click');

    // ---- D1-D3: UI state assertions, only when the session survived.
    if (reloaded.kind === 'title-changed' || reloaded.kind === 'url-changed') {
      try {
        // D1: no .code-workspace text editor open.
        const titles = await new EditorView().getOpenEditorTitles().catch(() => [] as string[]);
        assert.ok(!titles.some((t) => /\.code-workspace$/.test(t)), 'workspace should be opened as a workspace, not as a text editor');

        // D2: Azure / Logic Apps activity-bar item present.
        const activityIcons = await driver.findElements(
          By.css('.activitybar .codicon[aria-label*="Azure"], .activitybar [aria-label*="Logic Apps"]')
        );
        assert.ok(activityIcons.length > 0, 'Logic Apps / Azure activity-bar item should be present');

        // D3: no error notifications.
        const notifications = await new Workbench().getNotifications().catch(() => []);
        const errorFlags = await Promise.all(
          notifications.map(async (n) => {
            try {
              return (await n.getType()) === NotificationType.Error;
            } catch {
              return false;
            }
          })
        );
        const errorCount = errorFlags.filter(Boolean).length;
        assert.strictEqual(errorCount, 0, 'no error notifications should be present after conversion');
      } catch (e) {
        if (isSessionEnded(e)) {
          // Session ended mid-UI-check — accept as the session-ended branch.
          console.log('[conversionYes] Session ended during UI assertions — treating as reload');
        } else {
          throw e;
        }
      }
    } else {
      console.log('[conversionYes] Session ended — skipping UI assertions (B1 path)');
      // R9: capture diagnostic note for the session-ended path.
      try {
        fs.writeFileSync(
          path.join(DIAGNOSTICS_DIR, 'session-ended.txt'),
          `Selenium session ended at ${new Date().toISOString()} after pushing "${YES_BUTTON_LABEL}"\n`
        );
      } catch {
        /* ignore */
      }
    }

    console.log('[conversionYes] PASSED — prompt appeared, Yes clicked, post-conditions verified');
  });
});

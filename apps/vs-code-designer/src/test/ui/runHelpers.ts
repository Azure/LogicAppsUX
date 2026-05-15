// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Run/Debug/Overview helpers for E2E tests.
 *
 * Contains helpers for the full debug→run→verify cycle:
 *   - startDebugging: Start debugging via command palette
 *   - waitForRuntimeReady: Poll until the Functions runtime is ready
 *   - openOverviewPage: Open the overview page via Explorer right-click
 *   - switchToOverviewWebview: Switch into the overview webview iframe
 *   - clickRunTrigger: Click "Run trigger" in the overview command bar
 *   - clickRefresh: Click "Refresh" in the overview command bar
 *   - getLatestRunStatus: Get the status of the latest run
 *   - waitForRunStatusInList: Poll until the latest run shows a target status
 *   - clickLatestRunRow: Click the latest run row to open details
 *   - verifyAllNodesSucceeded: Verify all action nodes show "Succeeded"
 *   - stopDebugging: Stop the debug session
 *
 * These are extracted from designerActions.test.ts.
 */

import { execSync } from 'child_process';
import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { type Workbench, WebView, By, type WebDriver, VSBrowser, Key, EditorView, BottomBarPanel } from 'vscode-extension-tester';
import { sleep, captureScreenshot, dismissAllDialogs, clearBlockingUI, focusEditor } from './helpers';

// ===========================================================================
// Debug helpers
// ===========================================================================

/**
 * Start debugging via "Debug: Start Debugging" command palette.
 */
export async function startDebugging(workbench: Workbench, driver: WebDriver): Promise<void> {
  console.log('[debug] Starting debug via "Debug: Start Debugging"...');

  await clearBlockingUI(driver);
  await focusEditor(driver);
  await sleep(500);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await clearBlockingUI(driver);
      await focusEditor(driver);
      await sleep(500);

      const input = await workbench.openCommandPrompt();
      await sleep(500);
      await input.setText('> Debug: Start Debugging');
      await sleep(1500);

      const picks = await input.getQuickPicks();
      for (const pick of picks) {
        const label = await pick.getLabel();
        const lower = label.toLowerCase();
        if (lower.includes('start debugging') && !lower.includes('select')) {
          console.log(`[debug] Selecting: "${label}"`);
          await pick.select();
          await sleep(2000);
          return;
        }
      }

      for (const pick of picks) {
        try {
          console.log(`[debug] Available: "${await pick.getLabel()}"`);
        } catch {}
      }
      await input.cancel();
      await sleep(2000);
    } catch (e: any) {
      console.log(`[debug] Attempt ${attempt + 1}/3 failed: ${e.message}`);
      await sleep(2000);
    }
  }

  console.log('[debug] Could not find "Start Debugging" command');
}

/**
 * Wait for the Functions runtime to be ready before driving the overview.
 *
 * Two readiness modes:
 *   - **Default (`requireHostRunning: false`)** — returns true on the first
 *     of: debug toolbar visible, terminal tabs open >30 s, or
 *     `http://localhost:7071/admin/host/status` reporting `running`. This is
 *     the historical "early-return" behavior; suitable when callers only need
 *     the debugger attached.
 *   - **Strict (`requireHostRunning: true`)** — requires BOTH the debug
 *     toolbar visible AND the port-7071 host status to be `running`. The
 *     debug toolbar appears ~1-2 s after attach, well before `func host start`
 *     finishes loading bundle DLLs and registering the workflow trigger, so
 *     this mode is mandatory before any "Run trigger" interaction. Without
 *     it the downstream click loop burns its deadline waiting for the same
 *     readiness signal we already have a probe for.
 *
 * Timeout budget guidance (all callers should respect a >=90 s deadline,
 * per the reliability playbook). Default bumped from 180 s to 300 s after
 * CI runs 25893025827, 25894108831, and 25894108831-rerun showed
 * runner-image cold-start variability that exceeded 180 s on the newtests
 * shard's Phase 4.3 (toolbar appeared at 171 s in one run, never in three
 * subsequent runs on the same code path). 300 s gives enough headroom for
 * runner-image regressions without masking genuine deterministic failures.
 * The earlier 90 s -> 180 s bump (CI run 25888015435) confirmed the GitHub
 * Linux runner needs >90 s for the debug toolbar on a true cold Functions
 * runtime start. Callers that pass an explicit `timeoutMs` override take
 * precedence.
 *   - default callers: 300 s.
 *   - `clickRunTrigger` gate: 60 s strict (host *should* already be running
 *     by the time we open the overview).
 *   - `assertRunTriggerable` gate: 120 s strict (cold-start shards).
 *   - `startDebugging` post-condition: 90 s default.
 *
 * Progress is logged at most once per 10 s per signal so CI logs reveal
 * which gate is missing without spamming.
 */
export async function waitForRuntimeReady(
  driver: WebDriver,
  opts: { requireHostRunning?: boolean; timeoutMs?: number } = {}
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const requireHostRunning = opts.requireHostRunning ?? false;
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let screenshotTaken = false;
  let terminalsDetectedAt = 0;
  let lastProgressLog = 0;
  let debugToolbarSeenAt = 0;
  let hostRunningSeenAt = 0;

  while (Date.now() < deadline) {
    // Ensure every readiness probe runs against VS Code's main workbench, not a
    // webview iframe. Callers frequently arrive here while the WebDriver is
    // still parked inside a designer/overview iframe — in that context the
    // .debug-toolbar selector can't see the workbench and an in-page XHR to
    // :7071 is blocked by CORS. CI run 25903230417 (diagnostic dumps from
    // commit 7bc8b05eb) proved the host was healthy on every "300s timeout"
    // failure; the detector was simply polling from the wrong DOM context.
    // Safe to call even when already at default content.
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }

    try {
      await dismissAllDialogs(driver);
    } catch {
      /* ignore */
    }

    if (!screenshotTaken && Date.now() - t0 > 5000) {
      await captureScreenshot(driver, 'debug-waiting-for-runtime');
      screenshotTaken = true;
    }

    let debugAttached = false;
    try {
      debugAttached = !!(await driver.executeScript<boolean>(`
        var toolbar = document.querySelector('.debug-toolbar');
        if (toolbar) {
          var style = window.getComputedStyle(toolbar);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }
        var actionBar = document.querySelector('[class*="debug-toolbar"], [class*="debugging-actions"]');
        return !!actionBar;
      `));
    } catch {
      /* ignore */
    }
    if (debugAttached && debugToolbarSeenAt === 0) {
      debugToolbarSeenAt = Date.now();
      console.log(`[debug] Debug toolbar visible — debugger attached (${debugToolbarSeenAt - t0}ms)`);
    }
    if (debugAttached && !requireHostRunning) {
      await sleep(3000);
      return true;
    }

    try {
      const terminalCount = await driver.executeScript<number>(`
        var tabs = document.querySelectorAll('.terminal-tab, .terminal-tabs-entry');
        return tabs.length;
      `);
      if (terminalCount && terminalCount > 0 && terminalsDetectedAt === 0) {
        terminalsDetectedAt = Date.now();
        console.log(`[debug] Detected ${terminalCount} terminal(s) (${Date.now() - t0}ms)`);
      }
      if (!requireHostRunning && terminalsDetectedAt > 0 && Date.now() - terminalsDetectedAt > 30_000) {
        console.log(`[debug] Terminals open for 30s+ — assuming runtime ready (${Date.now() - t0}ms)`);
        return true;
      }
    } catch {
      /* ignore */
    }

    // Probe :7071 via Node http rather than an in-page XHR. The in-page XHR is
    // blocked by CORS whenever this loop runs inside a webview iframe, which
    // masked a healthy Functions host in CI run 25903230417. Node http
    // bypasses the browser/CORS layer entirely. Mirrors the Dump B pattern
    // added in commit 7bc8b05eb that was already proven to work.
    let hostReady = false;
    try {
      hostReady = await new Promise<boolean>((resolve) => {
        const req = http.get('http://localhost:7071/admin/host/status', { timeout: 2000 }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                resolve(!!(body && body.state && String(body.state).toLowerCase() === 'running'));
                return;
              }
            } catch {
              /* fallthrough */
            }
            resolve(false);
          });
          res.on('error', () => resolve(false));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      /* ignore */
    }
    if (hostReady && hostRunningSeenAt === 0) {
      hostRunningSeenAt = Date.now();
      console.log(`[debug] Functions host status='running' (${hostRunningSeenAt - t0}ms)`);
    }
    if (hostReady) {
      if (!requireHostRunning) {
        console.log(`[debug] Runtime ready — host status is 'running' (${Date.now() - t0}ms)`);
        return true;
      }
      if (debugAttached) {
        console.log(`[debug] Runtime ready — debug toolbar + host 'running' (${Date.now() - t0}ms)`);
        await sleep(1000);
        return true;
      }
    }

    if (Date.now() - lastProgressLog > 10_000) {
      lastProgressLog = Date.now();
      const elapsed = Date.now() - t0;
      const missing: string[] = [];
      if (!debugAttached) {
        missing.push('debug-toolbar');
      }
      if (requireHostRunning && !hostReady) {
        missing.push('host-running');
      }
      if (missing.length > 0) {
        console.log(`[debug] Still waiting for runtime (${elapsed}ms elapsed, missing: ${missing.join(', ')})`);
      }
    }

    await sleep(3000);
  }

  await captureScreenshot(driver, 'waitForRuntimeReady-timeout');
  const dbgLabel = debugToolbarSeenAt ? `${debugToolbarSeenAt - t0}ms` : 'never';
  const hostLabel = hostRunningSeenAt ? `${hostRunningSeenAt - t0}ms` : 'never';
  const terminalsLabel = terminalsDetectedAt ? `${terminalsDetectedAt - t0}ms` : 'never';
  console.log(
    `[debug] Timeout waiting for runtime after ${timeoutMs}ms (requireHostRunning=${requireHostRunning}, debugToolbarSeen=${dbgLabel}, hostRunningSeen=${hostLabel})`
  );

  // ===== Diagnostic dumps (timeout path only) =====
  // All wrapped in try/catch — a diagnostic failure must never mask the real
  // test failure. Triggered by CI run 25901768786 which proved both the per-
  // scenario pilot shard and the legacy newtests shard fail identically with
  // debugToolbarSeen=never, hostRunningSeen=never on Phase 4.3 inlineJavascript.
  // We need to know what func/dotnet actually did, whether :7071 became
  // reachable, and what's in the Terminal panel we're polling.

  // Dump A — Terminal panel full text + tab titles
  try {
    const bottomBar = new BottomBarPanel();
    try {
      await bottomBar.toggle(true);
    } catch {
      /* may already be open */
    }
    const terminalView = await bottomBar.openTerminalView();
    try {
      const titles = await terminalView.getTerminalTitles();
      console.log(`[waitForRuntimeReady][diag] Terminal tab titles: ${JSON.stringify(titles)}`);
    } catch {
      /* ignore */
    }
    try {
      const text = await terminalView.getText();
      console.log(`[waitForRuntimeReady][diag] Terminal text (last 8KB):\n${text.slice(-8192)}`);
    } catch (e: any) {
      console.log(`[waitForRuntimeReady][diag] Terminal getText failed: ${e?.message ?? e}`);
    }
  } catch (e: any) {
    console.log(`[waitForRuntimeReady][diag] Terminal panel access failed: ${e?.message ?? e}`);
  }

  // Dump B — Port 7071 reachability (final probe via node http, not webview XHR)
  try {
    const result = await new Promise<{ status: string; body: string }>((resolve) => {
      const req = http.get('http://localhost:7071/admin/host/status', { timeout: 2000 }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8').slice(0, 500);
          resolve({ status: String(res.statusCode ?? 'unknown'), body });
        });
        res.on('error', (err) => resolve({ status: 'unreachable', body: err.message }));
      });
      req.on('error', (err) => resolve({ status: 'unreachable', body: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'unreachable', body: 'timeout after 2000ms' });
      });
    });
    console.log(`[waitForRuntimeReady][diag] :7071 reachability: status=${result.status}, body=${result.body}`);
  } catch (e: any) {
    console.log(`[waitForRuntimeReady][diag] :7071 probe failed: ${e?.message ?? e}`);
  }

  // Dump C — Process inventory (func / dotnet / vsdbg / node)
  try {
    let output: string;
    if (process.platform === 'win32') {
      output = execSync(
        'powershell -NoProfile -Command "Get-Process | Where-Object { $_.Name -match \'func|dotnet|vsdbg|node\' } | Select-Object Id,Name,Path,StartTime | Format-Table -AutoSize | Out-String"',
        { stdio: 'pipe', timeout: 5000 }
      ).toString();
    } else {
      try {
        output = execSync("ps -eo pid,ppid,etime,comm,args | grep -E '(func|dotnet|vsdbg|node)' | grep -v grep", {
          stdio: 'pipe',
          timeout: 5000,
          shell: '/bin/sh',
        }).toString();
      } catch (e: any) {
        // grep exits 1 when no match — treat as "no matching processes"
        if (e?.status === 1) {
          output = '(no matching processes)';
        } else {
          throw e;
        }
      }
    }
    console.log(`[waitForRuntimeReady][diag] Running processes:\n${output}`);
  } catch (e: any) {
    console.log(`[waitForRuntimeReady][diag] Process inventory failed: ${e?.message ?? e}`);
  }

  // Dump D — Structured final gate state (single grep-friendly line)
  try {
    console.log(
      `[waitForRuntimeReady][diag] Final gate state: debugToolbarSeen=${dbgLabel}, terminalsDetectedAt=${terminalsLabel}, hostRunningSeen=${hostLabel}, requireHostRunning=${requireHostRunning}`
    );
  } catch {
    /* ignore - diagnostic only */
  }

  // Dump E — launch.json from the test workspace (best-effort env probe)
  try {
    const candidates = [
      process.env.LA_E2E_LEGACY_PROJECT_DIR,
      process.env.LA_E2E_CODEFUL_MODERN_DIR,
      process.env.LA_E2E_CODEFUL_LEGACY_DIR,
    ].filter((p): p is string => typeof p === 'string' && p.length > 0);
    let logged = false;
    for (const wsDir of candidates) {
      const launchPath = path.join(wsDir, '.vscode', 'launch.json');
      if (fs.existsSync(launchPath)) {
        const content = fs.readFileSync(launchPath, 'utf8').slice(0, 2000);
        console.log(`[waitForRuntimeReady][diag] launch.json (${launchPath}): ${content}`);
        logged = true;
        break;
      }
    }
    if (!logged) {
      console.log('[waitForRuntimeReady][diag] launch.json: not found (no workspace path in scope)');
    }
  } catch (e: any) {
    console.log(`[waitForRuntimeReady][diag] launch.json read failed: ${e?.message ?? e}`);
  }

  return false;
}

/**
 * Pre-warm the Functions host after starting a debug session.
 *
 * Phase 4.3 (inlineJavascript) failed in CI with "Functions host did not
 * become running within 120s" — the heavy `createplusnewtests` shard enters
 * Phase 4.3 immediately after a ~12 min Phase 4.1 workspace creation, so
 * the Functions host has had no opportunity to warm up before the first
 * `assertRunTriggerable` poll. This helper bridges that gap by running the
 * same `:7071/admin/host/status === 'running'` poll as
 * {@link waitForRuntimeReady} with a generous 180 s budget, BEFORE the test
 * begins its overview-navigation steps. By the time `assertRunTriggerable`
 * polls (120 s budget) the host should already be running and the assertion
 * returns quickly.
 *
 * Intentionally non-throwing: on timeout it logs a warning and captures a
 * screenshot but does NOT fail the test setup. The downstream
 * `assertRunTriggerable` call is the canonical assertion site and surfaces
 * the precise failure ("Functions host did not become running within 120s")
 * if the host genuinely fails to start. Throwing here would just move the
 * same failure earlier with a less informative stack.
 *
 * Default budget is 180 s (3 min), well above the documented 90 s minimum
 * CI deadline.
 */
export async function prewarmFunctionsHost(driver: WebDriver, opts?: { timeoutMs?: number }): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const t0 = Date.now();
  console.log(`[prewarm] Waiting for Functions host to report running on :7071 (budget: ${timeoutMs}ms)...`);
  const ready = await waitForRuntimeReady(driver, { requireHostRunning: true, timeoutMs });
  const elapsed = Date.now() - t0;
  if (ready) {
    console.log(`[prewarm] Functions host running (${elapsed}ms)`);
  } else {
    console.log(`[prewarm] Functions host not running after ${elapsed}ms — assertion site will retry`);
    await captureScreenshot(driver, 'prewarmFunctionsHost-timeout');
  }
  return ready;
}

// ===========================================================================
// Overview helpers
// ===========================================================================

/**
 * Open the overview page by right-clicking on workflow.json in the Explorer
 * and selecting "Overview" from the context menu.
 */
export async function openOverviewPage(workbench: Workbench, driver: WebDriver, workflowJsonPath: string): Promise<boolean> {
  console.log('[overview] Opening overview via right-click on workflow.json...');

  console.log('[overview] Switching to Explorer view...');
  try {
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('e').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
    await sleep(1500);
    console.log('[overview] Switched to Explorer view');
  } catch (e: any) {
    console.log(`[overview] Could not switch to Explorer: ${e.message}`);
  }

  await VSBrowser.instance.openResources(workflowJsonPath);
  await sleep(2000);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const treeItems =
        (await driver.executeScript<number>(`
        var items = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
        var found = 0;
        for (var i = 0; i < items.length; i++) {
          if ((items[i].textContent || '').includes('workflow.json')) { found++; }
        }
        return found;
      `)) ?? 0;

      if (treeItems === 0) {
        console.log(`[overview] Attempt ${attempt + 1}: workflow.json not found in Explorer tree`);
        await captureScreenshot(driver, `overview-explorer-attempt-${attempt + 1}`);
        await sleep(2000);
        continue;
      }

      console.log(`[overview] Found ${treeItems} workflow.json item(s) in tree`);

      await driver.executeScript<boolean>(`
        var items = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
        for (var i = 0; i < items.length; i++) {
          if ((items[i].textContent || '').trim().includes('workflow.json')) {
            items[i].scrollIntoView({block: 'center'});
            return true;
          }
        }
        return false;
      `);

      const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
      for (const row of rows) {
        try {
          const text = await row.getText();
          if (text.includes('workflow.json')) {
            console.log(`[overview] Right-clicking on: "${text.trim().substring(0, 50)}"`);
            await driver.actions().contextClick(row).perform();
            await sleep(1500);

            const menuItems = await driver.findElements(
              By.css('.context-view .action-item a, .monaco-menu .action-item a, .context-view .action-label')
            );
            for (const menuItem of menuItems) {
              try {
                const label = await menuItem.getText();
                if (label.toLowerCase().includes('overview')) {
                  console.log(`[overview] Clicking context menu: "${label}"`);
                  await menuItem.click();
                  await sleep(3000);

                  const deadline2 = Date.now() + 15_000;
                  while (Date.now() < deadline2) {
                    try {
                      const found = await driver.executeScript<boolean>(`
                        return !!(
                          document.querySelector('iframe.webview') ||
                          document.querySelector('iframe[id*="webview"]') ||
                          document.querySelector('*[id="active-frame"]')
                        );
                      `);
                      if (found) {
                        console.log('[overview] Overview webview detected');
                        return true;
                      }
                    } catch {
                      /* ignore */
                    }
                    await sleep(500);
                  }
                  console.log('[overview] Webview not detected after clicking Overview');
                  return false;
                }
              } catch {
                /* stale menu item */
              }
            }
            await driver.actions().sendKeys(Key.ESCAPE).perform();
            break;
          }
        } catch {
          /* stale row element */
        }
      }

      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(500);
      console.log(`[overview] "Overview" not found in context menu on attempt ${attempt + 1}`);
    } catch (e: any) {
      console.log(`[overview] Attempt ${attempt + 1} failed: ${e.message}`);
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(2000);
    }
  }

  console.log('[overview] Could not open overview page');
  return false;
}

/**
 * Switch into the overview webview and wait for it to render.
 */
export async function switchToOverviewWebview(driver: WebDriver, timeoutMs = 60_000): Promise<WebView> {
  const webview = new WebView();
  const t0 = Date.now();
  await webview.switchToFrame();
  console.log(`[overview] Switched into overview frame (${Date.now() - t0}ms)`);

  const deadline = Date.now() + timeoutMs;
  let lastAuthCheck = 0;
  let loggedContent = false;
  while (Date.now() < deadline) {
    try {
      const found = await driver.executeScript<boolean>(`
        return !!(
          document.querySelector('[data-testid="msla-overview-command-bar"]') ||
          document.querySelector('button[aria-label="Run trigger"]') ||
          document.querySelector('button[aria-label="Refresh"]')
        );
      `);
      if (found) {
        console.log(`[overview] Overview rendered (${Date.now() - t0}ms)`);
        return webview;
      }

      if (!loggedContent && Date.now() - t0 > 5000) {
        loggedContent = true;
        try {
          const bodyText = await driver.executeScript<string>(`
            return (document.body ? document.body.textContent : '').substring(0, 300);
          `);
          console.log(`[overview] Webview body (${Date.now() - t0}ms): "${bodyText?.substring(0, 200)}"`);
          const buttonCount = await driver.executeScript<number>(`
            return document.querySelectorAll('button').length;
          `);
          console.log(`[overview] Buttons found: ${buttonCount}`);

          // Detect if we accidentally landed in the designer webview
          const isDesigner = await driver.executeScript<boolean>(`
            return !!(
              document.querySelector('.msla-designer-canvas') ||
              document.querySelector('.react-flow__viewport') ||
              document.querySelector('[data-testid="card-Add a trigger"]')
            );
          `);
          if (isDesigner) {
            console.log('[overview] WARNING: Landed in designer webview instead of overview — switching back to retry');
            try {
              await webview.switchBack();
              // Try to close the designer tab and re-enter
              const { EditorView: EV } = require('vscode-extension-tester');
              const ev = new EV();
              await ev.closeAllEditors();
              await sleep(2000);
              await webview.switchToFrame();
              loggedContent = false; // Re-check on next iteration
            } catch {
              try {
                await webview.switchToFrame();
              } catch {
                /* ignore */
              }
            }
            continue;
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }

    if (Date.now() - lastAuthCheck > 10000) {
      lastAuthCheck = Date.now();
      try {
        await webview.switchBack();
        await dismissAllDialogs(driver);
        await webview.switchToFrame();
      } catch {
        try {
          await webview.switchToFrame();
        } catch {
          /* ignore */
        }
      }
    }

    await sleep(1000);
  }

  console.log(`[overview] Warning: overview content not detected after ${timeoutMs}ms`);
  return webview;
}

/**
 * High-level helper that drives the open-overview flow end-to-end and
 * returns a ready-to-use WebView. Combines the previous pair:
 *
 *   assert.ok(await openOverviewPage(workbench, driver, wjp), 'Overview should open');
 *   await driver.switchTo().defaultContent();
 *   const wv = await switchToOverviewWebview(driver);
 *
 * into a single helper that:
 *   1. Closes all editors and switches to default content (per SKILL.md
 *      rule #1, otherwise `switchToOverviewWebview` enters the lingering
 *      designer iframe instead of the overview iframe).
 *   2. Drives `openOverviewPage` (with retry across iterations) to right-
 *      click `workflow.json` and pick "Overview".
 *   3. Switches into the overview webview and verifies the overview
 *      command bar is present.
 *   4. Tolerates `StaleElementReferenceError` (SKILL.md rule #6/#8) and
 *      retries until the deadline.
 *   5. On timeout, captures `waitForOverviewView-timeout` and throws an
 *      `assert.fail` with a precise message identifying the missing iframe
 *      rather than the bare "Overview should open" symptom that obscures
 *      the real cause.
 *
 * Phase 4.4 (statelessVariables) failed in CI with "Overview should open"
 * — the overview tab never came up. This helper replaces that bare
 * assertion with a robust polling loop so transient open failures recover.
 *
 * Default timeout: 90_000 ms (per the 90 s minimum CI-dependent wait rule).
 */
export async function waitForOverviewView(
  workbench: Workbench,
  driver: WebDriver,
  workflowJsonPath: string,
  opts?: { timeoutMs?: number }
): Promise<WebView> {
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;

  // Per SKILL.md rule #1: ensure no other editors (especially a stale
  // designer panel) are open before triggering the overview.
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }
  try {
    await new EditorView().closeAllEditors();
  } catch {
    /* ignore */
  }
  await sleep(2000);

  let lastError: any = null;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    try {
      const opened = await openOverviewPage(workbench, driver, workflowJsonPath);
      if (!opened) {
        console.log(`[overview] openOverviewPage returned false on attempt ${attempt} — retrying`);
        await sleep(2000);
        continue;
      }
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      const remaining = Math.max(15_000, deadline - Date.now());
      const wv = await switchToOverviewWebview(driver, remaining);
      const ok = await driver.executeScript<boolean>(`
        return !!(
          document.querySelector('[data-testid="msla-overview-command-bar"]') ||
          document.querySelector('button[aria-label="Run trigger"]') ||
          document.querySelector('button[aria-label="Refresh"]')
        );
      `);
      if (ok) {
        console.log(`[overview] Overview view ready (${Date.now() - t0}ms, attempt ${attempt})`);
        return wv;
      }
      console.log(`[overview] Command bar not found in overview frame on attempt ${attempt} — retrying`);
      try {
        await wv.switchBack();
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      if (e?.name === 'StaleElementReferenceError') {
        console.log('[overview] StaleElementReferenceError during waitForOverviewView — retrying');
      } else {
        lastError = e;
        console.log(`[overview] waitForOverviewView attempt ${attempt} error: ${e?.message ?? e}`);
      }
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
    }
    try {
      await new EditorView().closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(2000);
  }

  await captureScreenshot(driver, 'waitForOverviewView-timeout');
  const suffix = lastError ? ` (last error: ${lastError?.message ?? lastError})` : '';
  assert.fail(`Overview webview did not open within ${timeoutMs}ms — runtime may be slow or webview iframe missing${suffix}`);
}

/**
 * Click the "Run trigger" button in the overview command bar.
 *
 * Default timeout is 180 s to absorb cold-start latency on heavy CI shards
 * (e.g. `createplusnewtests`) where the Functions host can keep the trigger
 * button `aria-disabled="true"` for >90 s after the host begins starting.
 *
 * @deprecated For new callers, prefer {@link assertRunTriggerable} which
 * combines the host-readiness gate with the click and surfaces precise
 * failure messages pointing at the actual root cause. The legacy pair
 *   assert.ok(await waitForRuntimeReady(driver), 'Runtime should start');
 *   assert.ok(await clickRunTrigger(driver), 'Run trigger clickable');
 * obscures the root cause when the Functions host hasn't finished starting:
 * the surfaced failure is "Run trigger clickable" but the real issue is the
 * runtime not being up.
 */
export async function clickRunTrigger(driver: WebDriver, timeoutMs = 180_000): Promise<boolean> {
  // Gate: don't burn the click-loop deadline waiting for a button that can
  // only become enabled once the Functions host is running. If the runtime
  // isn't ready within 180 s, fail fast with a screenshot + clear log so the
  // surfaced failure points at the actual root cause (runtime not ready),
  // not the downstream symptom ("Run trigger clickable").
  //
  // 180s matches the default ceiling in waitForRuntimeReady and prewarmFunctionsHost.
  // The previous 60s ceiling was too tight on the heavy `createplusnewtests` shard:
  // even after the toolbar appeared (debug session attached), the Functions host
  // could take >60s more to bind :7071, surfacing as
  // "Timeout waiting for runtime after 60000ms ... debugToolbarSeen=never,
  // hostRunningSeen=never" in Phase 4.4 statelessVariables on cold-start runners.
  const hostReady = await waitForRuntimeReady(driver, { requireHostRunning: true, timeoutMs: 180_000 });
  if (!hostReady) {
    await captureScreenshot(driver, 'clickRunTrigger-runtime-not-ready');
    console.log('[clickRunTrigger] Functions host not running after 180s; not entering click loop');
    return false;
  }

  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let foundLoggedAt = 0;
  let disabledLoggedAt = 0;
  let lastDisabledLog = 0;

  while (Date.now() < deadline) {
    try {
      const btns = await driver.findElements(By.css('button[aria-label="Run trigger"]'));
      if (btns.length > 0) {
        if (foundLoggedAt === 0) {
          foundLoggedAt = Date.now();
          console.log(`[overview] "Run trigger" button found (${foundLoggedAt - t0}ms)`);
        }
        const btn = btns[0];
        // Check both the disabled attribute and aria-disabled — the React-rendered
        // button may use either depending on Fluent UI version.
        const disabledAttr = await btn.getAttribute('disabled');
        const ariaDisabled = await btn.getAttribute('aria-disabled');
        const isDisabled = !!disabledAttr || ariaDisabled === 'true';
        if (isDisabled) {
          if (disabledLoggedAt === 0) {
            disabledLoggedAt = Date.now();
          }
          // Log at most once every 10s to avoid log spam during cold-start.
          if (Date.now() - lastDisabledLog > 10_000) {
            lastDisabledLog = Date.now();
            console.log(`[overview] "Run trigger" disabled — Functions runtime still warming up (${Date.now() - t0}ms elapsed)`);
          }
        } else {
          // Post-find enabled-stability poll: require the button to remain
          // enabled for ~500ms before clicking, so we don't race a re-render
          // that flips it back to disabled.
          await sleep(500);
          let stillEnabled = false;
          try {
            const recheck = await driver.findElements(By.css('button[aria-label="Run trigger"]'));
            if (recheck.length > 0) {
              const d2 = await recheck[0].getAttribute('disabled');
              const a2 = await recheck[0].getAttribute('aria-disabled');
              stillEnabled = !d2 && a2 !== 'true';
              if (stillEnabled) {
                await driver.actions().move({ origin: recheck[0] }).click().perform();
                console.log(`[overview] Clicked "Run trigger" (${Date.now() - t0}ms)`);
                return true;
              }
            }
          } catch (recheckErr: any) {
            // StaleElementReferenceError fires when React re-renders the
            // command bar between findElements and getAttribute. Treat as a
            // retryable transient and continue the outer poll.
            if (recheckErr?.name === 'StaleElementReferenceError') {
              console.log('[overview] StaleElementReferenceError during recheck — retrying');
              await sleep(250);
              continue;
            }
            /* fall through to retry */
          }
          if (!stillEnabled) {
            console.log('[overview] "Run trigger" flipped back to disabled — retrying');
          }
        }
      }
    } catch {
      /* ignore */
    }
    await sleep(500);
  }
  await captureScreenshot(driver, 'clickRunTrigger-timeout');
  const foundLabel = foundLoggedAt ? `${foundLoggedAt - t0}ms` : 'never';
  const disabledLabel = disabledLoggedAt ? `${disabledLoggedAt - t0}ms` : 'never';
  console.log(`[overview] "Run trigger" not clickable after ${timeoutMs}ms (foundAt=${foundLabel}, firstDisabled=${disabledLabel})`);
  return false;
}

/**
 * Wait for the Functions host to be running, then click the Run trigger.
 *
 * Replaces the copy-pasted pair:
 *   assert.ok(await waitForRuntimeReady(driver), 'Runtime should start');
 *   assert.ok(await clickRunTrigger(driver), 'Run trigger clickable');
 *
 * The legacy pattern's failure message points at the downstream symptom
 * ("Run trigger clickable") even when the root cause is the runtime never
 * becoming ready. This helper throws an AssertionError with a precise
 * message indicating which gate failed, so triage points at the real cause.
 *
 * Timeout budget:
 *   - host-running gate: 120 s (cold-start shards on CI can take this long).
 *   - clickRunTrigger inner loop: its own default 90 s, with another
 *     60 s host gate inside (cheap if host is already running).
 */
export async function assertRunTriggerable(driver: WebDriver): Promise<void> {
  const hostReady = await waitForRuntimeReady(driver, { requireHostRunning: true, timeoutMs: 120_000 });
  if (!hostReady) {
    assert.fail('Functions host did not become running within 120s — design-time/runtime startup is too slow on this shard');
  }
  const clicked = await clickRunTrigger(driver);
  if (!clicked) {
    assert.fail('Run trigger remained disabled after host became running — webview/iframe issue');
  }
}

/**
 * Click the "Refresh" button in the overview command bar.
 */
export async function clickRefresh(driver: WebDriver): Promise<void> {
  try {
    const btns = await driver.findElements(By.css('button[aria-label="Refresh"]'));
    if (btns.length > 0) {
      await driver.actions().move({ origin: btns[0] }).click().perform();
      console.log('[overview] Clicked Refresh');
      await sleep(1000);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Get the status of the latest (topmost) run in the overview run history list.
 */
export async function getLatestRunStatus(driver: WebDriver): Promise<string> {
  try {
    return await driver.executeScript<string>(`
      var rows = document.querySelectorAll('[role="row"], .ms-DetailsRow, tr');
      for (var i = 0; i < rows.length; i++) {
        var text = rows[i].textContent || '';
        if (text.includes('Status') && text.includes('Identifier')) continue;
        var statuses = ['Running', 'Succeeded', 'Failed', 'Cancelled', 'Waiting'];
        for (var j = 0; j < statuses.length; j++) {
          if (text.includes(statuses[j])) return statuses[j];
        }
      }
      return '';
    `);
  } catch {
    return '';
  }
}

/**
 * Poll the overview run history list until the latest run shows the target status.
 */
export async function waitForRunStatusInList(
  driver: WebDriver,
  targetStatus: string,
  timeoutMs = 90_000
): Promise<{ found: boolean; lastStatus: string }> {
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let lastStatus = '';
  let refreshCount = 0;

  while (Date.now() < deadline) {
    const status = await getLatestRunStatus(driver);

    if (status && status !== lastStatus) {
      console.log(`[overview] Latest run status: "${status}" (${Date.now() - t0}ms)`);
      lastStatus = status;
    }

    if (status === targetStatus) {
      return { found: true, lastStatus: status };
    }

    if ((status === 'Failed' || status === 'Cancelled') && targetStatus !== status) {
      console.log(`[overview] Run ended with "${status}" instead of "${targetStatus}"`);
      return { found: false, lastStatus: status };
    }

    if (Date.now() - t0 > (refreshCount + 1) * 3000) {
      await clickRefresh(driver);
      refreshCount++;
    }

    await sleep(1000);
  }

  console.log(`[overview] Target status "${targetStatus}" not found after ${timeoutMs}ms (last: "${lastStatus}")`);
  return { found: false, lastStatus };
}

/**
 * Click on the latest (topmost) run row to open the run details view.
 */
export async function clickLatestRunRow(driver: WebDriver): Promise<boolean> {
  try {
    const clicked = await driver.executeScript<boolean>(`
      var rows = document.querySelectorAll('[role="row"], .ms-DetailsRow, tr');
      for (var i = 0; i < rows.length; i++) {
        var text = rows[i].textContent || '';
        if (text.includes('Status') && text.includes('Identifier')) continue;
        var statuses = ['Running', 'Succeeded', 'Failed', 'Cancelled', 'Waiting'];
        var isRunRow = false;
        for (var j = 0; j < statuses.length; j++) {
          if (text.includes(statuses[j])) { isRunRow = true; break; }
        }
        if (!isRunRow) continue;
        var link = rows[i].querySelector('a, button, [role="link"], [data-is-focusable="true"]');
        if (link) { link.click(); return true; }
        rows[i].click();
        return true;
      }
      return false;
    `);
    if (clicked) {
      console.log('[overview] Clicked on latest run row to open details');
      await sleep(3000);
      return true;
    }
  } catch {
    /* ignore */
  }
  console.log('[overview] Could not find a run row to click');
  return false;
}

/**
 * Verify that all action nodes show "Succeeded" in the run details view.
 */
export async function verifyAllNodesSucceeded(driver: WebDriver): Promise<{ allSucceeded: boolean; details: string }> {
  try {
    const result = await driver.executeScript<{ succeeded: number; other: string[] }>(`
      var succeeded = 0;
      var other = [];
      var statusTexts = ['Succeeded', 'Running', 'Failed', 'Cancelled', 'Skipped', 'Waiting'];
      var cells = document.querySelectorAll('[role="gridcell"], .ms-DetailsRow-cell, td');
      for (var i = 0; i < cells.length; i++) {
        var t = (cells[i].textContent || '').trim();
        for (var j = 0; j < statusTexts.length; j++) {
          if (t === statusTexts[j]) {
            if (t === 'Succeeded') succeeded++;
            else other.push(t);
            break;
          }
        }
      }
      if (succeeded === 0) {
        var all = document.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
          var t = (all[i].textContent || '').trim();
          if (all[i].children.length === 0 && statusTexts.indexOf(t) >= 0) {
            if (t === 'Succeeded') succeeded++;
            else other.push(t);
          }
        }
      }
      return { succeeded: succeeded, other: other };
    `);

    const details = `${result.succeeded} succeeded${result.other.length > 0 ? `, non-succeeded: [${result.other.join(', ')}]` : ''}`;
    console.log(`[overview] Run details — ${details}`);
    return {
      allSucceeded: result.succeeded > 0 && result.other.length === 0,
      details,
    };
  } catch (e: any) {
    console.log(`[overview] Error reading run details: ${e.message}`);
    return { allSucceeded: false, details: 'error reading details' };
  }
}

/**
 * Stop the debug session by pressing Shift+F5.
 */
export async function stopDebugging(driver: WebDriver): Promise<void> {
  console.log('[debug] Stopping debug session (Shift+F5)...');
  try {
    await driver.actions().keyDown(Key.SHIFT).keyDown(Key.F5).keyUp(Key.F5).keyUp(Key.SHIFT).perform();
    await sleep(2000);
    console.log('[debug] Debug session stopped');
  } catch (e: any) {
    console.log(`[debug] Error stopping debug: ${e.message}`);
  }
}

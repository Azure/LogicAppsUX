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
import * as https from 'https';
import * as path from 'path';
import { type Workbench, WebView, By, type WebDriver, VSBrowser, Key, EditorView, BottomBarPanel } from 'vscode-extension-tester';
import { sleep, captureScreenshot, dismissAllDialogs, clearBlockingUI, focusEditor } from './helpers';

// ===========================================================================
// Port management helpers
// ===========================================================================

/**
 * Best-effort kill of any process(es) currently listening on `port`. Used to
 * guarantee the F5 preLaunchTask spawns a fresh `func host start` onto a
 * clean port rather than colliding with a stale design-time host, an orphan
 * from a prior phase, or an external occupant.
 *
 * CI run 25915000783 observed `:7071/admin/host/status` returning "Running"
 * in 168-306 ms after F5 — physically impossible for a cold-started func
 * host — meaning another process owned the port and was serving 404
 * `WorkflowNotFound` to `/workflows/{name}/triggers`. This helper neutralises
 * that class of false start.
 *
 * Non-fatal: if nothing is listening, or platform tooling fails, we log and
 * continue. Throwing here would mask the real downstream failure.
 */
async function killPortBound(port: number): Promise<void> {
  try {
    if (process.platform === 'win32') {
      let pidsRaw = '';
      try {
        pidsRaw = execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique"`,
          { stdio: 'pipe', timeout: 5000 }
        ).toString();
      } catch {
        pidsRaw = '';
      }
      const pids = pidsRaw
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s));
      if (pids.length === 0) {
        console.log(`[killport] no occupant on :${port}`);
        return;
      }
      for (const pid of pids) {
        let cmd = '?';
        try {
          cmd =
            execSync(
              `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessName)"`,
              { stdio: 'pipe', timeout: 5000 }
            )
              .toString()
              .trim() || '?';
        } catch {
          /* ignore */
        }
        try {
          execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`, {
            stdio: 'pipe',
            timeout: 5000,
          });
          console.log(`[killport] killed PID ${pid} (${cmd}) on :${port}`);
        } catch (e: any) {
          console.log(`[killport] failed to kill PID ${pid} (${cmd}) on :${port}: ${e?.message ?? e}`);
        }
      }
    } else {
      let pidsRaw = '';
      try {
        pidsRaw = execSync(`lsof -ti:${port}`, { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' }).toString();
      } catch (e: any) {
        // lsof exits 1 when nothing is listening — treat as "port free".
        if (e?.status === 1) {
          console.log(`[killport] no occupant on :${port}`);
          return;
        }
        throw e;
      }
      const pids = pidsRaw
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s));
      if (pids.length === 0) {
        console.log(`[killport] no occupant on :${port}`);
        return;
      }
      for (const pid of pids) {
        let cmd = '?';
        try {
          cmd = execSync(`ps -o comm= -p ${pid}`, { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' }).toString().trim() || '?';
        } catch {
          /* ignore */
        }
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' });
          console.log(`[killport] killed PID ${pid} (${cmd}) on :${port}`);
        } catch (e: any) {
          console.log(`[killport] failed to kill PID ${pid} (${cmd}) on :${port}: ${e?.message ?? e}`);
        }
      }
    }
  } catch (e: any) {
    console.log(`[killport] error while freeing :${port}: ${e?.message ?? e}`);
  }
}

/**
 * Ensure :7071 is unbound before F5 spawns a fresh `func host start`. Sleeps
 * briefly to let the kernel release the socket, then logs the freed state.
 *
 * Centralised pre-F5 hook for all phases (4.2, 4.3, 4.4, 4.5, 4.6,
 * scenarios-pilot) — invoked from {@link startDebugging} before the command
 * palette is opened so every shared-helper caller benefits.
 *
 * The `driver` parameter is currently unused but reserved for future
 * UI-side cleanup (e.g., dismissing pre-existing debug sessions).
 */
export async function prepareForFreshFuncHost(_driver?: WebDriver): Promise<void> {
  await killPortBound(7071);
  // Allow the kernel a moment to release the TCP socket before F5 binds it.
  await sleep(500);
  console.log('[prepareForFreshFuncHost] :7071 freed');
}

/**
 * Dump diagnostics when `:7071/admin/host/status` reports "Running" in under
 * 2 seconds — physically impossible for a cold-started func host, so almost
 * certainly some other process owns the port (design-time host / orphan /
 * external occupant). See CI run 25915000783.
 *
 * Captures:
 *   - port listener inventory (lsof / Get-NetTCPConnection)
 *   - per-PID process detail (cmdline / path / start time)
 *   - workflow-management endpoint body (first 500 chars) — reveals whether
 *     the occupant speaks the Logic Apps workflow runtime API at all
 *   - host.json / local.settings.json / launch.json from candidate workspace
 *     dirs (env var driven, mirroring the timeout-path `launch.json` dump)
 *
 * All probes are wrapped in try/catch — a diagnostic failure must never
 * change the test outcome.
 */
async function dumpSuspiciouslyFastHost(elapsedMs: number): Promise<void> {
  console.log(`[runtime][diag] suspiciously-fast host status (${elapsedMs}ms <2000ms) — investigating occupant of :7071`);

  // (A) Port listener inventory
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 7071 -State Listen -ErrorAction SilentlyContinue | Format-List | Out-String"',
        { stdio: 'pipe', timeout: 5000 }
      ).toString();
      console.log(`[runtime][diag] :7071 listener:\n${out}`);
    } else {
      let out: string;
      try {
        out = execSync('lsof -iTCP:7071 -sTCP:LISTEN -P -n', { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' }).toString();
      } catch (e: any) {
        out = e?.status === 1 ? '(no occupant)' : `error: ${e?.message ?? e}`;
      }
      console.log(`[runtime][diag] :7071 listener:\n${out}`);
    }
  } catch (e: any) {
    console.log(`[runtime][diag] listener probe failed: ${e?.message ?? e}`);
  }

  // (B) Per-PID process detail
  try {
    let pids: string[] = [];
    if (process.platform === 'win32') {
      try {
        const raw = execSync(
          'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 7071 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique"',
          { stdio: 'pipe', timeout: 5000 }
        ).toString();
        pids = raw
          .split(/\s+/)
          .map((s) => s.trim())
          .filter((s) => /^\d+$/.test(s));
      } catch {
        /* ignore */
      }
      for (const pid of pids) {
        try {
          const out = execSync(
            `powershell -NoProfile -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Format-List Id, ProcessName, Path, StartTime | Out-String"`,
            { stdio: 'pipe', timeout: 5000 }
          ).toString();
          console.log(`[runtime][diag] PID ${pid} detail:\n${out}`);
        } catch (e: any) {
          console.log(`[runtime][diag] PID ${pid} detail failed: ${e?.message ?? e}`);
        }
      }
    } else {
      try {
        const raw = execSync('lsof -ti:7071', { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' }).toString();
        pids = raw
          .split(/\s+/)
          .map((s) => s.trim())
          .filter((s) => /^\d+$/.test(s));
      } catch {
        /* ignore — lsof exit 1 when nothing is listening */
      }
      for (const pid of pids) {
        try {
          const out = execSync(`ps -o pid,ppid,cmd -p ${pid}`, { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' }).toString();
          console.log(`[runtime][diag] PID ${pid} detail:\n${out}`);
        } catch (e: any) {
          console.log(`[runtime][diag] PID ${pid} detail failed: ${e?.message ?? e}`);
        }
      }
    }
    if (pids.length === 0) {
      console.log('[runtime][diag] no PID resolved for :7071 (race? socket already moved?)');
    }
  } catch (e: any) {
    console.log(`[runtime][diag] PID inventory failed: ${e?.message ?? e}`);
  }

  // (C) Workflow-management endpoint body — what does this occupant *actually* serve?
  try {
    const result = await new Promise<{ status: string; body: string }>((resolve) => {
      const req = http.get('http://localhost:7071/runtime/webhooks/workflow/api/management/workflows', { timeout: 3000 }, (res) => {
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
        resolve({ status: 'unreachable', body: 'timeout after 3000ms' });
      });
    });
    console.log(`[runtime][diag] workflows-management probe: status=${result.status}, body=${result.body}`);
  } catch (e: any) {
    console.log(`[runtime][diag] workflows-management probe failed: ${e?.message ?? e}`);
  }

  // (D) host.json / local.settings.json / launch.json from candidate workspace dirs
  try {
    const candidates = [
      process.env.LA_E2E_LEGACY_PROJECT_DIR,
      process.env.LA_E2E_CODEFUL_MODERN_DIR,
      process.env.LA_E2E_CODEFUL_LEGACY_DIR,
    ].filter((p): p is string => typeof p === 'string' && p.length > 0);
    if (candidates.length === 0) {
      console.log('[runtime][diag] no workspace path in scope — skipping config dump');
    }
    for (const wsDir of candidates) {
      for (const rel of ['host.json', 'local.settings.json']) {
        const fp = path.join(wsDir, rel);
        try {
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, 'utf8').slice(0, 1024);
            console.log(`[runtime][diag] ${fp}:\n${content}`);
          } else {
            console.log(`[runtime][diag] ${fp}: (missing)`);
          }
        } catch (e: any) {
          console.log(`[runtime][diag] ${fp} read failed: ${e?.message ?? e}`);
        }
      }
      const launchPath = path.join(wsDir, '.vscode', 'launch.json');
      try {
        if (fs.existsSync(launchPath)) {
          const content = fs.readFileSync(launchPath, 'utf8').slice(0, 2000);
          console.log(`[runtime][diag] ${launchPath}:\n${content}`);
        } else {
          console.log(`[runtime][diag] ${launchPath}: (missing)`);
        }
      } catch (e: any) {
        console.log(`[runtime][diag] ${launchPath} read failed: ${e?.message ?? e}`);
      }
    }
  } catch (e: any) {
    console.log(`[runtime][diag] config dump failed: ${e?.message ?? e}`);
  }
}

// ===========================================================================
// Debug helpers
// ===========================================================================

/**
 * Start debugging via "Debug: Start Debugging" command palette.
 *
 * Before opening the command palette we proactively free :7071 — see
 * {@link prepareForFreshFuncHost} for the rationale (CI run 25915000783).
 */
export async function startDebugging(workbench: Workbench, driver: WebDriver): Promise<void> {
  console.log('[debug] Starting debug via "Debug: Start Debugging"...');

  await prepareForFreshFuncHost(driver);

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
  let suspiciousDumped = false;

  while (Date.now() < deadline) {
    // Probe VS Code's main workbench DOM via window.top rather than switching
    // the WebDriver to defaultContent. Callers frequently arrive here while
    // parked inside a designer/overview iframe (e.g., switchToOverviewWebview
    // → waitForRuntimeReady → clickRunTrigger); an unconditional
    // driver.switchTo().defaultContent() leaks that frame change back to the
    // caller and breaks downstream selectors. Using window.top.document inside
    // executeScript lets us read the workbench DOM from inside any iframe
    // without touching the driver's active frame. The :7071 probe uses Node
    // http (commit 7bc8b05eb / Dump B pattern), which bypasses the browser
    // entirely and is unaffected by CORS or frame context.

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
        try {
          var doc = (window.top && window.top.document) ? window.top.document : document;
          var win = (window.top) ? window.top : window;
          var toolbar = doc.querySelector('.debug-toolbar');
          if (toolbar) {
            var style = win.getComputedStyle(toolbar);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }
          var actionBar = doc.querySelector('[class*="debug-toolbar"], [class*="debugging-actions"]');
          return !!actionBar;
        } catch (e) {
          return false;
        }
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
        try {
          var doc = (window.top && window.top.document) ? window.top.document : document;
          var tabs = doc.querySelectorAll('.terminal-tab, .terminal-tabs-entry');
          return tabs.length;
        } catch (e) {
          return 0;
        }
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
    // Strict mode (requireHostRunning: true): we have an authoritative HTTP
    // probe to :7071/admin/host/status — when it returns 200 with body
    // state:"Running", the Functions host is actually up. DOM-based signals
    // (debug-toolbar visibility) are unreachable when callers invoke this
    // from inside a webview iframe (Chromium cross-origin isolation between
    // vscode-webview:// and vscode-file:// blocks window.top.document reads).
    // So in strict mode we trust the HTTP probe alone. DOM signals remain
    // telemetry-only and appear in the timeout diagnostic block.
    if (hostReady) {
      const elapsedMs = Date.now() - t0;
      if (elapsedMs < 2000 && !suspiciousDumped) {
        suspiciousDumped = true;
        await dumpSuspiciouslyFastHost(elapsedMs);
      }
      console.log(`[debug] Runtime ready — host status is 'running' (${elapsedMs}ms)`);
      return true;
    }

    if (Date.now() - lastProgressLog > 10_000) {
      lastProgressLog = Date.now();
      const elapsed = Date.now() - t0;
      const missing: string[] = [];
      if (requireHostRunning) {
        if (!hostReady) {
          missing.push('host-running');
        }
      } else {
        if (!debugAttached) {
          missing.push('debug-toolbar');
        }
        if (!hostReady) {
          missing.push('host-running');
        }
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
    if (requireHostRunning && hostRunningSeenAt === 0) {
      console.log('[waitForRuntimeReady][diag] strict mode timed out without `:7071` reporting Running — host genuinely never started.');
    }
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
 * Wait until the Functions host has finished scanning the workflow project
 * and registered at least one workflow function.
 *
 * Background: `:7071/admin/host/status` reports "Running" as soon as the host
 * PROCESS is up, but workflow trigger routes are not yet registered. The
 * Run trigger button stays disabled until registration completes. Polling
 * the workflow-management endpoint
 * `/runtime/webhooks/workflow/api/management/workflows` yields a non-empty
 * array once a workflow is registered.
 *
 * CI run 25908119964 demonstrated host-running fires in ~50ms but workflow
 * registration takes considerably longer on cold-start Linux runners; this
 * probe bridges that gap with a single deterministic signal.
 *
 * Response shape: depending on host version the body may be a bare array
 * (`[ {...}, {...} ]`) or an Azure-REST-style envelope (`{ value: [...] }`).
 * We accept either.
 */
export async function waitForWorkflowsRegistered(
  driver: WebDriver,
  opts: { timeoutMs?: number; intervalMs?: number; workflowName?: string } = {}
): Promise<boolean> {
  // Default bumped from 180s → 240s after CI run 25917034859. That run proved
  // the runtime DOES register the workflow on :7071 quickly, but cold-start
  // `InlineCodeDependencyGeneratorFailure` keeps `health.state="Unhealthy"`
  // until the runtime self-heals (generates the inline-code node_modules).
  // 240s is the empirically observed worst case before the runtime recovers
  // (newtests succeeds on retry 3 once node_modules exists from prior runs).
  const timeoutMs = opts.timeoutMs ?? 240_000;
  const intervalMs = opts.intervalMs ?? 2_000;
  const workflowName = opts.workflowName;
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let lastLog = 0;
  let firstSeenAt = 0;
  let lastBody = '';
  let lastStatus = 0;
  let lastHealthState = '(never seen)';
  let lastHealth: unknown = null;

  // Always probe the workflow LIST endpoint. CI run 25917034859 proved this
  // endpoint always returns 200 and each entry carries a `health` block, so a
  // single request answers both "is the workflow present?" and "is it healthy?".
  // The per-workflow `/triggers` endpoint was previously used but it only
  // proves trigger-binding, not runtime health — which is the actual gate for
  // `listCallbackUrl` to succeed when inline-code dep-generation fails.
  const probeUrl = 'http://localhost:7071/runtime/webhooks/workflow/api/management/workflows';

  while (Date.now() < deadline) {
    try {
      const reachable = await new Promise<{ status: number; body: string }>((resolve) => {
        const req = http.get(probeUrl, { timeout: 3000 }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
          res.on('error', () => resolve({ status: 0, body: '' }));
        });
        req.on('error', () => resolve({ status: 0, body: '' }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ status: 0, body: '' });
        });
      });

      lastStatus = reachable.status;
      lastBody = reachable.body;

      if (reachable.status === 200) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(reachable.body);
        } catch {
          parsed = null;
        }
        const list = Array.isArray(parsed?.value) ? parsed.value : Array.isArray(parsed) ? parsed : null;
        if (list && list.length > 0) {
          if (!firstSeenAt) {
            firstSeenAt = Date.now() - t0;
          }
          // When a specific workflow name is provided, find that entry and
          // require its health.state === "Healthy". Without a name, treat any
          // healthy workflow as success.
          const entry = workflowName ? list.find((w: any) => w?.name === workflowName) : list[0];
          if (entry) {
            const healthState: string | undefined = entry?.health?.state;
            lastHealthState = healthState ?? '(missing)';
            lastHealth = entry?.health ?? null;
            if (healthState === 'Healthy') {
              const elapsed = Date.now() - t0;
              const label = workflowName ? `workflow="${workflowName}"` : `workflow="${entry?.name ?? '?'}"`;
              console.log(`[workflows] Healthy — ${label} health.state=Healthy (${elapsed}ms)`);
              return true;
            }
          }
        }
      }
    } catch {
      /* ignore */
    }

    // Throttled progress log at 10s cadence (per playbook)
    const now = Date.now();
    if (now - lastLog >= 10_000) {
      const label = workflowName ? `workflow="${workflowName}"` : 'any workflow';
      console.log(
        `[workflows] Still waiting for ${label} health=Healthy (${now - t0}ms elapsed, lastStatus=${lastStatus}, lastHealthState=${lastHealthState})`
      );
      lastLog = now;
    }

    await sleep(intervalMs);
  }

  await captureScreenshot(driver, 'waitForWorkflowsRegistered-timeout');
  const firstSeenLabel = firstSeenAt ? `${firstSeenAt}ms` : 'never';
  const target = workflowName ? `workflow="${workflowName}" ` : '';
  let healthSnippet = '(none)';
  try {
    healthSnippet = lastHealth ? JSON.stringify(lastHealth).slice(0, 1024) : '(none)';
  } catch {
    healthSnippet = '(unserializable)';
  }
  const bodySnippet = lastBody ? lastBody.slice(0, 512) : '(empty)';
  console.log(
    `[workflows] Timeout — ${target}never reached Healthy within ${timeoutMs}ms (firstSeenAt=${firstSeenLabel}, lastStatus=${lastStatus}, lastHealthState=${lastHealthState}, lastHealth=${healthSnippet}, lastBody=${bodySnippet})`
  );
  return false;
}

// ---------------------------------------------------------------------------
// listCallbackUrl probe — gates the overview "Run trigger" enable state
// ---------------------------------------------------------------------------

/**
 * Issue a single HTTP request returning {status, body} and never reject.
 * Internal helper for the listCallbackUrl probe so the polling loop stays flat.
 */
function httpRequestJson(options: http.RequestOptions & { url: string }, timeoutMs = 3_000): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.request(options.url, { ...options, timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', () => resolve({ status: 0, body: '' }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: '' });
    });
    req.end();
  });
}

function httpPostJson(url: string, body: unknown, timeoutMs = 60_000): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body ?? {});
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(
      url,
      {
        method: 'POST',
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', (err) => resolve({ status: 0, body: err.message }));
      }
    );
    req.on('error', (err) => resolve({ status: 0, body: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: `timeout after ${timeoutMs}ms` });
    });
    req.write(payload);
    req.end();
  });
}

async function getWorkflowCallbackUrl(workflowName: string, timeoutMs = 180_000): Promise<string | undefined> {
  const apiVersion = '2019-10-01-edge-preview';
  const managementBase = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
  const deadline = Date.now() + timeoutMs;
  let triggerName: string | undefined;
  let lastStatus = 0;
  let lastBody = '';
  while (Date.now() < deadline) {
    const encodedWorkflowName = encodeURIComponent(workflowName);
    if (!triggerName) {
      const tr = await httpRequestJson({
        url: `${managementBase}/workflows/${encodedWorkflowName}/triggers?api-version=${apiVersion}`,
        method: 'GET',
      });
      lastStatus = tr.status;
      lastBody = tr.body;
      if (tr.status === 200) {
        try {
          const parsed = JSON.parse(tr.body);
          const list = Array.isArray(parsed?.value) ? parsed.value : Array.isArray(parsed) ? parsed : [];
          if (typeof list[0]?.name === 'string') {
            triggerName = list[0].name;
          }
        } catch {
          /* keep polling */
        }
      }
    }
    if (triggerName) {
      const cb = await httpRequestJson({
        url: `${managementBase}/workflows/${encodedWorkflowName}/triggers/${encodeURIComponent(triggerName)}/listCallbackUrl?api-version=${apiVersion}`,
        method: 'POST',
        headers: { 'Content-Length': '0' },
      });
      lastStatus = cb.status;
      lastBody = cb.body;
      if (cb.status === 200) {
        try {
          const parsed = JSON.parse(cb.body);
          if (typeof parsed?.value === 'string' && parsed.value.length > 0) {
            return parsed.value;
          }
        } catch {
          /* keep polling */
        }
      }
    }
    await sleep(2000);
  }
  console.log(
    `[workflowCallback] Callback URL not available for workflow="${workflowName}" within ${timeoutMs}ms (lastStatus=${lastStatus}, lastBody=${lastBody.slice(0, 500)})`
  );
  return undefined;
}

export async function invokeWorkflowCallback(
  driver: WebDriver,
  opts: { workflowName: string; body?: unknown; timeoutMs?: number }
): Promise<boolean> {
  const hostReady = await waitForRuntimeReady(driver, { requireHostRunning: true, timeoutMs: 180_000 });
  if (!hostReady) {
    await captureScreenshot(driver, 'invokeWorkflowCallback-runtime-not-ready');
    return false;
  }
  const workflowsReady = await waitForWorkflowsRegistered(driver, { workflowName: opts.workflowName, timeoutMs: 240_000 });
  if (!workflowsReady) {
    await captureScreenshot(driver, 'invokeWorkflowCallback-workflow-not-ready');
    return false;
  }
  const callbackUrl = await getWorkflowCallbackUrl(opts.workflowName, opts.timeoutMs ?? 180_000);
  if (!callbackUrl) {
    await captureScreenshot(driver, 'invokeWorkflowCallback-no-callback-url');
    return false;
  }
  let lastResult: { status: number; body: string } | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    lastResult = await httpPostJson(callbackUrl, opts.body ?? {}, 120_000);
    console.log(
      `[workflowCallback] POST workflow="${opts.workflowName}" attempt=${attempt + 1} status=${lastResult.status} body=${
        lastResult.body.slice(0, 500) || '(empty)'
      }`
    );
    if (lastResult.status >= 200 && lastResult.status < 300) {
      return true;
    }
    if (lastResult.status > 0 && lastResult.status < 500) {
      return false;
    }
    await sleep(5000);
  }
  return false;
}

/**
 * Wait until the local Functions runtime can produce a callback URL for the
 * first registered workflow trigger.
 *
 * Background: the overview "Run trigger" button is gated by
 *   `!isWorkflowRuntimeRunning || !canRunTrigger`
 * where `canRunTrigger = Boolean(workflowProperties.callbackInfo)`
 * (see libs/designer-ui/src/lib/overview/overviewcommandbar.tsx:64 and
 * libs/designer-ui/src/lib/overview/index.tsx:136). `callbackInfo` is
 * produced by the extension host calling
 *   POST {baseUrl}/workflows/{name}/triggers/{triggerName}/listCallbackUrl
 *        ?api-version=2019-10-01-edge-preview
 * (see apps/vs-code-designer/src/app/commands/workflows/openOverview.ts:468
 * and :518) and posting the response back to the webview, which flips the
 * button to enabled.
 *
 * CI run 25909925774 showed `:7071/admin/host/status:Running` and the
 * workflows-registered probe both fired within ~200ms, but the Run trigger
 * button stayed disabled for the full 180 s click-loop budget. That is the
 * window during which workflows are registered but `listCallbackUrl` still
 * fails (host hasn't fully bound the trigger route yet — symptom of cold
 * start on Linux runners). This probe collapses that window by waiting
 * directly on the same signal the UI is waiting on.
 *
 * Strategy:
 *   1. GET .../workflows?api-version=... → take the first workflow name.
 *   2. GET .../workflows/{name}/triggers?api-version=... → first trigger
 *      name (cached per workflow once seen).
 *   3. POST .../workflows/{name}/triggers/{triggerName}/listCallbackUrl?... →
 *      success = HTTP 200 with a non-empty `value` field in the JSON body.
 *
 * Non-throwing: returns true on success, false on timeout. The caller is
 * expected to log + screenshot on false; the existing button-enablement
 * poll in clickRunTrigger still runs after this probe as the canonical
 * assertion site.
 */
export async function waitForRunTriggerEnabled(
  driver: WebDriver,
  opts: { timeoutMs?: number; intervalMs?: number; apiVersion?: string; workflowName?: string } = {}
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const intervalMs = opts.intervalMs ?? 2_000;
  const apiVersion = opts.apiVersion ?? '2019-10-01-edge-preview';
  const managementBase = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let lastLog = 0;
  let lastStatus = 0;
  let lastBody = '';
  let lastStep = 'none';
  // When the caller provides the workflow name (recommended) we skip the
  // discovery step that polls the workflow LIST — that step previously
  // returned stale/template workflows from the workspace bootstrap and let
  // listCallbackUrl spin against the wrong name for the full timeout
  // (CI run 25911660164).
  let workflowName: string | undefined = opts.workflowName;
  let triggerName: string | undefined;

  while (Date.now() < deadline) {
    try {
      // Step 1: discover workflow name (cache once found).
      if (!workflowName) {
        lastStep = 'workflows';
        const wf = await httpRequestJson({ url: `${managementBase}/workflows?api-version=${apiVersion}`, method: 'GET' });
        lastStatus = wf.status;
        lastBody = wf.body;
        if (wf.status === 200) {
          let parsed: any = null;
          try {
            parsed = JSON.parse(wf.body);
          } catch {
            parsed = null;
          }
          const list = Array.isArray(parsed?.value) ? parsed.value : Array.isArray(parsed) ? parsed : null;
          if (list && list.length > 0 && typeof list[0]?.name === 'string') {
            workflowName = list[0].name;
          }
        }
      }

      // Step 2: discover trigger name (cache once found).
      if (workflowName && !triggerName) {
        lastStep = 'triggers';
        const tr = await httpRequestJson({
          url: `${managementBase}/workflows/${workflowName}/triggers?api-version=${apiVersion}`,
          method: 'GET',
        });
        lastStatus = tr.status;
        lastBody = tr.body;
        if (tr.status === 200) {
          let parsed: any = null;
          try {
            parsed = JSON.parse(tr.body);
          } catch {
            parsed = null;
          }
          const list = Array.isArray(parsed?.value) ? parsed.value : Array.isArray(parsed) ? parsed : null;
          if (list && list.length > 0 && typeof list[0]?.name === 'string') {
            triggerName = list[0].name;
          }
        }
      }

      // Step 3: probe listCallbackUrl — the canonical "button can enable" signal.
      if (workflowName && triggerName) {
        lastStep = 'listCallbackUrl';
        const cb = await httpRequestJson({
          url: `${managementBase}/workflows/${workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${apiVersion}`,
          method: 'POST',
          headers: { 'Content-Length': '0' },
        });
        lastStatus = cb.status;
        lastBody = cb.body;
        if (cb.status === 200) {
          let parsed: any = null;
          try {
            parsed = JSON.parse(cb.body);
          } catch {
            parsed = null;
          }
          if (parsed && typeof parsed.value === 'string' && parsed.value.length > 0) {
            const elapsed = Date.now() - t0;
            console.log(`[overview] listCallbackUrl ready — workflow="${workflowName}" trigger="${triggerName}" (${elapsed}ms)`);
            return true;
          }
        }
      }
    } catch {
      /* ignore — keep polling */
    }

    // Throttled progress log at 10s cadence (per playbook).
    const now = Date.now();
    if (now - lastLog >= 10_000) {
      console.log(
        `[overview] Waiting for listCallbackUrl (${now - t0}ms elapsed, step=${lastStep}, lastStatus=${lastStatus}, workflow=${workflowName ?? '?'}, trigger=${triggerName ?? '?'})`
      );
      lastLog = now;
    }

    await sleep(intervalMs);
  }

  await captureScreenshot(driver, 'waitForRunTriggerEnabled-timeout');
  const bodySnippet = lastBody ? lastBody.slice(0, 512) : '(empty)';
  // Diagnostics: log the upstream registration probe URL (probe #2) and the
  // listCallbackUrl probe URL (probe #3) side-by-side. CI run 25913438556
  // showed `/workflows/{name}` returning 200 within 13 ms while
  // `/workflows/{name}/triggers` 404'd for the full 180 s timeout — capturing
  // both URLs makes any future endpoint inconsistency obvious without guessing.
  const registrationProbeUrl = workflowName
    ? `${managementBase}/workflows/${workflowName}/triggers?api-version=${apiVersion}`
    : '(skipped — no workflowName threaded to waitForRunTriggerEnabled)';
  const listCallbackProbeUrl =
    workflowName && triggerName
      ? `${managementBase}/workflows/${workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${apiVersion}`
      : '(never reached — workflow/trigger discovery did not complete)';
  console.log(`[overview] Diagnostics — registrationProbe=${registrationProbeUrl}`);
  console.log(`[overview] Diagnostics — listCallbackProbe=${listCallbackProbeUrl}`);
  console.log(
    `[overview] Timeout — listCallbackUrl never returned a value within ${timeoutMs}ms (step=${lastStep}, lastStatus=${lastStatus}, workflow=${workflowName ?? '?'}, trigger=${triggerName ?? '?'}, lastBody=${bodySnippet})`
  );
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

  // Fail-fast disk check (PR #9164, run 25911660164): when the Create-Workflow
  // UI step silently fails to produce workflow.json, the Explorer probe inside
  // openOverviewPage logs "workflow.json not found in Explorer tree" 3 times
  // per attempt and then keeps retrying until this 90 s budget elapses. The
  // downstream failure surfaces 180 s later as "listCallbackUrl never returned
  // a value" instead of pointing at the real cause. Probe the filesystem
  // directly so we either confirm the file is on disk (Explorer tree is just
  // slow to refresh — proceed with the existing retry loop) or fail
  // immediately with a clear message identifying the missing artifact.
  if (!fs.existsSync(workflowJsonPath)) {
    await captureScreenshot(driver, 'waitForOverviewView-missing-workflow-json');
    assert.fail(`Create-Workflow UI step did not produce workflow.json on disk: ${workflowJsonPath}`);
  }

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
export async function clickRunTrigger(driver: WebDriver, opts: { timeoutMs?: number; workflowName?: string } = {}): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const workflowName = opts.workflowName;
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

  // :7071 host-status:"Running" fires as soon as the host PROCESS is up, but
  // the Run trigger button is gated by workflow REGISTRATION (host must scan
  // the project, discover the workflow function, and register its trigger
  // route). CI 25908119964 showed host-running in ~50ms but button stayed
  // disabled for full 180s. This probe bridges that gap.
  //
  // When a workflowName is provided we probe `/workflows/{name}` directly so
  // we don't green-light on stale/template workflows left in the workspace
  // (CI run 25911660164).
  const workflowsReady = await waitForWorkflowsRegistered(driver, { timeoutMs: 240_000, workflowName });
  if (!workflowsReady) {
    const target = workflowName ? `workflow="${workflowName}" ` : '';
    console.log(`[clickRunTrigger] ${target}never reached Healthy within 240s — host is up but workflow health.state never became Healthy`);
    await captureScreenshot(driver, 'clickRunTrigger-no-workflows');
    return false;
  }

  // CI run 25909925774: host-running and workflows-registered both fired in
  // <200ms but the Run trigger button stayed disabled for the full 180s
  // click-loop budget. The overview UI gates "Run trigger" on
  // `workflowProperties.callbackInfo`, which the extension host populates
  // by polling listCallbackUrl. Probe the same endpoint directly so the
  // downstream button-enablement loop doesn't have to absorb the cold-start
  // gap between "trigger registered" and "trigger route accepts
  // listCallbackUrl POSTs". See waitForRunTriggerEnabled for full details.
  const triggerEnabled = await waitForRunTriggerEnabled(driver, { timeoutMs: 180_000, workflowName });
  if (!triggerEnabled) {
    console.log('[clickRunTrigger] listCallbackUrl never returned a value within 180s — overview UI will keep button disabled');
    await captureScreenshot(driver, 'clickRunTrigger-callback-not-ready');
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
export async function assertRunTriggerable(driver: WebDriver, opts: { workflowName?: string } = {}): Promise<void> {
  const hostReady = await waitForRuntimeReady(driver, { requireHostRunning: true, timeoutMs: 120_000 });
  if (!hostReady) {
    assert.fail('Functions host did not become running within 120s — design-time/runtime startup is too slow on this shard');
  }
  const clicked = await clickRunTrigger(driver, { workflowName: opts.workflowName });
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

async function dumpWorkflowRunDiagnostics(): Promise<void> {
  const managementBase = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
  const apiVersion = '2019-10-01-edge-preview';
  try {
    const wf = await httpRequestJson({ url: `${managementBase}/workflows?api-version=${apiVersion}`, method: 'GET' }, 5_000);
    console.log(`[overview][diag] workflows status=${wf.status} body=${wf.body.slice(0, 2000) || '(empty)'}`);
    if (wf.status !== 200) {
      return;
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(wf.body);
    } catch {
      parsed = null;
    }
    const workflows = Array.isArray(parsed?.value) ? parsed.value : Array.isArray(parsed) ? parsed : [];
    for (const workflow of workflows.slice(0, 3)) {
      const workflowName = workflow?.name;
      if (typeof workflowName !== 'string' || workflowName.length === 0) {
        continue;
      }
      const encodedWorkflowName = encodeURIComponent(workflowName);
      const runs = await httpRequestJson(
        { url: `${managementBase}/workflows/${encodedWorkflowName}/runs?api-version=${apiVersion}`, method: 'GET' },
        5_000
      );
      console.log(`[overview][diag] workflow=${workflowName} runs status=${runs.status} body=${runs.body.slice(0, 2000) || '(empty)'}`);
      if (runs.status === 200) {
        try {
          const parsedRuns = JSON.parse(runs.body);
          const runItems = Array.isArray(parsedRuns?.value) ? parsedRuns.value : Array.isArray(parsedRuns) ? parsedRuns : [];
          const latestRunName = runItems[0]?.name;
          if (typeof latestRunName === 'string' && latestRunName.length > 0) {
            const encodedRunName = encodeURIComponent(latestRunName);
            const actions = await httpRequestJson(
              {
                url: `${managementBase}/workflows/${encodedWorkflowName}/runs/${encodedRunName}/actions?api-version=${apiVersion}`,
                method: 'GET',
              },
              5_000
            );
            console.log(
              `[overview][diag] workflow=${workflowName} run=${latestRunName} actions status=${actions.status} body=${
                actions.body.slice(0, 2000) || '(empty)'
              }`
            );
          }
        } catch (e: any) {
          console.log(`[overview][diag] workflow=${workflowName} action diagnostics failed: ${e?.message ?? e}`);
        }
      }
      const triggers = await httpRequestJson(
        { url: `${managementBase}/workflows/${encodedWorkflowName}/triggers?api-version=${apiVersion}`, method: 'GET' },
        5_000
      );
      console.log(
        `[overview][diag] workflow=${workflowName} triggers status=${triggers.status} body=${triggers.body.slice(0, 1000) || '(empty)'}`
      );
    }
  } catch (e: any) {
    console.log(`[overview][diag] workflow run diagnostics failed: ${e?.message ?? e}`);
  }
}

/**
 * Poll the overview run history list until the latest run shows the target status.
 */
export async function waitForRunStatusInList(
  driver: WebDriver,
  targetStatus: string,
  timeoutMs = 180_000
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
  await dumpWorkflowRunDiagnostics();
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
      var rows = document.querySelectorAll('[role="row"], .ms-DetailsRow, tr');
      for (var r = 0; r < rows.length; r++) {
        var rowText = (rows[r].textContent || '').trim();
        if (/when an http request is received|^manual\b|\bmanual\s+(running|succeeded|failed|cancelled|skipped|waiting)\b/i.test(rowText)) {
          continue;
        }
        var cells = rows[r].querySelectorAll('[role="gridcell"], .ms-DetailsRow-cell, td');
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
      }
      if (succeeded === 0 && other.length === 0) {
        var cells = document.querySelectorAll('[role="gridcell"], .ms-DetailsRow-cell, td');
        for (var k = 0; k < cells.length; k++) {
          var cellText = (cells[k].textContent || '').trim();
          for (var s = 0; s < statusTexts.length; s++) {
            if (cellText === statusTexts[s]) {
              if (cellText === 'Succeeded') succeeded++;
              else other.push(cellText);
              break;
            }
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

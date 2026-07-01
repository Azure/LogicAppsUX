// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Keyboard Navigation E2E Tests (Phase 4.6)
 *
 * Locks the production keyboard contract for the VS Code-hosted designer:
 *
 *   A. Ctrl+Alt+P opens the "Go to operation" panel.
 *      Source: libs/designer/src/lib/designer/Designer.tsx (VS Code branch).
 *   B. Escape closes the panel.
 *      Source: libs/designer/src/lib/ui/panel/nodeSearchPanel/nodeSearchPanel.tsx
 *              handleKeyDown -> toggleCollapse.
 *   C. Ctrl+Shift+P does NOT open NodeSearch when isVSCode=true.
 *      Source: Designer.tsx hotkey registration is `enabled: !isVSCode`.
 *      Note: this opens the VS Code host command palette (outside the
 *      iframe) which steals focus -- we run it last and clean up in
 *      afterEach.
 *
 * Selectors are stable aria attributes only ([role="dialog"]+aria-label),
 * no CSS classes or English text-matching. Reuses Phase 4.1's Stateful
 * Standard workspace via openDesignerForEntry().
 */

import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, EditorView, By, Key, until, type WebDriver, VSBrowser } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot } from './helpers';
import { TEST_TIMEOUT, DEPENDENCY_VALIDATION_TIMEOUT, waitForDependencyValidation, openDesignerForEntry } from './designerHelpers';
import { sessionWarmup } from './sessionWarmup';

let __warmedThisSession = false;

const GO_TO_OP_DIALOG = '[role="dialog"][aria-label="Go to operation"]';
const RESULT_LIST = '[role="list"][aria-label="List of operation results"]';
const SEARCH_BOX_PLACEHOLDER = 'Search for operation';
const PANEL_OPEN_TIMEOUT = 5_000;
const PANEL_CLOSE_TIMEOUT = 5_000;
const HOTKEY_SETTLE_MS = 1_500;

describe('Keyboard Navigation Tests', function () {
  this.timeout(TEST_TIMEOUT);
  // 3 total attempts per test. Synthetic KeyboardEvent dispatch + Actions
  // chord (Phase 4 Fix 2) is mechanism-proven but ExTester chord delivery
  // through webview iframes on xvfb is non-deterministic; retries absorb it.
  this.retries(2);

  let driver: WebDriver;
  let workbench: Workbench;
  let entry: WorkspaceManifestEntry;
  let activeWebview: Awaited<ReturnType<typeof openDesignerForEntry>>['webview'];

  before(async function () {
    this.timeout(DEPENDENCY_VALIDATION_TIMEOUT + 30_000);
    if (!fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      assert.fail(`Workspace manifest not found at ${WORKSPACE_MANIFEST_PATH} - Phase 4.1 must run first`);
      return;
    }
    const manifest = loadWorkspaceManifest();
    const found =
      manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest.find((e) => e.appType === 'standard');
    if (!found) {
      assert.fail('No Standard / Stateful workspace entry found in manifest');
      return;
    }
    entry = found;
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    await waitForDependencyValidation(driver);
  });

  beforeEach(async function () {
    if (!__warmedThisSession) {
      this.timeout(60_000);
      const result = await sessionWarmup(driver, workbench, { workspaceRoot: entry?.wsDir });
      console.log(`[warmup] ${JSON.stringify(result)}`);
      __warmedThisSession = true;
    }
    // Phase 3 H-p46-A diag: panel/tree state at test start. If iframe count is
    // 0 or designer tab count is 0 BEFORE the test body runs, the R1 iframe
    // re-entry guard inside pressGoToOperationHotkey can't help — the session
    // arrived without a designer webview, which is the real failure surface.
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    try {
      const iframes = await driver.findElements(By.css('iframe.webview'));
      const tabs = await driver.findElements(By.css('.tabs-container .tab'));
      console.log(`[keyboardNav-precondition] iframe count: ${iframes.length}, tab count: ${tabs.length}`);
    } catch (e: any) {
      console.log(`[keyboardNav-precondition] probe failed: ${e?.message?.split('\n')[0] ?? 'unknown'}`);
    }
  });

  afterEach(async () => {
    // Switch back to default content first so subsequent cleanups target
    // the VS Code host frame, not the designer iframe.
    try {
      if (activeWebview) {
        await activeWebview.switchBack();
      }
    } catch {
      /* ignore */
    }
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    // Dismiss the host command palette (test C) or any leftover modal.
    try {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    } catch {
      /* ignore */
    }
    try {
      await new EditorView().closeAllEditors();
    } catch {
      /* ignore */
    }
    activeWebview = undefined;
    await sleep(1000);
  });

  it('A: Ctrl+Alt+P opens Go to operation panel with focused search box', async () => {
    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open - ${result.error}`);
    activeWebview = result.webview;

    await anchorFocusInsideCanvas(driver);
    await pressGoToOperationHotkey(driver, activeWebview);

    const dialog = await waitForGoToOpDialogWithDiagnostic(driver);
    assert.ok(await dialog.isDisplayed(), 'Go to operation panel should be visible');

    // SearchBox should auto-focus when panel mounts (autoFocus={true}).
    await driver.wait(
      async () => {
        try {
          const active = await driver.switchTo().activeElement();
          const placeholder = await active.getAttribute('placeholder');
          return placeholder === SEARCH_BOX_PLACEHOLDER;
        } catch {
          return false;
        }
      },
      3_000,
      'SearchBox should auto-focus when Go to operation panel opens'
    );

    const list = await driver.findElements(By.css(RESULT_LIST));
    assert.ok(list.length > 0, 'Result list should be present in the panel');
  });

  it('B: Escape closes the Go to operation panel', async () => {
    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open - ${result.error}`);
    activeWebview = result.webview;

    await anchorFocusInsideCanvas(driver);
    await pressGoToOperationHotkey(driver, activeWebview);
    await waitForGoToOpDialogWithDiagnostic(driver);

    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.wait(
      async () => (await driver.findElements(By.css(GO_TO_OP_DIALOG))).length === 0,
      PANEL_CLOSE_TIMEOUT,
      'Escape should remove the Go to operation dialog from the DOM'
    );
  });

  it('C: Ctrl+Shift+P does NOT open NodeSearch when running in VS Code', async () => {
    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open - ${result.error}`);
    activeWebview = result.webview;

    await anchorFocusInsideCanvas(driver);

    // Send Ctrl+Shift+P. This will open the VS Code host palette outside
    // the iframe; the afterEach hook clears it with an Escape on default
    // content. The designer's NodeSearch hotkey is `enabled: !isVSCode`
    // so it must NOT register here.
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('p').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();

    // Allow any swallowed handlers to run; the host palette may take focus
    // away from the iframe, so we re-enter the webview to inspect the DOM.
    await sleep(HOTKEY_SETTLE_MS);
    try {
      if (activeWebview) {
        await activeWebview.switchToFrame();
      }
    } catch {
      /* ignore -- inspect from current context */
    }

    const found = await driver.findElements(By.css(GO_TO_OP_DIALOG));
    assert.strictEqual(
      found.length,
      0,
      'Ctrl+Shift+P must NOT open NodeSearch in VS Code (host palette opens instead, outside the iframe)'
    );
  });
});

/**
 * Phase 2 F3 (revised by review board #4) — Press the designer's
 * "Go to operation" hotkey (Ctrl+Alt+P).
 *
 * The hotkey is registered INSIDE the React app inside the webview iframe via
 * `useHotkeys(['ctrl+alt+p', ...])` in libs/designer/src/lib/ui/Designer.tsx.
 * The caller's `anchorFocusInsideCanvas()` already places DOM focus inside the
 * iframe before this helper runs, so Selenium's `actions().sendKeys()` reaches
 * the iframe's keydown listener directly. A pre-Escape clears any phantom
 * modal that may have appeared during designer load.
 *
 * Earlier revisions of this helper switched to `defaultContent()` before
 * sending the chord and then polled for the dialog from `defaultContent`,
 * which is the wrong frame (the dialog mounts inside the iframe) — that
 * caused deterministic post-chord readiness misses. The caller's existing
 * `driver.wait(until.elementLocated(...))` will surface a clean timeout if
 * the dialog truly fails to appear.
 *
 * Phase 2.5 carry-over (deferred from review board #5, non-blocking):
 *   - N1: F1 retry timing log via console.time/timeEnd
 *   - N2: 3s warm-up replaced with polling for host signal
 *   - N5: waitForQuickInputReady fixed sleeps replaced with polls
 *   - N6: G3 post-Escape 1000ms sleep replaced with poll
 *   - N7: clearBlockingUI called twice in one path
 *   - N8: `retried: boolean` -> `attempt = 0` to allow >1 retry
 * Tracked in plan.md and #9183. Phase 2's goal is fixing the 5 flaky
 * shards, not refactoring to perfect.
 */
async function pressGoToOperationHotkey(
  driver: WebDriver,
  webview: Awaited<ReturnType<typeof openDesignerForEntry>>['webview']
): Promise<void> {
  // Phase 4: Re-enter webview iframe and dispatch synthetic KeyboardEvent.
  // Phase 3 evidence showed activeElement was iframe <body> not
  // `.react-flow__pane` when the chord was sent via driver.actions(), so
  // `useHotkeys` never fired. Re-clicking the pane (Phase 3 r1 re-anchor)
  // did not restore focus. Bypass host-level chord routing entirely by
  // dispatching the keydown directly to the pane element from inside the
  // iframe. The iframe re-entry stays as defense-in-depth (Selenium can
  // lose frame context after the designer-open dance), and the Actions
  // chord remains as a fallback if the pane isn't present.
  try {
    try {
      await webview.switchBack();
    } catch {
      /* ignore — best-effort */
    }
    const iframes = await driver.findElements(By.css('iframe.webview'));
    if (iframes.length === 0) {
      console.log('[keyboardNav-diag] webview panel disposed before chord — cannot re-enter (R1 guard)');
      throw new Error('Webview panel disposed before keyboard chord');
    }
    await webview.switchToFrame();
    // Dispatch synthetic KeyboardEvent — bypasses focus/host routing.
    // react-hotkeys-hook listens on document by default; bubbles:true ensures
    // the event propagates from the pane up to document.
    // r1 sleeper-risk defense: dispatch keyup after keydown to prevent
    // react-hotkeys-hook v4.3.8 stale `currentlyPressedKeys` state leaking
    // across tests.
    const dispatched = await driver.executeScript<boolean>(
      'const pane = document.querySelector(".react-flow__pane");' +
        'if (!pane) return false;' +
        'pane.dispatchEvent(new KeyboardEvent("keydown", { key: "p", code: "KeyP", ctrlKey: true, altKey: true, bubbles: true, cancelable: true }));' +
        'pane.dispatchEvent(new KeyboardEvent("keyup", { key: "p", code: "KeyP", ctrlKey: true, altKey: true, bubbles: true, cancelable: true }));' +
        'return true;'
    );
    if (dispatched) {
      console.log('[pressGoToOperationHotkey] Synthetic KeyboardEvent dispatched on react-flow__pane');
      // r1 (critic): post-dispatch readback — poll for dialog within 1.5s.
      // If the synthetic path succeeded, return early; otherwise fall through
      // to the Actions chord as belt-and-suspenders (idempotent — the test
      // already handles a stray dialog via Escape).
      let synthSucceeded = false;
      try {
        await driver.wait(
          async () => (await driver.findElements(By.css('[role="dialog"][aria-label="Go to operation"]'))).length > 0,
          1500
        );
        synthSucceeded = true;
      } catch {
        /* dialog didn't appear yet — fall through to Actions chord */
      }
      if (synthSucceeded) {
        return;
      }
      console.log(
        '[pressGoToOperationHotkey] Synthetic event dispatched but dialog not detected — running Actions chord as belt-and-suspenders'
      );
    } else {
      console.log('[pressGoToOperationHotkey] .react-flow__pane not found — falling back to Actions chord');
    }
    // r1 (critic): Always run Actions chord as fallback OR belt-and-suspenders.
    // Restores pre-chord ESCAPE (lost in Phase 4 r0).
    try {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    } catch {
      /* ignore */
    }
    await sleep(200);
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.ALT).sendKeys('p').keyUp(Key.ALT).keyUp(Key.CONTROL).perform();
  } catch (e: any) {
    console.log(`[pressGoToOperationHotkey] iframe re-entry or dispatch failed: ${e?.message?.split('\n')[0] ?? 'unknown'}`);
    throw e;
  }
  // N3 (review board r2): dropped post-chord sleep(500). The caller's
  // driver.wait(until.elementLocated(GO_TO_OP_DIALOG), 5000) polls every
  // ~250ms, so a fixed sleep adds latency with no correctness benefit.
}

/**
 * N4 (review board r2) — Diagnostic wrapper for the post-chord dialog wait.
 * On TimeoutError, captures iframe count, document.activeElement, and a
 * screenshot so post-mortems can distinguish (chord didn't reach iframe)
 * vs (useHotkeys didn't fire) vs (dialog mounted in a different frame).
 */
async function waitForGoToOpDialogWithDiagnostic(driver: WebDriver) {
  try {
    return await driver.wait(until.elementLocated(By.css(GO_TO_OP_DIALOG)), PANEL_OPEN_TIMEOUT);
  } catch (e: any) {
    try {
      const iframes = await driver.findElements(By.css('iframe'));
      console.log(`[keyboardNav-diag] Dialog not found within ${PANEL_OPEN_TIMEOUT}ms`);
      console.log(`[keyboardNav-diag] iframe count: ${iframes.length}`);
      const activeTag = await driver
        .executeScript<string>('return document.activeElement ? document.activeElement.tagName : "?"')
        .catch(() => '?');
      console.log(`[keyboardNav-diag] document.activeElement: ${activeTag}`);
      await captureScreenshot(driver, 'keyboardNav-dialog-not-found');
    } catch {
      /* swallow diagnostic errors -- always rethrow original */
    }
    throw e;
  }
}

/**
 * Anchor keyboard focus inside the designer iframe by clicking an empty
 * region of the React Flow pane. Without this, the host VS Code chrome
 * may swallow the modifier keys before the iframe sees them.
 */
async function anchorFocusInsideCanvas(driver: WebDriver): Promise<void> {
  const panes = await driver.findElements(By.css('.react-flow__pane'));
  if (panes.length === 0) {
    // Fall back to clicking the document body inside the iframe.
    const body = await driver.findElement(By.css('body'));
    await driver.actions().move({ origin: body, x: 10, y: 10 }).click().perform();
    return;
  }
  await driver.actions().move({ origin: panes[0], x: 50, y: 50 }).click().perform();
  await sleep(200);
}

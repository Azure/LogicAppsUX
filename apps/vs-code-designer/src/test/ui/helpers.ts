// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Shared helpers for VS Code Extension E2E Tests.
 *
 * Centralises common utility functions that were previously duplicated across
 * createWorkspace.test.ts, designerActions.test.ts, and designerOpen.test.ts.
 *
 * Usage:
 *   import { sleep, captureScreenshot, clearBlockingUI, ... } from './helpers';
 */

import * as path from 'path';
import * as fs from 'fs';
import { By, Key, ModalDialog, until, type WebDriver, type WebElement, type Workbench } from 'vscode-extension-tester';

type WebDriverElement = Awaited<ReturnType<WebDriver['findElements']>>[number];

// ===========================================================================
// General utilities
// ===========================================================================

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Raw Selenium quick-input typing that bypasses ExTester's InputBox page object.
 *
 * The ExTester InputBox.setText/clear API can throw ElementNotInteractableError
 * on cold sessions because it matches hidden cached widgets. This helper uses
 * the proven `.quick-input-widget:not(.hidden) .quick-input-box input` selector
 * (see createWorkspaceShared.ts:266), with `until.elementLocated` so the wait
 * absorbs the widget-not-yet-rendered race, plus explicit visibility +
 * isEnabled checks and a 3-attempt retry with backoff for cold-session
 * settling.
 *
 * CAVEAT: this helper calls `input.clear()`, which deletes ALL existing text
 * in the widget — including the leading `>` prefix that
 * `Workbench.openCommandPrompt()` inserts to switch the widget into
 * command-palette mode. After clearing, the widget is in FILE / quick-open
 * mode. Callers that want command-palette behaviour must re-type the `>`
 * prefix themselves (e.g. `waitForQuickInputAndType(driver, '>Help')`), or
 * use ExTester's InputBox.setText directly. For plain file Quick Open
 * (Ctrl+P), no prefix is needed.
 *
 * Returns the input WebElement on success; throws after all retries fail.
 */
export async function waitForQuickInputAndType(driver: WebDriver, text: string, timeoutMs = 15000): Promise<WebElement> {
  // Phase 2 F2: bumped default timeoutMs 5000 -> 15000. Phase 1 CI evidence
  // (run 25949973119, smoke + multipleDesigners) showed
  // `Waiting until element is visible / 5140ms` timeouts where the widget DOM
  // exists but never paints visible. 3x headroom per senior-swe-planner I3.
  //
  // Phase 3 R2: Drop the `.quick-input-widget:not(.hidden) .quick-input-box
  // input` selector — the `.show` / `.hidden` CSS class transitions can take
  // >5s on slow CI runners (the widget paints before the class is removed).
  // F4 fix: use `offsetParent !== null` as the canonical "actually rendered"
  // check (hidden inputs are still .isEnabled() === true, so isEnabled was
  // a false-positive gate). Locate the input by structural selector only,
  // then validate visibility via computed style + offsetParent.
  // Phase 3 r1 BLOCKER #1: VS Code maintains a `.quick-input-widget` pool —
  // `document.querySelector('.quick-input-widget')` returns the first DOM
  // match, which may be a hidden cached widget. The old `offsetParent !== null`
  // check then stayed false for the whole timeout even when a visible palette
  // was rendered alongside. Iterate every widget, find the visible one, and
  // bind the input lookup to that widget so we don't grab a hidden input.
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await driver.wait(
        async () =>
          driver
            .executeScript<boolean>(
              'const widgets = Array.from(document.querySelectorAll(".quick-input-widget"));' +
                'for (const w of widgets) {' +
                '  const s = getComputedStyle(w);' +
                '  if (s.display !== "none" && s.visibility !== "hidden" && w.offsetParent !== null) {' +
                '    const inp = w.querySelector(".quick-input-box input");' +
                '    if (inp) return true;' +
                '  }' +
                '}' +
                'return false;'
            )
            .catch(() => false),
        timeoutMs,
        'Expected a visible quick-input widget containing an input to be rendered'
      );
      const inputs = await driver.findElements(By.css('.quick-input-widget .quick-input-box input'));
      let input: WebElement | null = null;
      for (const candidate of inputs) {
        const visible = await driver
          .executeScript<boolean>(
            'const w = arguments[0].closest(".quick-input-widget");' +
              'if (!w) return false;' +
              'const s = getComputedStyle(w);' +
              'return s.display !== "none" && s.visibility !== "hidden" && w.offsetParent !== null;',
            candidate
          )
          .catch(() => false);
        if (visible) {
          input = candidate;
          break;
        }
      }
      if (!input) {
        throw new Error('No visible quick-input widget found among candidates');
      }
      // Phase 4: Skip Selenium-level interactability check. R2's widget
      // iteration above correctly locates the visible widget + input, but
      // `input.clear()` then throws `element not interactable` because
      // Selenium's interactability check is stricter than
      // `display !== "none" && visibility !== "hidden" && offsetParent !== null`
      // — it also requires a non-zero bounding rect with the center not
      // occluded, and VS Code's input can have a 0x0 layout briefly while
      // the widget animates in. Use JS to focus + clear + dispatch input
      // event, then Actions.sendKeys to type into whatever element has
      // focus (the input we just focused).
      // r1 (critic): target the resolved input WebElement directly via
      // arguments[0] instead of re-querying widgets. Eliminates risk of
      // targeting a different widget than R2's iteration located if two
      // are momentarily visible.
      await driver.executeScript(
        'const i = arguments[0];' + 'i.focus();' + 'i.value = "";' + 'i.dispatchEvent(new Event("input", { bubbles: true }));',
        input
      );
      await sleep(100);
      await driver.actions().sendKeys(text).perform();
      await sleep(300);
      return input;
    } catch (e: any) {
      lastErr = e;
      const firstLine = e?.message?.split('\n')[0] ?? e?.message ?? 'unknown';
      console.log(`[waitForQuickInputAndType] attempt ${attempt + 1}/3 failed: ${firstLine}`);
      await sleep(500 * (attempt + 1));
    }
  }
  throw new Error(`[waitForQuickInputAndType] failed after 3 attempts: ${lastErr?.message ?? 'unknown'}`);
}

/**
 * Phase 2 F2 — Pre-condition gate before opening the command palette on cold
 * sessions.
 *
 * Phase 1 CI evidence (run 25949973119, p47-suite + p48c-multipledesigners)
 * showed `waitForQuickInputAndType` timing out with
 * `Waiting until element is visible / 5140ms`. The Quick Input widget exists
 * in the DOM but never becomes visible/interactable because:
 *   - notification toasts (extension activation, Azurite startup) steal focus,
 *   - a phantom Quick Input from a prior step still holds the input lock.
 *
 * This helper clears competing UI surfaces and asserts no Quick Input is
 * currently visible BEFORE the caller opens a fresh one. Per planner B4: poll
 * for state, do NOT trust fixed sleeps. Per planner B4: do NOT close the
 * auxiliary bar (could TOGGLE it open if it wasn't already open).
 */
export async function waitForQuickInputReady(workbench: Workbench, driver: WebDriver, timeoutMs = 5000): Promise<void> {
  // Phase 3 F3 fix: Switch to defaultContent BEFORE clearing notifications +
  // sending Escape. If a prior test left us inside a webview iframe, the
  // Escape would go to the React app instead of the VS Code workbench.
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }
  // Clear notifications (extension activation toasts, Azurite startup, etc.)
  try {
    await workbench.executeCommand('workbench.action.notifications.clearAll');
  } catch {
    /* ignore */
  }
  await sleep(200);
  // Phase 3 (planner improvement): Double Escape. The first dismisses an
  // inline decoration (selection / IME / link hover popup) and the second
  // closes the quick-input pool itself. Sending only one Escape was observed
  // to leave the widget visible on cold sessions.
  try {
    await driver.actions().sendKeys(Key.ESCAPE).perform();
  } catch {
    /* ignore */
  }
  await sleep(100);
  try {
    await driver.actions().sendKeys(Key.ESCAPE).perform();
  } catch {
    /* ignore */
  }
  // Phase 2 R1 (review board #4) — positive log when the gate is doing real work.
  // If a Quick Input widget is visible at entry, callers can see in CI logs that
  // this helper actually waited for clearance rather than no-opping.
  const initiallyVisible = await driver.findElements(By.css('.quick-input-widget.show'));
  if (initiallyVisible.length > 0) {
    console.log('[waitForQuickInputReady] Quick Input visible at entry — waiting for clear');
  }
  // Poll for "no Quick Input visible" state before returning. On timeout we
  // try a second Escape + brief re-poll before degrading to non-fatal so
  // callers can distinguish "gate closed cleanly" from "still busy".
  await driver
    .wait(
      async () => {
        const visible = await driver.findElements(By.css('.quick-input-widget.show'));
        return visible.length === 0;
      },
      timeoutMs,
      'No Quick Input widget should be visible before opening a fresh one'
    )
    .catch(async () => {
      console.log('[waitForQuickInputReady] First poll timed out — sending second Escape');
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(500);
      const stillVisible = await driver.findElements(By.css('.quick-input-widget.show'));
      if (stillVisible.length > 0) {
        console.log('[waitForQuickInputReady] WARN: Quick Input still visible after 2 Escapes; caller may race');
      } else {
        console.log('[waitForQuickInputReady] Second Escape cleared widget');
      }
    });
}

/** Replace invalid filename characters with underscores */
export function sanitizeFileSegment(value: string): string {
  return value
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || /[<>:"/\\|?*]/.test(char) || /\s/.test(char)) {
        return '_';
      }
      return char;
    })
    .join('');
}

// ===========================================================================
// Screenshot helpers
// ===========================================================================

/**
 * Save a base64 screenshot to the given directory.
 * Creates the directory if it doesn't exist.
 */
export async function captureScreenshot(driver: WebDriver, fileName: string, screenshotDir?: string): Promise<string | undefined> {
  const dir =
    screenshotDir ||
    path.join(
      process.env.TEMP || process.cwd(),
      'test-resources',
      'screenshots',
      'e2e-explicit',
      new Date().toISOString().replace(/[:.]/g, '-')
    );
  try {
    fs.mkdirSync(dir, { recursive: true });
    const screenshotPath = path.join(dir, `${sanitizeFileSegment(fileName)}.png`);
    const base64 = await driver.takeScreenshot();
    fs.writeFileSync(screenshotPath, base64, 'base64');
    console.log(`[screenshot] Saved: ${screenshotPath}`);
    return screenshotPath;
  } catch (e: any) {
    console.log(`[screenshot] Failed to capture "${fileName}": ${e.message}`);
    return undefined;
  }
}

// ===========================================================================
// Notification / Dialog dismissal
// ===========================================================================

/** Dismiss any VS Code notification toasts that may block interactions. */
export async function dismissNotifications(driver: WebDriver): Promise<void> {
  try {
    const closeButtons = await driver.findElements(
      By.css('.notifications-toasts .codicon-notifications-clear-all, .notification-toast .action-label.codicon-close')
    );
    for (const btn of closeButtons) {
      try {
        await btn.click();
      } catch {
        // Notification may have auto-dismissed
      }
    }
  } catch {
    // No notifications — fine
  }
}

/**
 * Dismiss any VS Code modal dialog (auth sign-in, workspace trust, etc.).
 *
 * Tries multiple strategies in order:
 *   1. ExTester ModalDialog page object — pushButton('Cancel') or ('Don't Trust')
 *   2. Raw Selenium — search for .monaco-dialog-box buttons
 *   3. Broader CSS selectors — [role="dialog"] buttons
 *   4. Press Escape key as last resort
 *
 * Returns true if a dialog was found and dismissed.
 */
export async function dismissAllDialogs(driver: WebDriver): Promise<boolean> {
  // Strategy 1: ExTester ModalDialog page object
  try {
    const dialog = new ModalDialog();
    const message = await dialog.getMessage();
    console.log(`[dismissAllDialogs] ModalDialog found: "${message.substring(0, 150)}"`);

    // CRITICAL: Do NOT dismiss the dependency validation notification.
    // The extension downloads runtime dependencies (func, dotnet, node)
    // sequentially within this single notification. Dismissing it kills
    // the in-progress download and leaves the func binary missing.
    if (message.includes('Validating Runtime Dependency') || message.includes('Successfully installed')) {
      console.log('[dismissAllDialogs] Skipping dependency validation notification — must complete');
      return false;
    }

    if (message.includes('AzureWebJobsStorage') || message.includes('local emulator installed and running')) {
      try {
        await dialog.pushButton('Debug anyway');
        console.log('[dismissAllDialogs] Clicked "Debug anyway" on storage verification dialog');
        await sleep(1000);
        return true;
      } catch {
        // Button not found — fall through to raw selectors.
      }
    }

    // Dismiss GitHub API rate-limit errors (403) that block the UI.
    // These occur when the extension checks for latest versions in CI.
    if (message.includes('Error reading JSON from URL') || message.includes('status code 403')) {
      try {
        await dialog.pushButton('Close');
        console.log('[dismissAllDialogs] Dismissed GitHub API error (403)');
        await sleep(500);
        return true;
      } catch {
        try {
          await dialog.close();
          console.log('[dismissAllDialogs] Closed GitHub API error dialog');
          await sleep(500);
          return true;
        } catch {
          /* fall through */
        }
      }
    }

    if (
      message.includes('sign in') ||
      message.includes('Sign in') ||
      message.includes('wants to sign in') ||
      message.includes('authentication')
    ) {
      try {
        await dialog.pushButton('Cancel');
        console.log('[dismissAllDialogs] Clicked "Cancel" on auth dialog');
        await sleep(1000);
        return true;
      } catch {
        // fall through
      }
    }

    const dismissLabels = ['Cancel', "Don't Trust", "Don't Allow", 'No', 'Close', 'Dismiss', 'Not Now'];
    for (const label of dismissLabels) {
      try {
        await dialog.pushButton(label);
        console.log(`[dismissAllDialogs] Clicked "${label}" via ModalDialog`);
        await sleep(1000);
        return true;
      } catch {
        // Button not found — try next
      }
    }

    try {
      await dialog.close();
      console.log('[dismissAllDialogs] Closed dialog via ModalDialog.close()');
      await sleep(1000);
      return true;
    } catch {
      /* no close button */
    }
  } catch {
    // No ModalDialog visible
  }

  // Strategy 2: Raw Selenium selectors
  const dialogSelectors = ['.monaco-dialog-box', '[role="dialog"]', '.dialog-shadow'];

  for (const containerSel of dialogSelectors) {
    try {
      const dialogs = await driver.findElements(By.css(containerSel));
      if (dialogs.length === 0) {
        continue;
      }

      let messageText = '';
      try {
        messageText = (await dialogs[0].getText()).substring(0, 200);
      } catch {
        /* ignore */
      }
      console.log(`[dismissAllDialogs] Found ${containerSel}: "${messageText}"`);

      // CRITICAL: Do NOT dismiss the dependency validation notification
      if (messageText.includes('Validating Runtime Dependency') || messageText.includes('Successfully installed')) {
        console.log('[dismissAllDialogs] Skipping dependency validation notification — must complete');
        continue;
      }

      if (messageText.includes('AzureWebJobsStorage') || messageText.includes('local emulator installed and running')) {
        try {
          const buttons = await dialogs[0].findElements(By.css('button, .monaco-text-button, .monaco-button'));
          for (const btn of buttons) {
            const label = await btn.getText().catch(() => '');
            if (label.toLowerCase().includes('debug anyway')) {
              console.log('[dismissAllDialogs] Clicking "Debug anyway" on storage verification dialog');
              await btn.click();
              await sleep(1000);
              return true;
            }
          }
        } catch {
          /* fall through to other dismiss strategies */
        }
      }

      // Dismiss GitHub API rate-limit errors (403) via raw selector
      if (messageText.includes('Error reading JSON from URL') || messageText.includes('status code 403')) {
        try {
          const closeBtn = await dialogs[0].findElement(By.css('.codicon-close, [aria-label="Close"]'));
          await closeBtn.click();
          console.log('[dismissAllDialogs] Dismissed GitHub API error via raw selector');
          await sleep(500);
          return true;
        } catch {
          /* fall through to other dismiss strategies */
        }
      }

      if (messageText.includes('sign in') || messageText.includes('Sign in') || messageText.includes('wants to sign in')) {
        try {
          const cancelBtns = await dialogs[0].findElements(By.css('button, .monaco-text-button, .monaco-button'));
          for (const btn of cancelBtns) {
            const label = await btn.getText().catch(() => '');
            if (label.toLowerCase().includes('cancel')) {
              await btn.click();
              await sleep(1000);
              return true;
            }
          }
        } catch {
          /* ignore */
        }
      }

      const buttonSelectors = [
        '.dialog-buttons-row .monaco-text-button',
        '.dialog-buttons-row .monaco-button',
        '.dialog-buttons button',
        'button',
      ];

      for (const btnSel of buttonSelectors) {
        try {
          const buttons = await dialogs[0].findElements(By.css(btnSel));
          for (const btn of buttons) {
            let label = '';
            try {
              label = await btn.getText();
            } catch {
              /* ignore */
            }
            if (!label) {
              try {
                label = await btn.getAttribute('title');
              } catch {
                /* ignore */
              }
            }
            const lower = (label || '').toLowerCase();
            if (
              lower.includes('cancel') ||
              lower.includes("don't trust") ||
              lower.includes("don't allow") ||
              lower.includes('no') ||
              lower.includes('close') ||
              lower.includes('not now')
            ) {
              console.log(`[dismissAllDialogs] Clicking "${label}" in ${containerSel}`);
              await btn.click();
              await sleep(1000);
              return true;
            }
          }
          if (buttons.length > 0) {
            const lastLabel = await buttons[buttons.length - 1].getText().catch(() => 'unknown');
            console.log(`[dismissAllDialogs] Clicking last button "${lastLabel}" in ${containerSel}`);
            await buttons[buttons.length - 1].click();
            await sleep(1000);
            return true;
          }
        } catch {
          /* try next */
        }
      }

      try {
        const closeBtn = await dialogs[0].findElement(By.css('.codicon-dialog-close, .codicon-close'));
        await closeBtn.click();
        console.log(`[dismissAllDialogs] Closed ${containerSel} via X button`);
        await sleep(1000);
        return true;
      } catch {
        /* no close button */
      }
    } catch {
      /* selector not found */
    }
  }

  return false;
}

// ===========================================================================
// Modal-dialog click helpers (used by workspace conversion tests)
// ===========================================================================

/**
 * Returns true if a Selenium error indicates the WebDriver session has ended
 * (e.g. VS Code reloaded, killing chromedriver). This is expected on the
 * workspace-conversion "Yes" path where clicking the button reloads the
 * window and tears down the Selenium session.
 */
export function isSessionEnded(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /invalid session id|NoSuchSession|session deleted|chrome not reachable|target window already closed|disconnected: not connected/i.test(
    msg
  );
}

/**
 * Force-focus the primary button of the active modal dialog. xvfb does not
 * auto-raise modal windows, so the focused element on the underlying editor
 * can swallow click events directed at the dialog. Calling .focus() via JS
 * on the modal's primary button bypasses this and ensures Tab+Enter / click
 * targets the dialog.
 */
export async function focusModalPrimaryButton(driver: WebDriver): Promise<boolean> {
  try {
    const focused = await driver.executeScript<boolean>(`
      const btn = document.querySelector('.monaco-dialog-box button.primary, .monaco-dialog-box button');
      if (btn) { btn.focus(); return true; }
      return false;
    `);
    return focused === true;
  } catch {
    return false;
  }
}

/**
 * Capture diagnostic information about modal dialogs / notifications / the
 * active element to disk. Used as a fallback when clicking a dialog button
 * fails so CI artifacts contain enough context to root-cause the failure.
 */
export async function dumpDialogDiagnostics(driver: WebDriver, label: string, dir: string): Promise<void> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const lines: string[] = [`[${ts}] ${label}`];
  try {
    lines.push(`title: ${await driver.getTitle()}`);
    lines.push(`url: ${await driver.getCurrentUrl()}`);
    const bodyLen = await driver.executeScript('return document.body.outerHTML.length');
    lines.push(`bodyHtmlLen: ${bodyLen}`);
    const dialogs = await driver.findElements(By.css('.monaco-dialog-box'));
    lines.push(`dialogCount: ${dialogs.length}`);
    for (let i = 0; i < dialogs.length; i++) {
      const txt = (await dialogs[i].getText().catch(() => '')).slice(0, 200);
      lines.push(`dialog[${i}]: ${txt}`);
    }
    const toasts = await driver.findElements(By.css('.notification-toast'));
    lines.push(`notificationCount: ${toasts.length}`);
    const active = await driver.switchTo().activeElement();
    const tag = await active.getTagName().catch(() => '?');
    const cls = await active.getAttribute('class').catch(() => '?');
    lines.push(`activeElement: <${tag} class="${cls}">`);
  } catch (e) {
    lines.push(`(diagnostic capture errored: ${e instanceof Error ? e.message : String(e)})`);
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${sanitizeFileSegment(label)}-${ts}.txt`), lines.join('\n'));
  } catch (e) {
    console.log(`[dumpDialogDiagnostics] failed to write: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Resolve a single ModalDialog handle and click the named button, retrying
 * on StaleElementReferenceError. Two prior bugs in workspaceConversionYes
 * were caused by (a) instantiating two `new ModalDialog()` references and
 * having the second go stale, and (b) the first click silently failing
 * because xvfb hadn't routed focus to the dialog yet.
 *
 * The retry path force-focuses the primary button before re-attempting,
 * waits for it to be visible, and finally falls back to Tab+Enter — which
 * is the most xvfb-robust way to activate the default modal button.
 */
export async function pushDialogButtonWithRetry(driver: WebDriver, label: string, retries = 3, diagnosticsDir?: string): Promise<void> {
  let lastErr: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      const dialog = new ModalDialog();
      // AbstractElement.wait() exists on older versions; guard with optional chain.
      try {
        await (dialog as unknown as { wait?: (timeout: number) => Promise<void> }).wait?.(5000);
      } catch {
        /* ignore — pushButton will throw the real error if dialog is missing */
      }
      // Force focus + wait for visibility BEFORE click — xvfb sometimes leaves
      // focus on the underlying editor, which swallows the click.
      await focusModalPrimaryButton(driver);
      await sleep(200);
      try {
        const btn = await driver.findElement(By.css('.monaco-dialog-box button.primary, .monaco-dialog-box button'));
        await driver.wait(until.elementIsVisible(btn), 5000).catch(() => undefined);
      } catch {
        /* dialog may have closed already */
      }
      await dialog.pushButton(label);
      console.log(`[pushDialogButtonWithRetry] Clicked "${label}" (attempt ${i + 1})`);
      return;
    } catch (e) {
      lastErr = e as Error;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[pushDialogButtonWithRetry] attempt ${i + 1} failed: ${msg.substring(0, 200)}`);
      if (isSessionEnded(e)) {
        // Session is gone — the click probably worked and VS Code reloaded.
        throw e;
      }
      if (diagnosticsDir) {
        await dumpDialogDiagnostics(driver, `pushDialogButton-attempt${i + 1}`, diagnosticsDir);
      }
      if ((i < retries - 1 && e instanceof Error && e.name === 'StaleElementReferenceError') || /stale|detached/i.test(msg)) {
        await sleep(500);
        continue;
      }
      // Final fallback on the last attempt: Tab+Enter — xvfb-robust default-button activation.
      if (i === retries - 1) {
        try {
          await focusModalPrimaryButton(driver);
          await sleep(200);
          await driver.actions().sendKeys(Key.TAB).perform();
          await sleep(150);
          await driver.actions().sendKeys(Key.ENTER).perform();
          console.log('[pushDialogButtonWithRetry] Fell back to Tab+Enter');
          return;
        } catch (fallbackErr) {
          if (isSessionEnded(fallbackErr)) {
            throw fallbackErr;
          }
          lastErr = fallbackErr as Error;
        }
      }
      await sleep(500);
    }
  }
  throw lastErr ?? new Error(`Failed to push '${label}' after ${retries} retries`);
}

/**
 * Cancel any currently open VS Code quick-input widget (command palette,
 * quick-pick, input box). Pressing Escape is safe even if no widget is
 * showing — this is a defensive pre-flight before opening a new prompt.
 */
export async function safeCancelAnyQuickInput(driver: WebDriver): Promise<void> {
  try {
    const visible = await driver.executeScript<boolean>(`
      const w = document.querySelector('.quick-input-widget:not(.hidden)');
      return !!(w && w.offsetHeight > 0);
    `);
    if (!visible) {
      return;
    }
    for (let i = 0; i < 3; i++) {
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(200);
      const stillVisible = await driver.executeScript<boolean>(`
        const w = document.querySelector('.quick-input-widget:not(.hidden)');
        return !!(w && w.offsetHeight > 0);
      `);
      if (!stillVisible) {
        return;
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Aggressively dismiss any blocking UI element: modal dialogs, notifications,
 * quick-pick widgets, and workspace trust prompts.
 */
export async function clearBlockingUI(driver: WebDriver): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const dismissed = await dismissAllDialogs(driver);
    if (!dismissed) {
      break;
    }
    await sleep(500);
  }
  await dismissNotifications(driver);
  // Dismiss any QuickPick widget (e.g. "Use connectors from Azure" / "Skip for now")
  await dismissQuickPickIfVisible(driver);
  try {
    const body = await driver.findElement(By.css('body'));
    for (let i = 0; i < 3; i++) {
      await body.sendKeys(Key.ESCAPE);
      await sleep(300);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Dismiss any visible QuickPick widget by selecting "Skip for now" or
 * "Connection Keys" if available, otherwise pressing Escape.
 * Uses JS-based textContent extraction for reliable label matching.
 */
export async function dismissQuickPickIfVisible(driver: WebDriver): Promise<boolean> {
  try {
    const result = await driver.executeScript<string | null>(`
      const widget = document.querySelector('.quick-input-widget:not(.hidden)');
      if (!widget) return null;
      // Skip the command palette (input starts with ">")
      const inputEl = widget.querySelector('.quick-input-box input');
      if (inputEl && (inputEl.value || '').startsWith('>')) return null;
      const rows = widget.querySelectorAll('.quick-input-list .monaco-list-row');
      if (rows.length === 0) return null;
      for (const row of rows) {
        const labelSpan = row.querySelector('.label-name');
        const text = (labelSpan ? labelSpan.textContent : row.textContent || '').toLowerCase();
        if (text.includes('skip')) { row.click(); return 'skip'; }
        if (text.includes('connection key') || text.includes('access key')) { row.click(); return 'connkey'; }
      }
      return 'unknown';
    `);

    if (!result) {
      return false;
    }

    if (result === 'skip' || result === 'connkey') {
      console.log(`[dismissQuickPick] Clicked ${result} option`);
      await sleep(1000);
      return true;
    }

    // Unknown QuickPick — press Escape
    console.log('[dismissQuickPick] No skip/connkey option, pressing Escape');
    const body = await driver.findElement(By.css('body'));
    await body.sendKeys(Key.ESCAPE);
    await sleep(500);
    return true;
  } catch {
    return false;
  }
}

/**
 * JS-injection DOM scan for blocking UI elements. Useful for debugging.
 */
export async function dumpDomState(driver: WebDriver, label: string): Promise<void> {
  try {
    const result = await driver.executeScript<string>(`
      const info = [];
      const dialogSelectors = [
        '.monaco-dialog-box', '[role="dialog"]', '.dialog-shadow',
        '.monaco-dialog-modal-block', '.dialog-box',
        '.quick-input-widget:not(.hidden)',
        '.notification-toast', '.notifications-toasts.visible',
        '.context-view.monaco-menu-container',
        '.welcomeOverlay', '.trust-dialog', '.workspace-trust',
        '.editor-widget.suggest-widget.visible',
      ];
      for (const sel of dialogSelectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const text = els[0].textContent?.substring(0, 200) || '';
          info.push(sel + ' (' + els.length + '): ' + text.replace(/\\n/g, ' '));
        }
      }
      const active = document.activeElement;
      if (active) {
        info.push('activeElement: <' + active.tagName + '> class=' + active.className?.substring(0, 100));
      }
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 100 &&
            el.offsetWidth > 100 && el.offsetHeight > 100 &&
            style.display !== 'none' && style.visibility !== 'hidden') {
          const text = el.textContent?.substring(0, 150) || '';
          if (text.length > 5) {
            info.push('FIXED-OVERLAY: <' + el.tagName + '.' + el.className?.substring(0, 80) + '> z=' + style.zIndex + ': ' + text.replace(/\\n/g, ' '));
          }
        }
      }
      return info.join('\\n');
    `);
    if (result && result.trim()) {
      console.log(`[dumpDomState:${label}]\n${result}`);
    } else {
      console.log(`[dumpDomState:${label}] No blocking elements found`);
    }
  } catch (e: any) {
    console.log(`[dumpDomState:${label}] Error: ${e.message}`);
  }
}

/** Dismiss dialogs via injected JS clicking Cancel/Close buttons. */
export async function jsDismissDialogs(driver: WebDriver): Promise<boolean> {
  try {
    const dismissed = await driver.executeScript<boolean>(`
      const selectors = [
        '.monaco-dialog-box .dialog-buttons-row button',
        '[role="dialog"] button',
        '.dialog-shadow button',
        '.dialog-box button',
      ];
      for (const sel of selectors) {
        const buttons = document.querySelectorAll(sel);
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('cancel') || text.includes("don't trust") || text.includes('no') || text.includes('close')) {
            btn.click();
            return true;
          }
        }
        if (buttons.length > 0) {
          buttons[buttons.length - 1].click();
          return true;
        }
      }
      return false;
    `);
    if (dismissed) {
      console.log('[jsDismissDialogs] Dismissed a dialog via JS injection');
      await sleep(1000);
    }
    return dismissed || false;
  } catch {
    return false;
  }
}

/** Ensure focus is on the VS Code editor area (not a dialog or webview). */
export async function focusEditor(driver: WebDriver): Promise<void> {
  try {
    const editor = await driver.findElement(By.css('.editor-container, .monaco-editor, .split-view-view'));
    await editor.click();
    await sleep(500);
  } catch {
    try {
      const wb = await driver.findElement(By.css('.monaco-workbench'));
      await wb.click();
      await sleep(500);
    } catch {
      /* ignore */
    }
  }
}

// ===========================================================================
// VS Code Activity Bar / Sidebar helpers (for tree-view tests)
// ===========================================================================

/**
 * Open a view from the VS Code Activity Bar by title (e.g., "Azure", "Explorer").
 * Uses Selenium to click the activity bar icon matching the given title.
 */
export async function openActivityBarItem(driver: WebDriver, title: string): Promise<void> {
  const items = await driver.findElements(By.css('.activitybar .actions-container .action-item a[aria-label]'));
  for (const item of items) {
    const label = await item.getAttribute('aria-label').catch(() => '');
    if (label.toLowerCase().includes(title.toLowerCase())) {
      await item.click();
      await sleep(2000);
      console.log(`[openActivityBarItem] Opened "${title}" from activity bar`);
      return;
    }
  }
  throw new Error(`Activity bar item "${title}" not found`);
}

/**
 * Expand a tree-view item in the sidebar by navigating through the given path.
 * Returns the final tree item element.
 */
export async function expandTreeViewItem(driver: WebDriver, path: string[]): Promise<WebDriverElement | null> {
  let currentElements = await driver.findElements(By.css('.pane-body .monaco-list-row'));
  let lastFound: WebDriverElement | null = null;

  for (const segment of path) {
    let found = false;
    currentElements = await driver.findElements(By.css('.pane-body .monaco-list-row'));

    for (const el of currentElements) {
      const text = await el.getText().catch(() => '');
      if (text.toLowerCase().includes(segment.toLowerCase())) {
        // Check if it's expandable (has a twistie that's not expanded)
        try {
          const twistie = await el.findElement(By.css('.monaco-tl-twistie'));
          const classes = await twistie.getAttribute('class');
          if (classes && !classes.includes('collapsedTwistie') && classes.includes('collapsed')) {
            await twistie.click();
            await sleep(1500);
          } else if (!classes?.includes('expanded')) {
            await el.click();
            await sleep(1500);
          }
        } catch {
          await el.click();
          await sleep(1500);
        }
        lastFound = el;
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`[expandTreeViewItem] Could not find tree item matching "${segment}"`);
      return null;
    }
  }
  return lastFound;
}

/**
 * Click an inline action button on a tree view item (e.g., the "+" icon).
 */
export async function clickTreeViewAction(driver: WebDriver, itemLabel: string, actionLabel: string): Promise<void> {
  const rows = await driver.findElements(By.css('.pane-body .monaco-list-row'));
  for (const row of rows) {
    const text = await row.getText().catch(() => '');
    if (text.toLowerCase().includes(itemLabel.toLowerCase())) {
      // Hover to reveal inline actions
      await driver.actions().move({ origin: row }).perform();
      await sleep(500);
      const actions = await row.findElements(By.css('.actions .action-label'));
      for (const action of actions) {
        const label = await action.getAttribute('aria-label').catch(() => '');
        const title = await action.getAttribute('title').catch(() => '');
        if (label.toLowerCase().includes(actionLabel.toLowerCase()) || title.toLowerCase().includes(actionLabel.toLowerCase())) {
          await action.click();
          await sleep(1000);
          console.log(`[clickTreeViewAction] Clicked "${actionLabel}" on "${itemLabel}"`);
          return;
        }
      }
      // If no specific action found, just click the row
      throw new Error(`Action "${actionLabel}" not found on tree item "${itemLabel}"`);
    }
  }
  throw new Error(`Tree item "${itemLabel}" not found`);
}

// ===========================================================================
// Folder / workspace opening (for tests that can't use code -r)
// ===========================================================================

/**
 * Pre-flight: wait until the VS Code workbench is ready to accept keyboard input.
 *
 * Checks that:
 *   - The activity bar is rendered and has non-zero width.
 *   - No blocking modal dialog (workspace trust, sign-in, etc.) is visible.
 *   - Any startup "Restore unsaved files" / Welcome quick-input is dismissed.
 *
 * Tests that launch immediately after a fresh VS Code session (e.g. Phase 4.8b
 * `openFolderInSession`) otherwise burn an entire retry attempt — typically
 * ~13 s — waiting on `ElementNotInteractableError` from the command palette.
 * Returns true if ready, false on timeout (callers should proceed regardless).
 */
export async function waitForWorkbenchReady(driver: WebDriver, timeoutMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let lastLog = 0;
  while (Date.now() < deadline) {
    try {
      try {
        await dismissAllDialogs(driver);
      } catch {
        /* ignore */
      }
      try {
        await dismissNotifications(driver);
      } catch {
        /* ignore */
      }

      const ready = await driver.executeScript<boolean>(`
        const ab = document.querySelector('.activitybar');
        if (!ab || ab.offsetWidth === 0 || ab.offsetHeight === 0) return false;
        const dialog = document.querySelector('.monaco-dialog-box, [role="dialog"].dialog-box');
        if (dialog && dialog.offsetWidth > 0 && dialog.offsetHeight > 0) return false;
        const widget = document.querySelector('.quick-input-widget:not(.hidden)');
        if (widget && widget.offsetHeight > 0) {
          const inputEl = widget.querySelector('.quick-input-box input');
          const v = inputEl ? (inputEl.value || '') : '';
          // Startup "Restore unsaved files" / Welcome prompts are not command-mode
          if (!v.startsWith('>')) return false;
        }
        return true;
      `);
      if (ready) {
        return true;
      }
    } catch {
      /* ignore */
    }
    if (Date.now() - lastLog > 10_000) {
      console.log('[waitForWorkbenchReady] still waiting for workbench…');
      lastLog = Date.now();
    }
    await sleep(500);
  }
  console.log('[waitForWorkbenchReady] timeout — proceeding anyway');
  return false;
}

/**
 * Open a folder in VS Code via the command palette.
 *
 * ExTester's openResources / startup resources use `code -r` CLI IPC which
 * silently fails on Linux CI. This function uses the command palette
 * "File: Open Folder..." command with the simple dialog (text input).
 *
 * IMPORTANT: Does NOT dismiss dialogs after opening — conversion tests need
 * the workspace prompt dialog to remain visible.
 */
export async function openFolderInSession(driver: WebDriver, folderPath: string): Promise<void> {
  console.log(`[openFolderInSession] Opening folder: ${folderPath}`);

  // Pre-flight: wait until the workbench is interactable. Without this the
  // first retry attempt almost always fails with ElementNotInteractableError
  // and wastes ~13 s before the second attempt succeeds.
  await waitForWorkbenchReady(driver, 20_000);

  // Aggressively dismiss ALL blocking UI before opening command palette.
  // On CI, dialogs like "C# Dev Kit Sign In" appear and block keyboard input.
  for (let d = 0; d < 3; d++) {
    try {
      await dismissAllDialogs(driver);
    } catch {
      /* ignore */
    }
    try {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    } catch {
      /* ignore */
    }
    await sleep(500);
  }

  // Open command palette and run "File: Open Folder..."
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Dismiss dialogs before each attempt
      try {
        await dismissAllDialogs(driver);
      } catch {
        /* ignore */
      }
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(500);

      // Click the workbench area to ensure VS Code has keyboard focus.
      // On CI runners, focus can be lost to notification toasts or other OS
      // windows, causing Ctrl+Shift+P to never reach the editor.
      try {
        const workbench = await driver.findElement(By.css('.monaco-workbench'));
        await driver.actions().move({ origin: workbench, x: 100, y: 100 }).click().perform();
        await sleep(300);
      } catch {
        /* best-effort focus — proceed regardless */
      }

      // Use Ctrl+Shift+P (more reliable than F1 when dialogs are present)
      await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('p').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();

      // Wait for the command palette input to become interactive (not just present in DOM).
      // This replaces a fixed 1s sleep that was too short on cold CI runners.
      const cmdInput = await driver.wait(
        until.elementIsEnabled(await waitForElement(driver, '.quick-input-box input', 5000)),
        5000,
        '[openFolderInSession] Command palette input not interactive within 5s'
      );

      await cmdInput.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await cmdInput.sendKeys('> File: Open Folder...');

      // Wait for the filtered command list to appear before pressing Enter.
      await driver
        .wait(
          async () => {
            const rows = await driver.findElements(By.css('.quick-input-list .monaco-list-row'));
            return rows.length > 0;
          },
          5000,
          '[openFolderInSession] Command list did not populate within 5s'
        )
        .catch(() => {
          /* proceed anyway — the command may still work */
        });
      await sleep(300);

      // Press Enter to execute the command
      await cmdInput.sendKeys(Key.ENTER);

      // Wait for the simple file dialog input to appear (ExTester sets
      // files.simpleDialog.enable=true so this is a quick-input, not native OS dialog).
      const dialogInput = await driver.wait(
        until.elementIsEnabled(await waitForElement(driver, '.quick-input-box input', 8000)),
        5000,
        '[openFolderInSession] File dialog input not interactive within 5s'
      );

      await dialogInput.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await dialogInput.sendKeys(folderPath);
      await sleep(300);
      await dialogInput.sendKeys(Key.ENTER);

      // Wait for the folder to open — poll title and Explorer for up to 10s
      const folderOpened = await driver
        .wait(
          async () => {
            const title = await driver.getTitle().catch(() => '');
            if (title !== 'Visual Studio Code' && title !== '') {
              return true;
            }
            const rows = await driver
              .executeScript<number>(
                'return document.querySelectorAll(".explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row").length'
              )
              .catch(() => 0);
            return rows > 0;
          },
          10_000,
          '[openFolderInSession] Folder did not open within 10s'
        )
        .catch(() => false);

      if (folderOpened) {
        const title = await driver.getTitle().catch(() => '');
        console.log(`[openFolderInSession] Folder opened successfully (title: "${title}")`);
        return;
      }

      console.log(`[openFolderInSession] Attempt ${attempt + 1}/3: folder not opened`);
    } catch (e: any) {
      console.log(`[openFolderInSession] Attempt ${attempt + 1}/3 failed: ${e.message}`);
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(2000);
    }
  }
  console.log('[openFolderInSession] All attempts exhausted');
}

/**
 * Wait for an element to appear in the DOM (polling until present).
 * Unlike `driver.findElement`, this won't throw immediately if the element
 * doesn't exist yet — it retries until the timeout expires.
 */
async function waitForElement(driver: WebDriver, cssSelector: string, timeoutMs: number): Promise<WebElement> {
  return driver.wait(until.elementLocated(By.css(cssSelector)), timeoutMs);
}

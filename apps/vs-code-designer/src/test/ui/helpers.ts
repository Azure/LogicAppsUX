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
import { By, Key, ModalDialog, type WebDriver } from 'vscode-extension-tester';

// ===========================================================================
// General utilities
// ===========================================================================

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
export async function expandTreeViewItem(driver: WebDriver, path: string[]): Promise<import('selenium-webdriver').WebElement | null> {
  let currentElements = await driver.findElements(By.css('.pane-body .monaco-list-row'));
  let lastFound: import('selenium-webdriver').WebElement | null = null;

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

      // Use Ctrl+Shift+P (more reliable than F1 when dialogs are present)
      await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('p').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
      await sleep(1000);

      const cmdInput = await driver.findElement(By.css('.quick-input-box input'));
      await cmdInput.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await cmdInput.sendKeys('> File: Open Folder...');
      await sleep(1000);

      // Press Enter to execute the command
      await cmdInput.sendKeys(Key.ENTER);
      await sleep(2000);

      // The simple dialog input should appear. Type the path.
      // ExTester sets files.simpleDialog.enable=true.
      const dialogInput = await driver.findElement(By.css('.quick-input-box input'));
      await dialogInput.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await dialogInput.sendKeys(folderPath);
      await sleep(500);
      await dialogInput.sendKeys(Key.ENTER);
      await sleep(5000);

      // Check if folder opened by looking at the title
      const title = await driver.getTitle().catch(() => '');
      console.log(`[openFolderInSession] VS Code title: "${title}"`);

      if (title !== 'Visual Studio Code') {
        console.log('[openFolderInSession] Folder opened successfully');
        return;
      }

      // Also check Explorer rows
      const rows = await driver
        .executeScript<number>(
          'return document.querySelectorAll(".explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row").length'
        )
        .catch(() => 0);
      if (rows > 0) {
        console.log(`[openFolderInSession] Folder opened (${rows} Explorer rows)`);
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

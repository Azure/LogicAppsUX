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

import { type Workbench, WebView, By, type WebDriver, VSBrowser, Key } from 'vscode-extension-tester';
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
 * Poll the terminal panel text until the Functions runtime reports it is ready.
 */
export async function waitForRuntimeReady(driver: WebDriver, timeoutMs = 90_000): Promise<boolean> {
  const t0 = Date.now();
  const deadline = t0 + timeoutMs;
  let screenshotTaken = false;
  let terminalsDetectedAt = 0;

  while (Date.now() < deadline) {
    try {
      await dismissAllDialogs(driver);
    } catch {
      /* ignore */
    }

    if (!screenshotTaken && Date.now() - t0 > 5000) {
      await captureScreenshot(driver, 'debug-waiting-for-runtime');
      screenshotTaken = true;
    }

    try {
      const debugAttached = await driver.executeScript<boolean>(`
        var toolbar = document.querySelector('.debug-toolbar');
        if (toolbar) {
          var style = window.getComputedStyle(toolbar);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }
        var actionBar = document.querySelector('[class*="debug-toolbar"], [class*="debugging-actions"]');
        return !!actionBar;
      `);
      if (debugAttached) {
        console.log(`[debug] Debug toolbar visible — debugger attached (${Date.now() - t0}ms)`);
        await sleep(3000);
        return true;
      }
    } catch {
      /* ignore */
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
      if (terminalsDetectedAt > 0 && Date.now() - terminalsDetectedAt > 30_000) {
        console.log(`[debug] Terminals open for 30s+ — assuming runtime ready (${Date.now() - t0}ms)`);
        return true;
      }
    } catch {
      /* ignore */
    }

    try {
      const hostReady = await driver.executeScript<boolean>(`
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', 'http://localhost:7071/admin/host/status', false);
          xhr.timeout = 2000;
          xhr.send();
          if (xhr.status === 200) {
            var body = JSON.parse(xhr.responseText);
            return body && body.state && body.state.toLowerCase() === 'running';
          }
        } catch(e) {}
        return false;
      `);
      if (hostReady) {
        console.log(`[debug] Runtime ready — host status is 'running' (${Date.now() - t0}ms)`);
        return true;
      }
    } catch {
      /* ignore */
    }

    await sleep(3000);
  }

  await captureScreenshot(driver, 'debug-timeout');
  console.log(`[debug] Timeout waiting for runtime after ${timeoutMs}ms`);
  return false;
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
 * Click the "Run trigger" button in the overview command bar.
 */
export async function clickRunTrigger(driver: WebDriver): Promise<boolean> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const btns = await driver.findElements(By.css('button[aria-label="Run trigger"]'));
      if (btns.length > 0) {
        const btn = btns[0];
        const disabled = await btn.getAttribute('disabled');
        if (disabled) {
          console.log('[overview] "Run trigger" button is disabled — runtime may not be ready');
        } else {
          await driver.actions().move({ origin: btn }).click().perform();
          console.log('[overview] Clicked "Run trigger"');
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    await sleep(500);
  }
  console.log('[overview] "Run trigger" button not found or not clickable');
  return false;
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

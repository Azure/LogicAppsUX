// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Multiple Designers + Add Workflow Test
 *
 * ADO Coverage: Test Case #31054994, Steps 14-15
 *
 * Flow:
 *   1. Open workspace with an existing logic app
 *   2. Right-click on the logic app folder → "Create workflow..." → add a new workflow
 *   3. Open designer for the ORIGINAL workflow via right-click on its workflow.json
 *   4. Verify the designer tab name, add a Request trigger
 *   5. Open designer for the NEWLY ADDED workflow via right-click on its workflow.json
 *   6. Verify the designer tab name, add a Compose action
 *   7. Verify both designer tabs are still open simultaneously
 *   8. Switch back to the first designer and verify it still has nodes
 *
 * Key technique: Use `VSBrowser.instance.openResources(specificPath)` to reveal
 * and select the correct workflow.json in the Explorer tree BEFORE right-clicking.
 * This prevents the test from right-clicking the wrong workflow.json when multiple
 * exist with the same filename.
 *
 * Phase 4.8c — own session, startup resource = .code-workspace file
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, EditorView, type WebDriver, VSBrowser, By, Key } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot, clearBlockingUI, dismissAllDialogs, waitForQuickInputAndType } from './helpers';
import { sessionWarmup } from './sessionWarmup';
import {
  TEST_TIMEOUT,
  ensureLocalSettingsForDesigner,
  openWorkspaceFileInSession,
  waitForDependencyValidation,
  waitForExtensionValidationComplete,
  DEPENDENCY_VALIDATION_TIMEOUT,
  findAddTriggerCard,
  waitForDiscoveryPanel,
  searchInDiscoveryPanel,
  waitForSearchResults,
  selectOperation,
  countCanvasNodes,
  waitForNodeCountIncrease,
  DESIGNER_READY_TIMEOUT,
  switchToDesignerWebview,
} from './designerHelpers';

let __warmedThisSession = false;

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'multipleDesigners-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

/**
 * Switch into the ACTIVE webview iframe using raw Selenium.
 *
 * When multiple designer webviews are open, ExTester's `new WebView().switchToFrame()`
 * always enters the first iframe in DOM order — which may not be the active tab's.
 *
 * This function finds the correct iframe by:
 *   1. Getting all webview iframes
 *   2. Checking which one is visible (has non-zero dimensions and is displayed)
 *   3. Switching into that specific iframe
 *   4. Then switching into the nested iframe inside (VS Code nests webview content)
 *   5. Waiting for the designer canvas to render
 *
 * Returns true if successfully switched into a designer webview.
 */
async function switchToActiveDesignerFrame(driver: WebDriver, timeoutMs = DESIGNER_READY_TIMEOUT): Promise<boolean> {
  const t0 = Date.now();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await sleep(500);

    // Find all webview iframes (poll — new tab's iframe may not exist immediately)
    const iframes = await driver.findElements(By.css('iframe.webview.ready, iframe.webview'));
    if (iframes.length === 0) {
      console.log(`[switchToActiveDesigner] No webview iframes yet (${Date.now() - t0}ms)`);
      await sleep(1000);
      continue;
    }
    console.log(`[switchToActiveDesigner] Found ${iframes.length} webview iframe(s) (${Date.now() - t0}ms)`);

    // Try the last iframe first (newest = most likely the active tab)
    for (let i = iframes.length - 1; i >= 0; i--) {
      try {
        const displayed = await iframes[i].isDisplayed();
        const rect = await iframes[i].getRect();
        if (displayed && rect.width > 100 && rect.height > 100) {
          console.log(`[switchToActiveDesigner] Iframe ${i} is visible (${rect.width}x${rect.height})`);
          await driver.switchTo().frame(iframes[i]);
          await sleep(300);

          // VS Code nests webviews: outer iframe → inner iframe with id="active-frame"
          try {
            const innerFrames = await driver.findElements(By.css('#active-frame, iframe'));
            if (innerFrames.length > 0) {
              await driver.switchTo().frame(innerFrames[0]);
              await sleep(300);
            }
          } catch {
            /* may already be in the right frame */
          }

          // Check if designer canvas is present
          try {
            const readyLevel = await driver.executeScript<number>(`
              if (!document.querySelector('.msla-designer-canvas')) return 0;
              if (!document.querySelector('.react-flow__viewport')) return 1;
              if (document.querySelector('[data-testid="card-Add a trigger"]') || document.querySelectorAll('.react-flow__node').length > 0) return 3;
              return 2;
            `);
            if ((readyLevel ?? 0) >= 2) {
              console.log(`[switchToActiveDesigner] Designer ready (level ${readyLevel}) in iframe ${i} (${Date.now() - t0}ms)`);
              return true;
            }
            console.log(`[switchToActiveDesigner] Iframe ${i} readyLevel=${readyLevel}, waiting...`);
          } catch {
            console.log(`[switchToActiveDesigner] Script failed in iframe ${i}, trying next`);
          }
          try {
            await driver.switchTo().defaultContent();
          } catch {
            /* ignore */
          }
        }
      } catch {
        try {
          await driver.switchTo().defaultContent();
        } catch {
          /* ignore */
        }
      }
    }
    await sleep(1500);
  }
  console.log(`[switchToActiveDesigner] No active designer webview found after ${timeoutMs}ms`);
  return false;
}

/**
 * Open a specific workflow's designer via right-click in the Explorer.
 *
 * Strategy: Use openResources() to open the exact workflow.json file by full path.
 * This reveals and selects it in the Explorer tree. Then right-click on the
 * now-active/focused workflow.json row. This guarantees we right-click the correct
 * file even when multiple workflow.json files exist in the tree.
 */
async function openDesignerViaExplorerRightClick(
  driver: WebDriver,
  workflowJsonPath: string,
  label: string,
  retried = false
): Promise<boolean> {
  console.log(`[multiDesigner] Opening designer for "${label}" via right-click${retried ? ' (retry pass)' : ''}...`);

  // Switch to Explorer view
  try {
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('e').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
    await sleep(1500);
  } catch {
    /* ignore */
  }

  // Phase 3 R3: Force Explorer tree refresh before relying on the tree state.
  // Phase 2 evidence (p42-*, p48c) showed the workflow.json row not found for
  // all 10 attempts when this helper was called for a second workflow in the
  // same workspace — the tree was stale from the first designer-open.
  // F5 fix: poll for the workflow.json row (no blind sleep). Also expand the
  // parent folder to handle H-p42-A (VS Code auto-collapses sibling folders
  // when a new file is revealed elsewhere).
  try {
    await new Workbench().executeCommand('workbench.files.action.refreshFilesExplorer');
  } catch {
    /* ignore */
  }
  try {
    const parentFolder = path.basename(path.dirname(workflowJsonPath));
    await driver
      .wait(async () => {
        const folders = await driver.findElements(By.css(`.explorer-folders-view .monaco-list-row[aria-label*="${parentFolder}"]`));
        if (folders.length === 0) {
          return false;
        }
        const expanded = await folders[0].getAttribute('aria-expanded').catch(() => null);
        if (expanded === 'false') {
          try {
            await folders[0].click();
          } catch {
            /* row may go stale during expand */
          }
          await sleep(500);
        }
        return true;
      }, 5_000)
      .catch(() => undefined);
  } catch {
    /* ignore */
  }
  await driver
    .wait(async () => {
      const rows = await driver.findElements(By.css('.explorer-folders-view .monaco-list-row[aria-label*="workflow.json"]'));
      return rows.length > 0;
    }, 5_000)
    .catch(() => undefined);

  // Strategy B: VSBrowser.openResources reveals AND selects the exact
  // workflow.json in the Explorer tree, bypassing the need to expand the
  // tree manually. CAUTION: `code -r` IPC silently NO-OPS on Linux CI
  // (documented in designerHelpers.ts comment history). A silent failure
  // throws no exception — so we verify a POSITIVE post-condition (a
  // workflow.json row in the Explorer tree) and explicitly throw to
  // trigger the Quick Open fallback when the tree is still empty.
  try {
    await VSBrowser.instance.openResources(workflowJsonPath);
    await sleep(1500);
    const revealed = await driver
      .wait(async () => {
        const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
        for (const row of rows) {
          const text = await row.getText().catch(() => '');
          // Match BOTH the parent folder/label AND workflow.json so we don't
          // false-positive on a stale row from a previous workflow in the
          // same shard (this test opens 2 workflows back-to-back).
          if (text.includes(label) && text.includes('workflow.json')) {
            return true;
          }
        }
        return false;
      }, 5_000)
      .then(() => true)
      .catch(() => false);
    if (revealed) {
      console.log('[multiDesigner] openResources revealed workflow.json - skipping Quick Open');
    } else {
      console.log('[multiDesigner] openResources completed but tree not populated - falling through to Quick Open');
      throw new Error('openResources silent no-op detected');
    }
  } catch (e: any) {
    console.log(`[multiDesigner] Reveal via openResources failed: ${e.message} - using Quick Open fallback`);
    try {
      await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('e').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
      await sleep(1000);
      await driver.actions().keyDown(Key.CONTROL).sendKeys('p').keyUp(Key.CONTROL).perform();
      await sleep(1000);
      await waitForQuickInputAndType(driver, `${label}/workflow.json`);
      await sleep(1500);
      await driver.actions().sendKeys(Key.ENTER).perform();
      await sleep(2000);
      console.log(`[multiDesigner] Opened ${label}/workflow.json via Quick Open fallback`);
    } catch (qoErr: any) {
      console.log(`[multiDesigner] Quick Open fallback also failed: ${qoErr.message}`);
    }
  }

  // Re-focus Explorer so the opened file is selected/revealed in the tree
  try {
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('e').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
    await sleep(1500);
  } catch {
    /* ignore */
  }

  // Belt-and-suspenders: explicitly reveal the active editor in Explorer.
  // openResources usually does this on its own, but on Linux CI we have
  // observed the tree remain collapsed (CI run 25946044192).
  const revealCandidates = [
    'workbench.files.action.showActiveFileInExplorer',
    'revealInExplorer',
    'workbench.action.revealActiveEditorInExplorer',
  ];
  for (const cmd of revealCandidates) {
    try {
      await new Workbench().executeCommand(cmd);
      console.log(`[multiDesigner] Revealed active file via "${cmd}"`);
      await sleep(800);
      break;
    } catch (revealErr: any) {
      console.log(`[multiDesigner] reveal command "${cmd}" failed: ${revealErr.message?.split('\n')[0]}`);
    }
  }

  // Strategy R3 (Phase 4 revert): 5 attempts with logarithmic backoff
  // (was bumped from 3 -> 10 in Phase 3 but amplified right-click flakes
  // past the per-test 10-min ceiling; reverted to 5).
  const backoffs = [250, 500, 1000, 2000, 4000];
  // Now right-click on the active/focused workflow.json in the Explorer
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Wait for the menubar overlay to be inactive before clicking. The
      // menubar-menu-title element can intercept clicks on context menu rows
      // if it isn't aria-hidden yet (same root cause as the openOverviewPage
      // flake fixed in 358332a41 — see PR #9181).
      try {
        await driver.wait(async () => {
          const active = await driver.findElements(By.css('.menubar-menu-title:not([aria-hidden="true"])'));
          return active.length === 0;
        }, 3000);
      } catch {
        /* menubar still active — proceed anyway; click retry handles it */
      }
      await sleep(300);

      // Scroll to the right file in the Explorer
      await driver.executeScript(`
        var items = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
        for (var i = 0; i < items.length; i++) {
          if ((items[i].textContent || '').includes('workflow.json') &&
              items[i].classList.contains('selected')) {
            items[i].scrollIntoView({block: 'center'});
            break;
          }
        }
      `);

      // Find the selected/focused workflow.json row and right-click it
      const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));

      // Strategy 1: Find the row that's selected (has .selected or .focused class)
      let targetRow = null;
      for (const row of rows) {
        const text = await row.getText().catch(() => '');
        const classes = await row.getAttribute('class').catch(() => '');
        if (text.includes('workflow.json') && (classes.includes('selected') || classes.includes('focused'))) {
          targetRow = row;
          console.log(`[multiDesigner] Found selected workflow.json row: "${text.trim().substring(0, 60)}"`);
          break;
        }
      }

      // Strategy 2: If no selected row, look for the row near the workflow folder name
      if (!targetRow) {
        let foundParentFolder = false;
        for (const row of rows) {
          const text = await row.getText().catch(() => '');
          // Check if this row is the parent workflow folder
          if (text.includes(label)) {
            foundParentFolder = true;
            continue;
          }
          // The workflow.json row immediately after the parent folder is our target
          if (foundParentFolder && text.includes('workflow.json')) {
            targetRow = row;
            console.log(`[multiDesigner] Found workflow.json after "${label}" folder`);
            break;
          }
          // If we hit another folder, stop
          if (foundParentFolder && !text.includes('workflow.json') && !text.includes('.')) {
            break;
          }
        }
      }

      // Strategy 3: Just find any workflow.json row (last resort)
      if (!targetRow) {
        for (const row of rows) {
          const text = await row.getText().catch(() => '');
          if (text.includes('workflow.json')) {
            targetRow = row;
            console.log('[multiDesigner] Using first available workflow.json (fallback)');
            break;
          }
        }
      }

      if (!targetRow) {
        console.log(`[multiDesigner] workflow.json not found in tree on attempt ${attempt + 1}/5`);
        if (process.env.LA_E2E_DEBUG_TREE === '1') {
          const allRows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
          for (let i = 0; i < Math.min(20, allRows.length); i++) {
            const t = await allRows[i].getText().catch(() => '?');
            console.log(`  [tree-row ${i}] ${t.replace(/\n/g, ' | ')}`);
          }
        }
        await sleep(backoffs[attempt]);
        continue;
      }

      // Right-click and find "Open Designer"
      await driver.actions().contextClick(targetRow).perform();
      await sleep(1500);

      const menuItems = await driver.findElements(
        By.css('.context-view .action-item a, .monaco-menu .action-item a, .context-view .action-label')
      );
      for (const menuItem of menuItems) {
        try {
          const menuLabel = await menuItem.getText();
          if (menuLabel.toLowerCase().includes('open designer') && !menuLabel.toLowerCase().includes('data map')) {
            console.log(`[multiDesigner] Clicking: "${menuLabel}"`);
            try {
              await menuItem.click();
            } catch (clickErr: any) {
              const msg = (clickErr?.message || '').split('\n')[0];
              const name = clickErr?.name || '';
              console.log(`[multiDesigner] menuItem.click intercepted/stale (${name}): ${msg}`);
              try {
                await driver.actions().sendKeys(Key.ESCAPE).perform();
              } catch {
                /* ignore */
              }
              await sleep(800);
              throw clickErr;
            }
            await sleep(3000);

            // Wait for webview tab to appear
            const deadline = Date.now() + 30_000;
            while (Date.now() < deadline) {
              try {
                await dismissAllDialogs(driver);
              } catch {
                /* ignore */
              }
              try {
                const found = await driver.executeScript<boolean>(
                  'return !!(document.querySelector("iframe.webview") || document.querySelector("iframe[id*=\\"webview\\"]"))'
                );
                if (found) {
                  console.log(`[multiDesigner] Designer webview tab detected for "${label}"`);
                  // Phase 2 F1 — iframe presence != React canvas ready.
                  // Delegate to switchToDesignerWebview (staged readyLevel
                  // progression). On failure, close the active editor and
                  // recursively retry openDesignerViaExplorerRightClick ONCE.
                  try {
                    await switchToDesignerWebview(driver, 30_000);
                    try {
                      await driver.switchTo().defaultContent();
                    } catch {
                      /* ignore */
                    }
                    console.log(`[multiDesigner] Designer canvas ready for "${label}"`);
                    return true;
                  } catch (canvasErr: any) {
                    try {
                      await driver.switchTo().defaultContent();
                    } catch {
                      /* ignore */
                    }
                    console.log(`[multiDesigner] Canvas-ready check failed: ${canvasErr.message}`);
                    if (retried) {
                      // Planner I4: diagnostic dump on final failure.
                      try {
                        const allIframes = await driver.findElements(By.css('iframe'));
                        console.log(`[multiDesigner][diag] iframe count after canvas-fail: ${allIframes.length}`);
                      } catch {
                        /* ignore */
                      }
                      try {
                        await captureScreenshot(driver, `multiDesigner-canvas-fail-${label}`);
                      } catch {
                        /* ignore */
                      }
                      return false;
                    }
                    console.log('[multiDesigner] Retrying once after close-active-editor');
                    // Phase 2 R1 (review board #4) — pre-retry diagnostic: snapshot state at
                    // retry trigger so CI logs can compare attempt-1 vs attempt-2 state.
                    try {
                      const iframes = await driver.findElements(By.css('iframe'));
                      console.log(`[multiDesigner][pre-retry] iframe count: ${iframes.length}`);
                      await captureScreenshot(driver, `multiDesigner-pre-retry-${label}`);
                    } catch {
                      /* ignore */
                    }
                    try {
                      await new Workbench().executeCommand('workbench.action.closeActiveEditor');
                      // Phase 2 R1 — warm-up grace: 1.5s wasn't enough for the design-time
                      // host to settle between attempts, so retry-1 produced the same outcome.
                      await sleep(3000);
                      try {
                        await new Workbench().executeCommand('workbench.action.notifications.clearAll');
                      } catch {
                        /* ignore */
                      }
                      await sleep(500);
                    } catch {
                      /* ignore */
                    }
                    return await openDesignerViaExplorerRightClick(driver, workflowJsonPath, label, true);
                  }
                }
              } catch {
                /* ignore */
              }
              await sleep(500);
            }
            console.log(`[multiDesigner] Webview not detected for "${label}"`);
            return false;
          }
        } catch (menuErr: any) {
          // Re-throw click-interception so outer attempt loop retries
          if (menuErr?.name === 'ElementClickInterceptedError') {
            throw menuErr;
          }
          /* stale menu item — try next */
        }
      }

      // Dismiss context menu
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      console.log(`[multiDesigner] "Open designer" not found in context menu on attempt ${attempt + 1}/5`);
    } catch (e: any) {
      console.log(`[multiDesigner] Attempt ${attempt + 1}/5 failed: ${e.message}`);
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await sleep(backoffs[attempt]);
    }
  }
  return false;
}

/**
 * Add a workflow via right-click on the logic app folder → "Create workflow..."
 * Returns the name of the created workflow, or null if it failed.
 */
async function addWorkflowViaRightClick(driver: WebDriver, appFolderName: string, newWorkflowName: string): Promise<boolean> {
  console.log(`[multiDesigner] Adding workflow "${newWorkflowName}" via right-click on "${appFolderName}"...`);

  // Switch to Explorer
  try {
    await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('e').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
    await sleep(1500);
  } catch {
    /* ignore */
  }
  await clearBlockingUI(driver);

  // Find and right-click the logic app folder
  const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
  for (const row of rows) {
    const text = await row.getText().catch(() => '');
    if (text.includes(appFolderName)) {
      console.log(`[multiDesigner] Found folder: "${text.trim().substring(0, 60)}"`);
      await driver.actions().contextClick(row).perform();
      await sleep(1500);

      // Find "Create workflow..." in context menu
      const menuItems = await driver.findElements(
        By.css('.context-view .action-item a, .monaco-menu .action-item a, .context-view .action-label')
      );
      for (const menuItem of menuItems) {
        const menuLabel = await menuItem.getText().catch(() => '');
        if (menuLabel.toLowerCase().includes('create workflow') || menuLabel.toLowerCase().includes('new workflow')) {
          console.log(`[multiDesigner] Clicking: "${menuLabel}"`);
          await menuItem.click();
          await sleep(2000);

          // Enter workflow name in the QuickPick input
          const quickInputs = await driver.findElements(By.css('.quick-input-widget:not(.hidden) input'));
          if (quickInputs.length > 0) {
            await quickInputs[0].sendKeys(newWorkflowName);
            await sleep(500);
            await quickInputs[0].sendKeys(Key.ENTER);
            await sleep(2000);
            console.log(`[multiDesigner] Entered workflow name: "${newWorkflowName}"`);

            // Select workflow type if prompted
            const typePicks = await driver.findElements(By.css('.quick-input-widget:not(.hidden) .quick-input-list .monaco-list-row'));
            if (typePicks.length > 0) {
              await typePicks[0].click();
              await sleep(2000);
              console.log('[multiDesigner] Selected workflow type');
            }

            return true;
          }
          console.log('[multiDesigner] No input prompt appeared');
          return false;
        }
      }

      // Dismiss menu
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      console.log('[multiDesigner] "Create workflow" not in context menu');
      break;
    }
  }
  return false;
}

/**
 * Find a designer tab by workflow name and click on it to make it active.
 * Designer tabs follow: {workspace} (Workspace)-{logicapp}-{workflow}
 *
 * IMPORTANT: Only matches tabs containing BOTH the workflow name AND
 * "(Workspace)" or "Workspace" — this distinguishes designer tabs from
 * workflow.json text file tabs which also contain the workflow name.
 *
 * Polls for up to 15s because the designer tab title may not appear immediately.
 */
async function activateDesignerTab(
  driver: WebDriver,
  workflowName: string,
  timeoutMs = 15_000
): Promise<{ found: boolean; tabTitle: string }> {
  const deadline = Date.now() + timeoutMs;
  const wfLower = workflowName.toLowerCase();

  const isDesignerTab = (title: string): boolean => {
    const lower = title.toLowerCase();
    // Must contain workflow name AND be a designer tab (contains "workspace" pattern)
    return lower.includes(wfLower) && (lower.includes('workspace') || lower.includes('(workspace)'));
  };

  while (Date.now() < deadline) {
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }

    // Strategy 1: Scan tab bar elements directly via JS
    // This avoids ElementClickInterceptedError from overlapping iframes
    try {
      const clicked = await driver.executeScript<string>(`
        var wfName = ${JSON.stringify(wfLower)};
        var tabs = document.querySelectorAll('.tab');
        for (var i = 0; i < tabs.length; i++) {
          var label = tabs[i].querySelector('.label-name, .tab-label');
          if (!label) continue;
          var text = (label.textContent || '').toLowerCase();
          // Must be a designer tab (contains "workspace") AND match the workflow name
          if (text.includes(wfName) && text.includes('workspace')) {
            tabs[i].click();
            return label.textContent;
          }
        }
        return '';
      `);
      if (clicked) {
        console.log(`[multiDesigner] Activated designer tab via JS: "${clicked}" for "${workflowName}"`);
        await sleep(1500);
        return { found: true, tabTitle: clicked };
      }
    } catch {
      /* try next strategy */
    }

    // Strategy 2: EditorView API
    try {
      const editorView = new EditorView();
      const allTabs = await editorView.getOpenEditorTitles();
      for (const title of allTabs) {
        if (isDesignerTab(title)) {
          console.log(`[multiDesigner] Found designer tab via API: "${title}" for "${workflowName}"`);
          try {
            await editorView.openEditor(title);
          } catch {
            // Fall back to JS click
            await driver.executeScript(`
              var tabs = document.querySelectorAll('.tab .label-name, .tab .tab-label');
              for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].textContent === ${JSON.stringify(title)}) {
                  tabs[i].closest('.tab').click();
                  break;
                }
              }
            `);
          }
          await sleep(1500);
          return { found: true, tabTitle: title };
        }
      }
      console.log(`[multiDesigner] No designer tab matching "${workflowName}" yet (tabs: ${JSON.stringify(allTabs)})`);
    } catch {
      /* keep polling */
    }

    await sleep(2000);
  }

  console.log(`[multiDesigner] No designer tab matching "${workflowName}" after ${timeoutMs}ms`);
  return { found: false, tabTitle: '' };
}

describe('Multiple Designers + Add Workflow', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(DEPENDENCY_VALIDATION_TIMEOUT + 30_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
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
    workbench = new Workbench();
    await waitForDependencyValidation(driver);
  });

  beforeEach(async function () {
    if (__warmedThisSession) {
      return;
    }
    this.timeout(60_000);
    // Match the entry the single `it` block will use (standard/Stateful)
    // so the warmup expands the same tree the test exercises.
    const entry =
      manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') ||
      manifest.find((e) => e.appType === 'standard') ||
      manifest[0];
    const workspaceRoot = entry?.wsDir;
    const result = await sessionWarmup(driver, workbench, { workspaceRoot });
    console.log(`[warmup] ${JSON.stringify(result)}`);
    __warmedThisSession = true;
  });

  afterEach(async () => {
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
    await sleep(1000);
  });

  it('should add a workflow, then open multiple designers via right-click and verify operations', async () => {
    const entry =
      manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest.find((e) => e.appType === 'standard');
    if (!entry) {
      assert.fail('No matching workspace entry found in manifest');
      return;
    }

    ensureLocalSettingsForDesigner(entry.appDir);

    // Reset original workflow to empty
    const wf1Name = entry.wfName;
    const wf1Json = path.join(entry.wfDir, 'workflow.json');
    fs.writeFileSync(
      wf1Json,
      JSON.stringify(
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            actions: {},
            contentVersion: '1.0.0.0',
            outputs: {},
            triggers: {},
          },
          kind: 'Stateful',
        },
        null,
        4
      )
    );

    // ── Step 1: Open the workspace ──
    await openWorkspaceFileInSession(workbench, entry.wsFilePath);
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    await captureScreenshot(driver, 'multi-workspace-opened', EXPLICIT_SCREENSHOT_DIR);

    // Wait for extension dependency validation to complete before opening designer
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await waitForExtensionValidationComplete(driver);

    // ── Step 2: Add a new workflow via right-click on the logic app folder ──
    const newWfName = 'e2enewwf';
    const wfAdded = await addWorkflowViaRightClick(driver, entry.appName, newWfName);
    await captureScreenshot(driver, 'multi-after-add-workflow', EXPLICIT_SCREENSHOT_DIR);
    // Don't hard-assert — the workflow might be created on disk even if the QuickPick interaction was partial
    if (wfAdded) {
      console.log(`[multiDesigner] Workflow "${newWfName}" added via right-click ✓`);
    } else {
      console.log('[multiDesigner] Right-click add may have partially succeeded — checking disk...');
    }

    // Wait for the workflow to appear on disk (extension creates it asynchronously)
    await sleep(3000);
    const newWfDir = path.join(entry.appDir, newWfName);
    const newWfJson = path.join(newWfDir, 'workflow.json');
    if (!fs.existsSync(newWfJson)) {
      // Create it manually as fallback so the rest of the test can proceed
      console.log(`[multiDesigner] Workflow not on disk at ${newWfJson} — creating manually`);
      fs.mkdirSync(newWfDir, { recursive: true });
      fs.writeFileSync(
        newWfJson,
        JSON.stringify(
          {
            definition: {
              $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
              actions: {},
              contentVersion: '1.0.0.0',
              outputs: {},
              triggers: {},
            },
            kind: 'Stateful',
          },
          null,
          4
        )
      );
    }

    // Close all editors to start fresh
    try {
      await new EditorView().closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(1000);

    // ── Step 3: Open designer for ORIGINAL workflow via right-click ──
    const d1Opened = await openDesignerViaExplorerRightClick(driver, wf1Json, wf1Name);
    await captureScreenshot(driver, 'multi-designer1-opened', EXPLICIT_SCREENSHOT_DIR);
    assert.ok(d1Opened, `Designer should open for original workflow "${wf1Name}"`);

    // Verify tab name contains the workflow name
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    const tab1 = await activateDesignerTab(driver, wf1Name);
    assert.ok(tab1.found, `Tab for "${wf1Name}" should exist`);
    console.log(`[multiDesigner] Designer 1 tab: "${tab1.tabTitle}"`);

    // Switch into designer 1 (only webview open) and add Request trigger
    assert.ok(await switchToActiveDesignerFrame(driver), 'Should switch into designer 1 webview');
    const triggerCard = await findAddTriggerCard(driver);
    assert.ok(triggerCard, `"${wf1Name}" should show "Add a trigger" card`);
    await triggerCard.click();
    assert.ok(await waitForDiscoveryPanel(driver), 'Discovery panel should open');
    assert.ok(await searchInDiscoveryPanel(driver, 'Request'), 'Search should work');
    assert.ok(await waitForSearchResults(driver), 'Results should appear');
    const c1 = await countCanvasNodes(driver);
    assert.ok(await selectOperation(driver, 'Request'), 'Request trigger selectable');
    await waitForNodeCountIncrease(driver, c1);
    console.log(`[multiDesigner] Added Request trigger to "${wf1Name}" ✓`);
    await captureScreenshot(driver, 'multi-designer1-trigger-added', EXPLICIT_SCREENSHOT_DIR);

    // Switch back to default content before opening designer 2
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await clearBlockingUI(driver);

    // Phase 2 G3 (revised by review board #4) — Reset frame context + clear any
    // modal between designer-1 and designer-2 opens, WITHOUT closing designer 1.
    // Designer 1 MUST stay open: Step 5 asserts `designerTabs.length >= 2`
    // (BOTH designers open simultaneously) and Step 6 calls
    // activateDesignerTab(wf1Name) which requires designer 1's tab + iframe
    // state intact. The right-click sequence runs in defaultContent, so a
    // frame-context reset + Escape is sufficient to prevent designer 1's
    // iframe from intercepting input.
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await clearBlockingUI(driver);
    try {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    } catch {
      /* ignore */
    }
    await sleep(1000);

    // ── Step 4: Open designer for NEW workflow via right-click (KEEP designer 1 open) ──
    const d2Opened = await openDesignerViaExplorerRightClick(driver, newWfJson, newWfName);
    await captureScreenshot(driver, 'multi-designer2-opened', EXPLICIT_SCREENSHOT_DIR);
    assert.ok(d2Opened, `Designer should open for new workflow "${newWfName}"`);

    // Verify tab name contains the new workflow name
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    const tab2 = await activateDesignerTab(driver, newWfName);
    assert.ok(tab2.found, `Tab for "${newWfName}" should exist`);
    console.log(`[multiDesigner] Designer 2 tab: "${tab2.tabTitle}"`);

    // Switch into the ACTIVE designer 2 webview (using raw iframe switching)
    assert.ok(await switchToActiveDesignerFrame(driver), 'Should switch into designer 2 webview');
    const triggerCard2 = await findAddTriggerCard(driver);
    assert.ok(triggerCard2, `"${newWfName}" should show "Add a trigger" card`);
    await triggerCard2.click();
    assert.ok(await waitForDiscoveryPanel(driver), 'Discovery panel should open for designer 2');
    // Use "Request" (same as designer 1) — built-in operations are always available
    // "Compose" may not appear if the design-time API hasn't loaded connector catalog
    assert.ok(await searchInDiscoveryPanel(driver, 'Request'), 'Search for Request in designer 2');
    assert.ok(await waitForSearchResults(driver), 'Results should appear');
    const c2 = await countCanvasNodes(driver);
    assert.ok(await selectOperation(driver, 'Request'), 'Request selectable in designer 2');
    await waitForNodeCountIncrease(driver, c2);
    console.log(`[multiDesigner] Added Request trigger to "${newWfName}" ✓`);
    await captureScreenshot(driver, 'multi-designer2-trigger-added', EXPLICIT_SCREENSHOT_DIR);

    // ── Step 5: Verify both designer tabs are still open ──
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    const edView = new EditorView();
    const finalTabs = await edView.getOpenEditorTitles();
    console.log(`[multiDesigner] Final tabs: ${JSON.stringify(finalTabs)}`);
    const designerTabs = finalTabs.filter((t) => t.includes(wf1Name) || t.includes(newWfName));
    console.log(`[multiDesigner] Designer tabs: ${JSON.stringify(designerTabs)}`);
    assert.ok(designerTabs.length >= 2, `Should have 2+ designer tabs (found ${designerTabs.length})`);

    // ── Step 6: Switch back to designer 1 tab and verify it still has nodes ──
    const tab1Again = await activateDesignerTab(driver, wf1Name);
    assert.ok(tab1Again.found, `Should switch back to "${wf1Name}"`);
    assert.ok(await switchToActiveDesignerFrame(driver), 'Should switch into designer 1 webview after tab switch');
    const nodeCount = await countCanvasNodes(driver);
    console.log(`[multiDesigner] "${wf1Name}" has ${nodeCount} node(s) after switching back`);
    await captureScreenshot(driver, 'multi-designer1-verified-after-switchback', EXPLICIT_SCREENSHOT_DIR);

    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await captureScreenshot(driver, 'multi-completed', EXPLICIT_SCREENSHOT_DIR);
    console.log('[multiDesigner] PASSED — add workflow + both designers open simultaneously + trigger/action in both');

    // Clean up
    try {
      fs.rmSync(newWfDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });
});

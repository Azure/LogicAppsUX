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
import { sleep } from './helpers';
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
    if (__warmedThisSession) {
      return;
    }
    this.timeout(60_000);
    const result = await sessionWarmup(driver, workbench, { workspaceRoot: entry?.wsDir });
    console.log(`[warmup] ${JSON.stringify(result)}`);
    __warmedThisSession = true;
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
    await pressCtrlAltP(driver);

    const dialog = await driver.wait(until.elementLocated(By.css(GO_TO_OP_DIALOG)), PANEL_OPEN_TIMEOUT);
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
    await pressCtrlAltP(driver);
    await driver.wait(until.elementLocated(By.css(GO_TO_OP_DIALOG)), PANEL_OPEN_TIMEOUT);

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
 * Press Ctrl+Alt+P via the Selenium Actions API (per SKILL.md rule 6).
 */
async function pressCtrlAltP(driver: WebDriver): Promise<void> {
  await driver.actions().keyDown(Key.CONTROL).keyDown(Key.ALT).sendKeys('p').keyUp(Key.ALT).keyUp(Key.CONTROL).perform();
  // Allow React Flow's keydown listener + panel mount to settle.
  await sleep(300);
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

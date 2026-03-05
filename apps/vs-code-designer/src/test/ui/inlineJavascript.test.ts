// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Inline JavaScript E2E Tests
 *
 * ADO Coverage: Test Case #10109800
 *   [Test Case][VS Code Extn] [SQL Storage]Inline JavaScript [VS Code]
 *
 * Verifies:
 *   1. Create workflow with Request trigger
 *   2. Add Execute JavaScript Code action with inline code
 *   3. Add Response action with JS output as body
 *   4. Save, debug, run from overview, verify all nodes succeeded
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, EditorView, type WebDriver, VSBrowser } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot } from './helpers';
import {
  TEST_TIMEOUT,
  openDesignerForEntry,
  findAddTriggerCard,
  findAddActionElement,
  findLastAddActionElement,
  waitForDiscoveryPanel,
  searchInDiscoveryPanel,
  waitForSearchResults,
  selectOperation,
  countCanvasNodes,
  waitForNodeCountIncrease,
  clickAddActionMenuItem,
  clickSaveButton,
  readWorkflowJson,
  fillCodeEditor,
} from './designerHelpers';
import {
  startDebugging,
  waitForRuntimeReady,
  openOverviewPage,
  switchToOverviewWebview,
  clickRunTrigger,
  clickRefresh,
  waitForRunStatusInList,
  clickLatestRunRow,
  verifyAllNodesSucceeded,
  stopDebugging,
} from './runHelpers';

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'inlineJavascript-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

describe('Inline JavaScript Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(120_000);
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

  it('should create a workflow with Request trigger, Execute JavaScript Code, and Response, then run and verify', async () => {
    const entry = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful');
    if (!entry) {
      assert.fail('No matching workspace entry found in manifest');
      return;
    }

    // Reset workflow to empty
    const wjp = path.join(entry.wfDir, 'workflow.json');
    fs.writeFileSync(
      wjp,
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

    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open — ${result.error}`);

    try {
      // Add Request trigger
      const triggerCard = await findAddTriggerCard(driver);
      assert.ok(triggerCard, '"Add a trigger" card should be visible');
      await triggerCard.click();
      assert.ok(await waitForDiscoveryPanel(driver), 'Discovery panel should open');
      assert.ok(await searchInDiscoveryPanel(driver, 'Request'), 'Search should accept input');
      assert.ok(await waitForSearchResults(driver), 'Results should appear');
      const c0 = await countCanvasNodes(driver);
      assert.ok(await selectOperation(driver, 'Request'), 'Request trigger selectable');
      await waitForNodeCountIncrease(driver, c0);
      await captureScreenshot(driver, 'inlineJS-after-request-trigger', EXPLICIT_SCREENSHOT_DIR);

      // Add Execute JavaScript Code action
      await sleep(2000);
      const addAction1 = await findAddActionElement(driver);
      assert.ok(addAction1, 'Add action element should be visible');
      await addAction1.click();
      await sleep(500);
      await clickAddActionMenuItem(driver);
      assert.ok(await waitForDiscoveryPanel(driver), 'Discovery panel should open for action');
      assert.ok(await searchInDiscoveryPanel(driver, 'Execute JavaScript Code'), 'Search for JS action');
      assert.ok(await waitForSearchResults(driver), 'JS action results should appear');
      const c1 = await countCanvasNodes(driver);
      assert.ok(await selectOperation(driver, 'Execute JavaScript Code'), 'JS action selectable');
      await waitForNodeCountIncrease(driver, c1);
      await captureScreenshot(driver, 'inlineJS-after-js-action', EXPLICIT_SCREENSHOT_DIR);

      // Fill the code editor
      await sleep(2000);
      const codeFilled = await fillCodeEditor(driver, "return 'hello'");
      assert.ok(codeFilled, 'Code editor should be fillable');

      // Add Response action — use findLastAddActionElement to add AFTER the JS action
      const addAction2 = await findLastAddActionElement(driver);
      if (addAction2) {
        await addAction2.click();
        await sleep(500);
        await clickAddActionMenuItem(driver);
      }
      if (await waitForDiscoveryPanel(driver, 3000)) {
        await searchInDiscoveryPanel(driver, 'Response');
        await waitForSearchResults(driver);
        const c2 = await countCanvasNodes(driver);
        await selectOperation(driver, 'Response');
        await waitForNodeCountIncrease(driver, c2);
      }

      // Save
      assert.ok(await clickSaveButton(driver), 'Save should complete');

      // CRITICAL: switch back from designer webview and close ALL editors
      // before starting the debug session. If we don't, the overview webview
      // will switch into the designer iframe instead of the overview iframe.
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      await sleep(1000);
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
      const wf = readWorkflowJson(entry.wfDir);
      assert.ok(wf?.definition?.actions && Object.keys(wf.definition.actions).length > 0, 'Should have actions');
      assert.ok(wf?.definition?.triggers && Object.keys(wf.definition.triggers).length > 0, 'Should have triggers');

      // Debug → Run → Verify
      workbench = new Workbench();
      await startDebugging(workbench, driver);
      assert.ok(await waitForRuntimeReady(driver), 'Runtime should start');
      try {
        await new EditorView().closeAllEditors();
        await sleep(1000);
      } catch {
        /* ignore */
      }
      workbench = new Workbench();
      assert.ok(await openOverviewPage(workbench, driver, wjp), 'Overview should open');
      try {
        await driver.switchTo().defaultContent();
      } catch {
        /* ignore */
      }
      const ovWv = await switchToOverviewWebview(driver);
      assert.ok(await clickRunTrigger(driver), 'Run trigger clickable');
      await sleep(1000);
      await clickRefresh(driver);
      const { found, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded');
      assert.ok(found, `Run should succeed (last: "${lastStatus}")`);
      assert.ok(await clickLatestRunRow(driver), 'Should open run details');
      const { allSucceeded, details } = await verifyAllNodesSucceeded(driver);
      assert.ok(allSucceeded, `All nodes should succeed (${details})`);
      console.log('[inlineJS] PASSED');
      try {
        await ovWv.switchBack();
      } catch {
        /* ignore */
      }
      await stopDebugging(driver);
      return;
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      try {
        await stopDebugging(driver);
      } catch {
        /* ignore */
      }
    }
  });
});

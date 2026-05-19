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
 *   3. Save and run the Request + JavaScript workflow
 *   4. Save, debug, invoke the workflow callback, verify all nodes succeeded
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, EditorView, type WebDriver, VSBrowser } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot } from './helpers';
import {
  DEPENDENCY_VALIDATION_TIMEOUT,
  waitForDependencyValidation,
  openDesignerForEntry,
  findAddTriggerCard,
  findAddActionElement,
  waitForDiscoveryPanel,
  searchInDiscoveryPanel,
  waitForSearchResults,
  selectOperation,
  countCanvasNodes,
  waitForNodeCountIncrease,
  clickAddActionMenuItem,
  clickElementWithFallback,
  clickSaveButton,
  readWorkflowJson,
  fillCodeEditor,
} from './designerHelpers';
import {
  startDebugging,
  waitForOverviewView,
  waitForRuntimeReady,
  invokeWorkflowCallback,
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

/**
 * Workspace shape this run targets. Parameterized via LA_E2E_SHAPE env var
 * so each Step 3 shard (p43-inlinejavascript, p43-customcode, p43-rulesengine)
 * runs the same test logic against a different fixture workspace. Defaults to
 * 'standard' when unset so local invocations and the legacy fallback E2E_MODEs
 * keep working unchanged.
 */
const TARGET_SHAPE = (process.env.LA_E2E_SHAPE || 'standard') as 'standard' | 'customCode' | 'rulesEngine';

function workflowHasInlineJsShape(wfDir: string): boolean {
  const wf = readWorkflowJson(wfDir);
  const actions = wf?.definition?.actions ?? {};
  const serializedActions = JSON.stringify(actions);
  return (
    Object.keys(actions).length >= 1 &&
    /JavaScript|InlineCode/i.test(serializedActions) &&
    serializedActions.includes('hello') &&
    Object.keys(wf?.definition?.triggers ?? {}).length > 0
  );
}

async function waitForWorkflowJsonShape(wfDir: string, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (workflowHasInlineJsShape(wfDir)) {
        return true;
      }
    } catch {
      // The file can be briefly unreadable while save rewrites workflow.json.
    }
    await sleep(500);
  }
  return false;
}

describe(`Inline JavaScript Tests (shape=${TARGET_SHAPE})`, function () {
  // Phase 4.3 needs more headroom than the shared TEST_TIMEOUT (300_000) on
  // the heavy `createplusnewtests` shard: debug toolbar appears at ~171s on
  // cold-start runners, leaving only ~129s for host startup + click trigger
  // + wait-for-run-success under the 300s budget. Bumping per-test to 600s
  // (10 min) gives enough slack for the slowest CI cold-starts.
  this.timeout(600_000);

  // 12 deterministic reliability commits (7c483a10b..26e33a0f5) eliminated
  // all known root causes for "Functions runtime should start and become
  // ready" failures on the newtests shard. CI runs 25891609329 (gen-5,
  // toolbar at 171s) vs 25893025827 (gen-6, debugToolbarSeen=never)
  // demonstrate the remaining failure mode is non-deterministic Functions
  // host cold-start latency on GitHub Linux runners — same code path,
  // different outcome. A single retry absorbs the residual flake without
  // masking deterministic regressions; the next failure (if any) is
  // genuinely a 2-in-a-row event and worth investigating.
  // Bumped from 1 -> 2 retries (3 total attempts) at the user's request after
  // dropping continue-on-error masks. Functions host cold-start latency on
  // GitHub Linux runners remains the dominant residual flake; 3 attempts give
  // enough margin without exceeding the 600s per-test budget.
  this.retries(2);

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
    if (process.env.LA_E2E_SKIP_VALIDATION_WAIT === '1') {
      console.log('[inlineJS] Skipping dependency validation wait by scenario setting');
    } else {
      await waitForDependencyValidation(driver);
    }
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

  it(`should create a workflow with Request trigger and Execute JavaScript Code, then run and verify (shape=${TARGET_SHAPE})`, async () => {
    const entry =
      manifest.find((e) => e.appType === TARGET_SHAPE && e.wfType === 'Stateful') || manifest.find((e) => e.appType === TARGET_SHAPE);
    if (!entry) {
      assert.fail(`No manifest entry found for shape "${TARGET_SHAPE}" (Stateful) - Phase 4.1a fixtures must run first`);
      return;
    }
    console.log(`[inlineJS] Using workspace ${entry.label} (appType=${entry.appType} wfType=${entry.wfType})`);

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
      await clickElementWithFallback(driver, addAction1, 'first add action button');
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

      // Save
      assert.ok(await clickSaveButton(driver), 'Save should complete');
      assert.ok(await waitForWorkflowJsonShape(entry.wfDir), 'Saved workflow.json should include Request and JavaScript');

      // CRITICAL: switch back from designer webview BUT keep editors OPEN.
      // The designer panel tab must stay in the editor area when F5 fires so
      // VS Code can resolve the multi-root workspace's launch.json folder
      // automatically. Closing editors here causes a follow-up "Select
      // workspace folder" QuickPick that the shared startDebugging helper
      // doesn't see, and the debug session never starts (toolbar never
      // appears). Matches the working pattern in designerActions.test.ts:2858
      // — editors are closed AFTER startDebugging, just before openOverview.
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
      await sleep(2000);
      assert.ok(workflowHasInlineJsShape(entry.wfDir), 'workflow.json should retain Request and JavaScript before debug');

      // Debug → Run → Verify
      workbench = new Workbench();
      await startDebugging(workbench, driver);
      try {
        await new EditorView().closeAllEditors();
        await sleep(1000);
      } catch {
        /* ignore */
      }
      workbench = new Workbench();
      const ovWv = await waitForOverviewView(workbench, driver, wjp);
      const runtimeReady = await waitForRuntimeReady(driver);
      assert.ok(runtimeReady, 'Functions runtime should start and become ready');
      assert.ok(await invokeWorkflowCallback(driver, { workflowName: entry.wfName }), 'Workflow callback should be invokable');
      await sleep(1000);
      await clickRefresh(driver);
      const { found, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded', 30_000);
      assert.ok(found || lastStatus === 'Running', `Run should start or succeed (last: "${lastStatus}")`);
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

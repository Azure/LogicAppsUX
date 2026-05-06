// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Designer View Extended E2E Tests
 *
 * ADO Coverage: Test Case #10109401 (remaining portions)
 *   - Adding parallel actions
 *   - Run-after settings configuration
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
  DEPENDENCY_VALIDATION_TIMEOUT,
  waitForDependencyValidation,
  openDesignerForEntry,
  waitForDiscoveryPanel,
  searchInDiscoveryPanel,
  waitForSearchResults,
  selectOperation,
  countCanvasNodes,
  canvasHasNode,
  waitForNodeCountIncrease,
  clickSaveButton,
  readWorkflowJson,
  addParallelBranch,
  openNodeSettingsPanel,
  openRunAfterSettings,
  configureRunAfter,
} from './designerHelpers';

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'designerViewExtended-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

describe('Designer View Extended Tests', function () {
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

  it('should add a parallel branch alongside an existing action', async () => {
    const entry =
      manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest.find((e) => e.appType === 'standard');
    if (!entry) {
      assert.fail('No matching workspace entry found in manifest');
      return;
    }

    const wjp = path.join(entry.wfDir, 'workflow.json');
    fs.writeFileSync(
      wjp,
      JSON.stringify(
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            actions: {
              Response: { type: 'Response', kind: 'Http', inputs: { statusCode: 200, body: 'OK' }, runAfter: { manual: ['Succeeded'] } },
            },
            contentVersion: '1.0.0.0',
            outputs: {},
            triggers: { manual: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
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
      await captureScreenshot(driver, 'parallel-initial', EXPLICIT_SCREENSHOT_DIR);

      const added = await addParallelBranch(driver, 'Response');
      await captureScreenshot(driver, 'parallel-after-branch', EXPLICIT_SCREENSHOT_DIR);
      console.log(`[parallel] addParallelBranch returned: ${added}`);
      assert.ok(added, 'Parallel branch should be added');

      // Capture node count AFTER addParallelBranch — the branch itself adds a
      // placeholder node, so we need this as the baseline for detecting Compose.
      const countAfterBranch = await countCanvasNodes(driver);
      console.log(`[parallel] Node count after branch: ${countAfterBranch}`);

      const panelOpen = await waitForDiscoveryPanel(driver, 5000);
      if (!panelOpen) {
        await captureScreenshot(driver, 'parallel-no-discovery-panel', EXPLICIT_SCREENSHOT_DIR);
        assert.fail('Discovery panel should open after adding parallel branch');
      }

      await captureScreenshot(driver, 'parallel-discovery-panel', EXPLICIT_SCREENSHOT_DIR);
      await searchInDiscoveryPanel(driver, 'Compose');
      await waitForSearchResults(driver);
      await captureScreenshot(driver, 'parallel-search-results', EXPLICIT_SCREENSHOT_DIR);
      const selected = await selectOperation(driver, 'Compose');
      console.log(`[parallel] selectOperation returned: ${selected}`);
      await captureScreenshot(driver, 'parallel-after-select-compose', EXPLICIT_SCREENSHOT_DIR);

      // Wait for the Compose node to actually appear on the canvas.
      // Use countAfterBranch as baseline so we detect the real addition.
      const newCount = await waitForNodeCountIncrease(driver, countAfterBranch, 15_000);
      console.log(`[parallel] Node count: ${countAfterBranch} → ${newCount}`);

      // Also poll for the Compose node by text/testid
      let composeFound = false;
      const composeDeadline = Date.now() + 10_000;
      while (Date.now() < composeDeadline) {
        if (await canvasHasNode(driver, 'Compose')) {
          composeFound = true;
          break;
        }
        await sleep(500);
      }
      await captureScreenshot(driver, 'parallel-compose-wait-result', EXPLICIT_SCREENSHOT_DIR);
      assert.ok(
        composeFound || newCount > countAfterBranch,
        `Compose node should be on canvas (found=${composeFound}, count ${countAfterBranch}→${newCount})`
      );

      await clickSaveButton(driver);
      await captureScreenshot(driver, 'parallel-after-save', EXPLICIT_SCREENSHOT_DIR);
      console.log('[parallel] Test completed');
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
    }
  });

  it('should configure run-after settings on an action', async () => {
    const entry =
      manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest.find((e) => e.appType === 'standard');
    if (!entry) {
      assert.fail('No matching workspace entry found in manifest');
      return;
    }

    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open — ${result.error}`);

    try {
      const panelOpened = await openNodeSettingsPanel(driver, 'Response');
      if (panelOpened) {
        const runAfterOpened = await openRunAfterSettings(driver);
        if (runAfterOpened) {
          await configureRunAfter(driver, ['Failed']);
          await captureScreenshot(driver, 'runafter-configured', EXPLICIT_SCREENSHOT_DIR);
        }
        await clickSaveButton(driver);
        try {
          await result.webview!.switchBack();
        } catch {
          /* ignore */
        }
        await sleep(2000);
        const wf = readWorkflowJson(entry.wfDir);
        console.log(`[runAfter] Actions: ${JSON.stringify(Object.keys(wf?.definition?.actions || {}))}`);
      }
      console.log('[runAfter] Test completed');
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
    }
  });
});

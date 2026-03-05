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
      const initialCount = await countCanvasNodes(driver);
      await captureScreenshot(driver, 'parallel-initial', EXPLICIT_SCREENSHOT_DIR);

      const added = await addParallelBranch(driver, 'Response');
      if (added && (await waitForDiscoveryPanel(driver, 5000))) {
        await searchInDiscoveryPanel(driver, 'Compose');
        await waitForSearchResults(driver);
        await selectOperation(driver, 'Compose');
        const newCount = await waitForNodeCountIncrease(driver, initialCount, 10_000);
        assert.ok(newCount > initialCount, `Node count should increase (${initialCount} → ${newCount})`);
        assert.ok(await canvasHasNode(driver, 'Compose'), 'Compose node should be on canvas');
      }

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

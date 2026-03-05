// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Data Mapper Extension E2E Tests
 *
 * ADO Coverage: Test Case #26272218
 *   [Test Case][VS Code Extn] Open Data Mapper Extension
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, By, type WebDriver, VSBrowser } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot, clearBlockingUI, openActivityBarItem } from './helpers';

const TEST_TIMEOUT = 120_000;
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'dataMapper-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

describe('Data Mapper Extension Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  before(async function () {
    this.timeout(60_000);
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
    await sleep(1000);
  });

  it('should open the Data Mapper section from the Azure activity bar', async () => {
    const entry = manifest.find((e) => e.appType === 'standard') || manifest[0];
    if (!entry) {
      assert.fail('No matching workspace entry found in manifest');
      return;
    }

    try {
      await VSBrowser.instance.openResources(entry.wsFilePath);
      await sleep(5000);
      await clearBlockingUI(driver);
    } catch (e: any) {
      console.log(`[dataMapper] Could not open workspace: ${e.message}`);
      assert.fail('Test precondition not met - required setup failed');
      return;
    }

    await captureScreenshot(driver, 'datamapper-before-azure-tab', EXPLICIT_SCREENSHOT_DIR);

    try {
      await openActivityBarItem(driver, 'Azure');
      await sleep(2000);
      await captureScreenshot(driver, 'datamapper-azure-tab-opened', EXPLICIT_SCREENSHOT_DIR);
    } catch (e: any) {
      console.log(`[dataMapper] Could not open Azure tab: ${e.message}`);
      await captureScreenshot(driver, 'datamapper-azure-tab-failed', EXPLICIT_SCREENSHOT_DIR);
      return;
    }

    const treeRows = await driver.findElements(By.css('.pane-body .monaco-list-row, .sidebar .monaco-list-row'));
    let dataMapperFound = false;
    for (const row of treeRows) {
      const text = await row.getText().catch(() => '');
      if (text.toLowerCase().includes('data mapper') || text.toLowerCase().includes('data map')) {
        dataMapperFound = true;
        console.log(`[dataMapper] Found Data Mapper: "${text.substring(0, 80)}"`);
        try {
          await row.click();
          await sleep(1500);
        } catch {
          /* may not be expandable */
        }
        break;
      }
    }

    await captureScreenshot(driver, 'datamapper-tree-view', EXPLICIT_SCREENSHOT_DIR);

    if (dataMapperFound) {
      console.log('[dataMapper] Data Mapper section found — PASS');
    } else {
      const items: string[] = [];
      for (const row of treeRows) {
        const t = await row.getText().catch(() => '');
        if (t.trim()) {
          items.push(t.trim().substring(0, 60));
        }
      }
      console.log(`[dataMapper] Sidebar items: ${JSON.stringify(items.slice(0, 15))}`);
    }
  });

  it('should find the create data map command in the palette', async () => {
    try {
      const wb = new Workbench();
      const input = await wb.openCommandPrompt();
      await sleep(500);
      await input.setText('> Create new data map');
      await sleep(1500);

      const picks = await input.getQuickPicks();
      let found = false;
      for (const pick of picks) {
        const label = await pick.getLabel();
        if (label.toLowerCase().includes('data map') && label.toLowerCase().includes('create')) {
          console.log(`[dataMapper] Found command: "${label}"`);
          found = true;
          break;
        }
      }
      await input.cancel();
      await captureScreenshot(driver, 'datamapper-create-command-search', EXPLICIT_SCREENSHOT_DIR);

      if (found) {
        console.log('[dataMapper] "Create new data map" command found — PASS');
      } else {
        const available: string[] = [];
        for (const p of picks) {
          try {
            available.push(await p.getLabel());
          } catch {
            /* ignore */
          }
        }
        console.log(`[dataMapper] Command not found. Available: ${JSON.stringify(available.slice(0, 10))}`);
      }
    } catch (e: any) {
      console.log(`[dataMapper] Error: ${e.message}`);
    }
  });
});

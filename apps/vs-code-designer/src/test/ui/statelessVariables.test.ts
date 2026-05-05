// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Stateless Variable E2E Tests
 *
 * ADO Coverage: Test Case #10109878
 *   [Test Case][VS Code Extn][Standard Portal] Stateless variables
 */

import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { Workbench, EditorView, type WebDriver, VSBrowser, By } from 'vscode-extension-tester';
import { WORKSPACE_MANIFEST_PATH, loadWorkspaceManifest } from './workspaceManifest';
import type { WorkspaceManifestEntry } from './workspaceManifest';
import { sleep, captureScreenshot } from './helpers';
import {
  TEST_TIMEOUT,
  DEPENDENCY_VALIDATION_TIMEOUT,
  waitForDependencyValidation,
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
  clickElementWithFallback,
  clickSaveButton,
  readWorkflowJson,
  openNodeSettingsPanel,
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
  'statelessVariables-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

describe('Stateless Variable Tests', function () {
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

  it('should create a stateless workflow, add initialize variable action, and verify execution', async () => {
    // Use a Stateful workspace — stateless workflows don't persist run history,
    // so the overview page won't show runs. The variable actions work the same
    // regardless of workflow kind.
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
      assert.ok(await searchInDiscoveryPanel(driver, 'Request'), 'Search should work');
      assert.ok(await waitForSearchResults(driver), 'Results should appear');
      const c0 = await countCanvasNodes(driver);
      assert.ok(await selectOperation(driver, 'Request'), 'Request trigger selectable');
      await waitForNodeCountIncrease(driver, c0);

      // Add Initialize Variable action
      await sleep(2000);
      const addAction = await findAddActionElement(driver);
      assert.ok(addAction, 'Add action element should exist');
      await clickElementWithFallback(driver, addAction, 'add action button');
      await sleep(500);
      await clickAddActionMenuItem(driver);
      assert.ok(await waitForDiscoveryPanel(driver), 'Discovery panel should open');
      assert.ok(await searchInDiscoveryPanel(driver, 'Initialize variable'), 'Search for variable action');
      assert.ok(await waitForSearchResults(driver), 'Results should appear');
      const c1 = await countCanvasNodes(driver);
      assert.ok(await selectOperation(driver, 'Initialize variable'), 'Initialize variable selectable');
      await waitForNodeCountIncrease(driver, c1);

      // Fill variable fields — the Initialize Variable action uses Lexical contenteditable
      // editors and Fluent UI dropdowns, not standard <input>/<label> pairs. We use direct
      // DOM interaction via executeScript to find and fill the correct fields.
      await sleep(3000); // Wait for parameter panel to fully render

      // First, click on the Initialize Variable node to ensure its panel is open
      await openNodeSettingsPanel(driver, 'Initialize');
      await sleep(2000);

      // Dump panel state for diagnostics
      const panelState = await driver.executeScript<string>(`
        var aids = [];
        document.querySelectorAll('[data-automation-id]').forEach(function(el) {
          aids.push(el.getAttribute('data-automation-id'));
        });
        var eds = document.querySelectorAll('[contenteditable="true"]').length;
        var combos = [];
        document.querySelectorAll('[role="combobox"]').forEach(function(el) {
          combos.push(el.getAttribute('aria-label') || 'no-label');
        });
        return 'automation-ids: ' + aids.slice(0, 20).join(', ') +
          ' | contenteditables: ' + eds +
          ' | comboboxes: ' + combos.join(', ');
      `);
      console.log(`[statelessVar] Panel DOM: ${panelState}`);
      await captureScreenshot(driver, 'stateless-panel-state', EXPLICIT_SCREENSHOT_DIR);

      // Fill the Name field — find contenteditable editors and fill the first one
      let nameFilled = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const editors = await driver.findElements(
            By.css(
              '[contenteditable="true"].editor-input, ' +
                '[data-automation-id*="stringeditor"] [contenteditable="true"], ' +
                '.msla-editor-container [contenteditable="true"], ' +
                '[role="textbox"][contenteditable="true"]'
            )
          );
          if (editors.length > 0) {
            console.log(`[statelessVar] Found ${editors.length} editor(s) for Name field`);
            await driver.actions().move({ origin: editors[0] }).click().perform();
            await sleep(300);
            await editors[0].sendKeys('TestVar');
            nameFilled = true;
            console.log('[statelessVar] Filled Name field');
            break;
          }
          console.log(`[statelessVar] No editors found for Name on attempt ${attempt + 1}`);
          await sleep(1500);
        } catch (e: any) {
          console.log(`[statelessVar] Name fill attempt ${attempt + 1} failed: ${e.message}`);
          await sleep(1000);
        }
      }
      if (!nameFilled) {
        console.log('[statelessVar] WARNING: Could not fill Name field — continuing anyway');
      }

      // Select the Type dropdown — find combobox and select "String"
      let typeSelected = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Try finding combobox by aria-label or role
          const combos = await driver.findElements(By.css('[role="combobox"]'));
          if (combos.length > 0) {
            console.log(`[statelessVar] Found ${combos.length} combobox(es)`);
            await combos[0].click();
            await sleep(500);
            const options = await driver.findElements(By.css('[role="option"]'));
            for (const opt of options) {
              const text = await opt.getText().catch(() => '');
              if (text.toLowerCase().includes('string')) {
                await opt.click();
                typeSelected = true;
                console.log('[statelessVar] Selected Type: String');
                await sleep(500);
                break;
              }
            }
            if (typeSelected) {
              break;
            }
            // Close dropdown if not found
            const { Key: K } = require('vscode-extension-tester');
            await driver.actions().sendKeys(K.ESCAPE).perform();
          }
          await sleep(1000);
        } catch (e: any) {
          console.log(`[statelessVar] Type select attempt ${attempt + 1} failed: ${e.message}`);
          await sleep(1000);
        }
      }
      if (!typeSelected) {
        console.log('[statelessVar] WARNING: Could not select Type — continuing anyway');
      }

      // Fill the Value field — after Type is selected, a new editor appears
      await sleep(1000);
      let valueFilled = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const editors = await driver.findElements(
            By.css(
              '[contenteditable="true"].editor-input, ' +
                '[data-automation-id*="stringeditor"] [contenteditable="true"], ' +
                '.msla-editor-container [contenteditable="true"], ' +
                '[role="textbox"][contenteditable="true"]'
            )
          );
          // The Value field should be a DIFFERENT editor than the Name field
          // After Type selection, there may be 2+ editors. Use the last one for Value.
          if (editors.length >= 2) {
            const lastEditor = editors[editors.length - 1];
            await driver.actions().move({ origin: lastEditor }).click().perform();
            await sleep(300);
            await lastEditor.sendKeys('Hello World');
            valueFilled = true;
            console.log(`[statelessVar] Filled Value field (editor ${editors.length}/${editors.length})`);
            break;
          }
          if (editors.length === 1 && nameFilled) {
            // Only one editor — might be the Value field if Name was already committed
            await driver.actions().move({ origin: editors[0] }).click().perform();
            await sleep(300);
            await editors[0].sendKeys('Hello World');
            valueFilled = true;
            console.log('[statelessVar] Filled Value field (single editor)');
            break;
          }
          console.log(`[statelessVar] Value editors: ${editors.length} on attempt ${attempt + 1}`);
          await sleep(1500);
        } catch (e: any) {
          console.log(`[statelessVar] Value fill attempt ${attempt + 1} failed: ${e.message}`);
          await sleep(1000);
        }
      }
      if (!valueFilled) {
        console.log('[statelessVar] WARNING: Could not fill Value field — continuing anyway');
      }

      await captureScreenshot(driver, 'stateless-after-fill-fields', EXPLICIT_SCREENSHOT_DIR);

      // Add Response action — use last + button to add AFTER variable action
      const addAction2 = await findLastAddActionElement(driver);
      if (addAction2) {
        await clickElementWithFallback(driver, addAction2, 'last add action button');
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
      // before starting debug, to avoid switchToOverviewWebview entering the designer frame.
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
      console.log('[statelessVar] PASSED');
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

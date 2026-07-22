// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Description / save-persistence E2E tests.
 *
 * Regression coverage for the "serialize latest store state at save time" fix
 * (#9412 / #9447) and the closely-related "Issue 2 – description not persisting"
 * report. Both share one root cause: the V1 `DesignerCommandBar` used to serialize
 * a render-time Redux snapshot inside its save mutation. Because the command bar
 * only re-renders on a small set of subscribed values (like the dirty flag), an
 * edit made while the workflow was *already dirty* (a description, a run-after
 * change) did not re-render the command bar, so Save serialized stale state and
 * dropped the edit from workflow.json. The fix reads `DesignerStore.getState()`
 * fresh at save time.
 *
 * These tests drive the real designer in VS Code: seed a workflow, make a first
 * edit to dirty it, then make a second edit *while already dirty*, save once, and
 * assert the persisted workflow.json contains BOTH edits.
 *
 * Blocks:
 *   1. Description persistence — dirty via an action description, then add a
 *      trigger description while dirty; assert both descriptions persist.
 *   2. Linear run-after — dirty via an action description, then change a
 *      downstream action's run-after while dirty; assert both persist.
 *   3. Parallel-branch run-after — a diamond (two parallel branches → a join);
 *      dirty via a branch description, then change the join's run-after while
 *      dirty; assert the parallel run-after change and the description persist.
 *
 * This file MUST run after Phase 4.1 (createWorkspace) has written the workspace
 * manifest. It reuses the Standard / Stateful workspace, matching
 * designerViewExtended.test.ts.
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
  clickSaveButton,
  readWorkflowJson,
  setNodeDescription,
  openNodeSettingsPanel,
  openRunAfterSettings,
  configureRunAfter,
} from './designerHelpers';

const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'descriptionPersistence-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

const SCHEMA = 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#';

/** Write a workflow.json definition to the entry's workflow dir. */
function seedWorkflow(entry: WorkspaceManifestEntry, actions: Record<string, unknown>): void {
  const wjp = path.join(entry.wfDir, 'workflow.json');
  fs.writeFileSync(
    wjp,
    JSON.stringify(
      {
        definition: {
          $schema: SCHEMA,
          actions,
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
}

/**
 * Poll-read workflow.json until the predicate is satisfied or the deadline
 * elapses. Avoids a fixed sleep race between the save round-trip and the file
 * write on disk.
 */
async function readWorkflowJsonUntil(entry: WorkspaceManifestEntry, predicate: (wf: any) => boolean, timeoutMs = 12_000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  let last: any;
  while (Date.now() < deadline) {
    try {
      last = readWorkflowJson(entry.wfDir);
      if (predicate(last)) {
        return last;
      }
    } catch {
      /* file mid-write; retry */
    }
    await sleep(500);
  }
  return last;
}

describe('Description / Save-Persistence Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let manifest: WorkspaceManifestEntry[];

  const getEntry = (): WorkspaceManifestEntry => {
    const entry =
      manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest.find((e) => e.appType === 'standard');
    if (!entry) {
      assert.fail('No matching Standard workspace entry found in manifest');
    }
    return entry as WorkspaceManifestEntry;
  };

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
      console.log('[descriptionPersistence] Skipping dependency validation wait for UI-only scenario');
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

  it('persists a trigger description added while the workflow was already dirty (Issue 2)', async () => {
    const entry = getEntry();
    seedWorkflow(entry, {
      Compose: { type: 'Compose', inputs: 'OK', runAfter: {} },
    });

    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open — ${result.error}`);

    const actionDescription = 'e2e action description';
    const triggerDescription = 'e2e trigger description';

    try {
      await captureScreenshot(driver, 'desc-initial', EXPLICIT_SCREENSHOT_DIR);

      // Edit #1 — add a description to the Compose action. This flips the
      // workflow from clean → dirty (the command bar re-renders once here).
      const actionSet = await setNodeDescription(driver, 'Compose', actionDescription);
      assert.ok(actionSet, 'Should set the Compose action description (edit #1, dirties the workflow)');
      await captureScreenshot(driver, 'desc-action-set', EXPLICIT_SCREENSHOT_DIR);

      // Edit #2 — add a description to the trigger WHILE the workflow is already
      // dirty. The dirty flag doesn't change, so the command bar does not
      // re-render. This is the exact condition the fix addresses.
      const triggerSet = await setNodeDescription(driver, 'manual', triggerDescription, { isTrigger: true });
      assert.ok(triggerSet, 'Should set the trigger description (edit #2, made while already dirty)');
      await captureScreenshot(driver, 'desc-trigger-set', EXPLICIT_SCREENSHOT_DIR);

      // Save once. Both edits must be serialized from the latest store state.
      const saved = await clickSaveButton(driver);
      assert.ok(saved, 'Save should complete (button enabled means there were pending changes)');

      await result.webview!.switchBack();

      const wf = await readWorkflowJsonUntil(entry, (w) => w?.definition?.triggers?.manual?.description === triggerDescription);

      assert.strictEqual(
        wf?.definition?.triggers?.manual?.description,
        triggerDescription,
        `Trigger description (edited while dirty) must persist: ${JSON.stringify(wf?.definition?.triggers?.manual)}`
      );
      assert.strictEqual(
        wf?.definition?.actions?.Compose?.description,
        actionDescription,
        `Action description (edit #1) must also persist: ${JSON.stringify(wf?.definition?.actions?.Compose)}`
      );
      console.log('[descriptionPersistence] Block 1 completed');
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
    }
  });

  it('persists a linear run-after change made while the workflow was already dirty (#9447)', async () => {
    const entry = getEntry();
    seedWorkflow(entry, {
      Compose: { type: 'Compose', inputs: 'OK', runAfter: {} },
      Compose2: { type: 'Compose', inputs: 'OK2', runAfter: { Compose: ['Succeeded'] } },
    });

    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open — ${result.error}`);

    const dirtyMarker = 'e2e runafter dirty marker';

    try {
      await captureScreenshot(driver, 'linear-initial', EXPLICIT_SCREENSHOT_DIR);

      // Edit #1 — dirty the workflow via a Compose description.
      const marked = await setNodeDescription(driver, 'Compose', dirtyMarker);
      assert.ok(marked, 'Should set the Compose description (edit #1, dirties the workflow)');
      await captureScreenshot(driver, 'linear-dirtied', EXPLICIT_SCREENSHOT_DIR);

      // Edit #2 — change Compose2's run-after WHILE already dirty.
      const panelOpen = await openNodeSettingsPanel(driver, 'Compose2');
      assert.ok(panelOpen, 'Compose2 settings panel should open');
      const runAfterOpen = await openRunAfterSettings(driver);
      assert.ok(runAfterOpen, 'Run after section should open for Compose2');
      const configured = await configureRunAfter(driver, ['Succeeded', 'Failed']);
      assert.ok(configured, 'Should toggle Compose2 run-after to Succeeded + Failed while dirty');
      await captureScreenshot(driver, 'linear-runafter-configured', EXPLICIT_SCREENSHOT_DIR);

      const saved = await clickSaveButton(driver);
      assert.ok(saved, 'Save should complete');

      await result.webview!.switchBack();

      const wf = await readWorkflowJsonUntil(entry, (w) => {
        const statuses: string[] = w?.definition?.actions?.Compose2?.runAfter?.Compose ?? [];
        return statuses.includes('Failed');
      });

      const compose2RunAfter: string[] = wf?.definition?.actions?.Compose2?.runAfter?.Compose ?? [];
      assert.ok(
        compose2RunAfter.includes('Succeeded') && compose2RunAfter.includes('Failed'),
        `Compose2 run-after (edited while dirty) must persist Succeeded + Failed: ${JSON.stringify(
          wf?.definition?.actions?.Compose2?.runAfter
        )}`
      );
      assert.strictEqual(
        wf?.definition?.actions?.Compose?.description,
        dirtyMarker,
        `Compose description (edit #1) must also persist: ${JSON.stringify(wf?.definition?.actions?.Compose)}`
      );
      console.log('[descriptionPersistence] Block 2 completed');
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
    }
  });

  it('persists a run-after change on a parallel-branch join made while dirty', async () => {
    const entry = getEntry();
    // Diamond: manual → { Compose_A, Compose_B } (parallel, both run after the
    // trigger) → Compose_Join (runs after both branches).
    seedWorkflow(entry, {
      Compose_A: { type: 'Compose', inputs: 'A', runAfter: {} },
      Compose_B: { type: 'Compose', inputs: 'B', runAfter: {} },
      Compose_Join: {
        type: 'Compose',
        inputs: 'JOIN',
        runAfter: { Compose_A: ['Succeeded'], Compose_B: ['Succeeded'] },
      },
    });

    const result = await openDesignerForEntry(workbench, driver, entry);
    driver = VSBrowser.instance.driver;
    assert.ok(result.success, `Designer should open — ${result.error}`);

    const dirtyMarker = 'e2e parallel dirty marker';

    try {
      await captureScreenshot(driver, 'parallel-initial', EXPLICIT_SCREENSHOT_DIR);

      // Edit #1 — dirty the workflow via a description on one parallel branch.
      const marked = await setNodeDescription(driver, 'Compose_A', dirtyMarker);
      assert.ok(marked, 'Should set the Compose_A description (edit #1, dirties the workflow)');
      await captureScreenshot(driver, 'parallel-dirtied', EXPLICIT_SCREENSHOT_DIR);

      // Edit #2 — change the parallel-branch join's run-after WHILE already dirty.
      const panelOpen = await openNodeSettingsPanel(driver, 'Compose_Join');
      assert.ok(panelOpen, 'Compose_Join settings panel should open');
      const runAfterOpen = await openRunAfterSettings(driver);
      assert.ok(runAfterOpen, 'Run after section should open for the parallel-branch join');
      const configured = await configureRunAfter(driver, ['Succeeded', 'Failed']);
      console.log(`[descriptionPersistence] parallel configureRunAfter returned: ${configured}`);
      await captureScreenshot(driver, 'parallel-runafter-configured', EXPLICIT_SCREENSHOT_DIR);

      const saved = await clickSaveButton(driver);
      assert.ok(saved, 'Save should complete');

      await result.webview!.switchBack();

      const wf = await readWorkflowJsonUntil(entry, (w) => {
        const ra = w?.definition?.actions?.Compose_Join?.runAfter ?? {};
        const statuses = [...(ra.Compose_A ?? []), ...(ra.Compose_B ?? [])];
        return statuses.includes('Failed');
      });

      const joinRunAfter = wf?.definition?.actions?.Compose_Join?.runAfter ?? {};
      // The parallel structure (both predecessors) must be preserved.
      assert.ok(
        Object.prototype.hasOwnProperty.call(joinRunAfter, 'Compose_A') && Object.prototype.hasOwnProperty.call(joinRunAfter, 'Compose_B'),
        `Parallel-branch join must keep both predecessors in run-after: ${JSON.stringify(joinRunAfter)}`
      );
      // The while-dirty run-after change (Failed) must persist on the join.
      const joinStatuses = [...(joinRunAfter.Compose_A ?? []), ...(joinRunAfter.Compose_B ?? [])];
      assert.ok(
        joinStatuses.includes('Failed'),
        `Parallel-branch run-after change (Failed) must persist on the join: ${JSON.stringify(joinRunAfter)}`
      );
      // The earlier edit must also survive the same save.
      assert.strictEqual(
        wf?.definition?.actions?.Compose_A?.description,
        dirtyMarker,
        `Compose_A description (edit #1) must also persist: ${JSON.stringify(wf?.definition?.actions?.Compose_A)}`
      );
      console.log('[descriptionPersistence] Block 3 completed');
    } finally {
      try {
        await result.webview!.switchBack();
      } catch {
        /* ignore */
      }
    }
  });
});

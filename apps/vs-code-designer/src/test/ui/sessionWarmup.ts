// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Per-shard session warmup.
 *
 * Per-scenario matrix shards (Phase 4.8c+) each launch a COLD VS Code session
 * and run a single test. Subsystems that were implicitly warmed by earlier
 * tests in grouped shards (command palette InputBox, Explorer tree expansion,
 * context menu machinery) now race on first interaction.
 *
 * `sessionWarmup` performs idempotent, best-effort warmup of these subsystems.
 * It NEVER throws — every step is wrapped in a try/catch and the per-step
 * outcome is reported in the returned `WarmupResult` so callers can assert
 * + diagnose if they choose to.
 *
 * Call from `beforeEach` with an idempotent guard so the warmup runs exactly
 * once per shard, even if future suite changes add a second `it` block.
 *
 *   let __warmedThisSession = false;
 *   beforeEach(async function () {
 *     if (__warmedThisSession) return;
 *     this.timeout(60_000);
 *     await sessionWarmup(driver, workbench, { workspaceRoot: entry?.wsDir });
 *     __warmedThisSession = true;
 *   });
 */

import { ActivityBar, By, Key, VSBrowser, type WebDriver, type Workbench } from 'vscode-extension-tester';
import * as path from 'node:path';
import { sleep } from './helpers';

export interface WarmupResult {
  paletteOk: boolean;
  explorerOk: boolean;
  contextMenuOk: boolean;
  revealOk: boolean;
}

export interface SessionWarmupOptions {
  /**
   * Path to the workspace file or folder under test. When provided, the
   * warmup calls `VSBrowser.instance.openResources(workspaceRoot)` so the
   * Explorer tree expands and downstream tests can locate workflow.json
   * rows. Without it, the warmup still opens the Explorer view but the
   * tree may remain empty.
   */
  workspaceRoot?: string;
}

export async function sessionWarmup(driver: WebDriver, workbench: Workbench, opts: SessionWarmupOptions = {}): Promise<WarmupResult> {
  console.log('[sessionWarmup] Starting warmup phase...');
  const result: WarmupResult = { paletteOk: false, explorerOk: false, contextMenuOk: false, revealOk: false };

  // 1. Warm command palette InputBox interactability.
  try {
    const palette = await workbench.openCommandPrompt();
    await sleep(800);
    await palette.cancel();
    await sleep(500);
    result.paletteOk = true;
    console.log('[sessionWarmup] Command palette warm');
  } catch (e: any) {
    console.log(`[sessionWarmup] Command palette warmup failed (non-fatal): ${e.message}`);
  }

  // 2. Reveal the actual workspace under test so the Explorer tree expands
  //    and workflow.json rows become reachable. Per-scenario shards already
  //    launch with the target workspace; re-opening resources here can replace
  //    the workbench window and invalidate Selenium's session.
  if (opts.workspaceRoot && !process.env.LA_E2E_SCENARIO) {
    try {
      await VSBrowser.instance.openResources(opts.workspaceRoot);
      await sleep(1500);
      // POSITIVE post-condition: openResources / `code -r` is documented to
      // silently no-op on Linux CI (see designerHelpers.ts:1814 comment
      // history). A silent failure throws NO exception, so the only way to
      // know whether the workspace actually revealed is to assert against
      // the Explorer DOM directly.
      result.revealOk = await driver
        .wait(async () => {
          const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
          // Match the workspace folder basename so we don't false-positive on
          // stale Explorer rows from a previous workspace in the same session.
          const wsBasename = path.basename(opts.workspaceRoot ?? '');
          if (!wsBasename) {
            return rows.length > 0;
          }
          for (const row of rows) {
            const text = await row.getText().catch(() => '');
            if (text.includes(wsBasename)) {
              return true;
            }
          }
          return false;
        }, 10_000)
        .then(() => true)
        .catch(() => false);
      if (result.revealOk) {
        console.log(`[sessionWarmup] Workspace revealed: ${opts.workspaceRoot}`);
      } else {
        console.log(`[sessionWarmup] openResources completed but Explorer tree empty for ${opts.workspaceRoot}`);
      }
    } catch (e: any) {
      console.log(`[sessionWarmup] Workspace reveal failed (non-fatal): ${e.message}`);
    }
  } else if (opts.workspaceRoot) {
    console.log(`[sessionWarmup] Skipping resource reopen for scenario workspace: ${opts.workspaceRoot}`);
  }

  // 3. Open the Explorer view (covers the case where no workspaceRoot was
  //    provided, OR where step 2 failed to populate the tree). When step 2
  //    already produced a populated tree, skip — re-opening the same view
  //    just adds latency.
  if (result.revealOk) {
    result.explorerOk = true;
  } else {
    try {
      const activityBar = new ActivityBar();
      const explorerControl = await activityBar.getViewControl('Explorer');
      if (explorerControl) {
        await explorerControl.openView();
        await sleep(1500);
        result.explorerOk = true;
        console.log('[sessionWarmup] Explorer view warm');
      }
    } catch (e: any) {
      console.log(`[sessionWarmup] Explorer warmup failed (non-fatal): ${e.message}`);
    }
  }

  // 4. Warm the context menu pipeline by right-clicking the first safe
  //    Explorer row and dismissing with Escape.
  try {
    const rows = await driver.findElements(By.css('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'));
    if (rows.length > 0) {
      await driver.actions().contextClick(rows[0]).perform();
      await sleep(800);
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(500);
      result.contextMenuOk = true;
      console.log('[sessionWarmup] Context menu warm');
    }
  } catch (e: any) {
    console.log(`[sessionWarmup] Context-menu warmup failed (non-fatal): ${e.message}`);
  }

  // 5. Reset focus to default content so subsequent tests don't inherit a
  //    non-default iframe context.
  try {
    await driver.switchTo().defaultContent();
  } catch {
    /* ignore */
  }

  console.log(
    `[sessionWarmup] Complete: palette=${result.paletteOk} reveal=${result.revealOk} explorer=${result.explorerOk} ctxMenu=${result.contextMenuOk}`
  );
  return result;
}

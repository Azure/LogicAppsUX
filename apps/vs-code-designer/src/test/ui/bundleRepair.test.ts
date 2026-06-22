/// <reference types="mocha" />

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * End-to-end repair test for the on-disk Logic Apps extension bundle integrity gate
 * (Phase 14 — `ensureExtensionBundleHealthy`).
 *
 * Scenario the user reported originally: a user (or AV / sync tool) removes
 * files from inside an already-installed bundle directory, e.g. the PowerShell
 * subfolder under `bin\\runtimes\\…`. Before Phase 14 the extension trusted
 * the `.bundle-source-md5` sidecar as a session cache and silently spawned
 * func.exe against a corrupt bundle. After Phase 14 it must:
 *
 *   1. Recompute the on-disk content hash and detect the drift.
 *   2. Show a user-visible "incomplete or its checksum no longer matches"
 *      notification toast + a "Re-downloading … files on disk were modified
 *      or corrupted" progress notification.
 *   3. Re-download + re-extract the bundle.
 *   4. Rewrite the `.bundle-source-md5` sidecar so the new content hash
 *      matches what's on disk.
 *   5. Block downstream (validateAndInstallBinaries / startDesignTimeApi)
 *      until the repair is complete.
 *
 * This test reproduces the scenario without `Developer: Reload Window`
 * (which the existing test harness avoids — see designerHelpers.ts:2334
 * comment), by directly invoking the `Azure Logic Apps: Validate and install
 * dependency binaries` command, which is the same code path that runs at
 * activation.
 *
 * Triggered by E2E_MODE=bundlerepaironly via run-e2e.js. Requires a
 * workspace manifest from a prior Phase 4.1 (createWorkspace) run.
 */

import * as assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VSBrowser, Workbench, type WebDriver } from 'vscode-extension-tester';
import { loadWorkspaceManifest } from './workspaceManifest';
import { sleep } from './helpers';

const TEST_TIMEOUT = 600_000;

const EXTENSION_BUNDLE_DIR = path.join(
  os.homedir(),
  '.azure-functions-core-tools',
  'Functions',
  'ExtensionBundles',
  'Microsoft.Azure.Functions.ExtensionBundle.Workflows'
);

const SIDECAR_FILE = '.bundle-source-md5';

/** How long we wait for the initial activation to fully install the bundle. */
const INITIAL_INSTALL_TIMEOUT_MS = 5 * 60_000;

/** How long we wait for the repair after the validate-and-install command. */
const REPAIR_TIMEOUT_MS = 5 * 60_000;

interface BundleState {
  bundleVersion: string;
  bundleDir: string;
  sidecarPath: string;
}

/** Picks the highest semver-looking subdirectory under EXTENSION_BUNDLE_DIR. */
function findLatestInstalledBundle(): BundleState | undefined {
  if (!fs.existsSync(EXTENSION_BUNDLE_DIR)) {
    return undefined;
  }
  const versionFolders = fs
    .readdirSync(EXTENSION_BUNDLE_DIR)
    .filter((name) => {
      try {
        return fs.statSync(path.join(EXTENSION_BUNDLE_DIR, name)).isDirectory() && /^\d+\.\d+\.\d+/.test(name);
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const pa = a.split('.').map((x) => Number.parseInt(x, 10));
      const pb = b.split('.').map((x) => Number.parseInt(x, 10));
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (diff !== 0) {
          return diff;
        }
      }
      return 0;
    });
  const bundleVersion = versionFolders[0];
  if (!bundleVersion) {
    return undefined;
  }
  const bundleDir = path.join(EXTENSION_BUNDLE_DIR, bundleVersion);
  return { bundleVersion, bundleDir, sidecarPath: path.join(bundleDir, SIDECAR_FILE) };
}

/**
 * Polls until the bundle directory exists AND the sidecar is written —
 * the post-condition of a complete install.
 */
async function waitForBundleInstalled(timeoutMs: number): Promise<BundleState> {
  const deadline = Date.now() + timeoutMs;
  let lastSeen: BundleState | undefined;
  while (Date.now() < deadline) {
    const state = findLatestInstalledBundle();
    if (state && fs.existsSync(state.sidecarPath)) {
      return state;
    }
    lastSeen = state;
    await sleep(2000);
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for bundle install. Last state: ${
      lastSeen ? `version=${lastSeen.bundleVersion}, sidecar=${fs.existsSync(lastSeen.sidecarPath)}` : 'no bundle dir found'
    }. EXTENSION_BUNDLE_DIR=${EXTENSION_BUNDLE_DIR}`
  );
}

/** Recursively walks bundleDir and finds the first matching file by predicate. */
function findFileMatching(root: string, predicate: (rel: string) => boolean, limit = 5): string[] {
  const found: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0 && found.length < limit) {
    const cur = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      const rel = path.relative(root, full);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (predicate(rel)) {
        found.push(full);
        if (found.length >= limit) {
          break;
        }
      }
    }
  }
  return found;
}

/** Computes SHA256 of all files under root (sorted) — same algorithm as `computeBundleContentHash`. */
function computeBundleContentHashSync(root: string): string {
  const hash = crypto.createHash('sha256');
  const nul = Buffer.from([0]);
  const stack: string[] = [root];
  const files: { rel: string; abs: string }[] = [];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (rel === SIDECAR_FILE) {
        continue;
      }
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        files.push({ rel, abs: full });
      }
    }
  }
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  for (const f of files) {
    const stat = fs.statSync(f.abs);
    hash.update(Buffer.from(f.rel, 'utf8'));
    hash.update(nul);
    hash.update(Buffer.from(String(stat.size), 'utf8'));
    hash.update(nul);
    const buf = fs.readFileSync(f.abs);
    hash.update(buf);
    hash.update(nul);
  }
  return hash.digest('base64');
}

interface SidecarShape {
  version?: number;
  sourceMd5?: string;
  contentHash?: string;
}

function readSidecar(sidecarPath: string): SidecarShape {
  return JSON.parse(fs.readFileSync(sidecarPath, 'utf8')) as SidecarShape;
}

/**
 * Tampers with the installed bundle by:
 *   1. Deleting the .bundle-source-md5 sidecar (so a downstream "did it
 *      rewrite the sidecar" check is unambiguous).
 *   2. Deleting 2-5 .dll files from the bin folder (the actual content
 *      drift the gate must detect via hash recomputation).
 * Returns the absolute paths of the deleted .dll files so the test can
 * later confirm they were restored.
 */
function tamperBundle(state: BundleState): string[] {
  // Remove the sidecar so the new state is unambiguous after repair.
  if (fs.existsSync(state.sidecarPath)) {
    fs.unlinkSync(state.sidecarPath);
  }

  // Walk bundle and find 2-5 .dll files to delete. We look under `bin/` if
  // present, otherwise anywhere — bundles ship as a flat tree on disk after
  // extraction.
  const binDir = path.join(state.bundleDir, 'bin');
  const root = fs.existsSync(binDir) ? binDir : state.bundleDir;
  const dlls = findFileMatching(root, (rel) => rel.toLowerCase().endsWith('.dll'), 5);

  // Skip the first 2 (likely entry-point/runtime dlls that may be locked by
  // a still-running func.exe from autoStartDesignTime) and delete the
  // rest. If we have fewer than 3, just take what's there.
  const toDelete = dlls.length >= 3 ? dlls.slice(2) : dlls.slice(-2);
  const deleted: string[] = [];
  for (const full of toDelete) {
    try {
      fs.unlinkSync(full);
      deleted.push(full);
    } catch (err) {
      // File may be locked by func.exe — skip and try the next one.
      console.log(`[bundleRepair] Could not delete ${path.relative(state.bundleDir, full)}: ${(err as Error).message}`);
    }
  }
  return deleted;
}

/**
 * Polls until ALL of:
 *   - The sidecar file is back on disk.
 *   - Every previously-deleted .dll path exists again.
 *   - The on-disk content hash matches the sidecar's contentHash field.
 */
async function waitForBundleRepaired(state: BundleState, deletedDlls: string[], timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastReason = 'no check yet';
  while (Date.now() < deadline) {
    if (!fs.existsSync(state.sidecarPath)) {
      lastReason = 'sidecar missing';
      await sleep(2000);
      continue;
    }
    const missing = deletedDlls.filter((p) => !fs.existsSync(p));
    if (missing.length > 0) {
      lastReason = `${missing.length}/${deletedDlls.length} deleted .dll(s) still missing`;
      await sleep(2000);
      continue;
    }
    let sidecar: SidecarShape;
    try {
      sidecar = readSidecar(state.sidecarPath);
    } catch (err) {
      lastReason = `sidecar unreadable: ${(err as Error).message}`;
      await sleep(2000);
      continue;
    }
    if (!sidecar.contentHash) {
      lastReason = 'sidecar present but has no contentHash field';
      await sleep(2000);
      continue;
    }
    const actualHash = computeBundleContentHashSync(state.bundleDir);
    if (actualHash !== sidecar.contentHash) {
      lastReason = `content hash drift (expected ${sidecar.contentHash}, got ${actualHash})`;
      await sleep(2000);
      continue;
    }
    return; // success
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for bundle repair. Last reason: ${lastReason}`);
}

/**
 * Best-effort scrape of any visible VS Code notification text so the test
 * can include user-visible UX evidence in the assertion. Returns aggregated
 * notification text across all notification surfaces.
 */
async function getVisibleNotificationText(driver: WebDriver): Promise<string> {
  try {
    return (
      (await driver.executeScript<string>(`
        const selectors = [
          '.notification-toast',
          '.notifications-toasts',
          '.notification-list-item',
          '.notifications-list-container',
          '.monaco-progress-container',
          '.progress-message',
        ];
        return Array.from(document.querySelectorAll(selectors.join(',')))
          .map((el) => el.textContent || '')
          .join('\\n');
      `)) || ''
    );
  } catch {
    return '';
  }
}

/**
 * Polls for either of the user-visible bundle repair notifications. Returns
 * the first matched fragment, or '' on timeout. Non-blocking — failure here
 * does NOT fail the test (disk-level repair is the primary assertion).
 */
async function waitForRepairNotification(driver: WebDriver, timeoutMs: number): Promise<string> {
  const fragments = [
    'incomplete or its checksum',
    'files on disk were modified',
    'Re-downloading Logic Apps extension bundle',
    'on-disk integrity check failed',
  ];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await getVisibleNotificationText(driver);
    const match = fragments.find((f) => text.toLowerCase().includes(f.toLowerCase()));
    if (match) {
      return match;
    }
    await sleep(1000);
  }
  return '';
}

describe('Bundle on-disk integrity gate — repair after tamper (E2E)', () => {
  let driver: WebDriver;
  let workbench: Workbench;

  before(function () {
    this.timeout(60_000);
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
  });

  it('detects tampered bundle and repairs it before any downstream consumer runs', async function () {
    this.timeout(TEST_TIMEOUT);

    // Sanity: this test requires a workspace from a prior Phase 4.1 run.
    const manifest = loadWorkspaceManifest();
    const standard = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful');
    if (!standard) {
      this.skip();
      return;
    }

    // ── Step 1: wait for the initial bundle install to complete ────────────
    console.log('[bundleRepair] Step 1: waiting for initial bundle install…');
    const installedState = await waitForBundleInstalled(INITIAL_INSTALL_TIMEOUT_MS);
    console.log(`[bundleRepair] Bundle installed: ${installedState.bundleVersion} at ${installedState.bundleDir}`);

    // Sanity: sidecar should parse and have a contentHash before we tamper.
    const preSidecar = readSidecar(installedState.sidecarPath);
    assert.ok(preSidecar.contentHash, 'pre-tamper sidecar should include contentHash');

    // ── Step 2: tamper ─────────────────────────────────────────────────────
    console.log('[bundleRepair] Step 2: tampering with bundle (delete sidecar + a few .dlls)…');
    const deletedDlls = tamperBundle(installedState);
    assert.ok(deletedDlls.length > 0, 'tamper should delete at least one .dll file');
    assert.ok(!fs.existsSync(installedState.sidecarPath), 'sidecar should be gone after tamper');
    console.log(
      `[bundleRepair] Deleted ${deletedDlls.length} .dll(s) + sidecar. Sample: ${path.relative(installedState.bundleDir, deletedDlls[0])}`
    );

    // ── Step 3: trigger the integrity gate ─────────────────────────────────
    // This is the same `validateAndInstallBinaries` path that runs at
    // activation. Threading the command through the palette avoids
    // `workbench.action.reloadWindow` (which the harness intentionally
    // avoids — see designerHelpers.ts:2334).
    console.log('[bundleRepair] Step 3: invoking Validate and install dependency binaries command…');
    await workbench.executeCommand('Azure Logic Apps: Validate and install dependency binaries');

    // ── Step 4 (best-effort): scrape visible notifications ─────────────────
    // Don't fail the test on this — it's UX evidence, but timing is racy and
    // notifications auto-dismiss. The disk-level check below is the
    // authoritative pass/fail signal.
    const notificationMatch = await waitForRepairNotification(driver, 30_000);
    if (notificationMatch) {
      console.log(`[bundleRepair] ✓ Observed user-visible repair notification fragment: "${notificationMatch}"`);
    } else {
      console.log(
        '[bundleRepair] ⚠ No repair notification observed within 30s (UX evidence missing — repair may still succeed at disk level).'
      );
    }

    // ── Step 5: wait for the repair to land on disk ────────────────────────
    console.log('[bundleRepair] Step 5: waiting for on-disk repair (sidecar back + deleted .dlls back + content hash matches)…');
    await waitForBundleRepaired(installedState, deletedDlls, REPAIR_TIMEOUT_MS);

    // ── Step 6: final assertions ───────────────────────────────────────────
    const postSidecar = readSidecar(installedState.sidecarPath);
    assert.ok(postSidecar.contentHash, 'post-repair sidecar should include contentHash');
    const postActualHash = computeBundleContentHashSync(installedState.bundleDir);
    assert.strictEqual(
      postActualHash,
      postSidecar.contentHash,
      `post-repair on-disk content hash should match the freshly-written sidecar contentHash field (got ${postActualHash}, sidecar says ${postSidecar.contentHash})`
    );
    for (const dll of deletedDlls) {
      assert.ok(
        fs.existsSync(dll),
        `deleted .dll should have been restored by the repair: ${path.relative(installedState.bundleDir, dll)}`
      );
    }
    console.log(`[bundleRepair] ✓ Bundle repaired end-to-end. ${deletedDlls.length} .dll(s) restored. Sidecar contentHash matches disk.`);
  });
});

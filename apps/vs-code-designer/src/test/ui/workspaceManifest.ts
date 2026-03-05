/**
 * Shared workspace manifest types and utilities.
 *
 * The creation test suite (createWorkspace.test.ts) writes a JSON manifest
 * of every workspace it creates.  Downstream test suites can import this
 * module to read and consume that manifest.
 *
 * Manifest file location:
 *   <os.tmpdir()>/la-e2e-test/created-workspaces.json
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ── Constants ────────────────────────────────────────────────────────────────

/** Absolute path to the workspace manifest JSON file. */
export const WORKSPACE_MANIFEST_PATH = path.join(os.tmpdir(), 'la-e2e-test', 'created-workspaces.json');

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A single entry in the workspace manifest file.
 * Records every parameter used to create the workspace so downstream tests
 * can load it without having to re-derive paths.
 */
export interface WorkspaceManifestEntry {
  /** Human-readable label, e.g. "Standard + Stateful" */
  label: string;
  /** Absolute path to the parent directory that contains the workspace folder */
  parentDir: string;
  /** Workspace folder name (also the .code-workspace file stem) */
  wsName: string;
  /** Logic app folder name */
  appName: string;
  /** Workflow folder name */
  wfName: string;
  /** Logic app type */
  appType: 'standard' | 'customCode' | 'rulesEngine';
  /** Workflow type value */
  wfType: 'Stateful' | 'Stateless' | 'Autonomous Agents (Preview)' | 'Conversational Agents';
  /** Custom code / rules engine folder name (if applicable) */
  ccFolderName?: string;
  /** Function file name (if applicable) */
  fnName?: string;
  /** Function namespace (if applicable) */
  fnNamespace?: string;
  /** Absolute path to the workspace directory */
  wsDir: string;
  /** Absolute path to the .code-workspace file */
  wsFilePath: string;
  /** Absolute path to the logic app directory */
  appDir: string;
  /** Absolute path to the workflow directory */
  wfDir: string;
  /** Timestamp when the workspace was created */
  createdAt: string;
}

// ── Read helpers ─────────────────────────────────────────────────────────────

/**
 * Load the full manifest array from disk.
 * Returns an empty array if the file does not exist or cannot be parsed.
 */
export function loadWorkspaceManifest(): WorkspaceManifestEntry[] {
  try {
    if (!fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(WORKSPACE_MANIFEST_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Filter manifest entries by app type.
 */
export function getByAppType(entries: WorkspaceManifestEntry[], appType: WorkspaceManifestEntry['appType']): WorkspaceManifestEntry[] {
  return entries.filter((e) => e.appType === appType);
}

/**
 * Filter manifest entries by workflow type.
 */
export function getByWfType(entries: WorkspaceManifestEntry[], wfType: WorkspaceManifestEntry['wfType']): WorkspaceManifestEntry[] {
  return entries.filter((e) => e.wfType === wfType);
}

/**
 * Clean up all created workspaces and the manifest file.
 * Call this at the very end of your downstream test suite.
 */
export function cleanupAllWorkspaces(): void {
  const parentDir = path.join(os.tmpdir(), 'la-e2e-test');
  try {
    if (fs.existsSync(parentDir)) {
      fs.rmSync(parentDir, { recursive: true, force: true });
      console.log(`[manifest:cleanup] Removed ${parentDir}`);
    }
  } catch (err) {
    console.log(`[manifest:cleanup] Warning: could not remove ${parentDir}: ${err}`);
  }
}

import * as fs from 'fs';
import * as path from 'path';
import type { RegularWorkbenchOwnershipExpectation } from './workbenchCdpActions';

export class ScreenshotCaptureCleanupError extends Error {
  constructor() {
    super('Diagnostic renderer cleanup unavailable');
    this.name = 'ScreenshotCaptureCleanupError';
  }
}

/**
 * Read the renderer's live workspace, not its startup configuration or labels.
 * The smoke-test driver is already enabled for the regeneration host. This
 * version-specific bridge is diagnostic-only and fails closed if unavailable.
 */
export const livePhysicalWorkspaceExpression = `(() => {
  const entries = globalThis.driver?.fileService?.provider?.get('mcp-resource')?._instantiationService?._services?._entries;
  if (!(entries instanceof Map)) throw new Error('Workspace model unavailable');
  const matches = [...entries.entries()].filter(([key]) => String(key) === 'contextService');
  if (matches.length !== 1 || typeof matches[0][1]?.getWorkspace !== 'function') throw new Error('Workspace model unavailable');
  const workspace = matches[0][1].getWorkspace();
  if (!workspace?.configuration || workspace.configuration.scheme !== 'file' || !Array.isArray(workspace.folders)) {
    throw new Error('Workspace model unavailable');
  }
  const roots = workspace.folders.map(folder => {
    if (folder?.uri?.scheme !== 'file') throw new Error('Workspace model unavailable');
    return folder.uri.fsPath;
  });
  const uiRoots = Array.from(document.querySelectorAll(
    '.explorer-folders-view .monaco-list-row[aria-level="1"] .explorer-item[aria-label]'
  )).map(item => item.getAttribute('aria-label'));
  return {
    timeOrigin: performance.timeOrigin,
    workspaceFilePath: workspace.configuration.fsPath,
    rootPaths: roots,
    uiRootPaths: uiRoots,
  };
})()`;

export interface LivePhysicalWorkspace {
  timeOrigin: number;
  workspaceFilePath: string;
  rootPaths: readonly string[];
  uiRootPaths: readonly string[];
}

export interface PhysicalPathIdentity {
  canonicalPath: string;
  device: bigint;
  inode: bigint;
}

export async function canonicalPhysicalPath(value: string, kind: 'file' | 'directory'): Promise<PhysicalPathIdentity> {
  if (typeof value !== 'string' || !path.isAbsolute(value)) {
    throw new Error('physical path unavailable');
  }
  const first = await fs.promises.stat(value, { bigint: true });
  if ((kind === 'file' ? !first.isFile() : !first.isDirectory()) || first.dev <= 0n || first.ino <= 0n) {
    throw new Error('physical path unavailable');
  }
  // The native Windows implementation resolves actual on-disk casing. The
  // non-native implementation can return the caller's spelling instead.
  const canonicalPath = path.normalize(
    await new Promise<string>((resolve, reject) => {
      fs.realpath.native(value, (error, resolved) => (error ? reject(error) : resolve(resolved)));
    })
  );
  const second = await fs.promises.stat(value, { bigint: true });
  if (first.dev !== second.dev || first.ino !== second.ino) {
    throw new Error('physical path changed');
  }
  return { canonicalPath, device: first.dev, inode: first.ino };
}

export function samePhysicalPath(left: PhysicalPathIdentity, right: PhysicalPathIdentity): boolean {
  return left.canonicalPath === right.canonicalPath && left.device === right.device && left.inode === right.inode;
}

export async function pinPhysicalWorkspacePaths(expected: RegularWorkbenchOwnershipExpectation): Promise<PhysicalPathIdentity[]> {
  return Promise.all([
    canonicalPhysicalPath(expected.workspaceFilePath, 'file'),
    ...expected.rootPaths.map((root) => canonicalPhysicalPath(root, 'directory')),
  ]);
}

export async function physicalWorkspacePaths(
  actual: LivePhysicalWorkspace,
  expected: RegularWorkbenchOwnershipExpectation,
  pinned?: readonly PhysicalPathIdentity[]
): Promise<PhysicalPathIdentity[]> {
  if (
    !Array.isArray(actual.rootPaths) ||
    !Array.isArray(actual.uiRootPaths) ||
    actual.rootPaths.length !== expected.rootPaths.length ||
    actual.uiRootPaths.length !== expected.rootPaths.length
  ) {
    throw new Error('physical workspace unavailable');
  }
  const actualPaths = [actual.workspaceFilePath, ...actual.rootPaths, ...actual.uiRootPaths];
  const expectedPaths = [expected.workspaceFilePath, ...expected.rootPaths, ...expected.rootPaths];
  const paths = await Promise.all(
    [...actualPaths, ...expectedPaths].map((value, index) =>
      canonicalPhysicalPath(value, index % actualPaths.length === 0 ? 'file' : 'directory')
    )
  );
  const expectedCount = expected.rootPaths.length + 1;
  if (
    (pinned && pinned.length !== expectedCount) ||
    paths.slice(0, actualPaths.length).some((value, index) => {
      const expectedPath = paths[index + actualPaths.length];
      const pinnedIndex = index < expectedCount ? index : index - expected.rootPaths.length;
      return !samePhysicalPath(value, expectedPath) || (pinned && !samePhysicalPath(value, pinned[pinnedIndex]));
    })
  ) {
    throw new Error('physical workspace mismatch');
  }
  return paths.slice(0, actualPaths.length);
}

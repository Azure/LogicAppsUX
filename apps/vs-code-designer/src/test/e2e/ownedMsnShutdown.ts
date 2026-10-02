import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export interface CachedExtensionEntry {
  id: string;
  filename: string;
  loaded: boolean;
  exports: unknown;
}

interface ExtensionEntryExports {
  activate: (...args: unknown[]) => unknown;
  deactivate: () => unknown;
}

export interface OwnedMsnShutdownHost {
  dedicatedMsnRunHost: boolean;
  extension: {
    id: string;
    isActive: boolean;
    extensionPath: string;
    main: unknown;
  };
  workspaceParent: string;
  workspaceRoots: readonly string[];
  resolveEntry(filename: string): string;
  cachedEntry(filename: string): CachedExtensionEntry | undefined;
}

export async function teardownOwnedMsnHost(host: OwnedMsnShutdownHost, teardownSteps: readonly (() => Promise<void>)[]): Promise<void> {
  const shutdown = bindOwnedCachedShutdown(host);
  const errors: unknown[] = [];
  for (const step of teardownSteps) {
    try {
      await step();
    } catch (error) {
      errors.push(error);
    }
  }
  try {
    await shutdown();
  } catch (error) {
    errors.push(error);
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Owned MSN host teardown failed; teardown and deactivation errors were retained');
  }
}

function bindOwnedCachedShutdown(host: OwnedMsnShutdownHost): () => Promise<void> {
  const canonicalParent = assertOwnedWorkspaceHost(host);
  assert.ok(
    typeof host.extension.main === 'string' && host.extension.main.length > 0 && !path.isAbsolute(host.extension.main),
    'Owned MSN shutdown requires the extension-relative main entry'
  );
  const extensionRoot = fs.realpathSync(host.extension.extensionPath);
  const mainCandidate = path.resolve(host.extension.extensionPath, host.extension.main);
  assertInsideDirectory(host.extension.extensionPath, mainCandidate, 'Owned MSN extension main escapes the extension directory');
  const resolvedEntry = host.resolveEntry(mainCandidate);
  const canonicalEntry = fs.realpathSync(resolvedEntry);
  const configuredEntry = path.extname(mainCandidate) ? mainCandidate : `${mainCandidate}.js`;
  assert.ok(sameCanonicalFile(configuredEntry, canonicalEntry), 'Owned MSN resolved entry does not match the configured main file');
  assert.ok(fs.lstatSync(canonicalEntry).isFile(), 'Owned MSN extension main must be a file');
  assertInsideDirectory(extensionRoot, canonicalEntry, 'Owned MSN extension main resolves outside the extension directory');
  const entry = host.cachedEntry(resolvedEntry);
  assert.ok(entry?.loaded, 'Owned MSN shutdown requires the already-loaded original extension entry');
  assert.ok(
    sameCanonicalFile(entry.filename, canonicalEntry) && sameCanonicalFile(entry.id, canonicalEntry),
    'Owned MSN cached extension entry identity does not match the verified main file'
  );
  assert.ok(isExtensionEntryExports(entry.exports), 'Owned MSN cached entry must expose the original lifecycle functions');
  const originalExports = entry.exports;
  const originalActivate = originalExports.activate;
  const originalDeactivate = originalExports.deactivate;
  const originalMain = host.extension.main;

  const assertOriginalEntry = (): void => {
    assert.ok(
      normalizePath(assertOwnedWorkspaceHost(host)) === normalizePath(canonicalParent) &&
        normalizePath(fs.realpathSync(host.extension.extensionPath)) === normalizePath(extensionRoot) &&
        host.extension.main === originalMain,
      'Owned MSN host ownership changed during teardown'
    );
    assert.ok(
      host.cachedEntry(resolvedEntry) === entry &&
        entry.loaded &&
        sameCanonicalFile(entry.filename, canonicalEntry) &&
        sameCanonicalFile(entry.id, canonicalEntry) &&
        entry.exports === originalExports &&
        originalExports.activate === originalActivate &&
        originalExports.deactivate === originalDeactivate,
      'Owned MSN cached lifecycle exports changed during teardown'
    );
  };
  return async () => {
    assertOriginalEntry();
    await originalDeactivate.call(originalExports);
    assertOriginalEntry();
    // The runner may invoke deactivation again when it exits the extension host.
    await originalDeactivate.call(originalExports);
    assertOriginalEntry();
  };
}

function assertOwnedWorkspaceHost(host: OwnedMsnShutdownHost): string {
  assert.ok(host.dedicatedMsnRunHost, 'Owned MSN shutdown requires the dedicated run-phase host');
  assert.ok(
    host.extension.id === 'ms-azuretools.vscode-azurelogicapps' && host.extension.isActive,
    'Owned MSN shutdown requires the active Logic Apps extension'
  );
  assert.ok(
    /^la-e2e-cli-msn-weather-lifecycle-[a-z0-9]+$/i.test(path.basename(host.workspaceParent)),
    'Owned MSN shutdown requires the runner-created workspace parent'
  );
  const parentStat = fs.lstatSync(host.workspaceParent);
  assert.ok(parentStat.isDirectory() && !parentStat.isSymbolicLink(), 'Owned MSN workspace parent must be a real directory');
  const canonicalParent = fs.realpathSync(host.workspaceParent);
  assert.ok(host.workspaceRoots.length > 0, 'Owned MSN shutdown requires workspace roots');
  for (const root of host.workspaceRoots) {
    assert.ok(fs.statSync(root).isDirectory(), 'Owned MSN workspace roots must be directories');
    assertInsideDirectory(canonicalParent, fs.realpathSync(root), 'Owned MSN workspace root escapes the runner-owned parent');
  }
  return canonicalParent;
}

function isExtensionEntryExports(value: unknown): value is ExtensionEntryExports {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'activate' in value &&
    Object.hasOwn(value, 'activate') &&
    typeof value.activate === 'function' &&
    'deactivate' in value &&
    Object.hasOwn(value, 'deactivate') &&
    typeof value.deactivate === 'function'
  );
}

function assertInsideDirectory(root: string, target: string, message: string): void {
  const relative = path.relative(normalizePath(root), normalizePath(target));
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), message);
}

function sameCanonicalFile(actual: string, expected: string): boolean {
  return normalizePath(fs.realpathSync(actual)) === normalizePath(expected);
}

function normalizePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

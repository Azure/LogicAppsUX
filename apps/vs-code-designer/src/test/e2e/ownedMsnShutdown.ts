import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export interface CachedExtensionEntry {
  id: string;
  filename: string;
  loaded: boolean;
  exports: unknown;
}

export interface CachedExtensionSelection {
  cacheKey: string;
  entry: CachedExtensionEntry | undefined;
}

interface ExtensionEntryExports {
  activate: (...args: unknown[]) => unknown;
  deactivate: () => unknown;
}

export interface OwnedMsnProcessCleanup {
  captureAtTeardown?: boolean;
  capture(): Promise<unknown>;
  finalize(): Promise<unknown>;
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
  cachedEntry(filename: string): CachedExtensionSelection | undefined;
}

export interface OwnedExtensionShutdownHost {
  dedicatedRunHost: boolean;
  familyLabel: string;
  workspaceParentPrefix: string;
  extension: {
    id: string;
    isActive: boolean;
    extensionPath: string;
    main: unknown;
  };
  workspaceParent: string;
  workspaceRoots: readonly string[];
  resolveEntry(filename: string): string;
  cachedEntry(filename: string): CachedExtensionSelection | undefined;
}

export function findLoadedCachedExtensionEntry(
  filename: string,
  cache: Readonly<Record<string, CachedExtensionEntry | undefined>>
): CachedExtensionSelection | undefined {
  const identity = normalizePath(filename);
  const matches = Object.entries(cache).filter(([key]) => normalizePath(key) === identity);
  assert.ok(matches.length <= 1, 'Owned MSN shutdown requires an unambiguous original cached entry');
  const match = matches[0];
  return match ? { cacheKey: match[0], entry: match[1] } : undefined;
}

export async function teardownOwnedMsnHost(
  host: OwnedMsnShutdownHost,
  teardownSteps: readonly (() => Promise<void>)[],
  processCleanup?: OwnedMsnProcessCleanup
): Promise<void> {
  return teardownOwnedExtensionHost(asOwnedExtensionShutdownHost(host), teardownSteps, processCleanup);
}

export async function teardownOwnedExtensionHost(
  host: OwnedExtensionShutdownHost,
  teardownSteps: readonly (() => Promise<void>)[],
  processCleanup?: OwnedMsnProcessCleanup
): Promise<void> {
  const shutdown = bindOwnedCachedShutdown(host);
  const errors: unknown[] = [];
  let capturedProcesses = processCleanup?.captureAtTeardown === false;
  if (processCleanup && processCleanup.captureAtTeardown !== false) {
    try {
      await processCleanup.capture();
      capturedProcesses = true;
    } catch (error) {
      errors.push(error);
    }
  }
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
  if (processCleanup && capturedProcesses) {
    try {
      await processCleanup.finalize();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    logRetainedTeardownErrors(host.familyLabel, errors);
    throw new AggregateError(errors, `${host.familyLabel} host teardown failed; teardown and deactivation errors were retained`);
  }
}

function logRetainedTeardownErrors(familyLabel: string, errors: readonly unknown[]): void {
  errors.forEach((error, index) => {
    console.error(
      `[owned-extension-shutdown] retained-error ${JSON.stringify({
        family: familyLabel,
        index: index + 1,
        error: describeRetainedError(error),
      })}`
    );
  });
}

function describeRetainedError(error: unknown): Record<string, unknown> {
  if (error instanceof AggregateError) {
    return {
      name: 'AggregateError',
      message: sanitizeRetainedErrorText(error.message),
      errors: error.errors.map(describeRetainedError),
    };
  }
  const reason =
    typeof error === 'object' && error !== null && 'reason' in error && typeof error.reason === 'string' ? error.reason : undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      ...(reason ? { reason } : {}),
      message: sanitizeRetainedErrorText(error.message),
    };
  }
  return {
    name: 'NonError',
    message: sanitizeRetainedErrorText(String(error)),
  };
}

function sanitizeRetainedErrorText(value: string): string {
  return sanitizeCommonSecretForms(value)
    .replace(/("Authorization"\s*:\s*")[^"]*(")/gi, '$1<redacted>$2')
    .replace(/(\bAuthorization\s*:\s*)[^\r\n,;"'}]+/gi, '$1<redacted>')
    .replace(
      /([?&](?:access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|client[_-]?assertion|api[_-]?key|account[_-]?key|sig|signature|token|code|key|secret|password|sas)=)[^&\s"'<>]+/gi,
      '$1<redacted>'
    )
    .replace(
      /("(?:access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|client[_-]?assertion|api[_-]?key|account[_-]?key|password|secret|sas)"\s*:\s*")[^"]*(")/gi,
      '$1<redacted>$2'
    );
}

function sanitizeCommonSecretForms(value: string): string {
  return value
    .replace(/([?&](?:sig|token|code|key|secret|password)=)[^&\s]+/gi, '$1<redacted>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer <redacted>')
    .replace(/(Authorization\s*:\s*)[^\s,;]+/gi, '$1<redacted>')
    .replace(/("(?:accessToken|refreshToken|clientSecret|password|secret)"\s*:\s*")[^"]*(")/gi, '$1<redacted>$2');
}

/** Scope validation for existing VS Code handles; never OS PID admission. */
export function assertOwnedMsnHandleScopes(
  host: OwnedMsnShutdownHost,
  invocation: string,
  handles: {
    tasks: readonly { workspacePath: string | undefined; name: string }[];
    session?: { workspacePath: string | undefined; invocation: unknown };
  }
): void {
  const extensionHost = asOwnedExtensionShutdownHost(host);
  assertOwnedWorkspaceHost(extensionHost);
  assert.ok(invocation, 'Owned MSN handles require the current invocation marker');
  const roots = new Set(host.workspaceRoots.map((root) => normalizePath(fs.realpathSync(root))));
  const assertScope = (workspacePath: string | undefined): void => {
    assert.ok(workspacePath && roots.has(normalizePath(fs.realpathSync(workspacePath))), 'Refusing to stop a foreign MSN workspace handle');
  };
  for (const task of handles.tasks) {
    assertScope(task.workspacePath);
    assert.strictEqual(task.name, 'func: host start', 'Refusing to terminate a foreign MSN task');
  }
  if (handles.session) {
    assertScope(handles.session.workspacePath);
    assert.strictEqual(handles.session.invocation, invocation, 'Refusing to stop a foreign MSN debug session');
  }
}

function bindOwnedCachedShutdown(host: OwnedExtensionShutdownHost): () => Promise<void> {
  const canonicalParent = assertOwnedWorkspaceHost(host);
  assert.ok(
    typeof host.extension.main === 'string' && host.extension.main.length > 0 && !path.isAbsolute(host.extension.main),
    `${host.familyLabel} shutdown requires the extension-relative main entry`
  );
  const extensionRoot = fs.realpathSync(host.extension.extensionPath);
  const mainCandidate = path.resolve(host.extension.extensionPath, host.extension.main);
  assertInsideDirectory(host.extension.extensionPath, mainCandidate, `${host.familyLabel} extension main escapes the extension directory`);
  const resolvedEntry = host.resolveEntry(mainCandidate);
  const canonicalEntry = fs.realpathSync(resolvedEntry);
  const configuredEntry = path.extname(mainCandidate) ? mainCandidate : `${mainCandidate}.js`;
  assert.ok(
    sameCanonicalFile(configuredEntry, canonicalEntry),
    `${host.familyLabel} resolved entry does not match the configured main file`
  );
  assert.ok(fs.lstatSync(canonicalEntry).isFile(), `${host.familyLabel} extension main must be a file`);
  assertInsideDirectory(extensionRoot, canonicalEntry, `${host.familyLabel} extension main resolves outside the extension directory`);
  const selection = host.cachedEntry(resolvedEntry);
  assert.ok(selection?.entry?.loaded, `${host.familyLabel} shutdown requires the already-loaded original extension entry`);
  const entry = selection.entry;
  const originalCacheKey = selection.cacheKey;
  assert.ok(
    normalizePath(originalCacheKey) === normalizePath(resolvedEntry),
    `${host.familyLabel} selected cache key does not match the resolved main entry`
  );
  assert.ok(
    sameCanonicalFile(entry.filename, canonicalEntry) && sameCanonicalFile(entry.id, canonicalEntry),
    `${host.familyLabel} cached extension entry identity does not match the verified main file`
  );
  assert.ok(isExtensionEntryExports(entry.exports), `${host.familyLabel} cached entry must expose the original lifecycle functions`);
  const originalExports = entry.exports;
  const originalActivate = originalExports.activate;
  const originalDeactivate = originalExports.deactivate;
  const originalMain = host.extension.main;

  const assertOriginalEntry = (): void => {
    assert.ok(
      normalizePath(assertOwnedWorkspaceHost(host)) === normalizePath(canonicalParent) &&
        normalizePath(fs.realpathSync(host.extension.extensionPath)) === normalizePath(extensionRoot) &&
        host.extension.main === originalMain,
      `${host.familyLabel} host ownership changed during teardown`
    );
    const currentSelection = host.cachedEntry(resolvedEntry);
    assert.ok(
      currentSelection?.cacheKey === originalCacheKey &&
        currentSelection.entry === entry &&
        entry.loaded &&
        sameCanonicalFile(entry.filename, canonicalEntry) &&
        sameCanonicalFile(entry.id, canonicalEntry) &&
        entry.exports === originalExports &&
        originalExports.activate === originalActivate &&
        originalExports.deactivate === originalDeactivate,
      `${host.familyLabel} cached lifecycle exports changed during teardown`
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

function assertOwnedWorkspaceHost(host: OwnedExtensionShutdownHost): string {
  assert.ok(host.dedicatedRunHost, `${host.familyLabel} shutdown requires the dedicated run-phase host`);
  assert.ok(
    host.extension.id === 'ms-azuretools.vscode-azurelogicapps' && host.extension.isActive,
    `${host.familyLabel} shutdown requires the active Logic Apps extension`
  );
  assert.ok(
    path.basename(host.workspaceParent).toLowerCase().startsWith(`${host.workspaceParentPrefix.toLowerCase()}-`) &&
      /^[a-z0-9]+$/i.test(path.basename(host.workspaceParent).slice(host.workspaceParentPrefix.length + 1)),
    `${host.familyLabel} shutdown requires the runner-created workspace parent`
  );
  const parentStat = fs.lstatSync(host.workspaceParent);
  assert.ok(parentStat.isDirectory() && !parentStat.isSymbolicLink(), `${host.familyLabel} workspace parent must be a real directory`);
  const canonicalParent = fs.realpathSync(host.workspaceParent);
  assert.ok(host.workspaceRoots.length > 0, `${host.familyLabel} shutdown requires workspace roots`);
  for (const root of host.workspaceRoots) {
    assert.ok(fs.statSync(root).isDirectory(), `${host.familyLabel} workspace roots must be directories`);
    assertInsideDirectory(canonicalParent, fs.realpathSync(root), `${host.familyLabel} workspace root escapes the runner-owned parent`);
  }
  return canonicalParent;
}

function asOwnedExtensionShutdownHost(host: OwnedMsnShutdownHost): OwnedExtensionShutdownHost {
  return {
    get dedicatedRunHost() {
      return host.dedicatedMsnRunHost;
    },
    familyLabel: 'Owned MSN',
    workspaceParentPrefix: 'la-e2e-cli-msn-weather-lifecycle',
    get extension() {
      return host.extension;
    },
    get workspaceParent() {
      return host.workspaceParent;
    },
    get workspaceRoots() {
      return host.workspaceRoots;
    },
    resolveEntry: (filename) => host.resolveEntry(filename),
    cachedEntry: (filename) => host.cachedEntry(filename),
  };
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

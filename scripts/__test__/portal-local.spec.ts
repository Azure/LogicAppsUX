import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  acquirePortalLock,
  assertManifestsUnchanged,
  discoverPortalPackages,
  parseArguments,
  releasePortalLock,
  resolvePackageManagerInvocation,
  resolvePortalReactDirectory,
  snapshotManifests,
} from '../portal-local.js';

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-local-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writePortalManifest(directory: string, dependencies = {}): void {
  writeJson(path.join(directory, 'package.json'), {
    dependencies,
    scripts: {
      'build-hybrid:dev': 'build',
      serve: 'serve',
    },
  });
}

function writeWorkspacePackage(root: string, directoryName: string, name: string, dependencies: Record<string, string> = {}): void {
  writeJson(path.join(root, 'libs', directoryName, 'package.json'), {
    dependencies,
    name,
    scripts: { 'build:lib': 'build' },
    version: '1.2.3',
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe('parseArguments', () => {
  it('accepts a Portal worktree and local build options', () => {
    expect(parseArguments(['--portal-root', 'D:\\portal-worktree', '--no-serve', '--dry-run'], {})).toEqual({
      dryRun: true,
      portalRoot: 'D:\\portal-worktree',
      serve: false,
    });
  });

  it('uses the environment default and rejects missing paths', () => {
    expect(parseArguments([], { LOGIC_APPS_PORTAL_ROOT: 'D:\\portal' })).toMatchObject({
      portalRoot: 'D:\\portal',
    });
    expect(() => parseArguments([], {})).toThrow('Provide --portal-root');
  });

  it('rejects --portal-root without a value', () => {
    expect(() => parseArguments(['--portal-root'], {})).toThrow('Missing value for --portal-root');
    expect(() => parseArguments(['--portal-root='], {})).toThrow('Missing value for --portal-root');
    expect(() => parseArguments(['--portal-root', '--dry-run'], {})).toThrow('Missing value for --portal-root');
  });
});

describe('resolvePortalReactDirectory', () => {
  it('accepts either a Portal worktree root or its React directory', () => {
    const portalRoot = createTemporaryDirectory();
    const reactDirectory = path.join(portalRoot, 'src', 'Extension', 'Client', 'React');
    writePortalManifest(reactDirectory);

    expect(resolvePortalReactDirectory(portalRoot)).toBe(reactDirectory);
    expect(resolvePortalReactDirectory(reactDirectory)).toBe(reactDirectory);
  });

  it('rejects directories without the Portal build scripts', () => {
    const portalRoot = createTemporaryDirectory();
    writeJson(path.join(portalRoot, 'package.json'), {});

    expect(() => resolvePortalReactDirectory(portalRoot)).toThrow('Could not find the Portal React project');
  });
});

describe('discoverPortalPackages', () => {
  it('selects Portal dependencies and orders their local workspace dependencies first', () => {
    const logicAppsUxRoot = createTemporaryDirectory();
    const portalReactDirectory = createTemporaryDirectory();
    writeWorkspacePackage(logicAppsUxRoot, 'shared', '@microsoft/logic-apps-shared');
    writeWorkspacePackage(logicAppsUxRoot, 'ui', '@microsoft/designer-ui', {
      '@microsoft/logic-apps-shared': 'workspace:*',
    });
    writeWorkspacePackage(logicAppsUxRoot, 'unused', '@microsoft/unused');
    writePortalManifest(portalReactDirectory, {
      '@microsoft/designer-ui': '^1.0.0',
    });

    expect(discoverPortalPackages(logicAppsUxRoot, portalReactDirectory).map(({ name }) => name)).toEqual([
      '@microsoft/logic-apps-shared',
      '@microsoft/designer-ui',
    ]);
  });
});

describe('Portal manifest preservation', () => {
  it('detects package manifest and lockfile changes', () => {
    const portalReactDirectory = createTemporaryDirectory();
    writePortalManifest(portalReactDirectory);
    const lockfilePath = path.join(portalReactDirectory, 'package-lock.json');
    fs.writeFileSync(lockfilePath, '{"lockfileVersion":3}\n');
    const snapshot = snapshotManifests(portalReactDirectory);

    expect(() => assertManifestsUnchanged(snapshot)).not.toThrow();
    fs.appendFileSync(lockfilePath, 'changed');
    expect(() => assertManifestsUnchanged(snapshot)).toThrow('changed during local package installation');
  });
});

describe('Portal worktree locking', () => {
  it('prevents concurrent helpers from targeting the same Portal worktree', () => {
    const portalReactDirectory = createTemporaryDirectory();
    const lock = acquirePortalLock(portalReactDirectory);

    expect(() => acquirePortalLock(portalReactDirectory)).toThrow('already running for this worktree');
    releasePortalLock(lock);

    const nextLock = acquirePortalLock(portalReactDirectory);
    releasePortalLock(nextLock);
  });
});

describe('Windows package manager invocation', () => {
  it('runs JavaScript pnpm entrypoints through Node', () => {
    const directory = createTemporaryDirectory();
    const pnpmScript = path.join(directory, 'pnpm.cjs');
    fs.writeFileSync(pnpmScript, '');

    expect(resolvePackageManagerInvocation(pnpmScript, 'node.exe')).toEqual({
      argsPrefix: [pnpmScript],
      executable: 'node.exe',
    });
  });

  it('runs native pnpm executables directly', () => {
    const directory = createTemporaryDirectory();
    const pnpmExecutable = path.join(directory, 'pnpm.exe');
    fs.writeFileSync(pnpmExecutable, '');

    expect(resolvePackageManagerInvocation(pnpmExecutable, 'node.exe')).toEqual({
      argsPrefix: [],
      executable: pnpmExecutable,
    });
  });
});

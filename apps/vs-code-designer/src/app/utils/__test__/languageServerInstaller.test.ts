import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDependencyPathValue } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { ensureRuntimeDependenciesDir } from '../binaries';
import { type LspAssetsManifest, lspServerDirectoryName, lspServerRevisionMarkerName } from '../languageServerAssetConstants';
import { formatLockedFileError, installLogicAppsLanguageServerAssets } from '../languageServerInstaller';

const assetManifest: LspAssetsManifest = {
  serverArchive: 'test-language-server.zip',
  serverSha256: 'a'.repeat(64),
};

const mocks = vi.hoisted(() => {
  const extractAllTo = vi.fn();
  const admZip = vi.fn(() => ({ extractAllTo }));
  return {
    admZip,
    extractAllTo,
    pathExists: vi.fn(),
    readFile: vi.fn(),
    readJson: vi.fn(),
    readdir: vi.fn(),
    remove: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('adm-zip', () => ({
  default: mocks.admZip,
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  readFile: mocks.readFile,
  readJson: mocks.readJson,
  readdir: mocks.readdir,
  remove: mocks.remove,
  writeFile: mocks.writeFile,
}));

vi.mock('../binaries', () => ({
  ensureRuntimeDependenciesDir: vi.fn(async () => 'D:\\runtime-dependencies'),
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    languageClient: undefined,
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('installLogicAppsLanguageServerAssets', () => {
  const targetDirectory = 'D:\\runtime-dependencies';
  const lspServerPath = path.join(targetDirectory, lspServerDirectoryName);
  const lspServerDllPath = path.join(lspServerPath, 'LogicAppsLanguageServer.dll');
  const revisionMarker = path.join(targetDirectory, lspServerRevisionMarkerName);
  const staleVersionedLspFolder = path.join(targetDirectory, 'LSPServer-1778130324219');
  let lspServerExtracted = false;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureRuntimeDependenciesDir).mockResolvedValue(targetDirectory);
    mocks.extractAllTo.mockImplementation(() => {
      lspServerExtracted = true;
    });
    mocks.pathExists.mockImplementation(async (filePath: string) => {
      return filePath.endsWith(path.join(lspServerDirectoryName, 'LogicAppsLanguageServer.dll')) && lspServerExtracted;
    });
    mocks.readFile.mockResolvedValue('old-revision');
    mocks.readJson.mockResolvedValue(assetManifest);
    mocks.readdir.mockResolvedValue([]);
    mocks.remove.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
    lspServerExtracted = false;
    ext.languageClient = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => {
      return (
        existingPaths.has(filePath) ||
        (filePath.endsWith(path.join(lspServerDirectoryName, 'LogicAppsLanguageServer.dll')) && lspServerExtracted)
      );
    });
  }

  it('rejects an invalid asset manifest before changing installed files', async () => {
    mocks.readJson.mockResolvedValue({
      ...assetManifest,
      serverArchive: '../unexpected.zip',
    });

    await expect(installLogicAppsLanguageServerAssets()).rejects.toThrow('language server asset manifest');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
  });

  it('extracts the server when its target directory is missing', async () => {
    setExistingPaths([]);

    await installLogicAppsLanguageServerAssets();

    expect(ensureRuntimeDependenciesDir).toHaveBeenCalled();
    expect(mocks.admZip).toHaveBeenCalledWith(expect.stringContaining(assetManifest.serverArchive));
    expect(mocks.extractAllTo).toHaveBeenCalledWith(targetDirectory, true, true);
    expect(mocks.writeFile).toHaveBeenCalledWith(revisionMarker, assetManifest.serverSha256);
  });

  it('uses the default dependencies path when the setting is unset', async () => {
    vi.mocked(ensureRuntimeDependenciesDir).mockResolvedValue(defaultDependencyPathValue);

    await installLogicAppsLanguageServerAssets();

    expect(mocks.extractAllTo).toHaveBeenCalledWith(defaultDependencyPathValue, true, true);
  });

  it('refreshes the server when its revision marker is missing', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath]);

    await installLogicAppsLanguageServerAssets();

    expect(mocks.remove).toHaveBeenCalledWith(lspServerPath);
    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
  });

  it('refreshes the server when its revision differs', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, revisionMarker]);

    await installLogicAppsLanguageServerAssets();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(revisionMarker, assetManifest.serverSha256);
  });

  it('does not refresh a current server installation', async () => {
    setExistingPaths([lspServerDllPath, revisionMarker]);
    mocks.readFile.mockResolvedValue(assetManifest.serverSha256);

    await installLogicAppsLanguageServerAssets();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it('cleans stale versioned server folders after extraction', async () => {
    setExistingPaths([lspServerPath]);
    mocks.readdir.mockResolvedValue(['LSPServer', 'LSPServer-1778130324219', 'LanguageServerLogicApps']);

    await installLogicAppsLanguageServerAssets();

    expect(mocks.remove).toHaveBeenCalledWith(staleVersionedLspFolder);
  });

  it('stops the language client before replacing server files', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    ext.languageClient = { stop } as any;

    await installLogicAppsLanguageServerAssets();

    expect(stop).toHaveBeenCalledOnce();
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(mocks.extractAllTo.mock.invocationCallOrder[0]);
    expect(ext.languageClient).toBeUndefined();
  });

  it('does not stop the language client when the installed server is current', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    ext.languageClient = { stop } as any;
    setExistingPaths([lspServerDllPath, revisionMarker]);
    mocks.readFile.mockResolvedValue(assetManifest.serverSha256);

    await installLogicAppsLanguageServerAssets();

    expect(stop).not.toHaveBeenCalled();
  });

  it('retries locked server directory removal', async () => {
    vi.useFakeTimers();
    setExistingPaths([lspServerPath]);
    const lockedError = Object.assign(new Error('locked'), { code: 'EPERM' });
    mocks.remove.mockRejectedValueOnce(lockedError).mockResolvedValue(undefined);

    const installPromise = installLogicAppsLanguageServerAssets();
    await vi.advanceTimersByTimeAsync(2_000);
    await installPromise;

    expect(mocks.remove).toHaveBeenCalledWith(lspServerPath);
    expect(mocks.remove.mock.calls.filter(([filePath]) => filePath === lspServerPath)).toHaveLength(2);
  });

  it('wraps extraction errors with server context', async () => {
    mocks.extractAllTo.mockImplementation(() => {
      throw new Error('zip failed');
    });

    await expect(installLogicAppsLanguageServerAssets()).rejects.toThrow('Error extracting LSP server: Error: zip failed');
  });

  it('reports actionable guidance for locked server files', () => {
    const error = Object.assign(new Error('resource busy'), { code: 'EBUSY' });

    expect(formatLockedFileError(error)).toContain('stop the dotnet process running LogicAppsLanguageServer.dll');
  });
});

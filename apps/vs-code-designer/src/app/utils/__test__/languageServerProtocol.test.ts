import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDependencyPathValue } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { ensureRuntimeDependenciesDir } from '../binaries';
import { formatLockedFileError, installLSPServer } from '../languageServerProtocol';
import { lspServerAssetRevision, lspServerRevisionMarkerName } from '../languageServerProtocolConstants';

const mocks = vi.hoisted(() => {
  const extractAllTo = vi.fn();
  const admZip = vi.fn(() => ({ extractAllTo }));

  return {
    admZip,
    extractAllTo,
    pathExists: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    remove: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('adm-zip', () => ({
  default: mocks.admZip,
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
  remove: mocks.remove,
  writeFile: mocks.writeFile,
}));

vi.mock('../binaries', () => ({
  ensureRuntimeDependenciesDir: vi.fn(async () => 'D:\\runtime-dependencies'),
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    languageClient: undefined,
  },
}));

describe('installLSPServer', () => {
  const targetDirectory = 'D:\\runtime-dependencies';
  const lspServerPath = path.join(targetDirectory, 'LSPServer');
  const lspServerDllPath = path.join(lspServerPath, 'SdkLspServer.dll');
  const lspRevisionMarker = path.join(targetDirectory, lspServerRevisionMarkerName);
  const staleVersionedLspFolder = path.join(targetDirectory, 'LSPServer-1778130324219');
  const oldRevision = '0';
  let lspServerExtracted = false;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractAllTo.mockReset();
    mocks.extractAllTo.mockImplementation(() => {
      lspServerExtracted = true;
    });
    mocks.pathExists.mockResolvedValue(false);
    mocks.readdir.mockResolvedValue([]);
    mocks.readFile.mockResolvedValue(oldRevision);
    mocks.remove.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
    lspServerExtracted = false;
    ext.languageClient = undefined;
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => {
      return existingPaths.has(filePath) || (filePath.endsWith(path.join('LSPServer', 'SdkLspServer.dll')) && lspServerExtracted);
    });
  }

  it('extracts the LSP server when the target is missing', async () => {
    setExistingPaths([]);

    await installLSPServer();

    expect(ensureRuntimeDependenciesDir).toHaveBeenCalled();
    expect(mocks.admZip).toHaveBeenCalledWith(expect.stringContaining('LSPServer.zip'));
    expect(mocks.extractAllTo).toHaveBeenCalledWith(targetDirectory, true, true);
    expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
  });

  it('uses the default dependencies path when configured dependencies are unavailable', async () => {
    vi.mocked(ensureRuntimeDependenciesDir).mockResolvedValue(defaultDependencyPathValue);
    setExistingPaths([]);

    await installLSPServer();

    expect(mocks.extractAllTo).toHaveBeenCalledWith(defaultDependencyPathValue, true, true);
  });

  it('refreshes the server when the revision marker is missing', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath]);

    await installLSPServer();

    expect(mocks.remove).toHaveBeenCalledWith(lspServerPath);
    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
  });

  it('refreshes the server when its asset revision changes', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, lspRevisionMarker]);

    await installLSPServer();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
  });

  it('does not refresh the server when its revision is current', async () => {
    setExistingPaths([lspServerDllPath, lspRevisionMarker]);
    mocks.readFile.mockResolvedValue(lspServerAssetRevision);

    await installLSPServer();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it('cleans stale versioned LSP folders after refreshing', async () => {
    setExistingPaths([lspServerPath]);
    mocks.readdir.mockResolvedValue(['LSPServer', 'LSPServer-1778130324219', 'OtherFolder']);

    await installLSPServer();

    expect(mocks.remove).toHaveBeenCalledWith(staleVersionedLspFolder);
  });

  it('wraps extraction errors with LSP server context', async () => {
    mocks.extractAllTo.mockImplementation(() => {
      throw new Error('zip failed');
    });

    await expect(installLSPServer()).rejects.toThrow('Error extracting LSP server: Error: zip failed');
  });

  it('adds actionable guidance for locked LSP files during stable folder removal', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    setExistingPaths([lspServerPath]);
    mocks.remove.mockRejectedValue(lockedError);

    try {
      const installPromise = installLSPServer();
      const expectation = expect(installPromise).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
      await vi.advanceTimersByTimeAsync(4000);
      await expectation;
      expect(mocks.remove).toHaveBeenCalledTimes(3);
      expect(mocks.extractAllTo).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries locked-file errors during extraction', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    mocks.extractAllTo.mockImplementation(() => {
      throw lockedError;
    });

    try {
      const installPromise = installLSPServer();
      const expectation = expect(installPromise).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
      await vi.advanceTimersByTimeAsync(4000);
      await expectation;
      expect(mocks.extractAllTo).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries a transient EPERM error during extraction', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error(`EPERM: operation not permitted, mkdir '${lspServerPath}'`), {
      code: 'EPERM',
    });
    let attempts = 0;
    mocks.extractAllTo.mockImplementation(() => {
      attempts += 1;
      if (attempts === 1) {
        throw lockedError;
      }
      lspServerExtracted = true;
    });
    setExistingPaths([]);

    try {
      const installPromise = installLSPServer();
      await vi.advanceTimersByTimeAsync(2000);
      await installPromise;
      expect(mocks.extractAllTo).toHaveBeenCalledTimes(2);
      expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
    } finally {
      vi.useRealTimers();
    }
  });

  it('formatLockedFileError recognizes EPERM', () => {
    const lockedError = Object.assign(new Error("EPERM: operation not permitted, unlink 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EPERM',
    });

    expect(formatLockedFileError(lockedError)).toContain('stop the dotnet process running SdkLspServer.dll');
  });

  it('retries EPERM errors while removing the existing server', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error("EPERM: operation not permitted, unlink 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EPERM',
    });
    setExistingPaths([lspServerPath]);
    mocks.remove.mockRejectedValueOnce(lockedError).mockRejectedValueOnce(lockedError).mockResolvedValue(undefined);

    try {
      const installPromise = installLSPServer();
      await vi.advanceTimersByTimeAsync(4000);
      await installPromise;
      const removeLspCalls = mocks.remove.mock.calls.filter(([filePath]) => filePath === lspServerPath);
      expect(removeLspCalls).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops a running language client before replacing the LSP server', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    ext.languageClient = { stop } as any;
    setExistingPaths([]);

    await installLSPServer();

    expect(stop).toHaveBeenCalledOnce();
    expect(ext.languageClient).toBeUndefined();
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(mocks.extractAllTo.mock.invocationCallOrder[0]);
  });

  it('does not extract when stopping the language client fails', async () => {
    const stop = vi.fn().mockRejectedValue(new Error('stop failed'));
    ext.languageClient = { stop } as any;

    await expect(installLSPServer()).rejects.toThrow('Error stopping LSP server before update: Error: stop failed');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(ext.languageClient).toBeDefined();
  });
});

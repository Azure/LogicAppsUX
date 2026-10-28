import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDependencyPathValue, lspDirectory } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { ensureRuntimeDependenciesDir } from '../binaries';
import { formatLockedFileError, installLSPSDK } from '../languageServerProtocol';
import {
  lspSdkAssetRevision,
  lspSdkRevisionMarkerName,
  lspServerAssetRevision,
  lspServerRevisionMarkerName,
} from '../languageServerProtocolConstants';
import path from 'path';

const mocks = vi.hoisted(() => {
  const extractAllTo = vi.fn();
  const admZip = vi.fn(() => ({ extractAllTo }));

  return {
    admZip,
    copyFile: vi.fn(),
    ensureDir: vi.fn(),
    extractAllTo,
    getGlobalSetting: vi.fn(),
    pathExists: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    remove: vi.fn(),
    stat: vi.fn(),
    updateGlobalSetting: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('adm-zip', () => ({
  default: mocks.admZip,
}));

vi.mock('fs-extra', () => ({
  copyFile: mocks.copyFile,
  ensureDir: mocks.ensureDir,
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
  remove: mocks.remove,
  stat: mocks.stat,
  writeFile: mocks.writeFile,
}));

vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: mocks.getGlobalSetting,
  updateGlobalSetting: mocks.updateGlobalSetting,
}));

vi.mock('../binaries', () => ({
  ensureRuntimeDependenciesDir: vi.fn(async () => 'D:\\runtime-dependencies'),
}));
vi.mock('../../../extensionVariables', () => ({
  ext: {
    languageClient: undefined,
  },
}));

describe('installLSPSDK', () => {
  const targetDirectory = 'D:\\runtime-dependencies';
  const lspServerPath = path.join(targetDirectory, 'LSPServer');
  const lspServerDllPath = path.join(lspServerPath, 'SdkLspServer.dll');
  const lspRevisionMarker = path.join(targetDirectory, lspServerRevisionMarkerName);
  const sdkDirectoryPath = path.join(targetDirectory, lspDirectory);
  const sdkRevisionMarker = path.join(targetDirectory, lspSdkRevisionMarkerName);
  const sdkPackageName = 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg';
  const sdkDestinationFile = path.join(sdkDirectoryPath, sdkPackageName);
  const legacyLspVersionMarker = path.join(targetDirectory, '.lspserver-version');
  const legacyLspPathMarker = path.join(targetDirectory, '.lspserver-path');
  const legacySdkVersionMarker = path.join(targetDirectory, '.lspsdk-version');
  const staleVersionedLspFolder = path.join(targetDirectory, 'LSPServer-1778130324219');
  const oldRevision = '0';
  let lspServerExtracted = false;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractAllTo.mockReset();
    mocks.getGlobalSetting.mockReturnValue(targetDirectory);
    mocks.copyFile.mockResolvedValue(undefined);
    mocks.ensureDir.mockResolvedValue(undefined);
    mocks.extractAllTo.mockImplementation(() => {
      lspServerExtracted = true;
    });
    mocks.pathExists.mockResolvedValue(false);
    mocks.readdir.mockResolvedValue([]);
    mocks.remove.mockResolvedValue(undefined);
    mocks.updateGlobalSetting.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
    lspServerExtracted = false;
    configureReadFileMocks();
    ext.languageClient = undefined;
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => {
      return existingPaths.has(filePath) || (filePath.endsWith(path.join('LSPServer', 'SdkLspServer.dll')) && lspServerExtracted);
    });
  }

  function configureReadFileMocks(options?: {
    lspRevisionMarker?: string;
    sdkRevisionMarker?: string;
  }): void {
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === lspRevisionMarker) {
        return options?.lspRevisionMarker ?? oldRevision;
      }
      if (filePath === sdkRevisionMarker) {
        return options?.sdkRevisionMarker ?? oldRevision;
      }
      return '';
    });
  }

  it('extracts the LSP server and copies the SDK when target directories are missing', async () => {
    setExistingPaths([]);

    await installLSPSDK();

    expect(ensureRuntimeDependenciesDir).toHaveBeenCalled();
    expect(mocks.admZip).toHaveBeenCalledWith(expect.stringContaining('LSPServer.zip'));
    expect(mocks.extractAllTo).toHaveBeenCalledWith(targetDirectory, true, true);
    expect(mocks.ensureDir).toHaveBeenCalledWith(sdkDirectoryPath);
    expect(mocks.copyFile).toHaveBeenCalledWith(expect.stringContaining(sdkPackageName), sdkDestinationFile);
    expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkRevisionMarker, lspSdkAssetRevision);
  });

  it('defaults the dependencies path before extracting LSP assets when the setting is unset', async () => {
    vi.mocked(ensureRuntimeDependenciesDir).mockResolvedValue(defaultDependencyPathValue);
    const defaultLspServerPath = path.join(defaultDependencyPathValue, 'LSPServer');
    setExistingPaths([]);

    await installLSPSDK();

    expect(ensureRuntimeDependenciesDir).toHaveBeenCalled();
    expect(mocks.extractAllTo).toHaveBeenCalledWith(defaultDependencyPathValue, true, true);
  });

  it('updates both assets when target files exist but revision markers are missing', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, sdkDestinationFile]);

    await installLSPSDK();

    expect(mocks.remove).toHaveBeenCalledWith(lspServerPath);
    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
  });

  it('updates both assets when asset revisions differ from their stored markers', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, lspRevisionMarker, sdkDestinationFile, sdkRevisionMarker]);

    await installLSPSDK();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkRevisionMarker, lspSdkAssetRevision);
  });

  it('does not update assets when revision markers and installed SDK package are current', async () => {
    setExistingPaths([lspServerDllPath, lspRevisionMarker, sdkDestinationFile, sdkRevisionMarker]);
    configureReadFileMocks({
      lspRevisionMarker: lspServerAssetRevision,
      sdkRevisionMarker: lspSdkAssetRevision,
    });

    await installLSPSDK();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.copyFile).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(ensureRuntimeDependenciesDir).toHaveBeenCalled();
  });

  it('treats legacy mtime markers as stale and refreshes assets', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, legacyLspVersionMarker, sdkDestinationFile, legacySdkVersionMarker]);
    await installLSPSDK();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkRevisionMarker, lspSdkAssetRevision);
  });

  it('cleans stale versioned LSP folders after refreshing the stable LSP folder', async () => {
    setExistingPaths([lspServerPath]);
    mocks.readdir.mockResolvedValue(['LSPServer', 'LSPServer-1778130324219', 'LanguageServerLogicApps']);

    await installLSPSDK();

    expect(mocks.remove).toHaveBeenCalledWith(staleVersionedLspFolder);
  });

  it('wraps extraction errors with LSP server context', async () => {
    mocks.extractAllTo.mockImplementation(() => {
      throw new Error('zip failed');
    });

    await expect(installLSPSDK()).rejects.toThrow('Error extracting LSP server: Error: zip failed');
    expect(mocks.copyFile).not.toHaveBeenCalled();
  });

  it('adds actionable guidance for locked LSP files during stable folder removal', async () => {
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    setExistingPaths([lspServerPath]);
    mocks.remove.mockImplementation(async (filePath: string) => {
      if (filePath === lspServerPath) {
        throw lockedError;
      }
    });

    await expect(installLSPSDK()).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.copyFile).not.toHaveBeenCalled();
  });

  it('adds actionable guidance for locked LSP files during extraction', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    mocks.extractAllTo.mockImplementation(() => {
      throw lockedError;
    });

    try {
      const installPromise = installLSPSDK();
      const expectation = expect(installPromise).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
      await vi.advanceTimersByTimeAsync(4000);

      await expectation;
      expect(mocks.extractAllTo).toHaveBeenCalledTimes(3);
      expect(mocks.copyFile).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries when extracting LSP server hits EPERM creating the LSPServer directory', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error(`EPERM: operation not permitted, mkdir '${path.join(targetDirectory, 'LSPServer')}'`), {
      code: 'EPERM',
      path: path.join(targetDirectory, 'LSPServer'),
      syscall: 'mkdir',
    });
    let extractionSucceeded = false;
    let extractAttempts = 0;
    mocks.extractAllTo.mockImplementation(() => {
      extractAttempts += 1;
      if (extractAttempts === 1) {
        throw lockedError;
      }

      extractionSucceeded = true;
    });
    mocks.pathExists.mockImplementation(async (filePath: string) => {
      return filePath.endsWith('SdkLspServer.dll') && extractionSucceeded;
    });

    try {
      const installPromise = installLSPSDK();
      await vi.advanceTimersByTimeAsync(2000);
      await installPromise;

      expect(mocks.extractAllTo).toHaveBeenCalledTimes(2);
      expect(mocks.writeFile).toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
      expect(mocks.copyFile).toHaveBeenCalledWith(expect.stringContaining(sdkPackageName), sdkDestinationFile);
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces actionable guidance when EPERM mkdir persists during LSPServer extraction', async () => {
    vi.useFakeTimers();
    const lockedError = Object.assign(new Error(`EPERM: operation not permitted, mkdir '${path.join(targetDirectory, 'LSPServer')}'`), {
      code: 'EPERM',
      path: path.join(targetDirectory, 'LSPServer'),
      syscall: 'mkdir',
    });
    mocks.extractAllTo.mockImplementation(() => {
      throw lockedError;
    });

    try {
      const installPromise = installLSPSDK();
      const expectation = expect(installPromise).rejects.toThrow(
        /Error extracting LSP server:.*stop the dotnet process running SdkLspServer.dll/
      );
      await vi.advanceTimersByTimeAsync(4000);

      await expectation;
      expect(mocks.extractAllTo).toHaveBeenCalledTimes(3);
      expect(mocks.copyFile).not.toHaveBeenCalled();
      expect(mocks.writeFile).not.toHaveBeenCalledWith(lspRevisionMarker, lspServerAssetRevision);
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

  it('installLSPSDK retries on EPERM', async () => {
    vi.useFakeTimers();
    try {
      const lockedError = Object.assign(new Error("EPERM: operation not permitted, unlink 'ICSharpCode.SharpZipLib.dll'"), {
        code: 'EPERM',
      });
      setExistingPaths([lspServerPath]);
      mocks.remove.mockRejectedValueOnce(lockedError).mockRejectedValueOnce(lockedError).mockResolvedValue(undefined);

      const installPromise = installLSPSDK();
      await vi.advanceTimersByTimeAsync(4000);
      await installPromise;

      const removeLspCalls = mocks.remove.mock.calls.filter(([filePath]) => filePath === lspServerPath);
      expect(removeLspCalls).toHaveLength(3);
      expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops a running language client before replacing LSP assets', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    ext.languageClient = { stop } as any;
    setExistingPaths([]);

    await installLSPSDK();

    expect(stop).toHaveBeenCalledOnce();
    expect(ext.languageClient).toBeUndefined();
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(mocks.extractAllTo.mock.invocationCallOrder[0]);
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(mocks.copyFile.mock.invocationCallOrder[0]);
  });

  it('does not extract or copy assets when stopping the language client fails', async () => {
    const stop = vi.fn().mockRejectedValue(new Error('stop failed'));
    ext.languageClient = { stop } as any;

    await expect(installLSPSDK()).rejects.toThrow('Error stopping LSP server before update: Error: stop failed');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.copyFile).not.toHaveBeenCalled();
    expect(ext.languageClient).toBeDefined();
  });

  it('wraps SDK copy errors with SDK context', async () => {
    setExistingPaths([lspServerDllPath, lspRevisionMarker]);
    configureReadFileMocks({
      lspRevisionMarker: lspServerAssetRevision,
    });
    mocks.copyFile.mockRejectedValue(new Error('copy failed'));

    await expect(installLSPSDK()).rejects.toThrow('Error copying sdk: Error: copy failed');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
  });
});

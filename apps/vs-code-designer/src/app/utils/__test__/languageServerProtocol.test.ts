import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lspDirectory } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { installLSPSDK } from '../languageServerProtocol';
import path from 'path';
import { createHash } from 'crypto';

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
  const lspHashMarker = path.join(targetDirectory, '.lspserver-hash');
  const sdkDirectoryPath = path.join(targetDirectory, lspDirectory);
  const sdkHashMarker = path.join(targetDirectory, '.lspsdk-hash');
  const sdkPackageName = 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg';
  const sdkDestinationFile = path.join(sdkDirectoryPath, sdkPackageName);
  const legacyLspVersionMarker = path.join(targetDirectory, '.lspserver-version');
  const legacyLspPathMarker = path.join(targetDirectory, '.lspserver-path');
  const legacySdkVersionMarker = path.join(targetDirectory, '.lspsdk-version');
  const staleVersionedLspFolder = path.join(targetDirectory, 'LSPServer-1778130324219');
  const serverZipContent = Buffer.from('server zip content');
  const sdkPackageContent = Buffer.from('sdk package content');
  const staleSdkPackageContent = Buffer.from('stale sdk package content');
  const serverZipHash = createHash('sha256').update(serverZipContent).digest('hex');
  const sdkPackageHash = createHash('sha256').update(sdkPackageContent).digest('hex');
  const oldHash = 'old-hash';
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
    mocks.writeFile.mockResolvedValue(undefined);
    lspServerExtracted = false;
    configureReadFileMocks();
    ext.languageClient = undefined;
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => {
      return existingPaths.has(filePath) || (filePath === lspServerDllPath && lspServerExtracted);
    });
  }

  function configureReadFileMocks(options?: {
    lspHashMarker?: string;
    sdkHashMarker?: string;
    installedSdkContent?: Buffer;
  }): void {
    mocks.readFile.mockImplementation(async (filePath: string, encoding?: BufferEncoding) => {
      if (encoding === 'utf-8') {
        if (filePath === lspHashMarker) {
          return options?.lspHashMarker ?? oldHash;
        }
        if (filePath === sdkHashMarker) {
          return options?.sdkHashMarker ?? oldHash;
        }
        return '';
      }

      if (filePath.includes('LSPServer.zip')) {
        return serverZipContent;
      }
      if (filePath === sdkDestinationFile) {
        return options?.installedSdkContent ?? staleSdkPackageContent;
      }
      if (filePath.includes(sdkPackageName)) {
        return sdkPackageContent;
      }

      return Buffer.from('');
    });
  }

  it('extracts the LSP server and copies the SDK when target directories are missing', async () => {
    setExistingPaths([]);

    await installLSPSDK();

    expect(mocks.ensureDir).toHaveBeenCalledWith(targetDirectory);
    expect(mocks.admZip).toHaveBeenCalledWith(expect.stringContaining('LSPServer.zip'));
    expect(mocks.extractAllTo).toHaveBeenCalledWith(targetDirectory, true, true);
    expect(mocks.ensureDir).toHaveBeenCalledWith(sdkDirectoryPath);
    expect(mocks.copyFile).toHaveBeenCalledWith(expect.stringContaining(sdkPackageName), sdkDestinationFile);
    expect(mocks.writeFile).toHaveBeenCalledWith(lspHashMarker, serverZipHash);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkHashMarker, sdkPackageHash);
  });

  it('updates both assets when target files exist but hash markers are missing', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, sdkDestinationFile]);

    await installLSPSDK();

    expect(mocks.remove).toHaveBeenCalledWith(lspServerPath);
    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
  });

  it('updates both assets when source hashes differ from their stored markers', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, lspHashMarker, sdkDestinationFile, sdkHashMarker]);

    await installLSPSDK();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspHashMarker, serverZipHash);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkHashMarker, sdkPackageHash);
  });

  it('does not update assets when hash markers and installed SDK package are current', async () => {
    setExistingPaths([lspServerDllPath, lspHashMarker, sdkDestinationFile, sdkHashMarker]);
    configureReadFileMocks({
      lspHashMarker: serverZipHash,
      sdkHashMarker: sdkPackageHash,
      installedSdkContent: sdkPackageContent,
    });

    await installLSPSDK();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.copyFile).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.ensureDir).toHaveBeenCalledTimes(1);
    expect(mocks.ensureDir).toHaveBeenCalledWith(targetDirectory);
  });

  it('copies the SDK when the marker is current but the installed same-version package is stale', async () => {
    setExistingPaths([lspServerDllPath, lspHashMarker, sdkDestinationFile, sdkHashMarker]);
    configureReadFileMocks({
      lspHashMarker: serverZipHash,
      sdkHashMarker: sdkPackageHash,
      installedSdkContent: staleSdkPackageContent,
    });

    await installLSPSDK();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.copyFile).toHaveBeenCalledWith(expect.stringContaining(sdkPackageName), sdkDestinationFile);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkHashMarker, sdkPackageHash);
  });

  it('treats legacy mtime markers as stale and refreshes assets', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, legacyLspVersionMarker, sdkDestinationFile, legacySdkVersionMarker]);
    configureReadFileMocks({
      lspHashMarker: '2026-05-06T09:17:03.798Z',
      sdkHashMarker: '2026-05-06T09:17:03.860Z',
    });

    await installLSPSDK();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspHashMarker, serverZipHash);
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkHashMarker, sdkPackageHash);
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
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    mocks.extractAllTo.mockImplementation(() => {
      throw lockedError;
    });

    await expect(installLSPSDK()).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
    expect(mocks.copyFile).not.toHaveBeenCalled();
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
    setExistingPaths([lspServerDllPath, lspHashMarker]);
    configureReadFileMocks({
      lspHashMarker: serverZipHash,
    });
    mocks.copyFile.mockRejectedValue(new Error('copy failed'));

    await expect(installLSPSDK()).rejects.toThrow('Error copying sdk: Error: copy failed');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
  });
});

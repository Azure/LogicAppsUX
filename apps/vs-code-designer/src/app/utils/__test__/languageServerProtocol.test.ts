import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { installLSPServer } from '../languageServerProtocol';
import path from 'path';
import { createHash } from 'crypto';

const mocks = vi.hoisted(() => {
  const extractAllTo = vi.fn();
  const admZip = vi.fn(() => ({ extractAllTo }));

  return {
    admZip,
    ensureDir: vi.fn(),
    extractAllTo,
    getGlobalSetting: vi.fn(),
    pathExists: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    remove: vi.fn(),
    updateGlobalSetting: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('adm-zip', () => ({
  default: mocks.admZip,
}));

vi.mock('fs-extra', () => ({
  ensureDir: mocks.ensureDir,
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
  remove: mocks.remove,
  writeFile: mocks.writeFile,
}));

vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: mocks.getGlobalSetting,
  updateGlobalSetting: mocks.updateGlobalSetting,
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
  const lspHashMarker = path.join(targetDirectory, '.lspserver-hash');
  const legacyLspVersionMarker = path.join(targetDirectory, '.lspserver-version');
  const staleVersionedLspFolder = path.join(targetDirectory, 'LSPServer-1778130324219');
  const serverZipContent = Buffer.from('server zip content');
  const serverZipHash = createHash('sha256').update(serverZipContent).digest('hex');
  const oldHash = 'old-hash';
  let lspServerExtracted = false;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractAllTo.mockReset();
    mocks.getGlobalSetting.mockReturnValue(targetDirectory);
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

  function configureReadFileMocks(options?: { lspHashMarker?: string }): void {
    mocks.readFile.mockImplementation(async (filePath: string, encoding?: BufferEncoding) => {
      if (encoding === 'utf-8') {
        if (filePath === lspHashMarker) {
          return options?.lspHashMarker ?? oldHash;
        }
        return '';
      }

      if (filePath.includes('LSPServer.zip')) {
        return serverZipContent;
      }

      return Buffer.from('');
    });
  }

  it('extracts the LSP server when target directory is missing', async () => {
    setExistingPaths([]);

    await installLSPServer();

    expect(mocks.ensureDir).toHaveBeenCalledWith(targetDirectory);
    expect(mocks.admZip).toHaveBeenCalledWith(expect.stringContaining('LSPServer.zip'));
    expect(mocks.extractAllTo).toHaveBeenCalledWith(targetDirectory, true, true);
    expect(mocks.writeFile).toHaveBeenCalledWith(lspHashMarker, serverZipHash);
  });

  it('defaults the dependencies path before extracting when the setting is unset', async () => {
    mocks.getGlobalSetting.mockReturnValue(undefined);
    setExistingPaths([]);

    await installLSPServer();

    expect(mocks.updateGlobalSetting).toHaveBeenCalledWith(autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue);
    expect(mocks.ensureDir).toHaveBeenCalledWith(defaultDependencyPathValue);
    expect(mocks.extractAllTo).toHaveBeenCalledWith(defaultDependencyPathValue, true, true);
  });

  it('extracts when target file exists but hash marker is missing', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath]);

    await installLSPServer();

    expect(mocks.remove).toHaveBeenCalledWith(lspServerPath);
    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
  });

  it('extracts when source hash differs from stored marker', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, lspHashMarker]);

    await installLSPServer();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspHashMarker, serverZipHash);
  });

  it('does not extract when hash marker is current', async () => {
    setExistingPaths([lspServerDllPath, lspHashMarker]);
    configureReadFileMocks({ lspHashMarker: serverZipHash });

    await installLSPServer();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.ensureDir).toHaveBeenCalledTimes(1);
    expect(mocks.ensureDir).toHaveBeenCalledWith(targetDirectory);
  });

  it('treats legacy mtime markers as stale and refreshes', async () => {
    setExistingPaths([lspServerPath, lspServerDllPath, legacyLspVersionMarker]);
    configureReadFileMocks({
      lspHashMarker: '2026-05-06T09:17:03.798Z',
    });

    await installLSPServer();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspHashMarker, serverZipHash);
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
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    setExistingPaths([lspServerPath]);
    mocks.remove.mockImplementation(async (filePath: string) => {
      if (filePath === lspServerPath) {
        throw lockedError;
      }
    });

    await expect(installLSPServer()).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
  });

  it('adds actionable guidance for locked LSP files during extraction', async () => {
    const lockedError = Object.assign(new Error("EBUSY: resource busy or locked, open 'ICSharpCode.SharpZipLib.dll'"), {
      code: 'EBUSY',
    });
    mocks.extractAllTo.mockImplementation(() => {
      throw lockedError;
    });

    await expect(installLSPServer()).rejects.toThrow('stop the dotnet process running SdkLspServer.dll');
  });

  it('stops a running language client before replacing LSP assets', async () => {
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

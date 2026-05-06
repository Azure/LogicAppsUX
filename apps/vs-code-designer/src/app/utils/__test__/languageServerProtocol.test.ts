import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lspDirectory } from '../../../constants';
import { installLSPSDK } from '../languageServerProtocol';

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
    readFile: vi.fn(),
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
  readFile: mocks.readFile,
  stat: mocks.stat,
  writeFile: mocks.writeFile,
}));

vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: mocks.getGlobalSetting,
}));

describe('installLSPSDK', () => {
  const targetDirectory = 'D:\\runtime-dependencies';
  const lspServerPath = `${targetDirectory}\\LSPServer`;
  const lspVersionMarker = `${targetDirectory}\\.lspserver-version`;
  const sdkDirectoryPath = `${targetDirectory}\\${lspDirectory}`;
  const sdkVersionMarker = `${targetDirectory}\\.lspsdk-version`;
  const oldMarker = '2024-01-01T00:00:00.000Z';
  const currentMarker = '2024-03-01T00:00:00.000Z';
  const oldSourceTime = new Date('2024-01-15T00:00:00.000Z');
  const newSourceTime = new Date('2024-04-01T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractAllTo.mockReset();
    mocks.getGlobalSetting.mockReturnValue(targetDirectory);
    mocks.copyFile.mockResolvedValue(undefined);
    mocks.ensureDir.mockResolvedValue(undefined);
    mocks.extractAllTo.mockReturnValue(undefined);
    mocks.pathExists.mockResolvedValue(false);
    mocks.readFile.mockResolvedValue(oldMarker);
    mocks.stat.mockResolvedValue({ mtime: newSourceTime });
    mocks.writeFile.mockResolvedValue(undefined);
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => existingPaths.has(filePath));
  }

  it('extracts the LSP server and copies the SDK when target directories are missing', async () => {
    await installLSPSDK();

    expect(mocks.ensureDir).toHaveBeenCalledWith(targetDirectory);
    expect(mocks.admZip).toHaveBeenCalledWith(expect.stringContaining('LSPServer.zip'));
    expect(mocks.extractAllTo).toHaveBeenCalledWith(targetDirectory, true, true);
    expect(mocks.ensureDir).toHaveBeenCalledWith(sdkDirectoryPath);
    expect(mocks.copyFile).toHaveBeenCalledWith(
      expect.stringContaining('Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg'),
      `${sdkDirectoryPath}\\Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg`
    );
    expect(mocks.writeFile).toHaveBeenCalledWith(lspVersionMarker, newSourceTime.toISOString());
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkVersionMarker, newSourceTime.toISOString());
  });

  it('updates both assets when target directories exist but version markers are missing', async () => {
    setExistingPaths([lspServerPath, sdkDirectoryPath]);

    await installLSPSDK();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it('updates both assets when source files are newer than their stored markers', async () => {
    setExistingPaths([lspServerPath, lspVersionMarker, sdkDirectoryPath, sdkVersionMarker]);
    mocks.readFile.mockResolvedValue(oldMarker);
    mocks.stat.mockResolvedValue({ mtime: newSourceTime });

    await installLSPSDK();

    expect(mocks.extractAllTo).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledWith(lspVersionMarker, newSourceTime.toISOString());
    expect(mocks.writeFile).toHaveBeenCalledWith(sdkVersionMarker, newSourceTime.toISOString());
  });

  it('does not update assets when version markers are current', async () => {
    setExistingPaths([lspServerPath, lspVersionMarker, sdkDirectoryPath, sdkVersionMarker]);
    mocks.readFile.mockResolvedValue(currentMarker);
    mocks.stat.mockResolvedValue({ mtime: oldSourceTime });

    await installLSPSDK();

    expect(mocks.extractAllTo).not.toHaveBeenCalled();
    expect(mocks.copyFile).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.ensureDir).toHaveBeenCalledTimes(1);
    expect(mocks.ensureDir).toHaveBeenCalledWith(targetDirectory);
  });

  it('wraps extraction errors with LSP server context', async () => {
    mocks.extractAllTo.mockImplementation(() => {
      throw new Error('zip failed');
    });

    await expect(installLSPSDK()).rejects.toThrow('Error extracting LSP server: Error: zip failed');
    expect(mocks.copyFile).not.toHaveBeenCalled();
  });

  it('wraps SDK copy errors with SDK context', async () => {
    setExistingPaths([lspServerPath, lspVersionMarker]);
    mocks.readFile.mockResolvedValue(currentMarker);
    mocks.stat.mockResolvedValue({ mtime: oldSourceTime });
    mocks.copyFile.mockRejectedValue(new Error('copy failed'));

    await expect(installLSPSDK()).rejects.toThrow('Error copying sdk: Error: copy failed');
    expect(mocks.extractAllTo).not.toHaveBeenCalled();
  });
});

import { getBundleVersionNumber } from '../getDebugSymbolDll';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as cp from 'child_process';
import { extensionBundleId } from '../../../constants';

// Mock VS Code
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: [],
  },
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock localize
vi.mock('../../localize', () => ({
  localize: vi.fn((key: string, defaultValue: string) => defaultValue),
}));

// Mock extension variables
vi.mock('../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

// Mock funcVersion
vi.mock('../funcCoreTools/funcVersion', () => ({
  getFunctionsCommand: vi.fn(() => 'func'),
}));

const mockedFse = vi.mocked(fse);
const mockedExecSync = vi.mocked(cp.execSync);

describe('getBundleVersionNumber', () => {
  const mockBundleFolderRoot = '/mock/bundle/root';
  const mockBundleFolder = path.join(mockBundleFolderRoot, extensionBundleId);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExecSync.mockReturnValue(`${mockBundleFolderRoot}Microsoft.Azure.Functions.ExtensionBundle\n`);
  });

  it('should return the highest version number from available bundle folders', async () => {
    const mockFolders = ['1.0.0', '2.1.0', '1.5.0', 'some-file.txt'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation((filePath: any) => {
      const fileName = path.basename(filePath.toString());
      return Promise.resolve({
        isDirectory: () => fileName !== 'some-file.txt',
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('2.1.0');
    expect(mockedFse.readdir).toHaveBeenCalledWith(mockBundleFolder);
  });

  it('should handle version numbers with different digit counts', async () => {
    const mockFolders = ['1.0.0', '10.2.1', '2.15.3'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('10.2.1');
  });

  it('should return default version when only non-directory files exist', async () => {
    const mockFolders = ['file1.txt', 'file2.log'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => false,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('0.0.0');
  });

  it('should handle single version folder', async () => {
    const mockFolders = ['1.2.3'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('1.2.3');
  });

  it('should throw error when no bundle folders found', async () => {
    mockedFse.readdir.mockResolvedValue([] as any);

    await expect(getBundleVersionNumber()).rejects.toThrow('Extension bundle could not be found.');
  });

  it('should handle mixed version formats correctly', async () => {
    const mockFolders = ['1.0', '1.0.0', '1.0.0.1'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('1.0.0.1');
  });

  it('should call execSync to get the bundle root path', async () => {
    const mockFolders = ['1.0.0'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    await getBundleVersionNumber();

    expect(mockedExecSync).toHaveBeenCalledWith('func GetExtensionBundlePath', { encoding: 'utf8' });
  });
});

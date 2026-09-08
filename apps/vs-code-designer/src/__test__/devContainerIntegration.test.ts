import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as binaries from '../app/utils/binaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getGlobalSetting, shouldValidateAndInstallRuntimeDependencies } from '../app/utils/vsCodeConfig/settings';

vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));
vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  shouldValidateAndInstallRuntimeDependencies: vi.fn(),
}));

// Mock transitive dependencies of binaries.ts to prevent real module loading.
vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  startAllDesignTimeApis: vi.fn(),
  stopAllDesignTimeApis: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
}));
vi.mock('../app/utils/funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));
vi.mock('../app/commands/binaries/validateAndInstallBinaries', () => ({
  validateAndInstallBinaries: vi.fn(),
}));

describe('devContainer Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('useBinariesDependencies - devContainer override', () => {
    it('should return false in devContainer regardless of global setting', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue(true);

      const result = await binaries.useBinariesDependencies();

      expect(result).toBe(false);
    });

    it('should respect global setting in non-devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);

      const result = await binaries.useBinariesDependencies();

      expect(result).toBe(true);
    });
  });

  describe('binariesExist - devContainer early exit', () => {
    it('should return false immediately in devContainer without checking filesystem', async () => {
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue('test/path');

      const result = await binaries.binariesExist('dotnet');

      expect(result).toBe(false);
      expect(existsSyncSpy).not.toHaveBeenCalled();
    });

    it('should check filesystem in non-devContainer workspace', async () => {
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue('test/path');

      const result = await binaries.binariesExist('dotnet');

      expect(result).toBe(true);
      expect(existsSyncSpy).toHaveBeenCalled();
    });
  });

  describe('Error handling in devContainer detection', () => {
    it('should gracefully handle errors in devContainer detection', async () => {
      vi.mocked(isDevContainerWorkspace).mockImplementation(async () => {
        throw new Error('File system error');
      });

      await expect(binaries.useBinariesDependencies()).rejects.toThrow('File system error');
    });
  });
});

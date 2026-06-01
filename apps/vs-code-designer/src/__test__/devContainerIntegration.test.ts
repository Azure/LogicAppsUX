import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs';
import * as binaries from '../app/utils/binaries';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { startOnboarding } from '../onboarding';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getGlobalSetting } from '../app/utils/vsCodeConfig/settings';

// Use factory mocks for leaf dependencies used by binaries.ts.
vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));
vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

// Mock transitive dependencies of binaries.ts to prevent real module loading
// when the real binaries module is imported at test level.
vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
  startAllDesignTimeApis: vi.fn(),
  stopAllDesignTimeApis: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
}));
vi.mock('../app/utils/funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));
vi.mock('../app/utils/vsCodeConfig/tasks', () => ({
  validateTasksJson: vi.fn(),
}));
vi.mock('../app/commands/binaries/validateAndInstallBinaries', () => ({
  validateAndInstallBinaries: vi.fn(),
}));
vi.mock('../app/utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn(async (_ctx: any, _cmd: any, callback: () => Promise<void>) => await callback()),
}));

describe('devContainer Integration Tests', () => {
  let mockContext: IActionContext;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockContext = {
      telemetry: {
        properties: {},
        measurements: {},
      },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    } as any;
  });

  describe('Complete onboarding flow - devContainer', () => {
    it('should skip dependency onboarding and auto-start design time in devContainer workspace', async () => {
      const { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } = await import('../app/utils/codeless/startDesignTimeApi');
      const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.properties.skippedDependencyOnboarding).toBe('true');
      expect(mockContext.telemetry.properties.skippedDependencyOnboardingReason).toBe('devContainer');
      expect(mockContext.telemetry.properties.designTimeStartupMode).toBe('devContainerAutoStart');
      expect(installBinariesSpy).not.toHaveBeenCalled();
      expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
      expect(scheduleStartAllDesignTimeApis).toHaveBeenCalled();
    });

    it('should complete onboarding flow in non-devContainer workspace', async () => {
      const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');
      const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

      await startOnboarding(mockContext);
      await vi.waitFor(() => expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined());

      expect(mockContext.telemetry.properties.skippedDependencyOnboarding).toBeUndefined();
      expect(installBinariesSpy).toHaveBeenCalled();
      expect(validateAndInstallBinaries).toHaveBeenCalled();
      expect(promptStartDesignTimeOption).toHaveBeenCalled();
    });
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
      vi.mocked(getGlobalSetting).mockReturnValue(true);

      const result = await binaries.useBinariesDependencies();

      expect(result).toBe(true);
    });
  });

  describe('binariesExist - devContainer early exit', () => {
    it('should return false immediately in devContainer without checking filesystem', async () => {
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue('test/path');

      const result = await binaries.binariesExist('dotnet');

      expect(result).toBe(false);
      expect(existsSyncSpy).not.toHaveBeenCalled();
    });

    it('should check filesystem in non-devContainer workspace', async () => {
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue('test/path');

      const result = await binaries.binariesExist('dotnet');

      expect(result).toBe(true);
      expect(existsSyncSpy).toHaveBeenCalled();
    });
  });

  describe('Telemetry tracking across devContainer detection', () => {
    it('should track skipped dependency onboarding in telemetry for devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.properties.skippedDependencyOnboarding).toBe('true');
      expect(mockContext.telemetry.properties.skippedDependencyOnboardingReason).toBe('devContainer');
    });

    it('should track binaries install duration for non-devContainer', async () => {
      const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(false);

      await startOnboarding(mockContext);
      await vi.waitFor(() => expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined());

      expect(typeof mockContext.telemetry.measurements.binariesInstallDuration).toBe('number');
      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeGreaterThanOrEqual(0);
      expect(installBinariesSpy).toHaveBeenCalled();
    });

    it('should not track binaries install duration for devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeUndefined();
    });
  });

  describe('Error handling in devContainer detection', () => {
    it('should gracefully handle errors in devContainer detection', async () => {
      vi.mocked(isDevContainerWorkspace).mockImplementation(async () => {
        throw new Error('File system error');
      });

      // Should reject when the underlying detection fails
      await expect(binaries.useBinariesDependencies()).rejects.toThrow('File system error');
    });
  });
});

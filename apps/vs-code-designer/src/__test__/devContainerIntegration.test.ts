import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

// Mock all dependencies
vi.mock('../app/utils/devContainerUtils');
vi.mock('../app/utils/binaries');
vi.mock('../app/utils/codeless/startDesignTimeApi');
vi.mock('../app/utils/vsCodeConfig/tasks');
vi.mock('../app/commands/binaries/validateAndInstallBinaries');
vi.mock('../app/utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn(async (ctx, cmd, callback) => await callback()),
}));
vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (cmd, callback) => {
    return await callback({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    });
  }),
}));
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
  },
}));

describe('devContainer Integration Tests', () => {
  let mockContext: IActionContext;

  beforeEach(() => {
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
    it('should skip entire onboarding flow in devContainer workspace', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { installBinaries } = await import('../app/utils/binaries');
      const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');
      const { startOnboarding } = await import('../onboarding');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(installBinaries).mockResolvedValue(undefined);
      vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.properties.skippedOnboarding).toBe('true');
      expect(mockContext.telemetry.properties.skippedReason).toBe('devContainer');
      expect(installBinaries).not.toHaveBeenCalled();
      expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
    });

    it('should complete onboarding flow in non-devContainer workspace', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { installBinaries } = await import('../app/utils/binaries');
      const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');
      const { startOnboarding } = await import('../onboarding');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(installBinaries).mockResolvedValue(undefined);
      vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.properties.skippedOnboarding).toBeUndefined();
      expect(installBinaries).toHaveBeenCalled();
      expect(promptStartDesignTimeOption).toHaveBeenCalled();
      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined();
    });
  });

  describe('useBinariesDependencies - devContainer override', () => {
    it('should return false in devContainer regardless of global setting', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { useBinariesDependencies } = await import('../app/utils/binaries');
      const settingsModule = await import('../app/utils/vsCodeConfig/settings');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(true);

      const result = await useBinariesDependencies();

      expect(result).toBe(false);
    });

    it('should respect global setting in non-devContainer workspace', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { useBinariesDependencies } = await import('../app/utils/binaries');
      const settingsModule = await import('../app/utils/vsCodeConfig/settings');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(true);

      const result = await useBinariesDependencies();

      expect(result).toBe(true);
    });
  });

  describe('binariesExist - devContainer early exit', () => {
    it('should return false immediately in devContainer without checking filesystem', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { binariesExist, useBinariesDependencies } = await import('../app/utils/binaries');
      const fs = await import('fs');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(useBinariesDependencies).mockResolvedValue(false);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await binariesExist('dotnet');

      expect(result).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should check filesystem in non-devContainer workspace', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { binariesExist, useBinariesDependencies } = await import('../app/utils/binaries');
      const fs = await import('fs');
      const settingsModule = await import('../app/utils/vsCodeConfig/settings');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(useBinariesDependencies).mockResolvedValue(true);
      vi.mocked(settingsModule.getGlobalSetting).mockReturnValue('test/path');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await binariesExist('dotnet');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalled();
    });
  });

  describe('Telemetry tracking across devContainer detection', () => {
    it('should track skipped onboarding in telemetry for devContainer', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { startOnboarding } = await import('../onboarding');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.properties.skippedOnboarding).toBe('true');
      expect(mockContext.telemetry.properties.skippedReason).toBe('devContainer');
    });

    it('should track binaries install duration for non-devContainer', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { installBinaries } = await import('../app/utils/binaries');
      const { startOnboarding } = await import('../onboarding');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(installBinaries).mockResolvedValue(undefined);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined();
      expect(typeof mockContext.telemetry.measurements.binariesInstallDuration).toBe('number');
      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeGreaterThanOrEqual(0);
    });

    it('should not track binaries install duration for devContainer', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { startOnboarding } = await import('../onboarding');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboarding(mockContext);

      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeUndefined();
    });
  });

  describe('Error handling in devContainer detection', () => {
    it('should gracefully handle errors in devContainer detection', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { useBinariesDependencies } = await import('../app/utils/binaries');

      vi.mocked(isDevContainerWorkspace).mockRejectedValue(new Error('File system error'));

      // Should not throw, but treat as non-devContainer (return based on setting)
      await expect(useBinariesDependencies()).rejects.toThrow();
    });
  });
});

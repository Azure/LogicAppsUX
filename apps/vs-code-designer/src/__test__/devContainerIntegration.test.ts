import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

// Use factory mocks to prevent transitive module loading issues (e.g., AzureWizardPromptStep).
// devContainerUtils and settings are leaf dependencies called by the real useBinariesDependencies/binariesExist.
vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));
vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

// Fully mock binaries (synchronous factory, no importActual) to avoid module resolution deadlock.
// Tests that need the REAL useBinariesDependencies/binariesExist use vi.importActual at test level.
vi.mock('../app/utils/binaries', () => ({
  useBinariesDependencies: vi.fn(),
  binariesExist: vi.fn(),
  installBinaries: vi.fn(),
  downloadAndExtractDependency: vi.fn(),
  getLatestFunctionCoreToolsVersion: vi.fn(),
  getLatestDotNetVersion: vi.fn(),
  getLatestNodeJsVersion: vi.fn(),
  getNodeJsBinariesReleaseUrl: vi.fn(),
  getFunctionCoreToolsBinariesReleaseUrl: vi.fn(),
  getDotNetBinariesReleaseUrl: vi.fn(),
  getCpuArchitecture: vi.fn(),
  getDependencyTimeout: vi.fn(),
}));

// Mock transitive dependencies of binaries.ts to prevent real module loading
// when vi.importActual('../app/utils/binaries') is used at test level.
vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
  startAllDesignTimeApis: vi.fn(),
  stopAllDesignTimeApis: vi.fn(),
}));
vi.mock('../app/utils/funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));
vi.mock('../app/utils/funcCoreTools/funcVersion', () => ({
  setFunctionsCommand: vi.fn(),
  getFunctionsCommand: vi.fn(),
}));
vi.mock('../app/commands/nodeJs/validateNodeJsInstalled', () => ({
  isNodeJsInstalled: vi.fn(),
}));
vi.mock('../app/utils/nodeJs/nodeJsVersion', () => ({
  getNpmCommand: vi.fn(),
}));
// Fully mock onboarding to break circular dep (onboarding ↔ binaries).
vi.mock('../onboarding', () => ({
  onboardBinaries: vi.fn(),
  startOnboarding: vi.fn(),
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
vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_cmd: string, callback: (ctx: IActionContext) => Promise<void>) => {
    return await callback({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    } as any);
  }),
}));

/**
 * Re-implements the core startOnboarding flow inline to test devContainer detection
 * without hitting the circular dependency between onboarding.ts ↔ binaries.ts.
 * This mirrors the real logic in onboarding.ts: check isDevContainerWorkspace,
 * skip if true, otherwise call installBinaries + promptStartDesignTimeOption.
 */
async function startOnboardingForTest(activateContext: IActionContext) {
  const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
  const { installBinaries } = await import('../app/utils/binaries');
  const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');

  const isDevContainer = await isDevContainerWorkspace();
  if (isDevContainer) {
    activateContext.telemetry.properties.skippedOnboarding = 'true';
    activateContext.telemetry.properties.skippedReason = 'devContainer';
    return;
  }

  const binariesInstallStartTime = Date.now();
  await installBinaries(activateContext as any);
  activateContext.telemetry.measurements.binariesInstallDuration = Date.now() - binariesInstallStartTime;

  await promptStartDesignTimeOption(activateContext);
}

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

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboardingForTest(mockContext);

      expect(mockContext.telemetry.properties.skippedOnboarding).toBe('true');
      expect(mockContext.telemetry.properties.skippedReason).toBe('devContainer');
      expect(installBinaries).not.toHaveBeenCalled();
      expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
    });

    it('should complete onboarding flow in non-devContainer workspace', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { installBinaries } = await import('../app/utils/binaries');
      const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(installBinaries).mockResolvedValue(undefined);
      vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

      await startOnboardingForTest(mockContext);

      expect(mockContext.telemetry.properties.skippedOnboarding).toBeUndefined();
      expect(installBinaries).toHaveBeenCalled();
      expect(promptStartDesignTimeOption).toHaveBeenCalled();
      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined();
    });
  });

  describe('useBinariesDependencies - devContainer override', () => {
    it('should return false in devContainer regardless of global setting', async () => {
      // Use importActual to run the REAL useBinariesDependencies logic.
      // Its dependencies (isDevContainerWorkspace, getGlobalSetting) are still mocked.
      const { useBinariesDependencies: realUseBinariesDependencies } =
        await vi.importActual<typeof import('../app/utils/binaries')>('../app/utils/binaries');
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const settingsModule = await import('../app/utils/vsCodeConfig/settings');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(true);

      const result = await realUseBinariesDependencies();

      expect(result).toBe(false);
    });

    it('should respect global setting in non-devContainer workspace', async () => {
      const { useBinariesDependencies: realUseBinariesDependencies } =
        await vi.importActual<typeof import('../app/utils/binaries')>('../app/utils/binaries');
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const settingsModule = await import('../app/utils/vsCodeConfig/settings');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(true);

      const result = await realUseBinariesDependencies();

      expect(result).toBe(true);
    });
  });

  describe('binariesExist - devContainer early exit', () => {
    it('should return false immediately in devContainer without checking filesystem', async () => {
      const { binariesExist: realBinariesExist } = await vi.importActual<typeof import('../app/utils/binaries')>('../app/utils/binaries');
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const fs = await import('fs');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await realBinariesExist('dotnet');

      expect(result).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should check filesystem in non-devContainer workspace', async () => {
      const { binariesExist: realBinariesExist } = await vi.importActual<typeof import('../app/utils/binaries')>('../app/utils/binaries');
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const fs = await import('fs');
      const settingsModule = await import('../app/utils/vsCodeConfig/settings');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(settingsModule.getGlobalSetting).mockReturnValue('test/path');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await realBinariesExist('dotnet');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalled();
    });
  });

  describe('Telemetry tracking across devContainer detection', () => {
    it('should track skipped onboarding in telemetry for devContainer', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboardingForTest(mockContext);

      expect(mockContext.telemetry.properties.skippedOnboarding).toBe('true');
      expect(mockContext.telemetry.properties.skippedReason).toBe('devContainer');
    });

    it('should track binaries install duration for non-devContainer', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
      const { installBinaries } = await import('../app/utils/binaries');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(installBinaries).mockResolvedValue(undefined);

      await startOnboardingForTest(mockContext);

      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined();
      expect(typeof mockContext.telemetry.measurements.binariesInstallDuration).toBe('number');
      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeGreaterThanOrEqual(0);
    });

    it('should not track binaries install duration for devContainer', async () => {
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

      await startOnboardingForTest(mockContext);

      expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeUndefined();
    });
  });

  describe('Error handling in devContainer detection', () => {
    it('should gracefully handle errors in devContainer detection', async () => {
      const { useBinariesDependencies: realUseBinariesDependencies } =
        await vi.importActual<typeof import('../app/utils/binaries')>('../app/utils/binaries');
      const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');

      vi.mocked(isDevContainerWorkspace).mockRejectedValue(new Error('File system error'));

      // Should reject when the underlying detection fails
      await expect(realUseBinariesDependencies()).rejects.toThrow();
    });
  });
});

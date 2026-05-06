import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onboardBinaries } from '../app/utils/runtimeDependencies';
import { startOnboarding } from '../onboarding';
import * as binaries from '../app/utils/binaries';
import { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } from '../app/utils/codeless/startDesignTimeApi';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { validateTasksJson } from '../app/utils/vsCodeConfig/tasks';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getGlobalSetting } from '../app/utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
}));
// Auto-mocks: no problematic transitive imports once the above chains are broken.
vi.mock('../app/commands/binaries/validateAndInstallBinaries');
vi.mock('../app/utils/vsCodeConfig/tasks');
vi.mock('../app/utils/devContainerUtils');
vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));
vi.mock('../app/utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn(async (ctx, cmd, callback) => await callback()),
}));
// @microsoft/vscode-azext-utils is already mocked in test-setup.ts with AzureWizardPromptStep, etc.

describe('onboardBinaries', () => {
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

  describe('devContainer workspace behavior', () => {
    it('should skip binaries validation in devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue(true);

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
      expect(validateTasksJson).not.toHaveBeenCalled();
    });

    it('should not set lastStep when skipping in devContainer', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue(true);

      await onboardBinaries(mockContext);

      expect(mockContext.telemetry.properties.lastStep).toBeUndefined();
    });
  });

  describe('non-devContainer workspace behavior', () => {
    it('should validate and install binaries when setting is enabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).toHaveBeenCalled();
      expect(validateTasksJson).toHaveBeenCalled();
    });

    it('should set telemetry lastStep when validating binaries', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(mockContext.telemetry.properties.lastStep).toBeDefined();
    });

    it('should not validate when setting is disabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(false);

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
      expect(validateTasksJson).not.toHaveBeenCalled();
    });
  });

  describe('validateTasksJson integration', () => {
    it('should call validateTasksJson with workspace folders when binaries are enabled', async () => {
      const vscode = await import('vscode');
      const mockWorkspaceFolders = [{ uri: { fsPath: '/test/path' } }];
      (vscode.workspace as any).workspaceFolders = mockWorkspaceFolders;

      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(validateTasksJson).toHaveBeenCalledWith(expect.any(Object), mockWorkspaceFolders);
    });

    it('should not call validateTasksJson in devContainer workspace', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
      vi.mocked(getGlobalSetting).mockReturnValue(true);

      await onboardBinaries(mockContext);

      expect(validateTasksJson).not.toHaveBeenCalled();
    });
  });
});

describe('startOnboarding', () => {
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

  it('should skip dependency onboarding and auto-start design time in devContainer workspaces', async () => {
    const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(scheduleStartAllDesignTimeApis).mockImplementation(() => undefined);

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.properties.isDevContainer).toBe('true');
    expect(mockContext.telemetry.properties.skippedDependencyOnboarding).toBe('true');
    expect(mockContext.telemetry.properties.skippedDependencyOnboardingReason).toBe('devContainer');
    expect(mockContext.telemetry.properties.designTimeStartupMode).toBe('devContainerAutoStart');
    expect(mockContext.telemetry.properties.designTimeStartupState).toBe('scheduled');
    expect(installBinariesSpy).not.toHaveBeenCalled();
    expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
    expect(scheduleStartAllDesignTimeApis).toHaveBeenCalled();
    expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeUndefined();
  });

  it('should install binaries and prompt for design time in non-devContainer workspaces', async () => {
    const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

    await startOnboarding(mockContext);
    await vi.waitFor(() => expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined());

    expect(mockContext.telemetry.properties.isDevContainer).toBe('false');
    expect(mockContext.telemetry.properties.lastStep).toBeDefined();
    expect(installBinariesSpy).toHaveBeenCalled();
    expect(promptStartDesignTimeOption).toHaveBeenCalledWith(mockContext);
    expect(scheduleStartAllDesignTimeApis).not.toHaveBeenCalled();
    expect(typeof mockContext.telemetry.measurements.binariesInstallDuration).toBe('number');
    expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeGreaterThanOrEqual(0);
  });

  it('should bypass the auto-start prompt path entirely for devContainer workspaces', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(scheduleStartAllDesignTimeApis).mockImplementation(() => undefined);
    vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

    await startOnboarding(mockContext);

    expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
    expect(scheduleStartAllDesignTimeApis).toHaveBeenCalledTimes(1);
  });

  it('should not wait for design-time startup completion in devContainer workspaces', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(scheduleStartAllDesignTimeApis).mockImplementation(() => undefined);

    await expect(startOnboarding(mockContext)).resolves.toBeUndefined();

    expect(scheduleStartAllDesignTimeApis).toHaveBeenCalledTimes(1);
  });
});

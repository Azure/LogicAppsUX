import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onboardBinaries } from '../app/utils/runtimeDependencies';
import { startOnboarding } from '../onboarding';
import * as binaries from '../app/utils/binaries';
import { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } from '../app/utils/codeless/startDesignTimeApi';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getGlobalSetting } from '../app/utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
}));
// Auto-mocks: no problematic transitive imports once the above chains are broken.
vi.mock('../app/commands/binaries/validateAndInstallBinaries');
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
    delete process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION;
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

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).toHaveBeenCalled();
    });

    it('should set telemetry lastStep when validating binaries', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(mockContext.telemetry.properties.lastStep).toBeDefined();
    });

    it('should not validate when setting is disabled', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(false);

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
    });

    it('should rethrow dependency validation failures in strict E2E mode', async () => {
      process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION = '1';
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockRejectedValue(new Error('Bundle sidecar missing'));

      await expect(onboardBinaries(mockContext)).rejects.toThrow('Bundle sidecar missing');

      expect(validateAndInstallBinaries).toHaveBeenCalled();
    });
  });

  describe('workspace validation integration', () => {
    it('should not invoke .vscode artifact validation during binary onboarding', async () => {
      vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(getGlobalSetting).mockReturnValue(true);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);

      await onboardBinaries(mockContext);

      expect(validateAndInstallBinaries).toHaveBeenCalledTimes(1);
    });
  });
});

describe('startOnboarding', () => {
  let mockContext: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION;
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

    expect(mockContext.telemetry.properties.isDevContainer).toBe('false');
    expect(mockContext.telemetry.properties.lastStep).toBeDefined();
    expect(installBinariesSpy).toHaveBeenCalled();
    expect(promptStartDesignTimeOption).toHaveBeenCalledWith(mockContext);
    expect(scheduleStartAllDesignTimeApis).not.toHaveBeenCalled();
    expect(typeof mockContext.telemetry.measurements.binariesInstallDuration).toBe('number');
    expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeGreaterThanOrEqual(0);
  });

  it('should rethrow dependency onboarding failures before design-time startup in strict E2E mode', async () => {
    process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION = '1';
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(getGlobalSetting).mockReturnValue(true);
    vi.mocked(validateAndInstallBinaries).mockRejectedValue(new Error('Bundle sidecar missing'));
    vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

    await expect(startOnboarding(mockContext)).rejects.toThrow('Bundle sidecar missing');

    expect(validateAndInstallBinaries).toHaveBeenCalled();
    expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
  });

  it('should wait for dependency onboarding before prompting for design-time startup', async () => {
    let resolveInstallBinaries = () => {};
    const installBinariesSpy = vi.spyOn(binaries, 'installBinaries').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInstallBinaries = resolve;
        })
    );
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

    const onboardingPromise = startOnboarding(mockContext);
    await vi.waitFor(() => expect(installBinariesSpy).toHaveBeenCalled());

    expect(promptStartDesignTimeOption).not.toHaveBeenCalled();

    resolveInstallBinaries();
    await onboardingPromise;

    expect(promptStartDesignTimeOption).toHaveBeenCalledWith(mockContext);
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

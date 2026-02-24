import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

// Mock devContainer utils
vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));

// Mock onboarding dependencies - don't mock useBinariesDependencies so real implementation runs
vi.mock('../app/utils/binaries', async () => {
  const actual = await vi.importActual<typeof import('../app/utils/binaries')>('../app/utils/binaries');
  return {
    ...actual,
    installBinaries: vi.fn(),
  };
});

vi.mock('../onboarding', () => ({
  onboardBinaries: vi.fn(),
  startOnboarding: vi.fn(),
}));

vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
}));

vi.mock('../app/utils/telemetry', () => ({
  runWithDurationTelemetry: vi.fn(async (ctx, cmd, callback) => await callback()),
}));

vi.mock('../app/utils/vsCodeConfig/tasks', () => ({
  validateTasksJson: vi.fn(),
}));

vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

vi.mock('../app/commands/binaries/validateAndInstallBinaries', () => ({
  validateAndInstallBinaries: vi.fn(),
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

describe('startOnboarding with devContainer', () => {
  let mockContext: IActionContext;

  beforeEach(async () => {
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

  it('should skip onboarding when in devContainer workspace', async () => {
    const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
    const { installBinaries } = await import('../app/utils/binaries');
    const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');
    const { startOnboarding } = await import('../onboarding');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(startOnboarding).mockImplementation(async (ctx) => {
      ctx.telemetry.properties.skippedOnboarding = 'true';
      ctx.telemetry.properties.skippedReason = 'devContainer';
    });

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.properties.skippedOnboarding).toBe('true');
    expect(mockContext.telemetry.properties.skippedReason).toBe('devContainer');
    expect(installBinaries).not.toHaveBeenCalled();
    expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
  });

  it('should run onboarding when NOT in devContainer workspace', async () => {
    const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
    const { installBinaries } = await import('../app/utils/binaries');
    const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');
    const { startOnboarding } = await import('../onboarding');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(installBinaries).mockResolvedValue(undefined);
    vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);
    vi.mocked(startOnboarding).mockImplementation(async (ctx) => {
      ctx.telemetry.measurements.binariesInstallDuration = 100;
      await installBinaries(ctx);
      await promptStartDesignTimeOption(ctx);
    });

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.properties.skippedOnboarding).toBeUndefined();
    expect(installBinaries).toHaveBeenCalled();
    expect(promptStartDesignTimeOption).toHaveBeenCalled();
  });

  it('should record telemetry for binaries install duration', async () => {
    const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
    const { installBinaries } = await import('../app/utils/binaries');
    const { startOnboarding } = await import('../onboarding');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(installBinaries).mockResolvedValue(undefined);
    vi.mocked(startOnboarding).mockImplementation(async (ctx) => {
      ctx.telemetry.measurements.binariesInstallDuration = 100;
    });

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.measurements.binariesInstallDuration).toBeDefined();
    expect(typeof mockContext.telemetry.measurements.binariesInstallDuration).toBe('number');
  });

  it('should not attempt binary installation in devContainer workspace', async () => {
    const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
    const { useBinariesDependencies } = await import('../app/utils/binaries');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

    const result = await useBinariesDependencies();

    expect(result).toBe(false);
  });

  it('should respect autoRuntimeDependenciesValidationAndInstallation setting when not in devContainer', async () => {
    const { isDevContainerWorkspace } = await import('../app/utils/devContainerUtils');
    const settingsModule = await import('../app/utils/vsCodeConfig/settings');
    const { useBinariesDependencies } = await import('../app/utils/binaries');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(true);

    const result = await useBinariesDependencies();

    expect(result).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as binaries from '../app/utils/binaries';
import { startOnboarding } from '../onboarding';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getGlobalSetting } from '../app/utils/vsCodeConfig/settings';

// Mock devContainer utils
vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));

vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
  startAllDesignTimeApis: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
}));

vi.mock('../app/utils/telemetry', () => ({
  callWithDurationTelemetry: vi.fn(async (_id: string, callback: (ctx: any) => Promise<any>) => {
    const innerContext = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: true, rethrow: true, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    return await callback(innerContext);
  }),
}));

vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

describe('startOnboarding with devContainer', () => {
  let mockContext: IActionContext;

  beforeEach(async () => {
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

  it('should skip dependency onboarding and auto-start design time when in devContainer workspace', async () => {
    const { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } = await import('../app/utils/codeless/startDesignTimeApi');
    const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.properties.skippedDependencyOnboarding).toBe('true');
    expect(mockContext.telemetry.properties.skippedDependencyOnboardingReason).toBe('devContainer');
    expect(installBinariesSpy).not.toHaveBeenCalled();
    expect(promptStartDesignTimeOption).not.toHaveBeenCalled();
  });

  it('should run onboarding when NOT in devContainer workspace', async () => {
    const { promptStartDesignTimeOption } = await import('../app/utils/codeless/startDesignTimeApi');
    const installBinariesSpy = vi.spyOn(binaries, 'installBinaries');

    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(getGlobalSetting).mockReturnValue(false);
    vi.mocked(promptStartDesignTimeOption).mockResolvedValue(undefined);

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.properties.skippedDependencyOnboarding).toBeUndefined();
    expect(installBinariesSpy).toHaveBeenCalled();
    expect(promptStartDesignTimeOption).toHaveBeenCalled();
  });

  it('should record telemetry lastStep for binaries install', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(getGlobalSetting).mockReturnValue(false);

    await startOnboarding(mockContext);

    expect(mockContext.telemetry.properties.lastStep).toBe('validateAndInstallBinaries');
  });

  it('should not attempt binary installation in devContainer workspace', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(getGlobalSetting).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(false);
  });

  it('should respect autoRuntimeDependenciesValidationAndInstallation setting when not in devContainer', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(getGlobalSetting).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(true);
  });
});

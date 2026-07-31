import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as binaries from '../app/utils/binaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { promptStartDesignTimeOption, scheduleStartAllDesignTimeApis } from '../app/utils/codeless/startDesignTimeApi';

vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));

vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  promptStartDesignTimeOption: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
  startAllDesignTimeApis: vi.fn(),
  stopAllDesignTimeApis: vi.fn(),
}));

vi.mock('../app/commands/binaries/validateAndInstallBinaries');

vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

// The activate function's callWithTelemetryAndErrorHandling is mocked to invoke callbacks with a fresh context.
// ensureBinaries and ensureDesignTimeApi each create their own callWithTelemetryAndErrorHandling scopes internally.
const telemetryContexts: any[] = [];
vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
    const context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    telemetryContexts.push(context);
    return await callback(context);
  }),
}));

import { onboardBinaries } from '../app/utils/runtimeDependencies';

describe('ensureBinaries (via onboardBinaries)', () => {
  let mockContext: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    telemetryContexts.length = 0;
    delete process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION;
    mockContext = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    } as any;
  });

  it('should skip binaries validation in devContainer workspace', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);

    await onboardBinaries(mockContext);

    expect(validateAndInstallBinaries).not.toHaveBeenCalled();
  });

  it('should validate and install binaries when setting is enabled and not in devContainer', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(true);
    vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);

    await onboardBinaries(mockContext);

    expect(validateAndInstallBinaries).toHaveBeenCalledWith(mockContext);
  });

  it('should not validate when setting is disabled', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(false);

    await onboardBinaries(mockContext);

    expect(validateAndInstallBinaries).not.toHaveBeenCalled();
  });

  it('should rethrow dependency validation failures in strict E2E mode', async () => {
    process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION = '1';
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(true);
    vi.mocked(validateAndInstallBinaries).mockRejectedValue(new Error('Bundle sidecar missing'));

    await expect(onboardBinaries(mockContext)).rejects.toThrow('Bundle sidecar missing');

    expect(validateAndInstallBinaries).toHaveBeenCalled();
  });
});

describe('useBinariesDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false in devContainer workspace', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(false);
  });

  it('should respect autoRuntimeDependenciesValidationAndInstallation setting when not in devContainer', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    const { getGlobalSetting } = await import('../app/utils/vsCodeConfig/settings');
    vi.mocked(getGlobalSetting).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(true);
  });
});

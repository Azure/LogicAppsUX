import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as azureStorage from 'azure-storage';
import { autoStartAzuriteSetting, localEmulatorConnectionString } from '../../../constants';
import { validateFuncCoreToolsInstalled } from '../../commands/funcCoreTools/validateFuncCoreToolsInstalled';
import { getAzureWebJobsStorage } from '../../utils/appSettings/localSettings';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { preDebugValidate, validateEmulatorIsRunning, azuriteProbeTimeoutMs } from '../validatePreDebug';

vi.mock('azure-storage', () => ({
  createBlobService: vi.fn(() => ({
    doesContainerExist: (_container: string, callback: (err?: Error) => void) => callback(new Error('connection refused')),
  })),
}));

vi.mock('../../commands/funcCoreTools/validateFuncCoreToolsInstalled', () => ({
  validateFuncCoreToolsInstalled: vi.fn(),
}));

vi.mock('../../utils/appSettings/localSettings', () => ({
  getAzureWebJobsStorage: vi.fn(),
  setLocalAppSetting: vi.fn(),
}));

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  getFunctionsWorkerRuntime: vi.fn(),
  getWorkspaceSetting: vi.fn(),
}));

describe('validatePreDebug', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  const context = {
    telemetry: {
      properties: {},
      measurements: {},
    },
    ui: {
      showWarningMessage: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    context.telemetry.properties = {};
    vi.mocked(getAzureWebJobsStorage).mockResolvedValue(localEmulatorConnectionString);
  });

  it('throws instead of showing a modal when auto-started Azurite cannot be reached', async () => {
    vi.mocked(validateFuncCoreToolsInstalled).mockResolvedValue(true);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      return key === autoStartAzuriteSetting ? true : undefined;
    });

    // This is the original hang: a modal here stalls resolveDebugConfiguration
    // forever because no headless session can answer it. Throwing surfaces the
    // same text through the non-modal command error notification instead.
    await expect(preDebugValidate(context, projectPath)).rejects.toThrow(/Failed to verify "AzureWebJobsStorage"/);
    expect(getAzureWebJobsStorage).toHaveBeenCalledTimes(1);
    expect(context.ui.showWarningMessage).not.toHaveBeenCalled();
  });

  it('gives up on a probe that never answers instead of hanging forever', async () => {
    // A listener that accepts the connection but never calls back — a half-started
    // emulator, or an unrelated process squatting on port 10000. Without the probe
    // timeout this call never settles, which is exactly the hang being fixed.
    vi.useFakeTimers();
    try {
      vi.mocked(azureStorage.createBlobService).mockReturnValueOnce({
        doesContainerExist: () => {
          /* never invokes the callback */
        },
      } as any);

      const pending = validateEmulatorIsRunning(context, projectPath, { promptWarningMessage: false });
      await vi.advanceTimersByTimeAsync(azuriteProbeTimeoutMs + 1);

      await expect(pending).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not block debug or show a modal when AzureWebJobsStorage is missing', async () => {
    vi.mocked(validateFuncCoreToolsInstalled).mockResolvedValue(true);
    vi.mocked(getAzureWebJobsStorage).mockResolvedValue(undefined);

    const result = await preDebugValidate(context, projectPath);

    // preDebugValidate runs inside resolveDebugConfiguration, so any awaited UI
    // stalls startDebugging() forever. Debug must continue exactly as it did
    // before the readiness work, and the warning must never be modal.
    expect(result).toBe(true);
    expect(context.ui.showWarningMessage).not.toHaveBeenCalled();
    expect(context.telemetry.properties.missingAzureWebJobsStorage).toBe('true');
  });

  it('keeps Debug anyway available when explicitly allowed', async () => {
    context.ui.showWarningMessage.mockImplementation(async (_message: string, _options: unknown, debugAnyway: unknown) => debugAnyway);

    const result = await validateEmulatorIsRunning(context, projectPath, { allowDebugAnyway: true });

    expect(result).toBe(true);
    expect(context.ui.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to verify "AzureWebJobsStorage"'),
      expect.objectContaining({ modal: true }),
      expect.objectContaining({ title: 'Debug anyway' })
    );
  });

  it('keeps Debug anyway available in pre-debug validation when Azurite auto-start is disabled', async () => {
    vi.mocked(validateFuncCoreToolsInstalled).mockResolvedValue(true);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      return key === autoStartAzuriteSetting ? false : undefined;
    });
    context.ui.showWarningMessage.mockImplementation(async (_message: string, _options: unknown, debugAnyway: unknown) => debugAnyway);

    const result = await preDebugValidate(context, projectPath);

    expect(result).toBe(true);
    expect(context.ui.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to verify "AzureWebJobsStorage"'),
      expect.objectContaining({ modal: true }),
      expect.objectContaining({ title: 'Debug anyway' })
    );
  });

  it('probes the local emulator when AzureWebJobsStorage uses development storage', async () => {
    await validateEmulatorIsRunning(context, projectPath, false);

    expect(azureStorage.createBlobService).toHaveBeenCalledWith(localEmulatorConnectionString);
  });

  it('uses a provided AzureWebJobsStorage value without rereading settings and still probes each call', async () => {
    await validateEmulatorIsRunning(context, projectPath, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });
    await validateEmulatorIsRunning(context, projectPath, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });

    expect(getAzureWebJobsStorage).not.toHaveBeenCalled();
    expect(azureStorage.createBlobService).toHaveBeenCalledTimes(2);
  });
});

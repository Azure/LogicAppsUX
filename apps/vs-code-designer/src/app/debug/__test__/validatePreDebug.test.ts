import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoStartAzuriteSetting, localEmulatorConnectionString } from '../../../constants';
import { validateFuncCoreToolsInstalled } from '../../commands/funcCoreTools/validateFuncCoreToolsInstalled';
import { getAzureWebJobsStorage } from '../../utils/appSettings/localSettings';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { preDebugValidate, validateEmulatorIsRunning } from '../validatePreDebug';

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

  it('does not offer Debug anyway when auto-started Azurite cannot be reached', async () => {
    vi.mocked(validateFuncCoreToolsInstalled).mockResolvedValue(true);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      return key === autoStartAzuriteSetting ? true : undefined;
    });

    const result = await preDebugValidate(context, projectPath);

    expect(result).toBe(false);
    expect(context.ui.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to verify "AzureWebJobsStorage"'),
      expect.objectContaining({ modal: true })
    );
  });

  it('blocks debug when AzureWebJobsStorage is missing', async () => {
    vi.mocked(validateFuncCoreToolsInstalled).mockResolvedValue(true);
    vi.mocked(getAzureWebJobsStorage).mockResolvedValue(undefined);

    const result = await preDebugValidate(context, projectPath);

    expect(result).toBe(false);
    expect(context.ui.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Missing required "AzureWebJobsStorage"'),
      expect.objectContaining({ modal: true })
    );
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
});

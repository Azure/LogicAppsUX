import { beforeEach, describe, expect, it, vi } from 'vitest';
import { preDebugValidate } from '../../debug/validatePreDebug';
import { verifyLocalConnectionKeys } from '../appSettings/connectionKeys';
import { activateAzurite } from '../azurite/activateAzurite';
import { startRuntimeApi } from '../startRuntimeApi';

const capturedMessages: string[] = [];
const telemetryContexts: any[] = [];
const azuriteTimeoutMessage =
  'Azurite did not become ready within "5" seconds. Make sure the Azurite extension is installed and running, then try debugging again.';

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
      const context = {
        telemetry: {
          properties: {},
          measurements: {},
        },
        errorHandling: {},
        ui: {
          showWarningMessage: vi.fn(async (message: string) => {
            capturedMessages.push(message);
            return undefined;
          }),
        },
      };
      telemetryContexts.push(context);
      try {
        return await callback(context);
      } catch (error) {
        if (!context.errorHandling.suppressDisplay) {
          capturedMessages.push(error instanceof Error ? error.message : String(error));
        }
        if (context.errorHandling.rethrow) {
          throw error;
        }
        return undefined;
      }
    }),
    UserCancelledError: class UserCancelledError extends Error {},
  };
});

vi.mock('../../debug/validatePreDebug', () => ({
  preDebugValidate: vi.fn(async () => {
    capturedMessages.push(
      'Failed to verify "AzureWebJobsStorage" connection specified in "local.settings.json". Is the local emulator installed and running?'
    );
    return false;
  }),
}));

vi.mock('../azurite/activateAzurite', () => ({
  activateAzurite: vi.fn(),
}));

vi.mock('../appSettings/connectionKeys', () => ({
  verifyLocalConnectionKeys: vi.fn(),
}));

describe('startRuntimeApi Azurite startup', () => {
  const projectPath = 'D:\\workspace\\LogicApp';

  beforeEach(() => {
    vi.clearAllMocks();
    capturedMessages.length = 0;
    telemetryContexts.length = 0;
    vi.mocked(activateAzurite).mockRejectedValue(new Error(azuriteTimeoutMessage));
    vi.mocked(verifyLocalConnectionKeys).mockResolvedValue(undefined);
  });

  it('stops runtime startup after Azurite auto-start fails without showing AzureWebJobsStorage warning', async () => {
    await startRuntimeApi(projectPath);

    expect(capturedMessages).toContain(azuriteTimeoutMessage);
    expect(activateAzurite).toHaveBeenCalledWith(telemetryContexts[1], projectPath);
    expect(capturedMessages).not.toContain(
      'Failed to verify "AzureWebJobsStorage" connection specified in "local.settings.json". Is the local emulator installed and running?'
    );
    expect(verifyLocalConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
  });
});

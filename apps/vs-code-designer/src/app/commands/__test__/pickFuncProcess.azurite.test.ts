import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { preDebugValidate } from '../../debug/validatePreDebug';
import { verifyLocalConnectionKeys } from '../../utils/appSettings/connectionKeys';
import { activateAzurite } from '../../utils/azurite/activateAzurite';
import { getProjFiles } from '../../utils/dotnet/dotnet';
import { tryBuildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';
import { pickFuncProcessInternal } from '../pickFuncProcess';

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

vi.mock('../../utils/azurite/activateAzurite', () => ({
  activateAzurite: vi.fn(),
}));

vi.mock('../../utils/appSettings/connectionKeys', () => ({
  verifyLocalConnectionKeys: vi.fn(),
}));

vi.mock('../../utils/dotnet/dotnet', () => ({
  getProjFiles: vi.fn(),
}));

vi.mock('../buildCustomCodeFunctionsProject', () => ({
  tryBuildCustomCodeFunctionsProject: vi.fn(),
}));

describe('pickFuncProcess Azurite startup', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  const workspaceFolder = { uri: vscode.Uri.file(projectPath), name: 'LogicApp', index: 0 };
  const debugConfig = { type: 'workflow', request: 'attach', name: 'Attach to Logic App' };
  const context = {
    telemetry: {
      properties: {},
      measurements: {},
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedMessages.length = 0;
    telemetryContexts.length = 0;
    vi.mocked(activateAzurite).mockRejectedValue(new Error(azuriteTimeoutMessage));
    vi.mocked(verifyLocalConnectionKeys).mockResolvedValue(undefined);
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(tryBuildCustomCodeFunctionsProject).mockResolvedValue(undefined);
  });

  it('stops debug startup after Azurite auto-start fails without showing AzureWebJobsStorage warning', async () => {
    await expect(pickFuncProcessInternal(context, debugConfig, workspaceFolder, projectPath)).rejects.toThrow(azuriteTimeoutMessage);

    expect(capturedMessages).not.toContain(azuriteTimeoutMessage);
    expect(activateAzurite).toHaveBeenCalledWith(telemetryContexts[0], projectPath);
    expect(capturedMessages).not.toContain(
      'Failed to verify "AzureWebJobsStorage" connection specified in "local.settings.json". Is the local emulator installed and running?'
    );
    expect(verifyLocalConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });
});

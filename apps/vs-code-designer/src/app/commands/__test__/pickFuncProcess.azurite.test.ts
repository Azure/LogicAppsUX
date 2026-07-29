import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { preDebugValidate } from '../../debug/validatePreDebug';
import { refreshConnectionKeys } from '../../utils/appSettings/connectionKeys';
import { activateAzurite } from '../../utils/azurite/activateAzurite';
import { getProjFiles } from '../../utils/dotnet/dotnet';
import { tryBuildCustomCodeFunctionsProject } from '../buildCustomCodeFunctionsProject';
import { pickFuncProcessInternal } from '../pickFuncProcess';

const capturedMessages: string[] = [];
const telemetryContexts: any[] = [];
// Stand-in for whatever bounded error `activateAzurite` rejects with. `activateAzurite` is mocked
// here, so this is the test's own rejection fixture. Deliberately the stable PREFIX only: the
// product's full sentence now reports measured elapsed seconds, so any longer copy here would be a
// stale duplicate that silently drifts. The real message is pinned in
// `src/app/utils/azurite/__test__/activateAzurite.test.ts`.
const azuriteTimeoutMessage = 'Azurite did not become ready';

// Hoisted so the module mock below and the tests share one class identity -- `instanceof` checks in
// the product and in the assertions must agree on which class this is.
const { UserCancelledErrorMock } = vi.hoisted(() => ({
  UserCancelledErrorMock: class UserCancelledError extends Error {},
}));

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
      const context = {
        telemetry: {
          properties: {},
          measurements: {},
        },
        errorHandling: {} as { suppressDisplay?: boolean; rethrow?: boolean },
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
        // Mirror the real library: a cancellation is never displayed AND never rethrown, whatever
        // the callback asked for -- `handleError` force-sets both knobs. That force-swallow is
        // exactly why the product must re-raise cancellations outside this scope rather than
        // relying on `rethrow`.
        if (error instanceof UserCancelledErrorMock) {
          return undefined;
        }
        if (!context.errorHandling.suppressDisplay) {
          capturedMessages.push(error instanceof Error ? error.message : String(error));
        }
        if (context.errorHandling.rethrow) {
          throw error;
        }
        return undefined;
      }
    }),
    UserCancelledError: UserCancelledErrorMock,
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
  refreshConnectionKeys: vi.fn(),
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
    vi.mocked(refreshConnectionKeys).mockResolvedValue(undefined);
    vi.mocked(getProjFiles).mockResolvedValue([]);
    vi.mocked(tryBuildCustomCodeFunctionsProject).mockResolvedValue(undefined);
  });

  it('stops debug startup after Azurite auto-start fails without showing AzureWebJobsStorage warning', async () => {
    await expect(pickFuncProcessInternal(context, debugConfig, workspaceFolder, projectPath)).rejects.toThrow(azuriteTimeoutMessage);

    // `capturedMessages` is empty ONLY because this test mocks the telemetry wrapper away and calls
    // `pickFuncProcessInternal` directly. In production the failure is shown exactly once, by the
    // outer scope that owns this command:
    // `registerCommandWithTreeNodeUnwrapping(extensionCommand.pickProcess, pickFuncProcess)` in
    // registerCommands.ts. The inner scope sets `suppressDisplay` so that single notification is
    // not duplicated -- `errorHandling` is allocated fresh per scope, so dropping it would show and
    // log the same message twice. Asserted separately from the message array so a regression in
    // either knob produces a readable diff instead of a bare "expected [] to equal [...]".
    expect(telemetryContexts[0].errorHandling).toEqual({ suppressDisplay: true, rethrow: true });
    expect(capturedMessages).toEqual([]);
    expect(capturedMessages).not.toContain(azuriteTimeoutMessage);
    expect(activateAzurite).toHaveBeenCalledWith(telemetryContexts[0], projectPath);
    expect(capturedMessages).not.toContain(
      'Failed to verify "AzureWebJobsStorage" connection specified in "local.settings.json". Is the local emulator installed and running?'
    );
    expect(refreshConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });

  it('aborts debug startup silently when the user dismisses an Azurite prompt', async () => {
    // `activateAzurite` prompts for the autostart opt-in and then for the Azurite directory.
    // Dismissing either throws `UserCancelledError`, which the telemetry wrapper force-swallows.
    // Without explicit propagation the dismissal would fall through to `preDebugValidate` and
    // re-open the modal "Debug anyway" hang. Nothing is displayed: a deliberate cancellation is
    // not an error the user needs to be told about.
    vi.mocked(activateAzurite).mockRejectedValue(new UserCancelledErrorMock('autoStartAzurite'));

    await expect(pickFuncProcessInternal(context, debugConfig, workspaceFolder, projectPath)).rejects.toBeInstanceOf(
      UserCancelledErrorMock
    );

    expect(capturedMessages).toEqual([]);
    expect(refreshConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });
});

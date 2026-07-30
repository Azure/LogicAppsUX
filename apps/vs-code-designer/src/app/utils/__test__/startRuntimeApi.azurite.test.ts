import { beforeEach, describe, expect, it, vi } from 'vitest';
import { preDebugValidate } from '../../debug/validatePreDebug';
import { refreshConnectionKeys } from '../appSettings/connectionKeys';
import { activateAzurite } from '../azurite/activateAzurite';
import { startRuntimeApi } from '../startRuntimeApi';

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

vi.mock('../azurite/activateAzurite', () => ({
  activateAzurite: vi.fn(),
}));

vi.mock('../appSettings/connectionKeys', () => ({
  refreshConnectionKeys: vi.fn(),
}));

describe('startRuntimeApi Azurite startup', () => {
  const projectPath = 'D:\\workspace\\LogicApp';

  beforeEach(() => {
    vi.clearAllMocks();
    capturedMessages.length = 0;
    telemetryContexts.length = 0;
    vi.mocked(activateAzurite).mockRejectedValue(new Error(azuriteTimeoutMessage));
    vi.mocked(refreshConnectionKeys).mockResolvedValue(undefined);
  });

  it('stops runtime startup after Azurite auto-start fails without showing AzureWebJobsStorage warning', async () => {
    await startRuntimeApi(projectPath);

    // The inner Azurite telemetry scope sets `errorHandling.suppressDisplay = true` and rethrows, so
    // only the outer scope surfaces the failure. Assert exactly one occurrence: dropping
    // `suppressDisplay` in the product makes the user see the same error twice, and a bare
    // `toContain` cannot tell the difference.
    expect(capturedMessages.filter((message) => message === azuriteTimeoutMessage)).toHaveLength(1);
    expect(activateAzurite).toHaveBeenCalledWith(telemetryContexts[1], projectPath);
    expect(capturedMessages).not.toContain(
      'Failed to verify "AzureWebJobsStorage" connection specified in "local.settings.json". Is the local emulator installed and running?'
    );
    expect(refreshConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
  });

  it('aborts runtime startup silently when the user dismisses an Azurite prompt', async () => {
    // The cancellation is re-raised in the outer `startRuntimeProcess` scope, which swallows it the
    // same way -- so the call resolves, but nothing downstream runs and nothing is shown. Without
    // the propagation this would continue into `preDebugValidate` and re-open the modal hang.
    vi.mocked(activateAzurite).mockRejectedValue(new UserCancelledErrorMock('autoStartAzurite'));

    await startRuntimeApi(projectPath);

    expect(capturedMessages).toEqual([]);
    expect(refreshConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
  });
});

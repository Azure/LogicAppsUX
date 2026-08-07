import { beforeEach, describe, expect, it, vi } from 'vitest';
import { preDebugValidate } from '../../debug/validatePreDebug';
import { refreshConnectionKeys } from '../appSettings/connectionKeys';
import { activateAzurite } from '../azurite/activateAzurite';
import { startRuntimeApi } from '../startRuntimeApi';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

const azuriteTimeoutMessage = 'Azurite did not become ready';

const { UserCancelledErrorMock } = vi.hoisted(() => ({
  UserCancelledErrorMock: class UserCancelledError extends Error {},
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  UserCancelledError: UserCancelledErrorMock,
  callWithTelemetryAndErrorHandling: vi.fn(async (_callbackId: string, callback: (context: any) => Promise<unknown>) => {
    const context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: true, rethrow: true, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    };
    return await callback(context);
  }),
}));

vi.mock('../../debug/validatePreDebug', () => ({
  preDebugValidate: vi.fn(async () => false),
}));

vi.mock('../azurite/activateAzurite', () => ({
  activateAzurite: vi.fn(),
}));

vi.mock('../appSettings/connectionKeys', () => ({
  refreshConnectionKeys: vi.fn(),
}));

describe('startRuntimeApi Azurite startup', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  let context: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { suppressDisplay: false, rethrow: false, issueProperties: {} },
      ui: {} as any,
      valuesToMask: [],
    } as unknown as IActionContext;
    vi.mocked(activateAzurite).mockRejectedValue(new Error(azuriteTimeoutMessage));
    vi.mocked(refreshConnectionKeys).mockResolvedValue(undefined);
  });

  it('stops runtime startup after Azurite auto-start fails without showing AzureWebJobsStorage warning', async () => {
    await expect(startRuntimeApi(context, projectPath)).rejects.toThrow(azuriteTimeoutMessage);

    expect(activateAzurite).toHaveBeenCalledWith(expect.any(Object), projectPath);
    expect(refreshConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
  });

  it('aborts runtime startup when the user dismisses an Azurite prompt', async () => {
    vi.mocked(activateAzurite).mockRejectedValue(new UserCancelledErrorMock('autoStartAzurite'));

    await expect(startRuntimeApi(context, projectPath)).rejects.toThrow(UserCancelledErrorMock);

    expect(refreshConnectionKeys).not.toHaveBeenCalled();
    expect(preDebugValidate).not.toHaveBeenCalled();
  });
});

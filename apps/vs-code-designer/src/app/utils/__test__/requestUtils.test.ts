import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendRequestWithExtTimeout } from '../requestUtils';
import { timeoutKey } from '../../../constants';

const { sendRequestWithTimeout, getWorkspaceSetting } = vi.hoisted(() => ({
  sendRequestWithTimeout: vi.fn<(...args: unknown[]) => Promise<{ bodyAsText: string }>>(),
  getWorkspaceSetting: vi.fn<() => number | undefined>(),
}));

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  sendRequestWithTimeout,
}));

vi.mock('../vsCodeConfig/settings', () => ({ getWorkspaceSetting }));
vi.mock('../../../extensionVariables', () => ({ ext: { prefix: 'azureLogicAppsStandard' } }));
vi.mock('../../../localize', () => ({
  localize: (_key: string, message: string, ...args: string[]) =>
    message.replace(/\{(\d+)\}/g, (_match, index: string) => args[Number(index)]),
}));
vi.mock('@microsoft/vscode-azext-utils', () => ({
  nonNullValue: <T>(value: T | undefined, name: string): T => {
    if (value === undefined) {
      throw new Error(`Missing value: ${name}`);
    }
    return value;
  },
  parseError: (error: Error) => ({ errorType: error.name, message: error.message }),
}));

const context = { telemetry: { properties: {}, measurements: {} } } as never;
const options = { method: 'GET', url: 'https://feed.example/index.json' };

describe('sendRequestWithExtTimeout', () => {
  beforeEach(() => {
    sendRequestWithTimeout.mockReset();
    getWorkspaceSetting.mockReset().mockReturnValue(30);
  });

  it.each([1, 30, 90])('delegates exactly one request with the configured %i-second timeout and no retry deadline', async (seconds) => {
    getWorkspaceSetting.mockReturnValue(seconds);
    const response = { bodyAsText: '["1.0.0"]' };
    sendRequestWithTimeout.mockResolvedValue(response);

    await expect(sendRequestWithExtTimeout(context, options)).resolves.toBe(response);
    expect(getWorkspaceSetting).toHaveBeenCalledExactlyOnceWith(timeoutKey);
    expect(sendRequestWithTimeout).toHaveBeenCalledExactlyOnceWith(context, options, seconds * 1000, undefined);
  });

  it('rejects missing timeout configuration before issuing a request', async () => {
    getWorkspaceSetting.mockReturnValue(undefined);

    await expect(sendRequestWithExtTimeout(context, options)).rejects.toThrow(`Missing value: ${timeoutKey}`);
    expect(sendRequestWithTimeout).not.toHaveBeenCalled();
  });

  it('preserves the original timeout error as cause without a synthetic retry code', async () => {
    const cause = new Error('SDK request aborted');
    cause.name = 'REQUEST_ABORTED_ERROR';
    sendRequestWithTimeout.mockRejectedValue(cause);

    const failure = sendRequestWithExtTimeout(context, options);
    await expect(failure).rejects.toMatchObject({
      message: `Request timed out. Modify setting "azureLogicAppsStandard.${timeoutKey}" if you want to extend the timeout.`,
      cause,
    });
    await expect(failure.catch((error: Error) => error.cause)).resolves.toBe(cause);
    await expect(failure).rejects.not.toHaveProperty('code');
    expect(sendRequestWithTimeout).toHaveBeenCalledTimes(1);
  });

  it('keeps transport error context and the exact original cause on the first failure', async () => {
    const cause = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    sendRequestWithTimeout.mockRejectedValue(cause);

    const failure = sendRequestWithExtTimeout(context, options);
    await expect(failure).rejects.toMatchObject({
      message: `${options.url} request failed with error: ${cause}`,
      cause,
    });
    await expect(failure.catch((error: Error) => error.cause)).resolves.toBe(cause);
    expect(sendRequestWithTimeout).toHaveBeenCalledTimes(1);
  });
});

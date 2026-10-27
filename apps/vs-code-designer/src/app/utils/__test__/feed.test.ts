import { getJsonFeed } from '../feed';
import { sendRequestWithExtTimeout } from '../requestUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../requestUtils', () => ({
  sendRequestWithExtTimeout: vi.fn(),
}));

vi.mock('../vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(() => 30),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  nonNullProp: <T extends object, K extends keyof T>(source: T, name: K): NonNullable<T[K]> => {
    const value = source[name];
    if (value === null || value === undefined) {
      throw new Error(`Missing property: ${String(name)}`);
    }
    return value;
  },
}));

const request = vi.mocked(sendRequestWithExtTimeout);
const context = { telemetry: { properties: {}, measurements: {} } } as never;

describe('getJsonFeed retry ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries transient transport failures only when explicitly enabled', async () => {
    const error = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    request.mockRejectedValueOnce(error).mockResolvedValueOnce({ bodyAsText: '["1.0.0"]' } as never);

    await expect(
      getJsonFeed(context, `https://feed.example/transient-${Date.now()}.json`, { retry: { sleep: async () => {} } })
    ).resolves.toEqual(['1.0.0']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not retry transport failures for feeds that did not opt in', async () => {
    const error = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    request.mockRejectedValue(error);

    await expect(getJsonFeed(context, `https://feed.example/default-${Date.now()}.json`)).rejects.toThrow('socket reset');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries timeout markers and nested aggregate transport causes', async () => {
    const timeout = Object.assign(new Error('request timeout'), { code: 'ETIMEDOUT' });
    request.mockRejectedValueOnce(timeout).mockResolvedValueOnce({ bodyAsText: '["timeout-recovered"]' } as never);
    await expect(
      getJsonFeed(context, `https://feed.example/timeout-${Date.now()}.json`, { retry: { sleep: async () => {} } })
    ).resolves.toEqual(['timeout-recovered']);
    expect(request).toHaveBeenCalledTimes(2);

    request.mockReset();
    const reset = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    const wrapped = new Error('request failed', { cause: new AggregateError([reset]) });
    request.mockRejectedValueOnce(wrapped).mockResolvedValueOnce({ bodyAsText: '["aggregate-recovered"]' } as never);
    await expect(
      getJsonFeed(context, `https://feed.example/aggregate-${Date.now()}.json`, { retry: { sleep: async () => {} } })
    ).resolves.toEqual(['aggregate-recovered']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not retry authorization failures or malformed JSON', async () => {
    const forbidden = Object.assign(new Error('forbidden'), { response: { status: 403 } });
    request.mockRejectedValueOnce(forbidden);
    await expect(
      getJsonFeed(context, `https://feed.example/forbidden-${Date.now()}.json`, { retry: { sleep: async () => {} } })
    ).rejects.toThrow('forbidden');
    expect(request).toHaveBeenCalledTimes(1);

    request.mockReset();
    request.mockResolvedValue({ bodyAsText: '{invalid' } as never);
    await expect(
      getJsonFeed(context, `https://feed.example/malformed-${Date.now()}.json`, { retry: { sleep: async () => {} } })
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('bounds retryable status failures to three total attempts', async () => {
    const unavailable = Object.assign(new Error('unavailable'), { response: { status: 503 } });
    request.mockRejectedValue(unavailable);

    await expect(
      getJsonFeed(context, `https://feed.example/exhausted-${Date.now()}.json`, { retry: { sleep: async () => {} } })
    ).rejects.toThrow('unavailable');
    expect(request).toHaveBeenCalledTimes(3);
  });
});

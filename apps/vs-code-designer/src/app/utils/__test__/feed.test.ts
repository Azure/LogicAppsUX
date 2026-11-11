import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getJsonFeed } from '../feed';

const { request } = vi.hoisted(() => ({
  request: vi.fn<(...args: unknown[]) => Promise<{ bodyAsText?: string }>>(),
}));

vi.mock('../requestUtils', () => ({
  sendRequestWithExtTimeout: request,
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

const context = { telemetry: { properties: {}, measurements: {} } } as never;
const cacheDurationMs = 10 * 60 * 1000;
let url: string;

describe('getJsonFeed single-request contract', () => {
  beforeEach(({ task }) => {
    request.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    url = `https://feed.example/${encodeURIComponent(task.name)}.json`;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses JSON including BOM, comments and trailing commas with one configured-timeout request', async () => {
    request.mockResolvedValue({ bodyAsText: '\uFEFF{ /* feed */ "versions": ["1.0.0",], }' });

    await expect(getJsonFeed(context, url)).resolves.toEqual({ versions: ['1.0.0'] });
    expect(request).toHaveBeenCalledExactlyOnceWith(context, { method: 'GET', url });
  });

  it('caches the same URL through the existing ten-minute boundary and refetches after expiration', async () => {
    request.mockResolvedValueOnce({ bodyAsText: '["1.0.0"]' }).mockResolvedValueOnce({ bodyAsText: '["2.0.0"]' });
    const first = await getJsonFeed(context, url);

    await vi.advanceTimersByTimeAsync(cacheDurationMs);
    expect(await getJsonFeed(context, url)).toBe(first);
    expect(request).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(getJsonFeed(context, url)).resolves.toEqual(['2.0.0']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps different feed URLs independent', async () => {
    request.mockResolvedValueOnce({ bodyAsText: '["index"]' }).mockResolvedValueOnce({ bodyAsText: '["dependency"]' });

    await expect(getJsonFeed(context, url)).resolves.toEqual(['index']);
    await expect(getJsonFeed(context, 'https://feed.example/dependency.json')).resolves.toEqual(['dependency']);
    await expect(getJsonFeed(context, url)).resolves.toEqual(['index']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }),
    Object.assign(new Error('request timeout'), { code: 'ETIMEDOUT' }),
    Object.assign(new Error('network unreachable'), { code: 'ENETUNREACH' }),
    new Error('request failed', { cause: new AggregateError([Object.assign(new Error('DNS unavailable'), { code: 'EAI_AGAIN' })]) }),
    Object.assign(new Error('forbidden'), { response: { status: 403 } }),
    Object.assign(new Error('request expired'), { status: 408 }),
    new Error('rate limited', { cause: Object.assign(new Error('too many requests'), { statusCode: 429 }) }),
    Object.assign(new Error('unavailable'), { response: { status: 503 } }),
  ])('propagates $message without retrying or caching the failure', async (error) => {
    request.mockRejectedValueOnce(error).mockResolvedValueOnce({ bodyAsText: '["recovered"]' });

    await expect(getJsonFeed(context, url)).rejects.toBe(error);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(1);

    await expect(getJsonFeed(context, url)).resolves.toEqual(['recovered']);
    expect(request).toHaveBeenCalledTimes(2);
    await expect(getJsonFeed(context, url)).resolves.toEqual(['recovered']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    { body: { bodyAsText: '{invalid' }, message: /InvalidSymbol near line/ },
    { body: {}, message: 'Missing property: bodyAsText' },
  ])('rejects invalid or missing bodies without retrying or caching them: $body', async ({ body, message }) => {
    request.mockResolvedValueOnce(body).mockResolvedValueOnce({ bodyAsText: '["valid"]' });

    await expect(getJsonFeed(context, url)).rejects.toThrow(message);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(1);

    await expect(getJsonFeed(context, url)).resolves.toEqual(['valid']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not serve an expired feed when its refresh fails', async () => {
    const error = new Error('refresh failed');
    request.mockResolvedValueOnce({ bodyAsText: '["old"]' }).mockRejectedValueOnce(error).mockResolvedValueOnce({ bodyAsText: '["new"]' });

    await expect(getJsonFeed(context, url)).resolves.toEqual(['old']);
    await vi.advanceTimersByTimeAsync(cacheDurationMs + 1);
    await expect(getJsonFeed(context, url)).rejects.toBe(error);
    await expect(getJsonFeed(context, url)).resolves.toEqual(['new']);
    expect(request).toHaveBeenCalledTimes(3);
  });
});

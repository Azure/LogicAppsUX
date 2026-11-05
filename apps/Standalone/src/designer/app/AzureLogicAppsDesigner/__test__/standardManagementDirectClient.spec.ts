import type { HttpRequestOptions } from '@microsoft/logic-apps-shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StandardManagementDirectClient } from '../Services/StandardManagementDirectClient';

const uri = 'https://runtime.example.test/admin/workflows';

function response(body = '', status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('StandardManagementDirectClient', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: StandardManagementDirectClient;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(response('{"name":"workflow"}'));
    vi.stubGlobal('fetch', fetchMock);
    client = new StandardManagementDirectClient();
  });

  afterEach(() => {
    client.dispose();
    vi.unstubAllGlobals();
  });

  it('preserves explicit credentials, merges queries, and disables ambient credentials, redirects, and caching', async () => {
    const options: HttpRequestOptions<unknown> = {
      uri: `${uri}?api-version=old&existing=a%2Bb#fragment`,
      queryParameters: { 'api-version': '2025-01-01', $filter: 'name eq "a&b"', top: 2 },
      headers: { aUtHoRiZaTiOn: 'Bearer synthetic-session', 'x-functions-key': 'synthetic-key', 'x-custom': ['first', 'second'] },
      includeAuth: true,
      noAuth: true,
      skipBatch: false,
      type: 'POST',
    };

    await expect(client.get(options)).resolves.toEqual({ name: 'workflow' });

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${uri}?api-version=2025-01-01&existing=a%2Bb&%24filter=name+eq+%22a%26b%22&top=2#fragment`,
      {
        method: 'GET',
        headers: expect.any(Headers),
        body: undefined,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
      }
    );
    const init = fetchMock.mock.calls[0][1]!;
    expect(Object.fromEntries((init.headers as Headers).entries())).toEqual({
      authorization: 'Bearer synthetic-session',
      'x-functions-key': 'synthetic-key',
      'x-custom': 'first, second',
    });
    expect(options.uri).toBe(`${uri}?api-version=old&existing=a%2Bb#fragment`);
  });

  it.each(['get', 'post', 'patch', 'put', 'delete'] as const)('dispatches %s without injecting authorization', async (method) => {
    const dispatch: (options: HttpRequestOptions<unknown>) => Promise<unknown> = client[method];
    await expect(dispatch.call(client, { uri, includeAuth: true })).resolves.toEqual({ name: 'workflow' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: method.toUpperCase(),
      body: undefined,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    expect(Object.fromEntries((fetchMock.mock.calls[0][1]!.headers as Headers).entries())).toEqual({});
  });

  it.each(['post', 'patch', 'put', 'delete'] as const)('sends the exact JSON body for %s', async (method) => {
    const dispatch: (options: HttpRequestOptions<unknown>) => Promise<unknown> = client[method];
    await dispatch.call(client, { uri, content: { enabled: false, count: 0, value: null }, headers: { 'x-request-id': 'request' } });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe('{"enabled":false,"count":0,"value":null}');
    expect(Object.fromEntries((init.headers as Headers).entries())).toEqual({
      'content-type': 'application/json',
      'x-request-id': 'request',
    });
  });

  it.each([
    [undefined, undefined, null],
    [null, 'null', 'application/json'],
    [false, 'false', 'application/json'],
    [0, '0', 'application/json'],
    ['{"raw":true}', '{"raw":true}', 'application/json'],
  ])('distinguishes content %j from an absent body', async (content, body, contentType) => {
    await client.post({ uri, content });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe(body);
    expect((init.headers as Headers).get('Content-Type')).toBe(contentType);
  });

  it('respects an explicitly supplied content type', async () => {
    await client.put({ uri, content: 'plain text', headers: { 'content-type': 'text/plain' } });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe('plain text');
    expect((init.headers as Headers).get('Content-Type')).toBe('text/plain');
  });

  it('leaves multipart bodies and their boundary to fetch', async () => {
    const content = new FormData();
    content.append('name', 'workflow');
    await client.post({ uri, content });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe(content);
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
  });

  it.each([401, 403, 429, 503])('preserves numeric HTTP %s, structured error body, and Retry-After without retrying', async (status) => {
    const data = {
      error: { code: 'DirectAccessRequestThrottled', message: 'Wait before retrying.', details: [{ target: 'workflow', code: 'Busy' }] },
    };
    fetchMock.mockResolvedValue(response(JSON.stringify(data), status, { 'Retry-After': '17' }));
    const error = await client
      .post({
        uri,
        content: { operation: 'save' },
        headers: { Authorization: 'Bearer synthetic-session', 'x-functions-key': 'synthetic-key' },
      })
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ status, data, error: data.error, message: data.error.message, retryAfter: '17' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveProperty('request');
    expect(error).not.toHaveProperty('config');
    expect(error).not.toHaveProperty('response');
    expect(JSON.stringify(error)).not.toMatch(/synthetic-session|synthetic-key|runtime\.example\.test/);
  });

  it('preserves an HTTP-date Retry-After and handles empty failure bodies', async () => {
    const retryAfter = 'Fri, 23 Oct 2026 22:00:00 GMT';
    fetchMock.mockResolvedValue(response('', 503, { 'Retry-After': retryAfter }));
    await expect(client.get({ uri })).rejects.toMatchObject({ status: 503, data: undefined, retryAfter });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([200, 202, 204])('returns undefined for an empty HTTP %s success', async (status) => {
    fetchMock.mockResolvedValue(response('', status));
    await expect(client.get({ uri })).resolves.toBeUndefined();
  });

  it('merges response headers with JSON data when requested', async () => {
    fetchMock.mockResolvedValue(response('{"name":"workflow"}', 200, { ETag: '"version"' }));
    await expect(client.get({ uri, returnHeaders: true })).resolves.toEqual({
      name: 'workflow',
      responseHeaders: { etag: '"version"' },
    });
  });

  it('returns headers for an empty response when requested', async () => {
    fetchMock.mockResolvedValue(response('', 204, { 'x-request-id': 'request' }));
    await expect(client.delete({ uri, returnHeaders: true })).resolves.toEqual({ responseHeaders: { 'x-request-id': 'request' } });
  });

  it('rejects invalid JSON on an HTTP success', async () => {
    fetchMock.mockResolvedValue(response('{invalid', 200));
    await expect(client.get({ uri })).rejects.toBeInstanceOf(SyntaxError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500, 503])('retains HTTP %s, the original non-JSON body, and Retry-After', async (status) => {
    const data = '<html>Service unavailable</html>';
    fetchMock.mockResolvedValue(response(data, status, { 'Retry-After': '1' }));
    const request = client.post({ uri, content: {} });
    await expect(request).rejects.toMatchObject({ status, data, retryAfter: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retains an HTTP throttle response when its body cannot be read', async () => {
    const failedResponse = response('', 429, { 'Retry-After': '1' });
    vi.mocked(failedResponse.text).mockRejectedValue(new TypeError('Synthetic body read failure'));
    fetchMock.mockResolvedValue(failedResponse);
    await expect(client.post({ uri, content: {} })).rejects.toMatchObject({ status: 429, retryAfter: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates network and redirect failures unchanged without replay', async () => {
    const error = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(error);
    await expect(client.post({ uri, content: null })).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates response body read failures unchanged', async () => {
    const error = new TypeError('Response body failed');
    const failedResponse = response();
    vi.mocked(failedResponse.text).mockRejectedValue(error);
    fetchMock.mockResolvedValue(failedResponse);
    await expect(client.get({ uri })).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { HttpClient, HttpOptions } from '../httpClient';
import type { HttpRequestOptions } from '@microsoft/logic-apps-shared';

vi.mock('axios');

describe('HttpClient', () => {
  const baseUrl = 'https://example.com';
  const accessToken = 'test-token';
  const apiHubBaseUrl = 'https://apihub.example.com';
  const hostVersion = '1.0.0';

  const httpClientOptions: HttpOptions = {
    baseUrl,
    accessToken,
    apiHubBaseUrl,
    hostVersion,
  };

  const httpClient = new HttpClient(httpClientOptions);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should make a GET request', async () => {
    const responseData = { data: 'test-data' };
    (axios as any).mockResolvedValue({ data: responseData });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-get',
      headers: {},
    };

    const result = await httpClient.get(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${baseUrl}/test-get`,
        headers: expect.objectContaining({
          Authorization: accessToken,
        }),
      })
    );
  });

  it('should make a POST request', async () => {
    const responseData = { data: JSON.stringify({ result: 'test-result' }) };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-post',
      headers: {},
      content: { key: 'value' },
    };

    const result = await httpClient.post(options);

    expect(result).toEqual({ result: 'test-result' });
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `${baseUrl}/test-post`,
        headers: expect.objectContaining({
          Authorization: accessToken,
          'Content-Type': 'application/json',
        }),
        data: options.content,
      })
    );
  });

  it('should make a PUT request', async () => {
    const responseData = { data: JSON.stringify({ result: 'test-result' }) };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-put',
      headers: {},
      content: { key: 'value' },
    };

    const result = await httpClient.put(options);

    expect(result).toEqual({ result: 'test-result' });
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: `${baseUrl}/test-put`,
        headers: expect.objectContaining({
          Authorization: accessToken,
          'Content-Type': 'application/json',
        }),
        data: options.content,
      })
    );
  });

  it('should make a DELETE request', async () => {
    const responseData = { data: 'test-data' };
    (axios as any).mockResolvedValue({ data: responseData });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-delete',
      headers: {},
    };

    const result = await httpClient.delete(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: `${baseUrl}/test-delete`,
        headers: expect.objectContaining({
          Authorization: accessToken,
        }),
      })
    );
  });
});

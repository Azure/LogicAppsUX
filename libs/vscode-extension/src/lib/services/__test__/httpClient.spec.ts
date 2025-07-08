import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
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

  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient(httpClientOptions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should make a successful GET request without arm resourceid', async () => {
    const responseData = { data: 'test-data' };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-get',
      headers: {},
    };

    const result = await httpClient.get(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'GET',
      uri: '/test-get',
      url: `${baseUrl}/test-get`,
      headers: {
        Authorization: '',
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
      },
    });
  });

  it('should make a successful GET request with arm resourceid', async () => {
    const responseData = { data: 'test-data' };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test/subscriptions/subscription-test/test-get',
      headers: {},
    };

    const result = await httpClient.get(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'GET',
      uri: '/test/subscriptions/subscription-test/test-get',
      url: `${apiHubBaseUrl}/test/subscriptions/subscription-test/test-get`,
      headers: {
        Authorization: 'test-token',
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
      },
    });
  });

  it('should throw an error when GET request returns an error', async () => {
    const errorMessage = 'Network Error';
    (axios as any).mockRejectedValueOnce(new Error(errorMessage)); // Simulate error

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-get',
      headers: {},
    };

    await expect(httpClient.get(options)).rejects.toThrow(errorMessage);
  });

  it('should make a POST request', async () => {
    const responseData = { data: { result: 'test-result' } };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-post',
      headers: {},
      content: { key: 'value' },
    };

    const result = await httpClient.post(options);

    expect(result).toEqual({ data: { result: 'test-result' } });
    expect(axios).toHaveBeenCalledWith({
      method: 'POST',
      url: `${baseUrl}/test-post`,
      headers: {
        Authorization: 'test-token',
        'Content-Type': 'application/json',
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
      },
      data: options.content,
      content: { key: 'value' },
      uri: '/test-post',
      commandName: 'Designer.httpClient.post',
    });
  });

  it('should make a successful POST request with arm resourceid', async () => {
    const responseData = { data: { result: 'test-result' } };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test/subscriptions/subscription-test/test-get',
      headers: {},
      content: { key: 'value' },
    };

    const result = await httpClient.post(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'POST',
      url: `${apiHubBaseUrl}/test/subscriptions/subscription-test/test-get`,
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
      },
      data: options.content,
      content: { key: 'value' },
      uri: '/test/subscriptions/subscription-test/test-get',
      commandName: 'Designer.httpClient.post',
    });
  });

  it('should throw an error when POST request returns an error', async () => {
    const errorMessage = 'Network Error';
    (axios as any).mockRejectedValueOnce(new Error(errorMessage)); // Simulate error

    const options: HttpRequestOptions<unknown> = {
      uri: '/test/subscriptions/subscription-test/test-get',
      headers: {},
      content: { key: 'value' },
    };

    await expect(httpClient.post(options)).rejects.toThrow(errorMessage);
  });

  it('should throw the error message when POST request returns an error', async () => {
    const errorMessage = 'Network Error';
    (axios as any).mockRejectedValueOnce(new Error(errorMessage)); // Simulate error

    const options: HttpRequestOptions<unknown> = {
      uri: '/test/subscriptions/subscription-test/test-get',
      headers: {},
      content: { key: 'value' },
    };

    try {
      await httpClient.post(options);
    } catch (error) {
      expect(error.message).toBe(errorMessage);
    }
  });

  it('should make a PUT request', async () => {
    const responseData = { data: { result: 'test-result' } };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-put',
      headers: {},
      content: { key: 'value' },
    };

    const result = await httpClient.put(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'PUT',
      url: `${baseUrl}/test-put`,
      content: { key: 'value' },
      headers: {
        Authorization: '',
        'Content-Type': 'application/json',
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
      },
      uri: '/test-put',
      data: options.content,
      commandName: 'Designer.httpClient.put',
    });
  });

  it('should make a successful PUT request with arm resourceid', async () => {
    const responseData = { data: { result: 'test-result' } };
    (axios as any).mockResolvedValue({ data: responseData, status: 200 });

    const options: HttpRequestOptions<unknown> = {
      uri: '/test/subscriptions/subscription-test/test-get',
      headers: {},
      content: { key: 'value' },
    };

    const result = await httpClient.put(options);

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'PUT',
      url: `${apiHubBaseUrl}/test/subscriptions/subscription-test/test-get`,
      content: { key: 'value' },
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
      },
      uri: '/test/subscriptions/subscription-test/test-get',
      data: options.content,
      commandName: 'Designer.httpClient.put',
    });
  });

  it('should throw an error when PUT request returns an error', async () => {
    const errorMessage = { error: { message: 'Not Found' } };
    (axios as any).mockRejectedValueOnce({ response: { status: 404, data: errorMessage } }); // Simulate 404 error

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-put-not-found',
      headers: {},
      content: { key: 'value' },
    };

    await expect(httpClient.put(options)).rejects.toEqual({ status: 404, ...errorMessage });
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
    expect(axios).toHaveBeenCalledWith({
      method: 'DELETE',
      uri: '/test-delete',
      headers: {
        'x-ms-user-agent': 'LogicAppsDesigner/(host vscode 1.0.0)',
        Authorization: accessToken,
      },
    });
  });

  it('should throw an error when DELETE request returns an error', async () => {
    const errorMessage = 'Network Error';
    (axios as any).mockRejectedValueOnce(new Error(errorMessage)); // Simulate error

    const options: HttpRequestOptions<unknown> = {
      uri: '/test-delete',
      headers: {},
    };

    await expect(httpClient.delete(options)).rejects.toThrow(errorMessage);
  });
});

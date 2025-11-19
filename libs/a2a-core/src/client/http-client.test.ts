import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from './http-client';
import type { AuthConfig } from './types';

// Mock fetch globally
global.fetch = vi.fn();

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should add bearer token to requests', async () => {
      const authConfig: AuthConfig = {
        type: 'bearer',
        token: 'test-token-123',
      };

      client = new HttpClient('https://api.test.com', authConfig);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/test');
      expect(request.headers.get('Authorization')).toBe('Bearer test-token-123');
    });

    it('should add API key to requests', async () => {
      const authConfig: AuthConfig = {
        type: 'api-key',
        key: 'api-key-456',
        header: 'X-API-Key',
      };

      client = new HttpClient('https://api.test.com', authConfig);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/test');
      expect(request.headers.get('X-API-Key')).toBe('api-key-456');
    });

    it('should handle custom auth function', async () => {
      const authConfig: AuthConfig = {
        type: 'custom',
        handler: async (request) => {
          request.headers.set('X-Custom-Auth', 'custom-value');
          return request;
        },
      };

      client = new HttpClient('https://api.test.com', authConfig);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/test');
      expect(request.headers.get('X-Custom-Auth')).toBe('custom-value');
    });

    it('should add X-API-Key header when apiKey is provided', async () => {
      const apiKey = 'standalone-api-key-789';
      client = new HttpClient('https://api.test.com', undefined, {}, apiKey);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/test');
      expect(request.headers.get('X-API-Key')).toBe('standalone-api-key-789');
    });

    it('should use both auth config and standalone API key when both are provided', async () => {
      const authConfig: AuthConfig = {
        type: 'bearer',
        token: 'bearer-token',
      };
      const apiKey = 'standalone-api-key';

      client = new HttpClient('https://api.test.com', authConfig, {}, apiKey);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/test', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/test');
      expect(request.headers.get('Authorization')).toBe('Bearer bearer-token');
      expect(request.headers.get('X-API-Key')).toBe('standalone-api-key');
    });
  });

  describe('request methods', () => {
    beforeEach(() => {
      client = new HttpClient('https://api.test.com');
    });

    it('should make GET requests', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      } as Response);

      const result = await client.get('/resource');

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/resource');
      expect(request.method).toBe('GET');
      expect(request.headers.get('Content-Type')).toBe('application/json');
      expect(request.headers.get('Accept')).toBe('application/json');
      expect(result).toEqual({ data: 'test' });
    });

    it('should make POST requests with body', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockImplementationOnce(async (request) => {
        // Clone request to read body without consuming it
        const req = request as Request;
        const clonedReq = req.clone();
        const body = await clonedReq.text();
        expect(body).toBe(JSON.stringify({ name: 'test', value: 42 }));

        return {
          ok: true,
          json: async () => ({ id: '123' }),
        } as Response;
      });

      const body = { name: 'test', value: 42 };
      const result = await client.post('/resource', body);

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/resource');
      expect(request.method).toBe('POST');
      expect(result).toEqual({ id: '123' });
    });

    it('should make DELETE requests', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      } as Response);

      await client.delete('/resource/123');

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.url).toBe('https://api.test.com/resource/123');
      expect(request.method).toBe('DELETE');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      // Use no retries for error tests to avoid timeouts
      client = new HttpClient('https://api.test.com', undefined, { retries: 0 });
    });

    it('should throw error for non-ok responses', async () => {
      const mockFetch = vi.mocked(fetch);
      // Mock all retry attempts to fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Resource not found',
      } as Response);

      await expect(client.get('/missing')).rejects.toThrow('HTTP error! status: 404 Not Found');
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.mocked(fetch);
      // Mock all retry attempts to fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow('Network error');
    });

    it('should parse error response body', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: { message: 'Invalid input' } }),
      } as Response);

      await expect(client.post('/test', {})).rejects.toThrow('Invalid input');
    });

    it('should call onUnauthorized handler for 401 responses', async () => {
      const mockFetch = vi.mocked(fetch);
      const onUnauthorized = vi.fn();

      // Mock all retry attempts to fail with 401
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      client = new HttpClient(
        'https://api.test.com',
        undefined,
        { retries: 2 }, // Reduce retries for faster test
        undefined,
        onUnauthorized
      );

      await expect(client.get('/protected')).rejects.toThrow(
        'HTTP error! status: 401 Unauthorized'
      );

      expect(onUnauthorized).toHaveBeenCalledTimes(3); // Once per initial attempt + 2 retries
      expect(onUnauthorized).toHaveBeenCalledWith({
        url: 'https://api.test.com/protected',
        method: 'GET',
        statusText: 'Unauthorized',
      });
    });

    it('should handle async onUnauthorized handler', async () => {
      const mockFetch = vi.mocked(fetch);
      const onUnauthorized = vi.fn().mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      client = new HttpClient(
        'https://api.test.com',
        undefined,
        { retries: 0 }, // No retries for faster test
        undefined,
        onUnauthorized
      );

      await expect(client.post('/auth', { data: 'test' })).rejects.toThrow(
        'HTTP error! status: 401 Unauthorized'
      );

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledWith({
        url: 'https://api.test.com/auth',
        method: 'POST',
        statusText: 'Unauthorized',
      });
    });

    it('should not call onUnauthorized for non-401 errors', async () => {
      const mockFetch = vi.mocked(fetch);
      const onUnauthorized = vi.fn();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response);

      client = new HttpClient(
        'https://api.test.com',
        undefined,
        { retries: 0 }, // No retries for faster test
        undefined,
        onUnauthorized
      );

      await expect(client.get('/error')).rejects.toThrow(
        'HTTP error! status: 500 Internal Server Error'
      );

      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('should call onUnauthorized handler for 302 redirect responses', async () => {
      const mockFetch = vi.mocked(fetch);
      const onUnauthorized = vi.fn();

      // Mock all retry attempts to fail with 302
      mockFetch.mockResolvedValue({
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Headers({
          Location: 'https://login.example.com',
        }),
        json: async () => ({ error: 'Redirect to login' }),
      } as Response);

      client = new HttpClient(
        'https://api.test.com',
        undefined,
        { retries: 2 }, // Reduce retries for faster test
        undefined,
        onUnauthorized
      );

      await expect(client.get('/protected')).rejects.toThrow(
        'HTTP redirect detected - session may have expired'
      );

      expect(onUnauthorized).toHaveBeenCalledTimes(3); // Once per initial attempt + 2 retries
      expect(onUnauthorized).toHaveBeenCalledWith({
        url: 'https://api.test.com/protected',
        method: 'GET',
        statusText: 'Redirect',
      });
    });

    it('should handle async onUnauthorized handler for 302 responses', async () => {
      const mockFetch = vi.mocked(fetch);
      const onUnauthorized = vi.fn().mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 302,
        statusText: 'Found',
        headers: new Headers({
          Location: 'https://auth.example.com/login',
        }),
        json: async () => ({ redirect: 'login required' }),
      } as Response);

      client = new HttpClient(
        'https://api.test.com',
        undefined,
        { retries: 0 }, // No retries for faster test
        undefined,
        onUnauthorized
      );

      await expect(client.post('/auth', { data: 'test' })).rejects.toThrow(
        'HTTP redirect detected - session may have expired'
      );

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledWith({
        url: 'https://api.test.com/auth',
        method: 'POST',
        statusText: 'Redirect',
      });
    });
  });

  describe('request interceptors', () => {
    it('should apply request interceptors', async () => {
      client = new HttpClient('https://api.test.com');

      const interceptor = vi.fn((config) => {
        config.headers = {
          ...config.headers,
          'X-Request-ID': '123',
        };
        return config;
      });

      client.addRequestInterceptor(interceptor);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.headers.get('X-Request-ID')).toBe('123');
    });
  });

  describe('response interceptors', () => {
    it('should apply response interceptors', async () => {
      client = new HttpClient('https://api.test.com');

      const interceptor = vi.fn((response) => {
        return { ...response, modified: true };
      });

      client.addResponseInterceptor(interceptor);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      } as Response);

      const result = await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(result).toEqual({ data: 'test', modified: true });
    });
  });

  describe('token refresh', () => {
    it('should call onTokenRefreshRequired when x-ms-aad-token-refresh-option header is refresh', async () => {
      const onTokenRefreshRequired = vi.fn();
      client = new HttpClient(
        'https://test-agent.logic.azure.com',
        { type: 'none' },
        { onTokenRefreshRequired }
      );

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'x-ms-aad-token-refresh-option': 'refresh',
        }),
        json: async () => ({ data: 'test' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow(
        'Token refresh initiated - request cannot be completed. URL: https://test-agent.logic.azure.com/test, Method: GET'
      );
      expect(onTokenRefreshRequired).toHaveBeenCalledTimes(1);
    });

    it('should reload page when x-ms-aad-token-refresh-option header is refresh and no callback provided', async () => {
      // Mock window.location.reload
      const originalLocation = global.window?.location;
      const mockReload = vi.fn();

      Object.defineProperty(global, 'window', {
        value: {
          location: {
            reload: mockReload,
          },
        },
        writable: true,
      });

      client = new HttpClient('https://test-agent.logic.azure.com');

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'x-ms-aad-token-refresh-option': 'refresh',
        }),
        json: async () => ({ data: 'test' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow(
        'Token refresh initiated - request cannot be completed. URL: https://test-agent.logic.azure.com/test, Method: GET'
      );
      expect(mockReload).toHaveBeenCalledTimes(1);

      // Restore original window
      if (originalLocation) {
        Object.defineProperty(global, 'window', {
          value: { location: originalLocation },
          writable: true,
        });
      }
    });

    it('should not trigger token refresh for other header values', async () => {
      const onTokenRefreshRequired = vi.fn();
      client = new HttpClient(
        'https://test-agent.logic.azure.com',
        { type: 'none' },
        { onTokenRefreshRequired }
      );

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'x-ms-aad-token-refresh-option': 'no-refresh',
        }),
        json: async () => ({ data: 'test' }),
      } as Response);

      const result = await client.get('/test');
      expect(result).toEqual({ data: 'test' });
      expect(onTokenRefreshRequired).not.toHaveBeenCalled();
    });

    it('should handle missing headers gracefully', async () => {
      const onTokenRefreshRequired = vi.fn();
      client = new HttpClient(
        'https://test-agent.logic.azure.com',
        { type: 'none' },
        { onTokenRefreshRequired }
      );

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: null,
        json: async () => ({ data: 'test' }),
      } as any);

      const result = await client.get('/test');
      expect(result).toEqual({ data: 'test' });
      expect(onTokenRefreshRequired).not.toHaveBeenCalled();
    });

    it('should not trigger token refresh for non-consumption agent URLs', async () => {
      const onTokenRefreshRequired = vi.fn();
      client = new HttpClient(
        'https://api.example.com',
        { type: 'none' },
        { onTokenRefreshRequired }
      );

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'x-ms-aad-token-refresh-option': 'refresh',
        }),
        json: async () => ({ data: 'test' }),
      } as Response);

      const result = await client.get('/test');
      expect(result).toEqual({ data: 'test' });
      expect(onTokenRefreshRequired).not.toHaveBeenCalled();
    });
  });
});

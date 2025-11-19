import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from './http-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('HttpClient edge cases', () => {
  let client: HttpClient;

  beforeEach(() => {
    // Use no retries for tests to avoid timeouts
    client = new HttpClient('https://api.test.com', undefined, { retries: 0 });
    vi.clearAllMocks();
  });

  describe('error response parsing', () => {
    it('should handle error response with plain error string', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Simple error message' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow('Simple error message');
    });

    it('should handle error response with message field', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Direct message error' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow('Direct message error');
    });

    it('should stringify complex error objects', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ code: 'ERR_001', details: 'Complex error' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow(
        '{"code":"ERR_001","details":"Complex error"}'
      );
    });

    it('should handle text error responses', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Plain text error',
      } as Response);

      await expect(client.get('/test')).rejects.toThrow('Plain text error');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(client.get('/test')).rejects.toThrow('HTTP error! status: 400 Bad Request');
    });
  });

  describe('request methods', () => {
    it('should make PUT requests', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      } as Response);

      const body = { id: 1, name: 'Updated' };
      const result = await client.put('/resource/1', body);

      expect(mockFetch).toHaveBeenCalled();
      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.method).toBe('PUT');
      expect(result).toEqual({ updated: true });
    });
  });

  describe('auth edge cases', () => {
    it('should handle oauth2 with custom token type', async () => {
      client = new HttpClient('https://api.test.com', {
        type: 'oauth2',
        accessToken: 'oauth-token',
        tokenType: 'MAC',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await client.get('/test');

      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.headers.get('Authorization')).toBe('MAC oauth-token');
    });

    it('should skip auth for none type', async () => {
      client = new HttpClient('https://api.test.com', {
        type: 'none',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await client.get('/test');

      const [request] = mockFetch.mock.calls[0] as [Request];
      expect(request.headers.get('Authorization')).toBeNull();
    });
  });
});

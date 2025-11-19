import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from './http-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('HttpClient abort behavior', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient('https://api.test.com', undefined, {
      timeout: 100,
      retries: 0,
    });
    vi.clearAllMocks();
  });

  it('should handle aborted requests', async () => {
    const mockFetch = vi.mocked(fetch);

    // Mock fetch to throw abort error
    mockFetch.mockImplementationOnce(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    });

    await expect(client.get('/aborted')).rejects.toThrow('The operation was aborted');
  });
});

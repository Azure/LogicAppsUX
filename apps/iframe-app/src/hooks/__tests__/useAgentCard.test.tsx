import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAgentCard, type UseAgentCardConfig } from '../useAgentCard';

// Mock the logic-apps-chat module
vi.mock('@microsoft/logic-apps-chat', () => ({
  isDirectAgentCardUrl: vi.fn((url: string) => url.endsWith('agent-card.json')),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAgentCard', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const mockAgentCard = {
    name: 'Test Agent',
    url: 'https://agent.example.com/api',
    description: 'A test agent',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch agent card successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAgentCard);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/.well-known/agent-card.json',
      expect.objectContaining({ credentials: 'include', redirect: 'manual' })
    );
  });

  it('should use direct URL when it ends with agent-card.json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com/.well-known/agent-card.json',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/.well-known/agent-card.json', expect.any(Object));
  });

  it('should include API key header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      apiKey: 'test-api-key',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/.well-known/agent-card.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': 'test-api-key',
        }),
        redirect: 'manual',
      })
    );
  });

  it('should include OBO user token header when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      oboUserToken: 'test-obo-token',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/.well-known/agent-card.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-ms-obo-userToken': 'Key test-obo-token',
        }),
      })
    );
  });

  it('should include both API key and OBO token when both provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      apiKey: 'test-api-key',
      oboUserToken: 'test-obo-token',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/.well-known/agent-card.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': 'test-api-key',
          'x-ms-obo-userToken': 'Key test-obo-token',
        }),
      })
    );
  });

  it('should handle unauthorized response and call onUnauthorized', async () => {
    const onUnauthorized = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      onUnauthorized,
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onUnauthorized).toHaveBeenCalled();
    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('should call onUnauthorized on network/CORS error (e.g., EasyAuth 302 redirect)', async () => {
    const onUnauthorized = vi.fn();
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      onUnauthorized,
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onUnauthorized).toHaveBeenCalled();
    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('should error with Unauthorized on network failure even without onUnauthorized callback', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('should handle 403 forbidden response and call onUnauthorized', async () => {
    const onUnauthorized = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      onUnauthorized,
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onUnauthorized).toHaveBeenCalled();
    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('should handle non-unauthorized error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to fetch agent card: 500 Internal Server Error');
  });

  it('should not fetch when disabled', async () => {
    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
    };

    const { result } = renderHook(() => useAgentCard(config, false), { wrapper });

    // When disabled, the query should not fetch
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should use credentials include when no auth tokens provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'include',
        redirect: 'manual',
      })
    );
  });

  it('should not include credentials when auth tokens are provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config: UseAgentCardConfig = {
      apiUrl: 'https://api.example.com',
      apiKey: 'test-api-key',
    };

    const { result } = renderHook(() => useAgentCard(config), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // When headers are provided, credentials should not be set
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].credentials).toBeUndefined();
  });

  it('should have correct query key based on config', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgentCard),
    });

    const config1: UseAgentCardConfig = {
      apiUrl: 'https://api1.example.com',
      apiKey: 'key1',
    };

    const config2: UseAgentCardConfig = {
      apiUrl: 'https://api2.example.com',
      apiKey: 'key2',
    };

    renderHook(() => useAgentCard(config1), { wrapper });
    renderHook(() => useAgentCard(config2), { wrapper });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Both should have been called with different URLs
    expect(mockFetch).toHaveBeenCalledWith('https://api1.example.com/.well-known/agent-card.json', expect.any(Object));
    expect(mockFetch).toHaveBeenCalledWith('https://api2.example.com/.well-known/agent-card.json', expect.any(Object));
  });
});

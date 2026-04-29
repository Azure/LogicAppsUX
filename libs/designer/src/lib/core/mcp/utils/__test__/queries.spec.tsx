/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAllMcpServers, useAllMcpServersFromVfs } from '../queries';
import type { McpServer } from '@microsoft/logic-apps-shared';

// Mock external dependencies
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    ResourceService: vi.fn(),
    LoggerService: vi.fn(() => ({
      log: vi.fn(),
    })),
  };
});

describe('useAllMcpServers', () => {
  let mockResourceService: any;
  let mockExecuteResourceAction: any;
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(async () => {
    // Create a new QueryClient for each test to avoid cache issues
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Import mocked functions dynamically
    const shared = await import('@microsoft/logic-apps-shared');
    mockResourceService = shared.ResourceService as any;

    mockExecuteResourceAction = vi.fn();
    mockResourceService.mockReturnValue({
      executeResourceAction: mockExecuteResourceAction,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('successful responses', () => {
    it('should return MCP servers sorted by name', async () => {
      const mockServers: McpServer[] = [
        { name: 'zebra-server', description: 'Zebra', enabled: true, tools: [] },
        { name: 'alpha-server', description: 'Alpha', enabled: true, tools: [] },
        { name: 'middle-server', description: 'Middle', enabled: false, tools: [] },
      ];

      mockExecuteResourceAction.mockResolvedValue({ value: mockServers });

      const { result } = renderHook(() => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].name).toBe('alpha-server');
      expect(result.current.data?.[1].name).toBe('middle-server');
      expect(result.current.data?.[2].name).toBe('zebra-server');
    });

    it('should default enabled to true when undefined', async () => {
      const mockServers = [
        { name: 'server1', description: 'Server 1' },
        { name: 'server2', description: 'Server 2', enabled: false },
        { name: 'server3', description: 'Server 3', enabled: true },
      ];

      mockExecuteResourceAction.mockResolvedValue({ value: mockServers });

      const { result } = renderHook(() => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const server1 = result.current.data?.find((s) => s.name === 'server1');
      const server2 = result.current.data?.find((s) => s.name === 'server2');
      const server3 = result.current.data?.find((s) => s.name === 'server3');

      expect(server1?.enabled).toBe(true);
      expect(server2?.enabled).toBe(false);
      expect(server3?.enabled).toBe(true);
    });

    it('should return empty array when response value is null', async () => {
      mockExecuteResourceAction.mockResolvedValue({ value: null });

      const { result } = renderHook(() => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should return empty array when response value is undefined', async () => {
      mockExecuteResourceAction.mockResolvedValue({});

      const { result } = renderHook(() => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should return empty array when McpServerNotEnabled error occurs', async () => {
      mockExecuteResourceAction.mockRejectedValue({
        error: { code: 'McpServerNotEnabled' },
      });

      const { result } = renderHook(() => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should return empty array and log error for other errors', async () => {
      const shared = await import('@microsoft/logic-apps-shared');
      const mockLog = vi.fn();
      (shared.LoggerService as any).mockReturnValue({ log: mockLog });

      mockExecuteResourceAction.mockRejectedValue({
        error: { code: 'SomeOtherError', message: 'Something went wrong' },
      });

      const { result } = renderHook(() => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: shared.LogEntryLevel.Error,
          area: 'McpServer.listServers',
        })
      );
    });
  });

  describe('query configuration', () => {
    it('should not execute query when siteResourceId is empty', async () => {
      const { result } = renderHook(() => useAllMcpServers(''), {
        wrapper: createWrapper(),
      });

      // Query should not be loading or fetching when disabled
      expect(result.current.isFetching).toBe(false);
      expect(mockExecuteResourceAction).not.toHaveBeenCalled();
    });

    it('should use lowercase siteResourceId in query key', async () => {
      mockExecuteResourceAction.mockResolvedValue({ value: [] });

      const { result: result1 } = renderHook(
        () => useAllMcpServers('/subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Web/sites/MYAPP'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // The second call with different casing should use cached result
      const { result: result2 } = renderHook(
        () => useAllMcpServers('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myapp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Should only be called once due to cache hit with normalized key
      expect(mockExecuteResourceAction).toHaveBeenCalledTimes(1);
    });

    it('should call executeResourceAction with correct parameters', async () => {
      mockExecuteResourceAction.mockResolvedValue({ value: [] });

      const siteResourceId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp';

      const { result } = renderHook(() => useAllMcpServers(siteResourceId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServers`,
        'POST',
        { 'api-version': '2024-11-01' }
      );
    });
  });
});

describe('useAllMcpServersFromVfs', () => {
  let mockResourceService: any;
  let mockGetResource: any;
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(async () => {
    // Create a new QueryClient for each test to avoid cache issues
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Import mocked functions dynamically
    const shared = await import('@microsoft/logic-apps-shared');
    mockResourceService = shared.ResourceService as any;

    mockGetResource = vi.fn();
    mockResourceService.mockReturnValue({
      getResource: mockGetResource,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('successful responses', () => {
    it('should return MCP server names from vfs response', async () => {
      const mockServers: McpServer[] = [
        { name: 'server1', description: 'Server 1', enabled: true, tools: [] },
        { name: 'server2', description: 'Server 2', enabled: true, tools: [] },
        { name: 'server3', description: 'Server 3', enabled: false, tools: [] },
      ];

      mockGetResource.mockResolvedValue({ mcpServers: mockServers });

      const { result } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data).toEqual(['server1', 'server2', 'server3']);
    });

    it('should return empty array when mcpServers is null', async () => {
      mockGetResource.mockResolvedValue({ mcpServers: null });

      const { result } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should return empty array when mcpServers is undefined', async () => {
      mockGetResource.mockResolvedValue({});

      const { result } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should return empty array when response is empty', async () => {
      mockGetResource.mockResolvedValue({ mcpServers: [] });

      const { result } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should return empty array and log error on failure', async () => {
      const shared = await import('@microsoft/logic-apps-shared');
      const mockLog = vi.fn();
      (shared.LoggerService as any).mockReturnValue({ log: mockLog });

      mockGetResource.mockRejectedValue({
        error: { code: 'NotFound', message: 'File not found' },
      });

      const { result } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: shared.LogEntryLevel.Error,
          area: 'McpServer.listServersFromVfs',
        })
      );
    });

    it('should handle error with no error property', async () => {
      const shared = await import('@microsoft/logic-apps-shared');
      const mockLog = vi.fn();
      (shared.LoggerService as any).mockReturnValue({ log: mockLog });

      mockGetResource.mockRejectedValue({});

      const { result } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
      expect(mockLog).toHaveBeenCalled();
    });
  });

  describe('query configuration', () => {
    it('should not execute query when siteResourceId is empty', async () => {
      const { result } = renderHook(() => useAllMcpServersFromVfs(''), {
        wrapper: createWrapper(),
      });

      // Query should not be loading or fetching when disabled
      expect(result.current.isFetching).toBe(false);
      expect(mockGetResource).not.toHaveBeenCalled();
    });

    it('should use lowercase siteResourceId in query key', async () => {
      mockGetResource.mockResolvedValue({ mcpServers: [] });

      const { result: result1 } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Web/sites/MYAPP'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // The second call with different casing should use cached result
      const { result: result2 } = renderHook(
        () => useAllMcpServersFromVfs('/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myapp'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Should only be called once due to cache hit with normalized key
      expect(mockGetResource).toHaveBeenCalledTimes(1);
    });

    it('should call getResource with correct parameters', async () => {
      mockGetResource.mockResolvedValue({ mcpServers: [] });

      const siteResourceId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp';

      const { result } = renderHook(() => useAllMcpServersFromVfs(siteResourceId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetResource).toHaveBeenCalledWith(`${siteResourceId}/hostruntime/admin/vfs/mcpservers.json`, {
        'api-version': '2018-11-01',
        relativepath: '1',
      });
    });

    it('should have cacheTime of 0 to always refetch for server name uniqueness validation', async () => {
      mockGetResource.mockResolvedValue({ mcpServers: [{ name: 'server1' }] });

      const siteResourceId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp';

      const { result: result1 } = renderHook(() => useAllMcpServersFromVfs(siteResourceId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Clear all queries to simulate cache expiry
      queryClient.clear();

      // Make a new call - should fetch again since cacheTime is 0
      const { result: result2 } = renderHook(() => useAllMcpServersFromVfs(siteResourceId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Should have been called twice since cache is disabled
      expect(mockGetResource).toHaveBeenCalledTimes(2);
    });
  });
});

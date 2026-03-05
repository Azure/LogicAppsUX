import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StandardConnectionService } from '../connection';
import type { StandardConnectionServiceOptions, ConnectionsData } from '../connection';
import { mcpclientConnectorId } from '../../base/operationmanifest';

describe('StandardConnectionService', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const createMockOptions = (connectionsData: ConnectionsData): StandardConnectionServiceOptions => ({
    apiVersion: '2024-01-01',
    baseUrl: 'https://test.azure.com',
    httpClient: mockHttpClient as any,
    apiHubServiceDetails: {
      apiVersion: '2024-01-01',
      baseUrl: 'https://test.azure.com',
      subscriptionId: 'test-subscription',
      resourceGroup: 'test-rg',
      location: 'eastus',
      httpClient: mockHttpClient as any,
    },
    readConnections: vi.fn().mockResolvedValue(connectionsData),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConnections', () => {
    it('should convert MCP connection data to Connection format', async () => {
      const mcpConnectionKey = 'my-mcp-connection';
      const mcpConnectionData = {
        displayName: 'My MCP Server',
        mcpServerUrl: 'https://mcp.example.com/sse',
        authentication: {
          type: 'ApiKey',
          apiKey: 'test-api-key',
        },
      };

      const connectionsData: ConnectionsData = {
        agentMcpConnections: {
          [mcpConnectionKey]: mcpConnectionData,
        },
      };

      const service = new StandardConnectionService(createMockOptions(connectionsData));
      const connections = await service.getConnections();

      // Find the MCP connection in the results
      const mcpConnection = connections.find((c) => c.name === mcpConnectionKey);

      expect(mcpConnection).toBeDefined();
      expect(mcpConnection?.name).toBe(mcpConnectionKey);
      expect(mcpConnection?.id).toBe(`/${mcpclientConnectorId}/connections/${mcpConnectionKey}`);
      expect(mcpConnection?.properties.displayName).toBe('My MCP Server');
      expect(mcpConnection?.properties.api.id).toBe(mcpclientConnectorId);
      expect(mcpConnection?.properties.connectionParameters?.mcpServerUrl?.metadata?.value).toBe('https://mcp.example.com/sse');
      expect(mcpConnection?.properties.connectionParameters?.authentication?.metadata?.value).toEqual({
        type: 'ApiKey',
        apiKey: 'test-api-key',
      });
      expect(mcpConnection?.properties.overallStatus).toBe('Connected');
    });

    it('should handle MCP connection without authentication', async () => {
      const mcpConnectionKey = 'mcp-no-auth';
      const mcpConnectionData = {
        displayName: 'MCP Server No Auth',
        mcpServerUrl: 'https://mcp.example.com/sse',
      };

      const connectionsData: ConnectionsData = {
        agentMcpConnections: {
          [mcpConnectionKey]: mcpConnectionData,
        },
      };

      const service = new StandardConnectionService(createMockOptions(connectionsData));
      const connections = await service.getConnections();

      const mcpConnection = connections.find((c) => c.name === mcpConnectionKey);

      expect(mcpConnection).toBeDefined();
      expect(mcpConnection?.properties.connectionParameters?.authentication).toBeUndefined();
    });
  });
});

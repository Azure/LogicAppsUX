import { describe, it, expect } from 'vitest';
import { convertConnectionsDataToReferences } from '../helper';
import { isMcpConnectionReference } from '../serializer';

describe('convertConnectionsDataToReferences', () => {
  it('should return empty object when connectionsData is undefined', () => {
    const result = convertConnectionsDataToReferences(undefined);
    expect(result).toEqual({});
  });

  it('should handle agentMcpConnections', () => {
    const connectionsData = {
      agentMcpConnections: {
        'my-mcp-connection': {
          mcpServerUrl: 'https://example.com/mcp',
          displayName: 'My MCP Server',
          authentication: { type: 'Basic' },
        },
      },
    };
    const result = convertConnectionsDataToReferences(connectionsData as any);
    expect(result['my-mcp-connection']).toEqual({
      connection: { id: '/connectionProviders/mcpclient/connections/my-mcp-connection' },
      connectionName: 'My MCP Server',
      api: { id: 'connectionProviders/mcpclient' },
    });
  });

  it('should use connectionKey as connectionName when displayName is missing in agentMcpConnections', () => {
    const connectionsData = {
      agentMcpConnections: {
        'mcp-no-display': {
          mcpServerUrl: 'https://example.com/mcp',
        },
      },
    };
    const result = convertConnectionsDataToReferences(connectionsData as any);
    expect(result['mcp-no-display'].connectionName).toBe('mcp-no-display');
  });

  it('should handle both managedApiConnections and agentMcpConnections', () => {
    const connectionsData = {
      managedApiConnections: {
        kusto: {
          connection: { id: '/subscriptions/sub1/connections/kusto1' },
          api: { id: '/subscriptions/sub1/managedApis/kusto' },
        },
      },
      agentMcpConnections: {
        'mcp-conn': {
          mcpServerUrl: 'https://example.com/mcp',
          displayName: 'Custom MCP',
        },
      },
    };
    const result = convertConnectionsDataToReferences(connectionsData as any);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['kusto']).toBeDefined();
    expect(result['mcp-conn']).toBeDefined();
  });
});

describe('isMcpConnectionReference', () => {
  it('should return true for mcpclient connector ID without leading slash', () => {
    expect(isMcpConnectionReference('connectionProviders/mcpclient')).toBe(true);
  });

  it('should return true for mcpclient connector ID with leading slash', () => {
    expect(isMcpConnectionReference('/connectionProviders/mcpclient')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isMcpConnectionReference('ConnectionProviders/McpClient')).toBe(true);
    expect(isMcpConnectionReference('/CONNECTIONPROVIDERS/MCPCLIENT')).toBe(true);
  });

  it('should return false for undefined or empty', () => {
    expect(isMcpConnectionReference(undefined)).toBe(false);
    expect(isMcpConnectionReference('')).toBe(false);
  });

  it('should return false for other connector IDs', () => {
    expect(isMcpConnectionReference('connectionProviders/agent')).toBe(false);
    expect(isMcpConnectionReference('/connectionProviders/apiManagementOperation')).toBe(false);
  });

  it('should return false for partial matches', () => {
    expect(isMcpConnectionReference('connectionProviders/mcpclient/connections/test')).toBe(false);
    expect(isMcpConnectionReference('mcpclient')).toBe(false);
  });
});

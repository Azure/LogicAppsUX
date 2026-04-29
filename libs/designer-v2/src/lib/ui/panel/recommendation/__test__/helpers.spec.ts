import { describe, test, expect, vi } from 'vitest';
import type { Connection, Connector, OperationApi } from '@microsoft/logic-apps-shared';
import {
  connectionToOperation,
  getOperationCardDataFromOperation,
  getOperationGroupCardDataFromConnector,
  getNodeId,
  builtinMcpServerOperation,
  MCP_CLIENT_CONNECTOR_ID,
} from '../helpers';

vi.mock('@microsoft/logic-apps-shared', () => ({
  getBrandColorFromConnector: vi.fn((connector: Connector | OperationApi) => connector.properties?.brandColor ?? '#0078D4'),
  getDescriptionFromConnector: vi.fn((connector: Connector | OperationApi) => connector.properties?.description ?? ''),
  getDisplayNameFromConnector: vi.fn((connector: Connector | OperationApi) => connector.properties?.displayName ?? connector.name),
  getIconUriFromConnector: vi.fn((connector: Connector | OperationApi) => connector.properties?.iconUri ?? ''),
}));

vi.mock('@microsoft/designer-ui', () => ({
  getConnectorCategoryString: vi.fn(() => 'Built-in'),
  isBuiltInConnector: vi.fn(() => true),
  isCustomConnector: vi.fn((connector: Connector | OperationApi) => connector.properties?.capabilities?.includes('custom') ?? false),
}));

describe('helpers', () => {
  describe('MCP_CLIENT_CONNECTOR_ID', () => {
    test('should have the correct value', () => {
      expect(MCP_CLIENT_CONNECTOR_ID).toBe('connectionProviders/mcpclient');
    });
  });

  describe('builtinMcpServerOperation', () => {
    test('should have correct id and name', () => {
      expect(builtinMcpServerOperation.id).toBe('nativemcpclient');
      expect(builtinMcpServerOperation.name).toBe('nativemcpclient');
    });

    test('should have correct type', () => {
      expect(builtinMcpServerOperation.type).toBe('nativemcpclient');
    });

    test('should have correct api.id', () => {
      expect(builtinMcpServerOperation.properties.api.id).toBe(MCP_CLIENT_CONNECTOR_ID);
    });

    test('should have operationType as McpClientTool', () => {
      expect(builtinMcpServerOperation.properties.operationType).toBe('McpClientTool');
    });

    test('should have operationKind as Builtin', () => {
      expect(builtinMcpServerOperation.properties.operationKind).toBe('Builtin');
    });
  });

  describe('getOperationGroupCardDataFromConnector', () => {
    test('should extract correct properties from Connector', () => {
      const connector: Connector = {
        id: 'connector-123',
        name: 'myConnector',
        type: 'connectors',
        properties: {
          displayName: 'My Connector',
          description: 'A test connector',
          iconUri: 'https://example.com/icon.svg',
          brandColor: '#FF5500',
        },
      };

      const result = getOperationGroupCardDataFromConnector(connector);

      expect(result.apiId).toBe('connector-123');
      expect(result.connectorName).toBe('My Connector');
      expect(result.description).toBe('A test connector');
      expect(result.iconUri).toBe('https://example.com/icon.svg');
      expect(result.brandColor).toBe('#FF5500');
    });

    test('should extract correct properties from OperationApi', () => {
      const api: OperationApi = {
        id: 'api-456',
        name: 'myApi',
        type: 'apis',
        properties: {
          displayName: 'My API',
          description: 'An API description',
          iconUri: 'https://example.com/api-icon.svg',
          brandColor: '#00AA00',
        },
      };

      const result = getOperationGroupCardDataFromConnector(api);

      expect(result.apiId).toBe('api-456');
      expect(result.connectorName).toBe('My API');
      expect(result.description).toBe('An API description');
      expect(result.iconUri).toBe('https://example.com/api-icon.svg');
      expect(result.brandColor).toBe('#00AA00');
    });

    test('should mark custom connectors correctly', () => {
      const customConnector: Connector = {
        id: 'custom-connector',
        name: 'customConnector',
        type: 'connectors',
        properties: {
          displayName: 'Custom Connector',
          capabilities: ['custom'],
        },
      };

      const result = getOperationGroupCardDataFromConnector(customConnector);

      expect(result.isCustom).toBe(true);
    });

    test('should mark non-custom connectors correctly', () => {
      const standardConnector: Connector = {
        id: 'standard-connector',
        name: 'standardConnector',
        type: 'connectors',
        properties: {
          displayName: 'Standard Connector',
        },
      };

      const result = getOperationGroupCardDataFromConnector(standardConnector);

      expect(result.isCustom).toBe(false);
    });
  });

  describe('connectionToOperation', () => {
    test('should transform connection to operation with correct structure', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {
          displayName: 'My MCP Connection',
          connectionParameters: {
            mcpServerUrl: {
              metadata: {
                value: 'https://mcp.example.com',
              },
            },
          },
        },
      };

      const result = connectionToOperation(connection);

      expect(result.id).toBe('conn-123');
      expect(result.name).toBe('my-mcp-connection');
      expect(result.type).toBe('builtinMcpClientToolConnection');
    });

    test('should extract server URL from connectionParameters.mcpServerUrl.metadata.value', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {
          displayName: 'My MCP Connection',
          connectionParameters: {
            mcpServerUrl: {
              metadata: {
                value: 'https://mcp.example.com',
              },
            },
          },
        },
      };

      const result = connectionToOperation(connection);

      expect(result.properties.summary).toBe('https://mcp.example.com');
    });

    test('should fallback to displayName when mcpServerUrl is not available', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {
          displayName: 'My Display Name',
        },
      };

      const result = connectionToOperation(connection);

      expect(result.properties.summary).toBe('My Display Name');
    });

    test('should fallback to connection name when displayName is not available', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {},
      };

      const result = connectionToOperation(connection);

      expect(result.properties.summary).toBe('my-mcp-connection');
    });

    test('should set correct api properties', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {},
      };

      const result = connectionToOperation(connection);

      expect(result.properties.api.id).toBe(MCP_CLIENT_CONNECTOR_ID);
      expect(result.properties.api.name).toBe('mcpclient');
      expect(result.properties.operationType).toBe('McpClientTool');
      expect(result.properties.operationKind).toBe('Builtin');
    });

    test('should set description based on displayName when available', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {
          displayName: 'My Display Name',
        },
      };

      const result = connectionToOperation(connection);

      expect(result.properties.description).toBe('My Display Name');
    });

    test('should set description based on connection name when displayName is not available', () => {
      const connection: Connection = {
        id: 'conn-123',
        name: 'my-mcp-connection',
        type: 'connections',
        properties: {},
      };

      const result = connectionToOperation(connection);

      expect(result.properties.description).toBe('MCP connection: my-mcp-connection');
    });
  });

  describe('getOperationCardDataFromOperation', () => {
    test('should append (MCP) suffix for MCP client tool operations', () => {
      const operation = {
        id: 'some-mcp-tool',
        name: 'mcptool',
        type: 'McpClientTool',
        properties: {
          summary: 'My MCP Tool',
          description: 'Description',
          operationType: 'McpClientTool',
          api: {
            id: MCP_CLIENT_CONNECTOR_ID,
            name: 'mcpclient',
            displayName: 'MCP Client',
            brandColor: '#000000',
            iconUri: 'https://example.com/icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation as any);

      expect(result.title).toBe('My MCP Tool (MCP)');
    });

    test('should not append (MCP) suffix for builtin MCP server operation', () => {
      const result = getOperationCardDataFromOperation(builtinMcpServerOperation as any);

      expect(result.title).toBe('Add new MCP server');
      expect(result.title).not.toContain('(MCP)');
    });

    test('should not append (MCP) suffix for non-MCP operations', () => {
      const operation = {
        id: 'http-action',
        name: 'http',
        type: 'Http',
        properties: {
          summary: 'HTTP Request',
          description: 'Make an HTTP request',
          operationType: 'Http',
          api: {
            id: 'connectionProviders/http',
            name: 'http',
            displayName: 'HTTP',
            brandColor: '#0078D4',
            iconUri: 'https://example.com/http-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation as any);

      expect(result.title).toBe('HTTP Request');
      expect(result.title).not.toContain('(MCP)');
    });

    test('should extract correct properties from operation', () => {
      const operation = {
        id: 'test-op',
        name: 'testop',
        type: 'Test',
        properties: {
          summary: 'Test Operation',
          description: 'Test Description',
          operationType: 'Test',
          api: {
            id: 'test-api',
            name: 'test',
            displayName: 'Test API',
            brandColor: '#FF0000',
            iconUri: 'https://example.com/test-icon.svg',
          },
        },
      };

      const result = getOperationCardDataFromOperation(operation as any);

      expect(result.id).toBe('test-op');
      expect(result.description).toBe('Test Description');
      expect(result.brandColor).toBe('#FF0000');
      expect(result.iconUri).toBe('https://example.com/test-icon.svg');
      expect(result.connectorName).toBe('Test API');
      expect(result.apiId).toBe('test-api');
    });
  });

  describe('getNodeId', () => {
    test('should return summary with spaces replaced by underscores', () => {
      const operation = {
        id: 'test',
        name: 'test',
        type: 'test',
        properties: {
          summary: 'My Test Operation',
          api: { id: 'test' },
        },
      };

      const result = getNodeId(operation as any);

      expect(result).toBe('My_Test_Operation');
    });

    test('should fallback to name when summary is not available', () => {
      const operation = {
        id: 'test',
        name: 'test-operation',
        type: 'test',
        properties: {
          api: { id: 'test' },
        },
      };

      const result = getNodeId(operation as any);

      expect(result).toBe('test-operation');
    });

    test('should return "undefined" string when operation is undefined', () => {
      const result = getNodeId(undefined);

      expect(result).toBe('undefined');
    });

    test('should handle empty summary', () => {
      const operation = {
        id: 'test',
        name: '',
        type: 'test',
        properties: {
          summary: '',
          api: { id: 'test' },
        },
      };

      const result = getNodeId(operation as any);

      expect(result).toBe('');
    });
  });
});

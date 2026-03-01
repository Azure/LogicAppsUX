import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsumptionConnectionService } from '../connection';
import type { Connector } from '../../../../utils/src';
import type { ConnectionCreationInfo } from '../../connection';
import { InitLoggerService } from '../../logger';

// Mock the LoggerService
const mockLoggerService = {
  log: vi.fn(),
  startTrace: vi.fn().mockReturnValue('mock-trace-id'),
  endTrace: vi.fn(),
  logErrorWithFormatting: vi.fn(),
};

describe('ConsumptionConnectionService', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const mockOptions = {
    apiVersion: '2018-07-01-preview',
    baseUrl: 'https://management.azure.com',
    subscriptionId: 'test-sub',
    resourceGroup: 'test-rg',
    location: 'eastus',
    httpClient: mockHttpClient,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: 'https://management.azure.com',
      subscriptionId: 'test-sub',
      resourceGroup: 'test-rg',
      location: 'eastus',
      httpClient: mockHttpClient,
    },
  };

  let service: ConsumptionConnectionService;

  beforeEach(() => {
    // Initialize the logger service before each test
    InitLoggerService([mockLoggerService]);

    service = new ConsumptionConnectionService(mockOptions as any);
    vi.clearAllMocks();

    // Re-setup logger mocks after clearAllMocks
    mockLoggerService.startTrace.mockReturnValue('mock-trace-id');
  });

  describe('createBuiltInMcpConnection', () => {
    it('should create a built-in MCP connection with correct structure', async () => {
      const connector: Partial<Connector> = {
        id: 'connectionProviders/mcpclient',
        type: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        properties: {
          displayName: 'MCP Client',
          iconUri: 'https://example.com/icon.png',
          brandColor: '#000000',
          capabilities: ['builtin'],
          description: 'MCP Client Connector',
          generalInformation: {
            displayName: 'MCP Client',
            iconUrl: 'https://example.com/icon.png',
          },
        },
      };

      const connectionInfo: ConnectionCreationInfo = {
        displayName: 'test-mcp-connection',
        connectionParameters: {
          serverUrl: { value: 'https://mcp-server.example.com' },
        },
        connectionParametersSet: {
          name: 'ApiKey',
          values: {
            key: { value: 'test-api-key' },
          },
        },
      };

      const result = await service.createConnection('test-connection-id', connector as Connector, connectionInfo);

      expect(result).toBeDefined();
      expect(result.name).toBe('test-mcp-connection');
      expect(result.id).toContain('connectionProviders/mcpclient/connections/');
      expect((result.properties as any).parameterValues.mcpServerUrl).toBe('https://mcp-server.example.com');
      expect((result.properties as any).parameterValues.authenticationType).toBe('ApiKey');
    });

    it('should throw error when serverUrl is missing', async () => {
      const connector: Partial<Connector> = {
        id: 'connectionProviders/mcpclient',
        type: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        properties: {
          displayName: 'MCP Client',
          capabilities: ['builtin'],
          generalInformation: {
            displayName: 'MCP Client',
          },
          iconUri: '',
        },
      };

      const connectionInfo: ConnectionCreationInfo = {
        displayName: 'test-mcp-connection',
        connectionParameters: {},
      };

      await expect(service.createConnection('test-connection-id', connector as Connector, connectionInfo)).rejects.toThrow(
        'Server URL is required for MCP connection'
      );
    });

    it('should use connectionId as fallback name when displayName is not provided', async () => {
      const connector: Partial<Connector> = {
        id: 'connectionProviders/mcpclient',
        type: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        properties: {
          displayName: 'MCP Client',
          capabilities: ['builtin'],
          generalInformation: {
            displayName: 'MCP Client',
          },
          iconUri: '',
        },
      };

      const connectionInfo: ConnectionCreationInfo = {
        connectionParameters: {
          serverUrl: { value: 'https://mcp-server.example.com' },
        },
      };

      const result = await service.createConnection(
        '/subscriptions/sub/connections/my-connection-name',
        connector as Connector,
        connectionInfo
      );

      expect(result.name).toBe('my-connection-name');
    });

    it('should handle None authentication type', async () => {
      const connector: Partial<Connector> = {
        id: 'connectionProviders/mcpclient',
        type: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        properties: {
          displayName: 'MCP Client',
          capabilities: ['builtin'],
          generalInformation: {
            displayName: 'MCP Client',
          },
          iconUri: '',
        },
      };

      const connectionInfo: ConnectionCreationInfo = {
        displayName: 'test-mcp-connection',
        connectionParameters: {
          serverUrl: { value: 'https://mcp-server.example.com' },
        },
        connectionParametersSet: {
          name: 'None',
          values: {},
        },
      };

      const result = await service.createConnection('test-connection-id', connector as Connector, connectionInfo);

      expect((result.properties as any).parameterValues.authenticationType).toBe('None');
    });
  });

  describe('extractParameterValue', () => {
    it('should extract value from wrapped object', () => {
      const result = (service as any).extractParameterValue({ value: 'test' });
      expect(result).toBe('test');
    });

    it('should return direct value if not wrapped', () => {
      const result = (service as any).extractParameterValue('direct-value');
      expect(result).toBe('direct-value');
    });

    it('should handle null value', () => {
      const result = (service as any).extractParameterValue(null);
      expect(result).toBe(null);
    });

    it('should handle undefined value', () => {
      const result = (service as any).extractParameterValue(undefined);
      expect(result).toBe(undefined);
    });

    it('should handle object without value property', () => {
      const result = (service as any).extractParameterValue({ other: 'prop' });
      expect(result).toEqual({ other: 'prop' });
    });
  });

  describe('extractAuthParameters', () => {
    it('should extract authentication parameters correctly', () => {
      const result = (service as any).extractAuthParameters({
        name: 'ApiKey',
        values: {
          key: { value: 'my-api-key' },
          keyHeaderName: { value: 'X-API-Key' },
        },
      });

      expect(result.authenticationType).toBe('ApiKey');
      expect(result.authParams.key).toBe('my-api-key');
      expect(result.authParams.keyHeaderName).toBe('X-API-Key');
    });

    it('should return None for undefined connectionParametersSet', () => {
      const result = (service as any).extractAuthParameters(undefined);

      expect(result.authenticationType).toBe('None');
      expect(result.authParams).toEqual({});
    });

    it('should return None for null connectionParametersSet', () => {
      const result = (service as any).extractAuthParameters(null);

      expect(result.authenticationType).toBe('None');
      expect(result.authParams).toEqual({});
    });

    it('should handle BasicAuth parameters', () => {
      const result = (service as any).extractAuthParameters({
        name: 'BasicAuth',
        values: {
          username: { value: 'testuser' },
          password: { value: 'testpass' },
        },
      });

      expect(result.authenticationType).toBe('BasicAuth');
      expect(result.authParams.username).toBe('testuser');
      expect(result.authParams.password).toBe('testpass');
    });

    it('should handle OAuth2 parameters', () => {
      const result = (service as any).extractAuthParameters({
        name: 'OAuth2',
        values: {
          clientId: { value: 'client-123' },
          secret: { value: 'secret-456' },
          tenant: { value: 'tenant-789' },
          authority: { value: 'https://login.microsoftonline.com' },
          audience: { value: 'api://my-app' },
        },
      });

      expect(result.authenticationType).toBe('OAuth2');
      expect(result.authParams.clientId).toBe('client-123');
      expect(result.authParams.secret).toBe('secret-456');
      expect(result.authParams.tenant).toBe('tenant-789');
      expect(result.authParams.authority).toBe('https://login.microsoftonline.com');
      expect(result.authParams.audience).toBe('api://my-app');
    });

    it('should only extract known auth keys', () => {
      const result = (service as any).extractAuthParameters({
        name: 'Custom',
        values: {
          key: { value: 'valid-key' },
          unknownParam: { value: 'should-be-ignored' },
          anotherUnknown: { value: 'also-ignored' },
        },
      });

      expect(result.authParams.key).toBe('valid-key');
      expect(result.authParams.unknownParam).toBeUndefined();
      expect(result.authParams.anotherUnknown).toBeUndefined();
    });
  });

  describe('getConnector', () => {
    it('should return mcpclient connector for mcpclient connectorId', async () => {
      const result = await service.getConnector('connectionProviders/mcpclient');

      expect(result).toBeDefined();
      expect(result.id).toContain('mcpclient');
    });

    it('should return agent connector for agent connectorId', async () => {
      const result = await service.getConnector('connectionProviders/agent');

      expect(result).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StandardConnectionService, microsoftFoundryModelsRegex, foundryServiceConnectionRegex, apimanagementRegex } from '../connection';
import type { StandardConnectionServiceOptions, ConnectionsData } from '../connection';
import { agentConnectorId, mcpclientConnectorId } from '../../base/operationmanifest';
import { ConnectionType } from '../../../../utils/src';
import { InitLoggerService } from '../../logger';

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

  describe('createConnection - MCP with ManagedServiceIdentity', () => {
    const mockLoggerService = {
      log: vi.fn(),
      startTrace: vi.fn().mockReturnValue('mock-trace-id'),
      endTrace: vi.fn(),
      logErrorWithFormatting: vi.fn(),
    };

    it('should include identity in MCP connection authentication when user-assigned MI is selected', async () => {
      InitLoggerService([mockLoggerService]);
      let capturedConnectionData: any;
      const writeConnection = vi.fn().mockImplementation((data: any) => {
        capturedConnectionData = data;
        return Promise.resolve();
      });

      const options = createMockOptions({});
      (options as any).writeConnection = writeConnection;

      const service = new StandardConnectionService(options);

      const connector = {
        id: 'connectionProviders/mcpclient',
        type: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        properties: {
          displayName: 'MCP Client',
          iconUri: '',
          brandColor: '#000000',
          capabilities: ['actions'],
          description: 'MCP Client',
        },
      };

      const connectionInfo = {
        displayName: 'test-mcp-mi',
        connectionParametersSet: {
          name: 'ManagedServiceIdentity',
          values: {
            serverUrl: { value: 'https://mcp.example.com/sse' },
            identity: {
              value: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-id',
            },
            audience: { value: 'api://my-app' },
          },
        },
      };

      const parametersMetadata = {
        connectionMetadata: { type: ConnectionType.Mcp },
      };

      await service.createConnection('test-conn', connector as any, connectionInfo, parametersMetadata as any);

      expect(writeConnection).toHaveBeenCalledOnce();
      const auth = capturedConnectionData.connectionData.authentication;
      expect(auth.type).toBe('ManagedServiceIdentity');
      expect(auth.identity).toBe('/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-id');
      expect(auth.audience).toBe('api://my-app');
    });

    it('should not include identity in MCP connection when system-assigned MI is used', async () => {
      InitLoggerService([mockLoggerService]);
      let capturedConnectionData: any;
      const writeConnection = vi.fn().mockImplementation((data: any) => {
        capturedConnectionData = data;
        return Promise.resolve();
      });

      const options = createMockOptions({});
      (options as any).writeConnection = writeConnection;

      const service = new StandardConnectionService(options);

      const connector = {
        id: 'connectionProviders/mcpclient',
        type: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        properties: {
          displayName: 'MCP Client',
          iconUri: '',
          brandColor: '#000000',
          capabilities: ['actions'],
          description: 'MCP Client',
        },
      };

      const connectionInfo = {
        displayName: 'test-mcp-system-mi',
        connectionParametersSet: {
          name: 'ManagedServiceIdentity',
          values: {
            serverUrl: { value: 'https://mcp.example.com/sse' },
            audience: { value: 'api://my-app' },
          },
        },
      };

      const parametersMetadata = {
        connectionMetadata: { type: ConnectionType.Mcp },
      };

      await service.createConnection('test-conn', connector as any, connectionInfo, parametersMetadata as any);

      expect(writeConnection).toHaveBeenCalledOnce();
      const auth = capturedConnectionData.connectionData.authentication;
      expect(auth.type).toBe('ManagedServiceIdentity');
      expect(auth.identity).toBeUndefined();
      expect(auth.audience).toBe('api://my-app');
    });
  });

  describe('createConnection - Agent with /models suffix', () => {
    const mockLoggerService = {
      log: vi.fn(),
      startTrace: vi.fn().mockReturnValue('mock-trace-id'),
      endTrace: vi.fn(),
      logErrorWithFormatting: vi.fn(),
    };

    const agentConnector = {
      id: agentConnectorId,
      type: agentConnectorId,
      name: 'agent',
      properties: {
        displayName: 'Agent',
        iconUri: '',
        brandColor: '#000000',
        capabilities: ['actions'],
        description: 'Agent',
      },
    };

    it('should append /models to resourceId for standard Cognitive Services connections', async () => {
      InitLoggerService([mockLoggerService]);
      let capturedConnectionData: any;
      const writeConnection = vi.fn().mockImplementation((data: any) => {
        capturedConnectionData = data;
        return Promise.resolve();
      });

      const options = createMockOptions({});
      (options as any).writeConnection = writeConnection;
      const service = new StandardConnectionService(options);

      const connectionInfo = {
        displayName: 'test-agent-foundry',
        connectionParametersSet: {
          name: 'ManagedServiceIdentity',
          values: {
            cognitiveServiceAccountId: {
              value: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount',
            },
          },
        },
      };

      const parametersMetadata = {
        connectionMetadata: { type: ConnectionType.Agent },
      };

      await service.createConnection('test-agent', agentConnector as any, connectionInfo, parametersMetadata as any);

      expect(writeConnection).toHaveBeenCalledOnce();
      expect(capturedConnectionData.connectionData.resourceId).toBe(
        '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/models'
      );
      expect(capturedConnectionData.connectionData.type).toBe('model');
    });

    it('should NOT append /models for Foundry project connections and should save type as model', async () => {
      InitLoggerService([mockLoggerService]);
      let capturedConnectionData: any;
      const writeConnection = vi.fn().mockImplementation((data: any) => {
        capturedConnectionData = data;
        return Promise.resolve();
      });

      const options = createMockOptions({});
      (options as any).writeConnection = writeConnection;
      const service = new StandardConnectionService(options);

      const foundryResourceId =
        '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/projects/myproject';
      const connectionInfo = {
        displayName: 'test-agent-foundry-service',
        connectionParametersSet: {
          name: 'ManagedServiceIdentity',
          values: {
            cognitiveServiceAccountId: { value: foundryResourceId },
          },
        },
      };

      const parametersMetadata = {
        connectionMetadata: { type: ConnectionType.Agent },
      };

      await service.createConnection('test-agent', agentConnector as any, connectionInfo, parametersMetadata as any);

      expect(writeConnection).toHaveBeenCalledOnce();
      expect(capturedConnectionData.connectionData.resourceId).toBe(foundryResourceId);
      expect(capturedConnectionData.connectionData.type).toBe('model');
    });

    it('should NOT append /models for APIM connections', async () => {
      InitLoggerService([mockLoggerService]);
      let capturedConnectionData: any;
      const writeConnection = vi.fn().mockImplementation((data: any) => {
        capturedConnectionData = data;
        return Promise.resolve();
      });

      const options = createMockOptions({});
      (options as any).writeConnection = writeConnection;
      const service = new StandardConnectionService(options);

      const apimResourceId = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/myservice/apis/myapi';
      const connectionInfo = {
        displayName: 'test-agent-apim',
        connectionParametersSet: {
          name: 'ManagedServiceIdentity',
          values: {
            cognitiveServiceAccountId: { value: apimResourceId },
          },
        },
      };

      const parametersMetadata = {
        connectionMetadata: { type: ConnectionType.Agent },
      };

      await service.createConnection('test-agent', agentConnector as any, connectionInfo, parametersMetadata as any);

      expect(writeConnection).toHaveBeenCalledOnce();
      expect(capturedConnectionData.connectionData.resourceId).toBe(apimResourceId);
      expect(capturedConnectionData.connectionData.type).toBe('APIMGenAIGateway');
    });
  });
});

describe('Connection regex patterns', () => {
  describe('microsoftFoundryModelsRegex', () => {
    it('should match resourceIds ending with /models', () => {
      expect(
        microsoftFoundryModelsRegex.test(
          '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/models'
        )
      ).toBe(true);
    });

    it('should not match resourceIds without /models suffix', () => {
      expect(
        microsoftFoundryModelsRegex.test('/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount')
      ).toBe(false);
    });

    it('should not match /models in the middle of a path', () => {
      expect(microsoftFoundryModelsRegex.test('/some/path/models/deployments')).toBe(false);
    });

    it('should not match FoundryAgentServiceV2 resourceIds', () => {
      expect(
        microsoftFoundryModelsRegex.test(
          '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/projects/myproject'
        )
      ).toBe(false);
    });
  });

  describe('foundryServiceConnectionRegex', () => {
    it('should match FoundryAgentServiceV2 resourceIds with /accounts/x/projects/y', () => {
      expect(
        foundryServiceConnectionRegex.test(
          '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/projects/myproject'
        )
      ).toBe(true);
    });

    it('should not match standard Cognitive Services resourceIds', () => {
      expect(
        foundryServiceConnectionRegex.test('/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount')
      ).toBe(false);
    });

    it('should not match resourceIds with /models suffix', () => {
      expect(
        foundryServiceConnectionRegex.test(
          '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/models'
        )
      ).toBe(false);
    });
  });

  describe('apimanagementRegex', () => {
    it('should match APIM resourceIds', () => {
      expect(
        apimanagementRegex.test('/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/myservice/apis/myapi')
      ).toBe(true);
    });

    it('should not match Cognitive Services resourceIds', () => {
      expect(apimanagementRegex.test('/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount')).toBe(
        false
      );
    });
  });
});

import { describe, vi, beforeEach, it, expect } from 'vitest';
import { ConsumptionConnectorService } from '../connector';
import type { IHttpClient } from '../../httpClient';
import { InitConnectionService } from '../../connection';
import type { Connection } from '../../../../utils/src';

describe('ConsumptionConnectorService', () => {
  let mockHttpClient: IHttpClient;
  let connectorService: ConsumptionConnectorService;

  const baseUrl = 'https://management.azure.com';
  const workflowReferenceId = '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Logic/workflows/test-workflow';
  const apiVersion = '2018-07-01-preview';

  const createMockOptions = () => ({
    apiVersion,
    baseUrl,
    httpClient: {} as IHttpClient,
    workflowReferenceId,
    clientSupportedOperations: [] as { connectorId: string; operationId: string }[],
    schemaClient: {},
    valuesClient: {},
  });

  beforeEach(() => {
    mockHttpClient = {
      dispose: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const options = createMockOptions();
    options.httpClient = mockHttpClient;
    connectorService = new ConsumptionConnectorService(options);
  });

  describe('constructor', () => {
    it('should throw when workflowReferenceId is not provided', () => {
      expect(
        () =>
          new ConsumptionConnectorService({
            ...createMockOptions(),
            workflowReferenceId: '',
          })
      ).toThrow('workflowReferenceId required');
    });
  });

  describe('getListDynamicValues', () => {
    const mcpDynamicState = {
      operationId: 'listMcpTools',
      apiType: 'mcp',
    };

    const nonMcpDynamicState = {
      operationId: 'someOperation',
      parameters: {},
    };

    const mockMcpToolsResponse = {
      response: {
        statusCode: 'OK',
        body: [
          { name: 'tool1', description: 'First tool' },
          { name: 'tool2', description: 'Second tool' },
        ],
        headers: {},
      },
    };

    describe('MCP built-in connections', () => {
      const builtInConnectionId = '/connectionProviders/mcpclient/connections/test-mcp';

      beforeEach(() => {
        InitConnectionService({
          getConnection: vi.fn().mockResolvedValue({
            id: builtInConnectionId,
            name: 'test-mcp',
            properties: {
              displayName: 'Test MCP Server',
              parameterValues: {
                mcpServerUrl: 'https://mcp.example.com',
                authenticationType: 'None',
              },
            },
          } as unknown as Connection),
        } as any);
      });

      it('should call listMcpTools endpoint with correct URL', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState
        );

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          expect.objectContaining({
            uri: `${baseUrl}${workflowReferenceId}/listMcpTools`,
          })
        );
      });

      it('should send native connection shape with mcpServerUrl', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState
        );

        const postCallArgs = vi.mocked(mockHttpClient.post).mock.calls[0][0];
        const content = postCallArgs.content as any;

        expect(content.connection).toBeDefined();
        expect(content.connection.mcpServerUrl).toBe('https://mcp.example.com');
        expect(content.connection.displayName).toBe('Test MCP Server');
      });

      it('should include authentication for ApiKey auth type', async () => {
        InitConnectionService({
          getConnection: vi.fn().mockResolvedValue({
            id: builtInConnectionId,
            name: 'test-mcp',
            properties: {
              displayName: 'Test MCP Server',
              parameterValues: {
                mcpServerUrl: 'https://mcp.example.com',
                authenticationType: 'ApiKey',
                key: 'test-api-key',
                keyHeaderName: 'X-Api-Key',
              },
            },
          } as unknown as Connection),
        } as any);

        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState
        );

        const postCallArgs = vi.mocked(mockHttpClient.post).mock.calls[0][0];
        const content = postCallArgs.content as any;

        expect(content.connection.authentication).toEqual({
          type: 'ApiKey',
          value: 'test-api-key',
          name: 'X-Api-Key',
          in: 'header',
        });
      });

      it('should not include authentication when auth type is None', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState
        );

        const postCallArgs = vi.mocked(mockHttpClient.post).mock.calls[0][0];
        const content = postCallArgs.content as any;

        expect(content.connection.authentication).toBeUndefined();
      });

      it('should map tools response to ListDynamicValue array', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        const result = await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState
        );

        expect(result).toEqual([
          { value: 'tool1', displayName: 'tool1', description: 'First tool' },
          { value: 'tool2', displayName: 'tool2', description: 'Second tool' },
        ]);
      });

      it('should return empty array when tools response is null', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue({
          response: { statusCode: 'OK', body: null, headers: {} },
        });

        const result = await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState
        );

        expect(result).toEqual([]);
      });

      it('should pass mcpServerPath from operationPath', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        await connectorService.getListDynamicValues(
          builtInConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState,
          false,
          '/custom/mcp/path'
        );

        const postCallArgs = vi.mocked(mockHttpClient.post).mock.calls[0][0];
        const content = postCallArgs.content as any;

        expect(content.mcpServerPath).toBe('/custom/mcp/path');
      });
    });

    describe('MCP managed connections', () => {
      const managedConnectionId = '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/connections/mcp-managed';

      beforeEach(() => {
        InitConnectionService({
          getConnection: vi.fn().mockResolvedValue({
            id: managedConnectionId,
            name: 'mcp-managed',
            properties: {
              displayName: 'Managed MCP',
            },
          } as unknown as Connection),
        } as any);
      });

      it('should send managedConnection shape for non-builtin connections', async () => {
        vi.mocked(mockHttpClient.post).mockResolvedValue(mockMcpToolsResponse);

        await connectorService.getListDynamicValues(
          managedConnectionId,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState,
          false,
          '/mcp/path'
        );

        const postCallArgs = vi.mocked(mockHttpClient.post).mock.calls[0][0];
        const content = postCallArgs.content as any;

        expect(content.managedConnection).toEqual({
          connection: { id: managedConnectionId },
        });
        expect(content.mcpServerPath).toBe('/mcp/path');
        expect(content.connection).toBeUndefined();
      });
    });

    describe('MCP with no connectionId', () => {
      it('should return empty list when connectionId is undefined', async () => {
        const result = await connectorService.getListDynamicValues(
          undefined,
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState,
          false,
          '/mcp/path'
        );

        expect(result).toEqual([]);
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe('non-MCP dynamic list', () => {
      it('should call dynamicList endpoint for non-MCP connections', async () => {
        const connectionId = '/some/connection/id';

        vi.mocked(mockHttpClient.post).mockResolvedValue({
          response: {
            statusCode: 'OK',
            body: { value: [{ value: 'option1', displayName: 'Option 1' }] },
            headers: {},
          },
        });

        await connectorService.getListDynamicValues(connectionId, 'someConnector', 'someOperation', {}, nonMcpDynamicState);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          expect.objectContaining({
            uri: `${connectionId}/dynamicList`,
          })
        );
      });
    });
  });

  describe('_buildMcpAuthentication', () => {
    // Access private method via any cast for testing
    const buildAuth = (props: Record<string, any>) => {
      return (connectorService as any)._buildMcpAuthentication(props);
    };

    it('should return undefined for None auth type', () => {
      expect(buildAuth({ authenticationType: 'None' })).toBeUndefined();
    });

    it('should return undefined when no auth type', () => {
      expect(buildAuth({})).toBeUndefined();
    });

    it('should build ApiKey authentication', () => {
      const result = buildAuth({
        authenticationType: 'ApiKey',
        key: 'my-key',
        keyHeaderName: 'Authorization',
      });

      expect(result).toEqual({
        type: 'ApiKey',
        value: 'my-key',
        name: 'Authorization',
        in: 'header',
      });
    });

    it('should build Basic authentication', () => {
      const result = buildAuth({
        authenticationType: 'Basic',
        username: 'user',
        password: 'pass',
      });

      expect(result).toEqual({
        type: 'Basic',
        username: 'user',
        password: 'pass',
      });
    });

    it('should build ActiveDirectoryOAuth authentication', () => {
      const result = buildAuth({
        authenticationType: 'ActiveDirectoryOAuth',
        tenant: 'my-tenant',
        clientId: 'my-client',
        secret: 'my-secret',
        authority: 'https://login.microsoftonline.com',
        audience: 'https://api.example.com',
      });

      expect(result).toEqual({
        type: 'ActiveDirectoryOAuth',
        tenant: 'my-tenant',
        clientId: 'my-client',
        secret: 'my-secret',
        authority: 'https://login.microsoftonline.com',
        audience: 'https://api.example.com',
      });
    });

    it('should build ClientCertificate authentication', () => {
      const result = buildAuth({
        authenticationType: 'ClientCertificate',
        pfx: 'cert-data',
        password: 'cert-pass',
      });

      expect(result).toEqual({
        type: 'ClientCertificate',
        pfx: 'cert-data',
        password: 'cert-pass',
      });
    });
  });
});

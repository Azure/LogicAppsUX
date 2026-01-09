import { describe, vi, beforeEach, it, expect } from 'vitest';
import { StandardConnectorService, type StandardConnectorServiceOptions } from '../connector';
import type { IHttpClient } from '../../httpClient';

describe('StandardConnectorService', () => {
  let mockHttpClient: IHttpClient;
  let mockGetConfiguration: ReturnType<typeof vi.fn>;
  let connectorService: StandardConnectorService;

  const createMockOptions = (): StandardConnectorServiceOptions => ({
    apiVersion: '2024-01-01',
    baseUrl:
      'https://test.azure.com/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-app/hostruntime/runtime/webhooks/workflow/api/management',
    httpClient: {} as IHttpClient,
    workflowName: 'testWorkflow',
    getConfiguration: vi.fn(),
    clientSupportedOperations: [],
    schemaClient: {},
    valuesClient: {},
  });

  // Helper to create mock API response in the expected format
  const createMockApiResponse = (body: unknown) => ({
    response: {
      statusCode: 'OK',
      body,
      headers: {},
    },
  });

  let mockOptions: StandardConnectorServiceOptions;

  beforeEach(() => {
    mockHttpClient = {
      dispose: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    mockGetConfiguration = vi.fn();
    mockOptions = createMockOptions();
    mockOptions.httpClient = mockHttpClient;
    mockOptions.getConfiguration = mockGetConfiguration;
    connectorService = new StandardConnectorService(mockOptions);
  });

  describe('MCP Connection - _listDynamicValues', () => {
    const mcpDynamicState = {
      operationId: 'listMcpTools',
      apiType: 'mcp',
    };

    const mockMcpToolsResponse = [
      { name: 'tool1', description: 'First tool description' },
      { name: 'tool2', description: 'Second tool description' },
      { name: 'tool3', description: 'Third tool description' },
    ];

    it('should call listMcpTools endpoint for MCP connections', async () => {
      const connectionId = '/connections/mcp-connection-1';
      const connectorId = '/connectionProviders/mcpclient';
      const operationId = 'nativemcpclient';
      const operationPath = '/mcp/server/path';

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'mcp-connection-1' },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse(mockMcpToolsResponse));

      const result = await connectorService.getListDynamicValues(
        connectionId,
        connectorId,
        operationId,
        {},
        mcpDynamicState,
        false,
        operationPath
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith({
        uri: `${mockOptions.baseUrl}/workflows/${mockOptions.workflowName}/listMcpTools`,
        queryParameters: { 'api-version': mockOptions.apiVersion },
        content: {
          managedConnection: { connectionId: 'mcp-connection-1' },
          mcpServerPath: operationPath,
        },
      });

      expect(result).toEqual([
        { value: 'tool1', displayName: 'tool1', description: 'First tool description' },
        { value: 'tool2', displayName: 'tool2', description: 'Second tool description' },
        { value: 'tool3', displayName: 'tool3', description: 'Third tool description' },
      ]);
    });

    it('should handle agent MCP connections differently', async () => {
      const connectionId = '/connections/agent-mcp-connection';
      const connectorId = '/connectionProviders/mcpclient';
      const operationId = 'nativemcpclient';

      mockGetConfiguration.mockResolvedValue({
        isAgentMcpConnection: true,
        connection: { connectionId: 'agent-mcp-connection', type: 'agent' },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse(mockMcpToolsResponse));

      const result = await connectorService.getListDynamicValues(connectionId, connectorId, operationId, {}, mcpDynamicState, false);

      expect(mockHttpClient.post).toHaveBeenCalledWith({
        uri: `${mockOptions.baseUrl}/workflows/${mockOptions.workflowName}/listMcpTools`,
        queryParameters: { 'api-version': mockOptions.apiVersion },
        content: {
          connection: { connectionId: 'agent-mcp-connection', type: 'agent' },
        },
      });

      expect(result).toHaveLength(3);
    });

    it('should remove connectionRuntimeUrl from connectionProperties for managed MCP connections', async () => {
      const connectionId = '/connections/mcp-connection-1';
      const connectorId = '/connectionProviders/mcpclient';
      const operationId = 'nativemcpclient';
      const operationPath = '/mcp/server/path';

      mockGetConfiguration.mockResolvedValue({
        connection: {
          connectionId: 'mcp-connection-1',
          connectionProperties: {
            connectionRuntimeUrl: 'https://runtime.url',
            otherProperty: 'value',
          },
        },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse(mockMcpToolsResponse));

      await connectorService.getListDynamicValues(connectionId, connectorId, operationId, {}, mcpDynamicState, false, operationPath);

      const postCallArgs = vi.mocked(mockHttpClient.post).mock.calls[0][0];
      const managedConnection = (postCallArgs.content as any)?.managedConnection;

      // Verify connectionRuntimeUrl was removed from connectionProperties
      expect(managedConnection.connectionProperties).not.toHaveProperty('connectionRuntimeUrl');
      expect(managedConnection.connectionProperties.otherProperty).toBe('value');
    });

    it('should throw error when workflowName is not provided for MCP connections', async () => {
      const optionsWithoutWorkflowName = createMockOptions();
      optionsWithoutWorkflowName.httpClient = mockHttpClient;
      optionsWithoutWorkflowName.getConfiguration = mockGetConfiguration;
      (optionsWithoutWorkflowName as any).workflowName = undefined;

      const serviceWithoutWorkflowName = new StandardConnectorService(optionsWithoutWorkflowName);

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'mcp-connection-1' },
      });

      await expect(
        serviceWithoutWorkflowName.getListDynamicValues(
          '/connections/mcp-connection-1',
          '/connectionProviders/mcpclient',
          'nativemcpclient',
          {},
          mcpDynamicState,
          false
        )
      ).rejects.toThrow('workflowName is required for MCP connections.');
    });

    it('should return empty array when MCP tools response is null or undefined', async () => {
      const connectionId = '/connections/mcp-connection-1';
      const connectorId = '/connectionProviders/mcpclient';
      const operationId = 'nativemcpclient';

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'mcp-connection-1' },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse(null));

      const result = await connectorService.getListDynamicValues(connectionId, connectorId, operationId, {}, mcpDynamicState, false);

      expect(result).toEqual([]);
    });

    it('should handle MCP tools with missing description', async () => {
      const connectionId = '/connections/mcp-connection-1';
      const connectorId = '/connectionProviders/mcpclient';
      const operationId = 'nativemcpclient';

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'mcp-connection-1' },
      });

      const toolsWithMissingDescription = [{ name: 'tool1' }, { name: 'tool2', description: 'Has description' }];

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse(toolsWithMissingDescription));

      const result = await connectorService.getListDynamicValues(connectionId, connectorId, operationId, {}, mcpDynamicState, false);

      expect(result).toEqual([
        { value: 'tool1', displayName: 'tool1', description: undefined },
        { value: 'tool2', displayName: 'tool2', description: 'Has description' },
      ]);
    });
  });

  describe('Non-MCP Dynamic Values', () => {
    it('should call standard dynamicInvoke endpoint for non-MCP operations', async () => {
      const connectionId = '/connections/standard-connection';
      const connectorId = '/connectionProviders/office365';
      const operationId = 'getEmails';
      const dynamicState = {
        operationId: 'getDynamicValues',
        parameters: {},
      };

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'standard-connection' },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse([{ value: 'option1', displayName: 'Option 1' }]));

      await connectorService.getListDynamicValues(connectionId, connectorId, operationId, {}, dynamicState, false);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: expect.stringContaining('/operationGroups/office365/operations/getDynamicValues/dynamicInvoke'),
        })
      );
    });
  });

  describe('getConfiguration integration', () => {
    it('should pass useManagedConnections flag as true for MCP connections', async () => {
      const connectionId = '/connections/mcp-connection-1';
      const mcpDynamicState = {
        operationId: 'listMcpTools',
        apiType: 'mcp',
      };

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'mcp-connection-1' },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse([]));

      await connectorService.getListDynamicValues(
        connectionId,
        '/connectionProviders/mcpclient',
        'nativemcpclient',
        {},
        mcpDynamicState,
        false
      );

      // Verify getConfiguration was called with useManagedConnections=true for MCP
      expect(mockGetConfiguration).toHaveBeenCalledWith(connectionId, undefined, true);
    });

    it('should not pass useManagedConnections flag for non-MCP connections', async () => {
      const connectionId = '/connections/standard-connection';
      const nonMcpDynamicState = {
        operationId: 'getDynamicValues',
      };

      mockGetConfiguration.mockResolvedValue({
        connection: { connectionId: 'standard-connection' },
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue(createMockApiResponse([]));

      await connectorService.getListDynamicValues(
        connectionId,
        '/connectionProviders/office365',
        'getEmails',
        {},
        nonMcpDynamicState,
        false
      );

      // Verify getConfiguration was called without useManagedConnections flag
      expect(mockGetConfiguration).toHaveBeenCalledWith(connectionId, undefined, false);
    });
  });
});

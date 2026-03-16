import type { OpenAPIV2 } from '../../../utils/src';
import { ArgumentException, UnsupportedException, optional, equals, getResourceName } from '../../../utils/src';
import type { BaseConnectorServiceOptions } from '../base';
import { BaseConnectorService } from '../base';
import { ConnectionService } from '../connection';
import type { ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicExtension, TreeDynamicValue } from '../connector';
import { pathCombine, unwrapPaginatedResponse } from '../helpers';
import { LoggerService } from '../logger';
import { LogEntryLevel } from '../logging/logEntry';

interface ConsumptionConnectorServiceOptions extends BaseConnectorServiceOptions {
  workflowReferenceId: string;
}

export class ConsumptionConnectorService extends BaseConnectorService {
  constructor(override readonly options: ConsumptionConnectorServiceOptions) {
    super(options);
    const { workflowReferenceId } = options;
    if (!workflowReferenceId) {
      throw new ArgumentException('workflowReferenceId required');
    }
  }

  async getLegacyDynamicContent(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl, apiVersion, workflowReferenceId } = this.options;

    const result = await this._executeAzureDynamicApi(
      pathCombine(baseUrl, connectionId),
      apiVersion,
      parameters,
      managedIdentityProperties ? { workflowReference: { id: workflowReferenceId } } : undefined
    );

    if (result?.__paginationIncomplete) {
      LoggerService().log({
        message: `Pagination request unsuccessful, some values may be missing. ${result.__paginationError || ''} on ${connectorId}`,
        level: LogEntryLevel.Error,
        area: 'unwrapPaginatedResponse',
      });
    }

    return unwrapPaginatedResponse(result);
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<ListDynamicValue[]> {
    const { apiVersion, httpClient } = this.options;
    const { operationId: dynamicOperation, apiType } = dynamicState;
    const isMcpConnection = apiType === 'mcp' && dynamicOperation === 'listMcpTools';

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.valuesClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the values client.`);
      }
      return this.options.valuesClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
      });
    }

    // MCP-specific: use listMcpTools endpoint instead of dynamicList
    if (isMcpConnection) {
      const { workflowReferenceId } = this.options;
      const uri = `${workflowReferenceId}/listMcpTools`;

      // Get the connection data from ConnectionService
      let connection: any;
      try {
        connection = connectionId ? await ConnectionService().getConnection(connectionId) : undefined;
      } catch {
        // Connection may not be in cache/API Hub for built-in MCP
      }

      let content: any = {};
      if (connection?.properties?.parameterValues) {
        // Built-in MCP connection — send connection info in the expected format
        const { mcpServerUrl, authenticationType, ...authParams } = connection.properties.parameterValues;
        content = {
          connection: {
            inputs: {
              Connection: {
                McpServerUrl: mcpServerUrl,
                Authentication: authenticationType || 'None',
                ...authParams,
              },
            },
            type: 'McpClientTool',
            kind: 'BuiltIn',
          },
        };
      }

      const mcpToolsResponse = await httpClient.post({
        uri,
        queryParameters: { 'api-version': '2018-07-01-preview' },
        content,
      });
      const tools = this._getResponseFromDynamicApi(mcpToolsResponse, uri);

      return (tools ?? []).map((tool: any) => ({
        value: tool.name,
        displayName: tool.name,
        description: tool.description,
      }));
    }

    // Regular dynamic list for non-MCP connections
    const resolvedConnectionId = this._resolveConnectionId(connectionId);
    const uri = `${resolvedConnectionId}/dynamicList`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        dynamicInvocationDefinition: dynamicState,
        parameters,
      },
    });
    return this._getResponseFromDynamicApi(response, uri)?.value;
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<OpenAPIV2.SchemaObject> {
    const { apiVersion, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
      contextParameterAlias,
    } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.schemaClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the schema client.`);
      }
      return this.options.schemaClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        isInput,
      });
    }

    const resolvedConnectionId = this._resolveConnectionId(connectionId);
    const uri = `${resolvedConnectionId}/dynamicProperties`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        location: isInput ? 'input' : 'output',
        dynamicInvocationDefinition: dynamicState.extension,
        parameters,
        contextParameterAlias,
      },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  async getTreeDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicExtension: TreeDynamicExtension,
    isManagedIdentityConnection?: boolean
  ): Promise<TreeDynamicValue[]> {
    const { apiVersion, httpClient } = this.options;
    const { dynamicState, selectionState } = dynamicExtension;

    const resolvedConnectionId = this._resolveConnectionId(connectionId);
    const uri = `${resolvedConnectionId}/dynamicTree`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        dynamicInvocationDefinition: dynamicState,
        parameters,
        selectionState,
      },
    });
    const values = this._getResponseFromDynamicApi(response, uri)?.value;
    return (values || []).map((item: any) => ({
      value: item,
      displayName: item.displayName,
      id: item.Id,
      isParent: item.isParent ?? equals(item.nodeType, 'parent'),
    }));
  }

  private _resolveConnectionId(connectionId: string | undefined): string | undefined {
    if (connectionId && !connectionId.startsWith('/subscriptions/')) {
      return `${this.options.workflowReferenceId}/${connectionId}`;
    }
    return connectionId;
  }

  private _getPropertiesIfNeeded(isManagedIdentityConnection?: boolean):
    | {
        workflowReference: { name: string; id: string; type: string };
      }
    | undefined {
    if (isManagedIdentityConnection) {
      const { workflowReferenceId } = this.options;
      return {
        workflowReference: {
          name: getResourceName(workflowReferenceId),
          id: workflowReferenceId,
          type: 'Microsoft.Logic/workflows',
        },
      };
    }

    return undefined;
  }
}

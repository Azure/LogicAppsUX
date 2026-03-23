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
    isManagedIdentityConnection?: boolean,
    operationPath?: string
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
      const { baseUrl, workflowReferenceId } = this.options;
      const uri = `${baseUrl}${workflowReferenceId}/listMcpTools`;

      // Get the connection data from ConnectionService
      let connection: any;
      try {
        connection = connectionId ? await ConnectionService().getConnection(connectionId) : undefined;
      } catch {
        // Connection may not be in cache/API Hub for built-in MCP
      }

      const isRealConnectionId = connectionId && !connectionId.includes('__MOCK');

      let content: any;
      const parameterValues = connection?.properties?.parameterValues;
      if (parameterValues?.mcpServerUrl) {
        // Built-in MCP connection — has mcpServerUrl in parameterValues
        const connectionData: any = {
          mcpServerUrl: parameterValues.mcpServerUrl,
          displayName: connection.properties.displayName,
        };
        const authentication = this._buildMcpAuthentication(parameterValues);
        if (authentication) {
          connectionData.authentication = authentication;
        }
        content = {
          connection: connectionData,
          mcpServerPath: operationPath,
        };
      } else if (isRealConnectionId) {
        // Managed MCP connection — send managed connection reference
        content = {
          managedConnection: {
            connection: { id: connectionId },
          },
          mcpServerPath: operationPath,
        };
      } else {
        // No valid connection available (e.g., mock reference during deserialization)
        // Return empty list — tools will load when called from the wizard with a real connection
        return [];
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
    const uri = `${connectionId}/dynamicList`;
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

    const uri = `${connectionId}/dynamicProperties`;
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

    const uri = `${connectionId}/dynamicTree`;
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

  private _buildMcpAuthentication(connectionProperties: Record<string, any>): Record<string, any> | undefined {
    const authType = connectionProperties['authenticationType'];
    if (!authType || authType === 'None') {
      return undefined;
    }

    const authentication: Record<string, any> = { type: authType };
    if (authType === 'ApiKey') {
      authentication['value'] = connectionProperties['key'];
      authentication['name'] = connectionProperties['keyHeaderName'];
      authentication['in'] = 'header';
    } else if (authType === 'Basic') {
      authentication['username'] = connectionProperties['username'];
      authentication['password'] = connectionProperties['password'];
    } else if (authType === 'ActiveDirectoryOAuth') {
      authentication['tenant'] = connectionProperties['tenant'];
      authentication['clientId'] = connectionProperties['clientId'];
      authentication['secret'] = connectionProperties['secret'];
      authentication['authority'] = connectionProperties['authority'];
      authentication['audience'] = connectionProperties['audience'];
    } else if (authType === 'ClientCertificate') {
      authentication['pfx'] = connectionProperties['pfx'];
      authentication['password'] = connectionProperties['password'];
    }

    return authentication;
  }
}

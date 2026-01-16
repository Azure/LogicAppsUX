import type { OpenAPIV2, OperationManifest } from '../../../utils/src';
import { isArmResourceId, UnsupportedException } from '../../../utils/src';
import { validateRequiredServiceArguments } from '../../../utils/src/lib/helpers/functions';
import type { BaseConnectorServiceOptions } from '../base';
import { BaseConnectorService } from '../base';
import type { ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicExtension, TreeDynamicValue } from '../connector';
import { pathCombine, unwrapPaginatedResponse } from '../helpers';
import { LoggerService } from '../logger';
import { LogEntryLevel } from '../logging/logEntry';
import { getHybridAppBaseRelativeUrl, hybridApiVersion, isHybridLogicApp } from './hybrid';

type GetConfigurationFunction = (
  connectionId: string,
  manifest?: OperationManifest,
  useManagedConnections?: boolean
) => Promise<Record<string, any>>;

export interface StandardConnectorServiceOptions extends BaseConnectorServiceOptions {
  getConfiguration: GetConfigurationFunction;
  workflowName?: string;
}

export class StandardConnectorService extends BaseConnectorService {
  constructor(override readonly options: StandardConnectorServiceOptions) {
    super({
      ...options,
      baseUrl: options.apiHubServiceDetails?.baseUrl ?? options.baseUrl,
      apiVersion: options.apiHubServiceDetails?.apiVersion ?? options.apiVersion,
    });
    const { apiVersion, baseUrl, getConfiguration } = options;
    validateRequiredServiceArguments({ apiVersion, baseUrl, getConfiguration });
  }

  async getLegacyDynamicContent(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl, apiHubServiceDetails } = this.options;
    let dynamicUrl: string;
    let apiVersion = this.options.apiVersion;

    if (isArmResourceId(connectorId)) {
      dynamicUrl = managedIdentityProperties ? baseUrl : pathCombine(apiHubServiceDetails?.baseUrl as string, connectionId);
      apiVersion = managedIdentityProperties ? apiVersion : (apiHubServiceDetails?.apiVersion as string);
    } else {
      dynamicUrl = baseUrl;
    }

    const result = await this._executeAzureDynamicApi(dynamicUrl, apiVersion, parameters, managedIdentityProperties);

    if (result?.__paginationIncomplete) {
      LoggerService().log({
        message: `Pagination request unsuccessful, some values may be missing. ${result.__paginationError || ''} on ${connectorId}`,
        level: LogEntryLevel.Error,
        area: 'unwrapPaginatedResponse',
      });
    }
    return unwrapPaginatedResponse(result);
  }

  protected async _listDynamicValues(
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    connectionId: string | undefined,
    operationPath?: string
  ): Promise<ListDynamicValue[]> {
    const { baseUrl, apiVersion, httpClient, getConfiguration } = this.options;
    const { operationId: dynamicOperation, apiType } = dynamicState;
    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const isMcpConnection = apiType === 'mcp' && dynamicOperation === 'listMcpTools';

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.valuesClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the values client.`);
      }
      return this.options.valuesClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        configuration: await getConfiguration(connectionId ?? ''),
      });
    }

    const configuration: any = await getConfiguration(connectionId ?? '', /* manifest */ undefined, !!isMcpConnection);
    if (isMcpConnection) {
      if (!this.options.workflowName) {
        throw new Error('workflowName is required for MCP connections.');
      }

      const uri = `${baseUrl}/workflows/${this.options.workflowName}/listMcpTools`;
      let content: any;

      if (configuration.isAgentMcpConnection) {
        content = { connection: configuration.connection };
      } else {
        // Workaround: Remove connectionRuntimeUrl from connectionProperties if it exists
        // connectionRuntimeUrl should be at the root level, not inside connectionProperties
        const connection = { ...configuration.connection };
        if (connection?.connectionProperties?.connectionRuntimeUrl) {
          delete connection.connectionProperties.connectionRuntimeUrl;
        }
        content = {
          managedConnection: connection,
          mcpServerPath: operationPath,
        };
      }
      const mcpToolsResponse = await httpClient.post({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content,
      });
      const tools = this._getResponseFromDynamicApi(mcpToolsResponse, uri);

      return (tools ?? []).map((tool: any) => ({
        value: tool.name,
        displayName: tool.name,
        description: tool.description,
      }));
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;
    let response = null;
    if (isHybridLogicApp(uri)) {
      response = await httpClient.post({
        uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=${hybridApiVersion}`,
        headers: {
          'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operationGroups/${connectorId
            .split('/')
            .slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`,
          'x-ms-logicapps-proxy-method': 'POST',
        },
        content: { parameters: invokeParameters, configuration },
      });
    } else {
      response = await httpClient.post({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content: { parameters: invokeParameters, configuration },
      });
    }

    return this._getResponseFromDynamicApi(response, uri);
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    _isManagedIdentityConnection?: boolean,
    operationPath?: string
  ): Promise<ListDynamicValue[]> {
    return this._listDynamicValues(connectorId, operationId, parameters, dynamicState, connectionId, operationPath);
  }

  protected async _getDynamicSchema(
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    configuration: Record<string, any>
  ): Promise<OpenAPIV2.SchemaObject> {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
    } = dynamicState;
    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.schemaClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the schema client.`);
      }
      return this.options.schemaClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        configuration,
        isInput,
      });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;

    let response = null;
    if (isHybridLogicApp(uri)) {
      response = await httpClient.post({
        uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=${hybridApiVersion}`,
        headers: {
          'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operationGroups/${connectorId
            .split('/')
            .slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`,
          'x-ms-logicapps-proxy-method': 'POST',
        },
        content: { parameters: invokeParameters, configuration },
      });
    } else {
      response = await httpClient.post({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content: { parameters: invokeParameters, configuration },
      });
    }

    return this._getResponseFromDynamicApi(response, uri);
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject> {
    const { getConfiguration } = this.options;
    const configuration = await getConfiguration(connectionId ?? '');

    return this._getDynamicSchema(connectorId, operationId, parameters, dynamicState, configuration);
  }

  getTreeDynamicValues(
    _connectionId: string | undefined,
    _connectorId: string,
    _operationId: string,
    _parameters: Record<string, any>,
    _dynamicState: TreeDynamicExtension
  ): Promise<TreeDynamicValue[]> {
    throw new UnsupportedException('Unsupported dynamic call connector method - getTreeDynamicValues');
  }
}

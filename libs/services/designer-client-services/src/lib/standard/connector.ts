import type { BaseConnectorServiceOptions } from '../base';
import { BaseConnectorService } from '../base';
import type { ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicValue } from '../connector';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';
import { ArgumentException, UnsupportedException } from '@microsoft/utils-logic-apps';

type GetConfigurationFunction = (connectionId: string) => Promise<Record<string, any>>;

interface StandardConnectorServiceOptions extends BaseConnectorServiceOptions {
  baseUrl: string;
  apiVersion: string;
  getConfiguration: GetConfigurationFunction;
  apiHubServiceDetails?: {
    apiVersion: string;
    baseUrl: string;
  };
}

export class StandardConnectorService extends BaseConnectorService {
  constructor(override readonly options: StandardConnectorServiceOptions) {
    super({
      ...options,
      baseUrl: options.apiHubServiceDetails?.baseUrl ?? options.baseUrl,
      apiVersion: options.apiHubServiceDetails?.apiVersion ?? options.apiVersion,
    });
    const { apiVersion, baseUrl, getConfiguration } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!getConfiguration) {
      throw new ArgumentException('getConfiguration required');
    }
  }

  async getLegacyDynamicContent(
    connectionId: string,
    _connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl, apiVersion } = this.options;
    return this._executeAzureDynamicApi(connectionId, baseUrl, apiVersion, parameters, managedIdentityProperties);
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<ListDynamicValue[]> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const { operationId: dynamicOperation } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const configuration = await getConfiguration(connectionId ?? '');

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.valuesClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the values client.`);
      }
      return this.options.valuesClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        configuration,
      });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: { parameters: invokeParameters, configuration },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
    } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const configuration = await getConfiguration(connectionId ?? '');

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
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: { parameters: invokeParameters, configuration },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  getTreeDynamicValues(
    _connectionId: string | undefined,
    _connectorId: string,
    _operationId: string,
    _parameterAlias: string | undefined,
    _parameters: Record<string, any>,
    _dynamicState: any
  ): Promise<TreeDynamicValue[]> {
    throw new UnsupportedException('Unsupported dynamic call connector method - getTreeDynamicValues');
  }
}

import type { OpenAPIV2 } from '../../../utils/src';
import { ArgumentException, UnsupportedException } from '../../../utils/src';
import type { BaseConnectorServiceOptions } from '../base';
import { BaseConnectorService } from '../base';
import type { ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicExtension, TreeDynamicValue } from '../connector';

type GetConfigurationFunction = (connectionId: string) => Promise<Record<string, any>>;

interface StandardConnectorServiceOptions extends BaseConnectorServiceOptions {
  getConfiguration: GetConfigurationFunction;
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
    }
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!getConfiguration) {
      throw new ArgumentException('getConfiguration required');
    }
  }

  async getLegacyDynamicContent(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl } = this.options;
    return this._executeAzureDynamicApi(connectionId, connectorId, baseUrl, parameters, managedIdentityProperties);
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
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
    let response = null;
    if (this.isHybridLogicApp(uri)) {
      response = await httpClient.post({
        uri: `${this.getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=2024-02-02-preview`.replace(
          'management.azure.com',
          'brazilus.management.azure.com'
        ),
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

  public isHybridLogicApp(uri: string): boolean {
    return uri.indexOf('providers/Microsoft.App/containerApps') !== -1;
  }

  public getHybridAppBaseRelativeUrl(appId: string | undefined): string {
    if (!appId) {
      throw new Error(`Invalid value for appId: '${appId}'`);
    }

    if (appId.endsWith('/')) {
      appId = appId.substring(0, appId.length - 1);
    }

    return `${appId}/providers/Microsoft.App/logicApps/${appId.split('/').pop()}`;
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
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

    let response = null;
    if (this.isHybridLogicApp(uri)) {
      response = await httpClient.post({
        uri: `${this.getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=2024-02-02-preview`.replace(
          'management.azure.com',
          'brazilus.management.azure.com'
        ),
        headers: {
          'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operationGroups/${connectorId
            .split('/')
            .slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`,
          'x-ms-logicapps-proxy-method': 'GET',
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

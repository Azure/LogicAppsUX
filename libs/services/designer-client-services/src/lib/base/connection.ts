/* eslint-disable no-param-reassign */
import { azureFunctionConnectorId } from '../base/operationmanifest';
import type { HttpResponse } from '../common/exceptions/service';
import type {
  ConnectionCreationInfo,
  ConnectionParametersMetadata,
  CreateConnectionResult,
  IConnectionService,
  ConnectorWithSwagger,
} from '../connection';
import type { HttpRequestOptions, IHttpClient, QueryParameters } from '../httpClient';
import type { Connection, ConnectionParameter, Connector, ManagedIdentity } from '@microsoft/utils-logic-apps';
import {
  getUniqueName,
  HTTP_METHODS,
  UserErrorCode,
  UserException,
  isArmResourceId,
  ConnectionParameterSource,
  ConnectionType,
  safeSetObjectPropertyValue,
  ArgumentException,
  equals,
} from '@microsoft/utils-logic-apps';

interface ServiceProviderConnectionModel {
  parameterValues: Record<string, any>;
  serviceProvider: {
    id: string;
  };
  displayName?: string;
}

interface FunctionsConnectionModel {
  function: {
    id: string;
  };
  triggerUrl: string;
  authentication: {
    type: string;
    name: string;
    value: string;
  };
  displayName?: string;
}

interface APIManagementConnectionModel {
  apiId: string;
  baseUrl: string;
  subscriptionKey: string;
  authentication?: {
    type: string;
    name: string;
    value: string;
  };
  displayName?: string;
}

interface ConnectionAndAppSetting<T> {
  connectionKey: string;
  connectionData: T;
  settings: Record<string, string>;
  pathLocation: string[];
}

export interface IApiHubServiceDetails {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export interface BaseConnectionServiceOptions {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  filterByLocation?: boolean;
  tenantId?: string;
  workflowAppDetails?: {
    appName: string;
    identity?: ManagedIdentity;
  };
  readConnections: ReadConnectionsFunc;
  writeConnection?: WriteConnectionFunc;
  apiHubServiceDetails: IApiHubServiceDetails;
  httpClient: IHttpClient;
}

export type getAccessTokenType = () => Promise<string>;

export interface ConsentLink {
  link: string;
  displayName?: string;
  status?: string;
}

export interface LogicAppConsentResponse {
  value: ConsentLink[];
}

interface ConnectionsData {
  managedApiConnections?: any;
  serviceProviderConnections?: Record<string, ServiceProviderConnectionModel>;
  functionConnections?: Record<string, FunctionsConnectionModel>;
}

type LocalConnectionModel = FunctionsConnectionModel | ServiceProviderConnectionModel | APIManagementConnectionModel;
type ReadConnectionsFunc = () => Promise<ConnectionsData>;
type WriteConnectionFunc = (connectionData: ConnectionAndAppSetting<LocalConnectionModel>) => Promise<void>;

const serviceProviderLocation = 'serviceProviderConnections';
const functionsLocation = 'functionConnections';

export abstract class BaseConnectionService implements IConnectionService {
  protected _connections: Record<string, Connection> = {};
  protected _subscriptionResourceGroupWebUrl = '';
  protected _allConnectionsInitialized = false;

  protected _vVersion: 'V1' | 'V2' = 'V1';

  constructor(public readonly options: BaseConnectionServiceOptions) {
    const { apiHubServiceDetails, apiVersion, baseUrl, readConnections } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!readConnections) {
      throw new ArgumentException('readConnections required');
    } else if (!apiHubServiceDetails) {
      throw new ArgumentException('apiHubServiceDetails required for workflow app');
    }
    this._subscriptionResourceGroupWebUrl = `/subscriptions/${apiHubServiceDetails.subscriptionId}/resourceGroups/${apiHubServiceDetails.resourceGroup}/providers/Microsoft.Web`;
  }

  dispose(): void {
    return;
  }

  async getConnectorAndSwagger(connectorId: string): Promise<ConnectorWithSwagger> {
    if (!isArmResourceId(connectorId)) {
      return { connector: await this.getConnector(connectorId), swagger: null as any };
    }

    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this.options;
    const [connector, swagger] = await Promise.all([
      this.getConnector(connectorId),
      httpClient.get<OpenAPIV2.Document>({ uri: connectorId, queryParameters: { 'api-version': apiVersion, export: 'true' } }),
    ]);

    return { connector, swagger };
  }

  async getSwaggerFromUri(uri: string): Promise<OpenAPIV2.Document> {
    const { httpClient } = this.options;
    return httpClient.get<OpenAPIV2.Document>({ uri, noAuth: true });
  }

  async getConnector(connectorId: string): Promise<Connector> {
    if (!isArmResourceId(connectorId)) {
      const { apiVersion, baseUrl, httpClient } = this.options;
      return httpClient.get<Connector>({
        uri: `${baseUrl}/operationGroups/${connectorId.split('/').at(-1)}?api-version=${apiVersion}`,
      });
    } else {
      const {
        apiHubServiceDetails: { apiVersion },
        httpClient,
      } = this.options;
      const response = await httpClient.get<Connector>({ uri: connectorId, queryParameters: { 'api-version': apiVersion } });
      return {
        ...response,
        properties: {
          ...response.properties,
          ...response.properties.generalInformation,
        },
      };
    }
  }

  async getConnection(connectionId: string): Promise<Connection> {
    if (isArmResourceId(connectionId)) {
      return this.getConnectionInApiHub(connectionId);
    }

    let connection = this._connections[connectionId];
    if (!connection) {
      await this.getConnections();
      connection = this._connections[connectionId];
    }

    return connection;
  }

  async getConnections(connectorId?: string): Promise<Connection[]> {
    if (connectorId) {
      return this.getConnectionsForConnector(connectorId);
    }

    const [localConnections, apiHubConnections] = await Promise.all([this.options.readConnections(), this.getConnectionsInApiHub()]);
    const serviceProviderConnections = (localConnections[serviceProviderLocation] || {}) as Record<string, ServiceProviderConnectionModel>;
    const functionConnections = (localConnections[functionsLocation] || {}) as Record<string, FunctionsConnectionModel>;

    this._allConnectionsInitialized = true;
    return [
      ...Object.keys(serviceProviderConnections).map((key) => {
        const connection = convertServiceProviderConnectionDataToConnection(key, serviceProviderConnections[key]);
        this._connections[connection.id] = connection;
        return connection;
      }),
      ...Object.keys(functionConnections).map((key) => {
        const connection = convertFunctionsConnectionDataToConnection(key, functionConnections[key]);
        this._connections[connection.id] = connection;
        return connection;
      }),
      ...apiHubConnections,
    ];
  }

  abstract createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection>;

  abstract createConnectionInApiHub(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo
  ): Promise<Connection>;

  abstract setupConnectionIfNeeded(connection: Connection): Promise<void>;

  protected _getRequestForCreateConnection(connectorId: string, _connectionName: string, connectionInfo: ConnectionCreationInfo): any {
    const parameterValues = connectionInfo?.connectionParameters;
    const parameterValueSet = connectionInfo?.connectionParametersSet;
    const displayName = connectionInfo?.displayName;
    const {
      apiHubServiceDetails: { location },
    } = this.options;

    return {
      properties: {
        api: { id: connectorId },
        ...(parameterValueSet ? { parameterValueSet } : { parameterValues }),
        displayName,
      },
      kind: this._vVersion,
      location,
    };
  }

  protected _getRequestForCreateConnectionWithAlternativeParameters(
    connectorId: string,
    connectionName: string,
    properties: ConnectionCreationInfo
  ): any {
    const alternativeParameterValues = properties?.internalAlternativeParameterValues;
    const {
      apiHubServiceDetails: { location },
    } = this.options;

    return {
      properties: {
        api: {
          id: connectorId,
        },
        parameterValueType: 'Alternative',
        alternativeParameterValues,
        displayName: properties?.displayName,
      },
      kind: this._vVersion,
      location,
    };
  }

  abstract createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult>;

  protected async testConnection(connection: Connection): Promise<void> {
    let response: HttpResponse<any> | undefined = undefined;
    try {
      const testLinks = connection.properties.testLinks;
      if (testLinks && testLinks.length > 0) response = await this.requestTestOtherConnections(connection);
      if (response) this.handleTestConnectionResponse(response);
    } catch (error: any) {
      Promise.reject(error);
    }
  }

  protected async requestTestOtherConnections(connection: Connection): Promise<HttpResponse<any>> {
    const testLinks = connection.properties.testLinks;
    if (!testLinks || testLinks.length === 0) return Promise.reject('No test links found');
    const { httpClient } = this.options;
    const { method: httpMethod, requestUri: uri } = testLinks[0];
    const method = httpMethod.toUpperCase() as HTTP_METHODS;

    let response: HttpResponse<any> | undefined = undefined;
    const requestOptions: HttpRequestOptions<any> = { uri };
    if (method === HTTP_METHODS.GET) response = await httpClient.get<any>(requestOptions);
    else if (method === HTTP_METHODS.POST) response = await httpClient.post<any, any>(requestOptions);
    else if (method === HTTP_METHODS.PUT) response = await httpClient.put<any, any>(requestOptions);
    else if (method === HTTP_METHODS.DELETE) response = await httpClient.delete<any>(requestOptions);
    if (!response) return Promise.reject('Failed to test connection');
    return response;
  }

  protected async pretestServiceProviderConnection(
    connector: Connector,
    connectionInfo: ConnectionCreationInfo
  ): Promise<HttpResponse<any>> {
    try {
      const { testConnectionUrl } = connector.properties;
      if (!testConnectionUrl) return Promise.reject();
      const { httpClient, baseUrl, apiVersion } = this.options;
      const queryParameters = { 'api-version': apiVersion };
      const { connectionParameters = {}, connectionParametersSet } = connectionInfo;

      let content: any = {
        parameterSetName: connectionParametersSet?.name,
        serviceProvider: { id: connector.id },
      };

      if (connectionParametersSet?.name === 'connectionString') {
        content = { ...content, parameterValues: { ...connectionParameters } };
      } else {
        content = {
          ...content,
          parameterValues: {
            authProvider: {
              type: connectionParametersSet?.name,
              ...connectionParameters,
            },
            fullyQualifiedNamespace: connectionParameters?.['fullyQualifiedNamespace'],
          },
        };
      }

      const uri = `${baseUrl.replace('/runtime/webhooks/workflow/api/management', '')}${testConnectionUrl}`;
      const requestOptions: HttpRequestOptions<any> = { uri, queryParameters, content };
      const response = await httpClient.post<any, any>(requestOptions);

      if (!response || response.status < 200 || response.status >= 300) throw response;
      return response;
    } catch (e: any) {
      return Promise.reject(JSON.parse(e?.responseText));
    }
  }

  protected handleTestConnectionResponse(response?: HttpResponse<any>): void {
    if (!response) return;
    const defaultErrorResponse = 'Please check your account info and/or permissions and try again.';
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      let errorMessage = defaultErrorResponse;
      if (response.body && typeof response.body === 'string')
        errorMessage = this.tryParseErrorMessage(JSON.parse(response.body), defaultErrorResponse);
      throw new UserException(UserErrorCode.TEST_CONNECTION_FAILED, errorMessage);
    }
  }

  protected tryParseErrorMessage(error: any, defaultErrorMessage?: string): string {
    return error?.message ?? error?.Message ?? error?.error?.message ?? error?.responseText ?? defaultErrorMessage ?? 'Unknown error';
  }

  protected getConnectionsConfiguration(
    connectionName: string,
    connectionInfo: ConnectionCreationInfo,
    connectorId: string,
    parametersMetadata: ConnectionParametersMetadata
  ): {
    connectionsData: ConnectionAndAppSetting<LocalConnectionModel>;
    connection: Connection;
  } {
    const { connectionType } = parametersMetadata;
    let connectionsData;
    let connection;
    switch (connectionType) {
      case ConnectionType.Function: {
        connectionsData = convertToFunctionsConnectionsData(connectionName, connectionInfo);
        connection = convertFunctionsConnectionDataToConnection(
          connectionsData.connectionKey,
          connectionsData.connectionData as FunctionsConnectionModel
        );
        break;
      }
      default: {
        connectionsData = convertToServiceProviderConnectionsData(connectionName, connectorId, connectionInfo, parametersMetadata);
        connection = convertServiceProviderConnectionDataToConnection(
          connectionsData.connectionKey,
          connectionsData.connectionData as ServiceProviderConnectionModel
        );
        break;
      }
    }
    return { connectionsData, connection };
  }

  protected async getConnectionsForConnector(connectorId: string): Promise<Connection[]> {
    if (isArmResourceId(connectorId)) {
      const {
        apiHubServiceDetails: { location, apiVersion },
        httpClient,
      } = this.options;
      const response = await httpClient.get<ConnectionsResponse>({
        uri: `${this._subscriptionResourceGroupWebUrl}/connections`,
        queryParameters: {
          'api-version': apiVersion,
          $filter: `Location eq '${location}' and ManagedApiName eq '${connectorId.split('/').at(-1)}' and Kind eq '${this._vVersion}'`,
        },
      });
      return response.value;
    } else {
      if (!this._allConnectionsInitialized) {
        await this.getConnections();
      }

      return Object.keys(this._connections)
        .filter((connectionId) => equals(this._connections[connectionId].properties.api.id, connectorId))
        .map((connectionId) => this._connections[connectionId]);
    }
  }

  protected async getConnectionInApiHub(connectionId: string): Promise<Connection> {
    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this.options;
    const connection = await httpClient.get<Connection>({
      uri: connectionId,
      queryParameters: { 'api-version': apiVersion },
    });

    return connection;
  }

  protected async getConnectionsInApiHub(): Promise<Connection[]> {
    const {
      filterByLocation,
      httpClient,
      apiHubServiceDetails: { apiVersion },
      locale,
    } = this.options;

    const uri = `${this._subscriptionResourceGroupWebUrl}/connections`;

    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `properties/integrationServiceEnvironmentResourceId eq null and Kind eq '${this._vVersion}'`,
      $top: 400,
    };

    try {
      const response = await httpClient.get<ConnectionsResponse>({ uri, queryParameters });
      return response.value.filter((connection: Connection) => {
        return filterByLocation ? equals(connection.location, locale) : true;
      });
    } catch {
      return [];
    }
  }

  protected getConnectionRequestPath(connectionName: string): string {
    const {
      apiHubServiceDetails: { subscriptionId, resourceGroup },
    } = this.options;
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}`;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const {
      httpClient,
      apiHubServiceDetails: { apiVersion },
    } = this.options;
    const request = {
      uri: this.getConnectionRequestPath(connectionId),
      queryParameters: { 'api-version': apiVersion },
    };
    await httpClient.delete<any>(request);
    delete this._connections[connectionId];
  }

  async getUniqueConnectionName(connectorId: string, connectionNames: string[], connectorName: string): Promise<string> {
    const { name: connectionName, index } = getUniqueName(connectionNames, connectorName);
    return isArmResourceId(connectorId)
      ? this._getUniqueConnectionNameInApiHub(connectorName, connectorId, connectionName, index)
      : connectionName;
  }

  protected async _getUniqueConnectionNameInApiHub(
    connectorName: string,
    connectorId: string,
    connectionName: string,
    i: number
  ): Promise<string> {
    const connectionId = this.getConnectionRequestPath(connectionName);
    const isUnique = await this._testConnectionIdUniquenessInApiHub(connectionId);

    if (isUnique) {
      return connectionName;
    } else {
      connectionName = `${connectorName}-${i++}`;
      return this._getUniqueConnectionNameInApiHub(connectorName, connectorId, connectionName, i);
    }
  }

  protected _testConnectionIdUniquenessInApiHub(id: string): Promise<boolean> {
    const request = {
      uri: id,
      queryParameters: { 'api-version': this.options.apiHubServiceDetails.apiVersion },
    };

    return this.options.httpClient
      .get<Connection>(request)
      .then(() => false)
      .catch(() => true);
  }

  protected getFunctionAppsRequestPath(): string {
    const { subscriptionId } = this.options.apiHubServiceDetails;
    return `/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites`;
  }

  async fetchFunctionApps(): Promise<any> {
    console.log('functionAppsResponse', this.getFunctionAppsRequestPath());

    const functionAppsResponse = await this.options.httpClient.get<any>({
      uri: this.getFunctionAppsRequestPath(),
      queryParameters: { 'api-version': this.options.apiVersion },
    });

    const apps = functionAppsResponse.value.filter((app: any) => app.kind === 'functionapp');
    return apps;
  }

  async fetchFunctionAppsFunctions(functionAppId: string) {
    const functionsResponse = await this.options.httpClient.get<any>({
      uri: `https://management.azure.com/${functionAppId}/functions`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    return functionsResponse?.value ?? [];
  }

  async fetchFunctionKey(functionId: string) {
    const keysResponse = await this.options.httpClient.post<any, any>({
      uri: `https://management.azure.com/${functionId}/listkeys`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    return keysResponse?.default ?? 'NotFound';
  }
}

type ConnectionsResponse = {
  value: Connection[];
};

function convertServiceProviderConnectionDataToConnection(
  connectionKey: string,
  connectionData: ServiceProviderConnectionModel
): Connection {
  const {
    displayName,
    serviceProvider: { id: apiId },
  } = connectionData;

  return {
    name: connectionKey,
    id: `${apiId}/connections/${connectionKey}`,
    type: 'connections',
    properties: {
      api: { id: apiId } as any,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName as string,
      statuses: [{ status: 'Connected' }],
      overallStatus: 'Connected',
      testLinks: [],
    },
  };
}

function convertToServiceProviderConnectionsData(
  connectionKey: string,
  connectorId: string,
  connectionInfo: ConnectionCreationInfo,
  connectionParameterMetadata: ConnectionParametersMetadata
): ConnectionAndAppSetting<ServiceProviderConnectionModel> {
  const {
    displayName,
    connectionParameters: connectionParameterValues,
    connectionParametersSet: connectionParametersSetValues,
  } = connectionInfo;
  const connectionParameters = connectionParametersSetValues
    ? connectionParameterMetadata.connectionParameterSet?.parameters
    : (connectionParameterMetadata.connectionParameters as Record<string, ConnectionParameter>);
  const parameterValues = connectionParametersSetValues
    ? Object.keys(connectionParametersSetValues.values).reduce(
        (result: Record<string, any>, currentKey: string) => ({
          ...result,
          [currentKey]: connectionParametersSetValues.values[currentKey].value,
        }),
        {}
      )
    : (connectionParameterValues as Record<string, any>);

  const connectionsData: ConnectionAndAppSetting<ServiceProviderConnectionModel> = {
    connectionKey,
    connectionData: {
      parameterValues: {},
      serviceProvider: { id: connectorId },
      displayName,
    },
    settings: {},
    pathLocation: [serviceProviderLocation],
  };

  for (const parameterKey of Object.keys(parameterValues)) {
    const connectionParameter = connectionParameters?.[parameterKey] as ConnectionParameter;
    let parameterValue = parameterValues[parameterKey];
    if (connectionParameter?.parameterSource === ConnectionParameterSource.AppConfiguration) {
      const appSettingName = `${escapeSpecialChars(connectionKey)}_${escapeSpecialChars(parameterKey)}`;
      connectionsData.settings[appSettingName] = parameterValues[parameterKey];

      parameterValue = `@appsetting('${appSettingName}')`;
    }

    safeSetObjectPropertyValue(
      connectionsData.connectionData.parameterValues,
      [...(connectionParameter?.uiDefinition?.constraints?.propertyPath ?? []), parameterKey],
      parameterValue
    );
  }

  return connectionsData;
}

function convertToFunctionsConnectionsData(
  connectionKey: string,
  connectionInfo: ConnectionCreationInfo
): ConnectionAndAppSetting<FunctionsConnectionModel> {
  const { displayName, connectionParameters } = connectionInfo;
  const authentication = connectionParameters?.['authentication'];
  const functionAppKey = authentication.value;
  const appSettingName = `${escapeSpecialChars(connectionKey)}_functionAppKey`;

  authentication.value = `@appsetting('${appSettingName}')`;

  return {
    connectionKey,
    connectionData: {
      function: connectionParameters?.['function'],
      triggerUrl: connectionParameters?.['triggerUrl'],
      authentication,
      displayName,
    },
    settings: { [appSettingName]: functionAppKey },
    pathLocation: [functionsLocation],
  };
}

function convertFunctionsConnectionDataToConnection(connectionKey: string, connectionData: FunctionsConnectionModel): Connection {
  const { displayName } = connectionData;

  return {
    name: connectionKey,
    id: `${azureFunctionConnectorId}/connections/${connectionKey}`,
    type: 'connections',
    properties: {
      api: { id: azureFunctionConnectorId } as any,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName as string,
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      testLinks: [],
    },
  };
}

function escapeSpecialChars(value: string): string {
  const escapedUnderscore = value.replace(/_/g, '__');
  return escapedUnderscore.replace(/-/g, '_1');
}

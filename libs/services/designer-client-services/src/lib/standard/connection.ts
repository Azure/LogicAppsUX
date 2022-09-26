/* eslint-disable no-param-reassign */
import { AzureConnectorMock } from '../__test__/__mocks__/azureConnectorResponse';
import { azureOperationsResponse } from '../__test__/__mocks__/azureOperationResponse';
import { almostAllBuiltInOperations } from '../__test__/__mocks__/builtInOperationResponse';
import type { HttpResponse } from '../common/exceptions/service';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult, IConnectionService } from '../connection';
import type { HttpRequestOptions, IHttpClient, QueryParameters } from '../httpClient';
import { LoggerService } from '../logger';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import { azureFunctionConnectorId } from './operationmanifest';
import type {
  Connection,
  ConnectionParameter,
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  SomeKindOfAzureOperationDiscovery,
} from '@microsoft-logic-apps/utils';
import {
  HTTP_METHODS,
  UserErrorCode,
  UserException,
  AssertionErrorCode,
  AssertionException,
  ConnectionParameterSource,
  ConnectionType,
  safeSetObjectPropertyValue,
  ArgumentException,
  equals,
  connectorsSearchResultsMock,
} from '@microsoft-logic-apps/utils';

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

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  filterByLocation?: boolean;
  readConnections: ReadConnectionsFunc;
  writeConnection?: WriteConnectionFunc;
  apiHubServiceDetails: {
    apiVersion: string;
    subscriptionId: string;
    resourceGroup: string;
    location: string;
  };
  httpClient: IHttpClient;
  isDev?: boolean;
}

interface ContinuationTokenResponse<T> {
  // danielle to move
  value: T;
  nextLink: string;
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

type AzureOperationsFetchResponse = ContinuationTokenResponse<DiscoveryOperation<SomeKindOfAzureOperationDiscovery>[]>;
type DiscoveryOpArray = DiscoveryOperation<DiscoveryResultTypes>[];

const serviceProviderLocation = 'serviceProviderConnections';
const functionsLocation = 'functionConnections';

export class StandardConnectionService implements IConnectionService {
  private _connections: Record<string, Connection> = {};
  private _subscriptionResourceGroupWebUrl = '';
  private _isDev = false; // TODO: Find a better way to do this, can't use process.env.NODE_ENV here

  constructor(public readonly options: StandardConnectionServiceArgs) {
    const { apiHubServiceDetails, apiVersion, baseUrl, readConnections, isDev } = options;
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
    this._isDev = isDev || false;
  }

  dispose(): void {
    return;
  }

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return [...(await this.getAllBuiltInOperations()), ...(await this.getAllAzureOperations())];
  }

  private async getAllBuiltInOperations(): Promise<DiscoveryOpArray> {
    if (this._isDev) {
      return Promise.resolve([...almostAllBuiltInOperations]);
    }
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/operations`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      workflowKind: 'stateful',
    };
    const response = await httpClient.get<AzureOperationsFetchResponse>({ uri, queryParameters });
    return response.value;
  }

  private async getAzureResourceByPage(uri: string, queryParams?: any, pageNumber = 0): Promise<{ value: any[]; hasMore: boolean }> {
    if (this._isDev) return { value: [], hasMore: false };

    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this.options;

    const pageSize = 250; // This is the number of results that can be returned in a single call
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $top: pageSize.toString(),
      $skiptoken: (pageNumber * pageSize).toString(),
      ...queryParams,
    };

    const { nextLink, value } = await httpClient.get<ContinuationTokenResponse<Connector[]>>({ uri, queryParameters });
    return { value, hasMore: !!nextLink };
  }

  private async batchAzureResourceRequests(uri: string, queryParams?: any): Promise<any[]> {
    const batchSize = 50; // Number of calls to make in parallel

    const output: any[] = [];
    let batchIteration = 0;
    let continueFetching = true;

    while (continueFetching) {
      await Promise.all(
        Array.from(Array(batchSize).keys()).map(async (index) => {
          const pageNum = batchIteration * batchSize + index;
          const { value, hasMore } = await this.getAzureResourceByPage(uri, queryParams, pageNum);
          output.push(...value);
          if (index === batchSize - 1) {
            continueFetching = hasMore;
          }
        })
      );
      batchIteration++;
    }

    return output;
  }

  private async getAllAzureOperations(): Promise<DiscoveryOpArray> {
    const traceId = LoggerService().startTrace({
      name: 'Get All Azure Operations',
      action: 'getAllAzureOperations',
      source: 'connection.ts',
    });

    const {
      apiHubServiceDetails: { location, subscriptionId },
    } = this.options;
    if (this._isDev) return Promise.resolve(azureOperationsResponse);

    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
    const queryParameters: QueryParameters = {
      $filter: "type eq 'Microsoft.Web/locations/managedApis/apiOperations' and properties/integrationServiceEnvironmentResourceId eq null",
    };

    const operations = await this.batchAzureResourceRequests(uri, queryParameters);

    LoggerService().endTrace(traceId);
    return operations;
  }

  async getAllConnectors(): Promise<Connector[]> {
    const allBuiltInConnectorsPromise = this.getAllBuiltInConnectors();
    const allAzureConnectorsPromise = this.getAllAzureConnectors();
    return Promise.all([allBuiltInConnectorsPromise, allAzureConnectorsPromise]).then((values) => {
      const builtInResults = values[0];
      const azureResults = values[1];
      // danielle possibly tag built in vs azure
      return [...builtInResults, ...azureResults];
    });
  }

  private async getAllBuiltInConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      return Promise.resolve(connectorsSearchResultsMock);
    }
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/operationGroups`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
    };
    const response = await httpClient.get<{ value: Connector[] }>({ uri, queryParameters });
    return response.value;
  }

  private async getAllAzureConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      const connectors = AzureConnectorMock.value as Connector[];
      const formattedConnectors = this.moveGeneralInformation(connectors);
      return Promise.resolve(formattedConnectors);
    } else {
      const {
        apiHubServiceDetails: { location, subscriptionId },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis`;
      const responseArray = await this.batchAzureResourceRequests(uri);
      return this.moveGeneralInformation(responseArray);
    }
  }

  private moveGeneralInformation(connectors: Connector[]): Connector[] {
    connectors.forEach((connector) => {
      if (connector.properties.generalInformation) {
        connector.properties.displayName = connector.properties.generalInformation.displayName ?? '';
        connector.properties.iconUri = connector.properties.generalInformation.iconUrl ?? '';
      }
    });
    return connectors;
  }

  // public async getAllOperationsForGroup(connectorId: string): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> { we will not need this while doing frontend search
  //   if (!isArmResourceId(connectorId)) {
  //     const { apiVersion, baseUrl, httpClient } = this.options;
  //     return httpClient.get<DiscoveryOperation<DiscoveryResultTypes>[]>({
  //       uri: `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}/operations?api-version=${apiVersion}`, // danielle to test
  //     }); // danielle this should work as it is same as priti
  //   } else {
  //     const {
  //       apiHubServiceDetails: { apiVersion },
  //       httpClient,
  //     } = this.options;
  //     const response = await httpClient.get<DiscoveryOperation<DiscoveryResultTypes>[]>({
  //       uri: `${connectorId}/apiOperations`,
  //       queryParameters: { 'api-version': apiVersion },
  //     }); // danielle this could be wrong
  //     return {
  //       ...response,
  //     };
  //   }
  //   //return Promise.resolve(MockSearchOperations);
  // }

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

  async createConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection> {
    const connectionName = connectionId.split('/').at(-1) as string;
    const connection = isArmResourceId(connectorId)
      ? await this.createConnectionInApiHub(connectionName, connectorId, connectionInfo)
      : await this.createConnectionInLocal(connectionName, connectorId, connectionInfo, parametersMetadata as ConnectionParametersMetadata);

    return connection;
  }

  private async createConnectionInLocal(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata: ConnectionParametersMetadata
  ): Promise<Connection> {
    const { connectionsData, connection } = this.getConnectionsConfiguration(
      connectionName,
      connectionInfo,
      connectorId,
      parametersMetadata
    );

    const { writeConnection } = this.options;
    if (!writeConnection) {
      throw new AssertionException(AssertionErrorCode.CALLBACK_NOTREGISTERED, 'Callback for write connection is not passed in service.');
    }

    await this.options.writeConnection?.(connectionsData);
    this._connections[connection.id] = connection;

    return connection;
  }

  async createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo
  ): Promise<CreateConnectionResult> {
    const connection = await this.createConnectionInApiHub(connectionId, connectorId, connectionInfo);
    const oAuthService = OAuthService();
    let oAuthPopupInstance: IOAuthPopup | undefined;

    try {
      const consentUrl = await oAuthService.fetchConsentUrlForConnection(connectionId);
      oAuthPopupInstance = oAuthService.openLoginPopup({ consentUrl });

      const loginResponse = await oAuthPopupInstance.loginPromise;
      if (loginResponse.error) {
        throw new Error(atob(loginResponse.error));
      } else if (loginResponse.code) {
        await oAuthService.confirmConsentCodeForConnection(connectionId, loginResponse.code);
      }

      await this.testConnection(connection);

      // Do something to the exisiting connection
      console.log('Connection created and authorized successfully', connection);
      connection.properties.displayName = (connection.properties as any).authenticatedUser.name;

      const fetchedConnection = await this.getConnection(connectionId);
      console.log('Connection fetched successfully', fetchedConnection);

      return { connection };
    } catch (error: any) {
      console.error('Failed to Authorize', error, error?.message);
      await this.deleteConnection(connectionId);
      return { errorMessage: this.tryParseErrorMessage(error) };
    }
  }

  private async testConnection(connection: Connection): Promise<void> {
    const testLinks = connection.properties.testLinks;
    if (!testLinks || testLinks.length < 1) return Promise.resolve();

    try {
      const { httpClient } = this.options;
      const { method: httpMethod, requestUri: uri } = testLinks[0];
      const method = httpMethod.toUpperCase() as HTTP_METHODS;

      let response: HttpResponse<any> | undefined = undefined;
      const requestOptions: HttpRequestOptions<any> = { uri };
      if (method === HTTP_METHODS.GET) response = await httpClient.get<any>(requestOptions);
      else if (method === HTTP_METHODS.POST) response = await httpClient.post<any, any>(requestOptions);
      else if (method === HTTP_METHODS.PUT) response = await httpClient.put<any, any>(requestOptions);
      else if (method === HTTP_METHODS.DELETE) response = await httpClient.delete<any>(requestOptions);
      // console.log('Test connection response', response);
      // if (!response) throw new Error('Invalid test link method');

      this.handleTestConnectionResponse(response);
    } catch (error: any) {
      console.error('Failed to test connection', this.tryParseErrorMessage(error));
      Promise.reject(error);
    }
  }

  private handleTestConnectionResponse(response?: HttpResponse<any>): void {
    if (!response) return;
    const defaultErrorResponse = 'Please check your account info and/or permissions and try again.';
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      let errorMessage = defaultErrorResponse;
      if (response.body && typeof response.body === 'string') {
        errorMessage = this.tryParseErrorMessage(JSON.parse(response.body), defaultErrorResponse);
      }

      const exception = new UserException(UserErrorCode.TEST_CONNECTION_FAILED, errorMessage);
      throw exception;
    }
  }

  private tryParseErrorMessage(error: any, defaultErrorMessage?: string): string {
    if (error?.message) return error.message;
    else if (error?.error?.message) error.error.message;
    return defaultErrorMessage ?? 'Unknown error';
  }

  private getConnectionsConfiguration(
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

  private async getConnectionsForConnector(connectorId: string): Promise<Connection[]> {
    if (isArmResourceId(connectorId)) {
      const {
        apiHubServiceDetails: { location, apiVersion },
        httpClient,
      } = this.options;
      const response = await httpClient.get<ConnectionsResponse>({
        uri: `${this._subscriptionResourceGroupWebUrl}/connections`,
        queryParameters: {
          'api-version': apiVersion,
          $filter: `Location eq '${location}' and ManagedApiName eq '${connectorId.split('/').at(-1)}' and Kind eq 'V2'`,
        },
      });
      return response.value;
    } else {
      return Object.keys(this._connections)
        .filter((connectionId) => equals(this._connections[connectionId].properties.api.id, connectorId))
        .map((connectionId) => this._connections[connectionId]);
    }
  }

  private async getConnectionInApiHub(connectionId: string): Promise<Connection> {
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

  private async getConnectionsInApiHub(): Promise<Connection[]> {
    const {
      filterByLocation,
      httpClient,
      apiHubServiceDetails: { apiVersion },
      locale,
    } = this.options;

    const uri = `${this._subscriptionResourceGroupWebUrl}/connections`;

    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `properties/integrationServiceEnvironmentResourceId eq null and Kind eq 'V2'`,
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

  private async createConnectionInApiHub(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo
  ): Promise<Connection> {
    const { httpClient } = this.options;

    // const { workflowAppDetails } = this.options;

    // // NOTE(sopai): Block connection creation if identity does not exist on Logic App.
    // if (workflowAppDetails && !isIdentityAssociatedWithLogicApp(workflowAppDetails.identity)) {
    //     throw new ConnectionServiceException(ConnectionServiceErrorCode.PUT_CONNECTION_FAILED, Resources.NO_MANAGED_IDENTITY_CONFIGURED_BLOCK_CONNECTION_CREATION);
    // }

    // TODO: Support external parameter values
    const request = this.getRequestForCreateConnection(connectorId, connectionName, connectionInfo);

    const connection = await httpClient.put<Connection, any>(request);
    if (!connection) {
      // TODO: Log error, creation failed
    }

    try {
      await this.createConnectionAclIfNeeded(connection);
    } catch {
      // NOTE(sopai): Delete the connection created in this method if Acl creation failed.
      // const error = new Error('Acl creation failed for connection. Trying to delete connection.');
      // TODO: Log error
      await this.deleteConnection(connection.id);
    }

    return connection;
  }

  private getConnectionRequestPath(connectionName: string): string {
    const {
      apiHubServiceDetails: { subscriptionId, resourceGroup },
    } = this.options;
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}`;
  }

  private getRequestForCreateConnection(
    connectorId: string,
    connectionName: string,
    connectionInfo: ConnectionCreationInfo
  ): HttpRequestOptions<any> {
    const parameterValues = connectionInfo?.connectionParameters;
    const parameterValueSet: Record<string, any> = connectionInfo?.connectionParametersSet?.values ?? {};
    const displayName = connectionInfo?.displayName;
    const {
      apiHubServiceDetails: { location, apiVersion },
    } = this.options;

    return {
      uri: this.getConnectionRequestPath(connectionName),
      queryParameters: { 'api-version': apiVersion },
      content: {
        properties: {
          api: {
            id: connectorId,
          },
          parameterValues,
          parameterValueSet,
          displayName,
        },
        kind: 'V2',
        location,
      },
    };
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

  async createConnectionAclIfNeeded(_connection: Connection): Promise<void> {
    // const { workflowAppDetails } = this.options;
    // if (!workflowAppDetails) {
    //     return;
    // }
    // if (!isArmResourceId(connection.id)) {
    //     return;
    // }
    // const tenantId = await Promise.resolve(this.options.tenantId);
    // if (!isIdentityAssociatedWithLogicApp(workflowAppDetails.identity)) {
    //     throw new ConnectionServiceException(ConnectionServiceErrorCode.PUT_CONNECTION_ACL_FAILED, Resources.NO_MANAGED_IDENTITY_CONFIGURED_ERROR);
    // }
    // const connectionAcls = (await this._getConnectionAcls(connection.id)) || [];
    // const { identity, appName } = workflowAppDetails;
    // const identityDetailsForApiHubAuth = this._getIdentityDetailsForApiHubAuth(identity, tenantId);
    // try {
    //     if (
    //         !connectionAcls.some(acl => {
    //             const { identity: principalIdentity } = acl.properties.principal;
    //             return principalIdentity.objectId === identityDetailsForApiHubAuth.principalId && principalIdentity.tenantId === tenantId;
    //         })
    //     ) {
    //         await this._createAccessPolicyInConnection(connection.id, appName, identityDetailsForApiHubAuth, connection.location);
    //     }
    // } catch {
    //     const error = new Error('Acl creation failed for connection.');
    //     this._analytics.logError(ConnectionServiceErrorCode.PUT_CONNECTION_ACL_FAILED, error);
    // }
  }
}

type ConnectionsResponse = {
  value: Connection[];
};

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

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

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
import { LoggerService } from '../logger';
import { LogEntryLevel } from '../logging/logEntry';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { Connection, ConnectionParameter, Connector, ManagedIdentity } from '@microsoft/utils-logic-apps';
import {
  getUniqueName,
  isIdentityAssociatedWithLogicApp,
  HTTP_METHODS,
  UserErrorCode,
  UserException,
  ResourceIdentityType,
  isArmResourceId,
  AssertionErrorCode,
  AssertionException,
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

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  filterByLocation?: boolean;
  tenantId?: string;
  workflowAppDetails: {
    appName: string;
    identity?: ManagedIdentity;
  };
  readConnections: ReadConnectionsFunc;
  writeConnection?: WriteConnectionFunc;
  apiHubServiceDetails: IApiHubServiceDetails;
  httpClient: IHttpClient;
  connectionCreationClients?: Record<string, ConnectionCreationClient>;
}

type CreateConnectionFunc = (connectionInfo: ConnectionCreationInfo, connectionName: string) => Promise<ConnectionCreationInfo>;

interface ConnectionCreationClient {
  connectionCreationFunc: CreateConnectionFunc;
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

interface ConnectionAcl {
  id: string;
  location: string;
  name: string;
  properties: {
    principal: {
      type: string;
      identity: {
        objectId: string;
        tenantId: string;
      };
    };
  };
  type: string;
}

type LocalConnectionModel = FunctionsConnectionModel | ServiceProviderConnectionModel | APIManagementConnectionModel;
type ReadConnectionsFunc = () => Promise<ConnectionsData>;
type WriteConnectionFunc = (connectionData: ConnectionAndAppSetting<LocalConnectionModel>) => Promise<void>;

const serviceProviderLocation = 'serviceProviderConnections';
const functionsLocation = 'functionConnections';

export class StandardConnectionService implements IConnectionService {
  private _connections: Record<string, Connection> = {};
  private _subscriptionResourceGroupWebUrl = '';
  private _allConnectionsInitialized = false;

  constructor(public readonly options: StandardConnectionServiceArgs) {
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

  async createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection> {
    const connectionName = connectionId.split('/').at(-1) as string;

    try {
      const logId = LoggerService().startTrace({
        action: 'createConnection',
        name: 'Creating Connection',
        source: 'connection.ts',
      });

      if (connector.properties.testConnectionUrl) await this.pretestServiceProviderConnection(connector, connectionInfo);

      const connection = isArmResourceId(connector.id)
        ? await this.createConnectionInApiHub(connectionName, connector.id, connectionInfo)
        : await this.createConnectionInLocal(
            connectionName,
            connector.id,
            connectionInfo,
            parametersMetadata as ConnectionParametersMetadata
          );
      await this.testConnection(connection);
      LoggerService().endTrace(logId);
      return connection;
    } catch (error) {
      this.deleteConnection(connectionId);
      const errorMessage = `Failed to create connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'createConnection',
        message: errorMessage,
      });
      return Promise.reject(errorMessage);
    }
  }

  async createConnectionAclIfNeeded(connection: Connection): Promise<void> {
    const { tenantId, workflowAppDetails } = this.options;
    if (!isArmResourceId(connection.id) || !workflowAppDetails) {
      return;
    }

    const intl = getIntl();

    if (!isIdentityAssociatedWithLogicApp(workflowAppDetails.identity)) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'A managed identity is not configured on the logic app.',
          description: 'Error message when no identity is associated',
        })
      );
    }

    const connectionAcls = (await this._getConnectionAcls(connection.id)) || [];
    const { identity, appName } = workflowAppDetails;
    const identityDetailsForApiHubAuth = this._getIdentityDetailsForApiHubAuth(identity as ManagedIdentity, tenantId as string);

    try {
      if (
        !connectionAcls.some((acl) => {
          const { identity: principalIdentity } = acl.properties.principal;
          return principalIdentity.objectId === identityDetailsForApiHubAuth.principalId && principalIdentity.tenantId === tenantId;
        })
      ) {
        await this._createAccessPolicyInConnection(connection.id, appName, identityDetailsForApiHubAuth, connection.location as string);
      }
    } catch {
      LoggerService().log({ level: LogEntryLevel.Error, area: 'ConnectionACLCreate', message: 'Acl creation failed for connection.' });
    }
  }

  private async createConnectionInApiHub(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo
  ): Promise<Connection> {
    const {
      httpClient,
      apiHubServiceDetails: { apiVersion, baseUrl },
      workflowAppDetails,
    } = this.options;
    const intl = getIntl();

    // NOTE: Block connection creation if identity does not exist on Logic App.
    if (workflowAppDetails && !isIdentityAssociatedWithLogicApp(workflowAppDetails.identity)) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'To create and use an API connection, you must have a managed identity configured on this logic app.',
          description: 'Error message to show when logic app does not have managed identity when creating azure connection',
        })
      );
    }

    const connectionId = this.getConnectionRequestPath(connectionName);
    const connection = await httpClient.put<any, Connection>({
      uri: `${baseUrl}${connectionId}`,
      queryParameters: { 'api-version': apiVersion },
      content: connectionInfo?.externalAlternativeParameterValues
        ? this._getRequestForCreateConnectionWithAlternativeParameters(connectorId, connectionName, connectionInfo)
        : this._getRequestForCreateConnection(connectorId, connectionName, connectionInfo),
    });

    try {
      await this.createConnectionAclIfNeeded(connection);
    } catch {
      // NOTE: Delete the connection created in this method if Acl creation failed.
      this.deleteConnection(connectionId);
      const error = new Error(
        intl.formatMessage({
          defaultMessage: 'Acl creation failed for connection. Deleting the connection.',
          description: 'Error while creating acl',
        })
      );
      throw error;
    }

    return connection;
  }

  // NOTE: Use the system-assigned MI if exists, else use the first user assigned identity.
  private _getIdentityDetailsForApiHubAuth(managedIdentity: ManagedIdentity, tenantId: string): { principalId: string; tenantId: string } {
    return equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
      equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)
      ? { principalId: managedIdentity.principalId as string, tenantId: managedIdentity.tenantId as string }
      : {
          principalId: managedIdentity.userAssignedIdentities?.[Object.keys(managedIdentity.userAssignedIdentities)[0]]
            .principalId as string,
          tenantId,
        };
  }

  private async _getConnectionAcls(connectionId: string): Promise<ConnectionAcl[]> {
    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this.options;

    // TODO: Handle nextLink from this response as well.
    const response = await httpClient.get<any>({
      uri: `${connectionId}/accessPolicies`,
      queryParameters: { 'api-version': apiVersion },
      headers: { 'x-ms-command-name': 'LADesigner.getConnectionAcls' },
    });

    return response.value;
  }

  private async _createAccessPolicyInConnection(
    connectionId: string,
    appName: string,
    identityDetails: Record<string, any>,
    location: string
  ): Promise<void> {
    const {
      apiHubServiceDetails: { apiVersion, baseUrl },
      httpClient,
    } = this.options;
    const { principalId: objectId, tenantId } = identityDetails;
    const policyName = `${appName}-${objectId}`;

    await httpClient.put({
      uri: `${baseUrl}${connectionId}/accessPolicies/${policyName}`,
      queryParameters: { 'api-version': apiVersion },
      headers: {
        'If-Match': '*',
        'x-ms-command-name': 'LADesigner.createAccessPolicyInConnection',
      },
      content: {
        name: appName,
        type: 'Microsoft.Web/connections/accessPolicy',
        location,
        properties: {
          principal: {
            type: 'ActiveDirectory',
            identity: { objectId, tenantId },
          },
        },
      },
    });
  }

  private _getRequestForCreateConnection(connectorId: string, connectionName: string, connectionInfo: ConnectionCreationInfo): any {
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
      kind: 'V2',
      location,
    };
  }

  private _getRequestForCreateConnectionWithAlternativeParameters(
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
      kind: 'V2',
      location,
    };
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

    const { writeConnection, connectionCreationClients } = this.options;
    const connectionCreationClientName = parametersMetadata.connectionMetadata?.connectionCreationClient;
    if (connectionCreationClientName) {
      if (connectionCreationClients?.[connectionCreationClientName]) {
        connectionInfo = await connectionCreationClients[connectionCreationClientName].connectionCreationFunc(
          connectionInfo,
          connectionName
        );
      } else {
        throw new AssertionException(
          AssertionErrorCode.CONNECTION_CREATION_CLIENT_NOTREGISTERED,
          `The connection creation client for ${connectionCreationClientName} is not registered`
        );
      }
    }
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
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult> {
    const connector = await this.getConnector(connectorId);
    const connection = await this.createConnection(connectionId, connector, connectionInfo, parametersMetadata);
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

      await this.createConnectionAclIfNeeded(connection);

      await this.testConnection(connection);

      const fetchedConnection = await this.getConnection(connection.id);
      return { connection: fetchedConnection };
    } catch (error: any) {
      this.deleteConnection(connectionId);
      const errorMessage = `Failed to create OAuth connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'create oauth connection',
        message: errorMessage,
      });
      return { errorMessage: this.tryParseErrorMessage(error) };
    }
  }

  private async testConnection(connection: Connection): Promise<void> {
    let response: HttpResponse<any> | undefined = undefined;
    try {
      const testLinks = connection.properties.testLinks;
      if (testLinks && testLinks.length > 0) response = await this.requestTestOtherConnections(connection);
      if (response) this.handleTestConnectionResponse(response);
    } catch (error: any) {
      Promise.reject(error);
    }
  }

  private async requestTestOtherConnections(connection: Connection): Promise<HttpResponse<any>> {
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

  private async pretestServiceProviderConnection(connector: Connector, connectionInfo: ConnectionCreationInfo): Promise<HttpResponse<any>> {
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

  private handleTestConnectionResponse(response?: HttpResponse<any>): void {
    if (!response) return;
    const defaultErrorResponse = 'Please check your account info and/or permissions and try again.';
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      let errorMessage = defaultErrorResponse;
      if (response.body && typeof response.body === 'string')
        errorMessage = this.tryParseErrorMessage(JSON.parse(response.body), defaultErrorResponse);
      throw new UserException(UserErrorCode.TEST_CONNECTION_FAILED, errorMessage);
    }
  }

  private tryParseErrorMessage(error: any, defaultErrorMessage?: string): string {
    return error?.message ?? error?.Message ?? error?.error?.message ?? error?.responseText ?? defaultErrorMessage ?? 'Unknown error';
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
    const connectionType = parametersMetadata?.connectionMetadata?.type;
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
      if (!this._allConnectionsInitialized) {
        await this.getConnections();
      }

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

  private getConnectionRequestPath(connectionName: string): string {
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

  private async _getUniqueConnectionNameInApiHub(
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

  private _testConnectionIdUniquenessInApiHub(id: string): Promise<boolean> {
    const request = {
      uri: id,
      queryParameters: { 'api-version': this.options.apiHubServiceDetails.apiVersion },
    };

    return this.options.httpClient
      .get<Connection>(request)
      .then(() => false)
      .catch(() => true);
  }

  private getFunctionAppsRequestPath(): string {
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

/* eslint-disable no-param-reassign */
import type { HttpResponse } from '../common/exceptions/service';
import type {
  ConnectionCreationInfo,
  ConnectionParametersMetadata,
  ConnectorWithSwagger,
  CreateConnectionResult,
  IConnectionService,
} from '../connection';
import type { HttpRequestOptions, IHttpClient, QueryParameters } from '../httpClient';
import type { Connection, Connector, OpenAPIV2 } from '@microsoft/logic-apps-shared';
import {
  ArgumentException,
  HTTP_METHODS,
  SwaggerParser,
  UserErrorCode,
  UserException,
  equals,
  getUniqueName,
  isArmResourceId,
  isCustomConnectorId,
} from '@microsoft/logic-apps-shared';

export interface ApiHubServiceDetails {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  locale?: string;
  filterByLocation?: boolean;
  tenantId?: string;
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

export abstract class BaseConnectionService implements IConnectionService {
  protected _connections: Record<string, Connection> = {};
  protected _subscriptionResourceGroupWebUrl = '';
  protected _allConnectionsInitialized = false;

  protected _vVersion: 'V1' | 'V2' = 'V1';

  constructor(protected readonly options: ApiHubServiceDetails) {
    const { apiVersion, baseUrl, httpClient } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!httpClient) {
      throw new ArgumentException('httpclient required');
    }

    this._subscriptionResourceGroupWebUrl = `/subscriptions/${options.subscriptionId}/resourceGroups/${options.resourceGroup}/providers/Microsoft.Web`;
  }

  async getConnectorAndSwagger(connectorId: string): Promise<ConnectorWithSwagger> {
    try {
      if (!isArmResourceId(connectorId)) {
        return { connector: await this.getConnector(connectorId), swagger: null as any };
      }

      const { apiVersion, httpClient } = this.options;
      const [connector, swagger] = await Promise.all([
        this.getConnector(connectorId),
        httpClient.get<OpenAPIV2.Document>({ uri: connectorId, queryParameters: { 'api-version': apiVersion, export: 'true' } }),
      ]);

      return { connector, swagger };
    } catch (error: any) {
      throw error?.response?.data?.error?.message ?? error;
    }
  }

  async getSwaggerFromUri(uri: string): Promise<OpenAPIV2.Document> {
    const { httpClient } = this.options;
    return httpClient.get<OpenAPIV2.Document>({ uri, noAuth: true, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  public async getSwaggerParser(uri: string): Promise<SwaggerParser> {
    const response = await this.getSwaggerFromUri(uri);
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
  }

  abstract getConnector(connectorId: string): Promise<Connector>;

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

  abstract getConnections(connectorId?: string): Promise<Connection[]>;

  abstract createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata,
    shouldTestConnection?: boolean
  ): Promise<Connection>;

  protected async createConnectionInApiHub(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo
  ): Promise<Connection> {
    const { httpClient, apiVersion, baseUrl } = this.options;

    const connectionId = this.getAzureConnectionRequestPath(connectionName);
    const connection = await httpClient.put<any, Connection>({
      uri: `${baseUrl}${connectionId}`,
      queryParameters: { 'api-version': apiVersion },
      content: connectionInfo?.alternativeParameterValues
        ? this._getRequestForCreateConnectionWithAlternativeParameters(connectorId, connectionName, connectionInfo)
        : this._getRequestForCreateConnection(connectorId, connectionName, connectionInfo),
    });

    return connection;
  }

  protected async _getAzureConnector(connectorId: string): Promise<Connector> {
    const { apiVersion, httpClient } = this.options;
    const response = await httpClient.get<Connector>({ uri: connectorId, queryParameters: { 'api-version': apiVersion } });

    return {
      ...response,
      properties: {
        ...response.properties,
        ...response.properties.generalInformation,
      },
    };
  }

  protected _getRequestForCreateConnection(connectorId: string, _connectionName: string, connectionInfo: ConnectionCreationInfo): any {
    const parameterValues = connectionInfo?.connectionParameters;
    const parameterValueSet = connectionInfo?.connectionParametersSet;
    const displayName = connectionInfo?.displayName;
    const { location } = this.options;

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
    _connectionName: string,
    connectionInfo: ConnectionCreationInfo
  ): any {
    const alternativeParameterValues = connectionInfo?.alternativeParameterValues ?? {};
    const displayName = connectionInfo?.displayName;
    const { location } = this.options;

    return {
      properties: {
        api: {
          id: connectorId,
        },
        parameterValueType: 'Alternative',
        alternativeParameterValues,
        displayName,
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

  async setupConnectionIfNeeded(_connection: Connection, _identityId?: string): Promise<void> {
    // No action needed, implementation class should override if there is any
  }

  protected async testConnection(connection: Connection): Promise<void> {
    let response: HttpResponse<any> | undefined = undefined;
    const testLinks = connection.properties?.testLinks;
    if (!testLinks || testLinks.length === 0) return;
    response = await this.requestTestConnection(connection);
    if (response) this.handleTestConnectionResponse(response);
  }

  protected async requestTestConnection(connection: Connection): Promise<HttpResponse<any> | undefined> {
    const testLinks = connection.properties?.testLinks;
    if (!testLinks || testLinks.length === 0) return undefined;
    const { httpClient } = this.options;
    const { method: httpMethod, requestUri: uri } = testLinks[0];
    const method = httpMethod.toUpperCase() as HTTP_METHODS;

    try {
      let response: HttpResponse<any> | undefined = undefined;
      const requestOptions: HttpRequestOptions<any> = {
        headers: { noBatch: 'true' }, // Some requests fail specifically when run through batch
        uri,
      };
      if (equals(method, HTTP_METHODS.GET)) response = await httpClient.get<any>(requestOptions);
      else if (equals(method, HTTP_METHODS.POST)) response = await httpClient.post<any, any>(requestOptions);
      else if (equals(method, HTTP_METHODS.PUT)) response = await httpClient.put<any, any>(requestOptions);
      else if (equals(method, HTTP_METHODS.DELETE)) response = await httpClient.delete<any>(requestOptions);
      return response;
    } catch (error: any) {
      return Promise.reject(error?.content ?? error);
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

  protected async getConnectionsForConnector(connectorId: string): Promise<Connection[]> {
    if (isArmResourceId(connectorId)) {
      // Right now there isn't a name $filter for custom connections, so we need to filter them manually
      if (isCustomConnectorId(connectorId)) {
        const { location, apiVersion, httpClient } = this.options;
        const response = await httpClient.get<ConnectionsResponse>({
          uri: `${this._subscriptionResourceGroupWebUrl}/connections`,
          queryParameters: {
            'api-version': apiVersion,
            $filter: `Location eq '${location}' and Kind eq '${this._vVersion}'`,
          },
        });
        const filteredConnections = response.value.filter((connection) => {
          return equals(connection.properties.api.id, connectorId);
        });
        return filteredConnections;
      }

      const { location, apiVersion, httpClient } = this.options;
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
    const { apiVersion, httpClient } = this.options;
    const connection = await httpClient.get<Connection>({
      uri: connectionId,
      queryParameters: { 'api-version': apiVersion },
    });

    return connection;
  }

  protected async getConnectionsInApiHub(): Promise<Connection[]> {
    const { filterByLocation, httpClient, apiVersion, locale } = this.options;

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

  protected getAzureConnectionRequestPath(connectionName: string): string {
    const { subscriptionId, resourceGroup } = this.options;
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}`;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const { httpClient, apiVersion } = this.options;
    const request = {
      uri: this.getAzureConnectionRequestPath(connectionId),
      queryParameters: { 'api-version': apiVersion },
    };
    await httpClient.delete<any>(request);
    delete this._connections[connectionId];
  }

  async getUniqueConnectionName(connectorId: string, connectionNames: string[], connectorName: string): Promise<string> {
    const { name: connectionName, index } = getUniqueName(connectionNames, connectorName);
    return isArmResourceId(connectorId)
      ? this._getUniqueConnectionNameInApiHub(connectorName, connectorId, connectionName, index, connectionNames)
      : connectionName;
  }

  protected async _getUniqueConnectionNameInApiHub(
    connectorName: string,
    connectorId: string,
    connectionName: string,
    i: number,
    connectionNames: string[] = []
  ): Promise<string> {
    if (!connectionNames.includes(connectionName)) {
      const connectionId = this.getAzureConnectionRequestPath(connectionName);
      const isUnique = await this._testConnectionIdUniquenessInApiHub(connectionId);
      if (isUnique) return connectionName;
    }
    connectionName = `${connectorName}-${++i}`;
    return this._getUniqueConnectionNameInApiHub(connectorName, connectorId, connectionName, i, connectionNames);
  }

  protected _testConnectionIdUniquenessInApiHub(id: string): Promise<boolean> {
    const request = {
      uri: id,
      queryParameters: { 'api-version': this.options.apiVersion },
    };

    return this.options.httpClient
      .get<Connection>(request)
      .then(() => false)
      .catch(() => true);
  }
}

type ConnectionsResponse = {
  value: Connection[];
};

/* eslint-disable no-param-reassign */
import type { HttpResponse } from '../common/exceptions/service';
import type {
  ConnectionCreationInfo,
  ConnectionParametersMetadata,
  CreateConnectionResult,
  IConnectionService,
  ConnectorWithSwagger,
} from '../connection';
import type { HttpRequestOptions, IHttpClient, QueryParameters } from '../httpClient';
import { SwaggerParser } from '@microsoft/parsers-logic-apps';
import type { Connection, Connector, OpenAPIV2 } from '@microsoft/utils-logic-apps';
import {
  isCustomConnector,
  getUniqueName,
  HTTP_METHODS,
  UserErrorCode,
  UserException,
  isArmResourceId,
  ArgumentException,
  equals,
} from '@microsoft/utils-logic-apps';

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
  httpClient: IHttpClient;
  apiHubServiceDetails: IApiHubServiceDetails;
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

  constructor(public readonly options: BaseConnectionServiceOptions) {
    const { apiVersion, baseUrl, apiHubServiceDetails } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!apiHubServiceDetails) {
      throw new ArgumentException('apiHubServiceDetails required for workflow app');
    }
    this._subscriptionResourceGroupWebUrl = `/subscriptions/${apiHubServiceDetails.subscriptionId}/resourceGroups/${apiHubServiceDetails.resourceGroup}/providers/Microsoft.Web`;
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
    return httpClient.get<OpenAPIV2.Document>({ uri, noAuth: true, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  public async getSwaggerParser(uri: string): Promise<SwaggerParser> {
    const response = await this.getSwaggerFromUri(uri);
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
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

  async getConnections(_connectorId?: string): Promise<Connection[]> {
    throw new Error('Should be implemented in extending class');
  }

  abstract createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata,
    shouldTestConnection?: boolean
  ): Promise<Connection>;

  abstract setupConnectionIfNeeded(connection: Connection, identityId?: string): Promise<void>;

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
    _connectionName: string,
    connectionInfo: ConnectionCreationInfo
  ): any {
    const alternativeParameterValues = connectionInfo?.alternativeParameterValues ?? {};
    const displayName = connectionInfo?.displayName;
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
      const requestOptions: HttpRequestOptions<any> = { uri };
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
      if (isCustomConnector(connectorId)) {
        const {
          apiHubServiceDetails: { location, apiVersion },
          httpClient,
        } = this.options;
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
}

type ConnectionsResponse = {
  value: Connection[];
};

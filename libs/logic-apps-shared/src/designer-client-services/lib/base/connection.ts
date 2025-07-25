/* eslint-disable no-param-reassign */
import type { QueryClient } from '@tanstack/react-query';
import { SwaggerParser } from '../../../parsers';
import type { Connection, OpenAPIV2, Connector, TestConnectionObject } from '../../../utils/src';
import {
  ArgumentException,
  isArmResourceId,
  HTTP_METHODS,
  equals,
  UserException,
  UserErrorCode,
  isCustomConnectorId,
  getUniqueName,
  findKeyValue,
} from '../../../utils/src';
import type { HttpResponse } from '../common/exceptions/service';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult, IConnectionService } from '../connection';
import type { HttpRequestOptions, IHttpClient, QueryParameters } from '../httpClient';
import { getAzureResourceRecursive } from '../common/azure';

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
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    if (!httpClient) {
      throw new ArgumentException('httpclient required');
    }

    this._subscriptionResourceGroupWebUrl = `/subscriptions/${options.subscriptionId}/resourceGroups/${options.resourceGroup}/providers/Microsoft.Web`;
  }

  async getSwaggerFromConnector(connectorId: string): Promise<OpenAPIV2.Document> {
    if (!isArmResourceId(connectorId)) {
      return null as any;
    }

    try {
      const { apiVersion, httpClient, locale } = this.options;
      const headers = locale ? { 'Accept-Language': locale } : undefined;

      return httpClient.get<OpenAPIV2.Document>({
        uri: connectorId,
        queryParameters: { 'api-version': apiVersion, export: 'true' },
        headers,
      });
    } catch (error: any) {
      throw error?.response?.data?.error?.message ?? error;
    }
  }

  async getSwaggerFromUri(uri: string): Promise<OpenAPIV2.Document> {
    const { httpClient } = this.options;
    return httpClient.get<OpenAPIV2.Document>({
      uri,
      noAuth: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  public async getSwaggerParser(uri: string): Promise<SwaggerParser> {
    const response = await this.getSwaggerFromUri(uri);
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
  }

  abstract getConnector(connectorId: string, getCached?: boolean): Promise<Connector>;

  async getConnection(connectionId: string): Promise<Connection> {
    if (isArmResourceId(connectionId)) {
      return this.getConnectionInApiHub(connectionId);
    }

    let connection = findKeyValue<Connection>(this._connections, connectionId);
    if (!connection) {
      await this.getConnections();
      connection = findKeyValue<Connection>(this._connections, connectionId);
    }

    return connection;
  }

  abstract getConnections(connectorId?: string, queryClient?: QueryClient): Promise<Connection[]>;

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
    const { apiVersion, httpClient, locale } = this.options;
    const headers = locale ? { 'Accept-Language': locale } : undefined;
    const response = await httpClient.get<Connector>({
      uri: connectorId,
      queryParameters: { 'api-version': apiVersion },
      headers,
    });

    return {
      ...response,
      properties: {
        ...response.properties,
        ...response.properties.generalInformation,
      },
    };
  }

  private _getAdditionalPropertiesForCreateConnection(connectionInfo: ConnectionCreationInfo): Record<string, any> {
    const additionalProperties: Record<string, any> = {};
    if (connectionInfo?.additionalParameterValues?.['isDynamicConnectionAllowed']) {
      additionalProperties['isDynamicConnectionAllowed'] = true;
    }
    return additionalProperties;
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
        ...this._getAdditionalPropertiesForCreateConnection(connectionInfo),
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
        ...this._getAdditionalPropertiesForCreateConnection(connectionInfo),
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
    const testLink = connection.properties?.testLinks?.[0];
    try {
      if (testLink) {
        response = await this.requestTestConnection(testLink);
        if (response) {
          this.handleTestConnectionResponse(response);
        }
      }
    } catch (testLinkError: any) {
      try {
        const testRequest = connection.properties?.testRequests?.[0];
        if (testRequest) {
          response = await this.requestTestConnection(testRequest);
          if (response) {
            this.handleTestConnectionResponse(response);
          }
        }
      } catch (testRequestError: any) {
        throw testLinkError ?? testRequestError;
      }
    }
  }

  protected async requestTestConnection(testConnectionObj: TestConnectionObject): Promise<HttpResponse<any> | undefined> {
    const { httpClient } = this.options;
    const { method: httpMethod, requestUri: uri, body } = testConnectionObj;
    if (!httpMethod || !uri) {
      return;
    }
    const method = httpMethod.toUpperCase() as HTTP_METHODS;

    try {
      let response: HttpResponse<any> | undefined = undefined;
      const requestOptions: HttpRequestOptions<any> = {
        headers: { noBatch: 'true' }, // Some requests fail specifically when run through batch
        uri,
        ...(body ? { content: body } : {}),
      };
      if (equals(method, HTTP_METHODS.GET)) {
        response = await httpClient.get<any>(requestOptions);
      } else if (equals(method, HTTP_METHODS.POST)) {
        response = await httpClient.post<any, any>(requestOptions);
      } else if (equals(method, HTTP_METHODS.PUT)) {
        response = await httpClient.put<any, any>(requestOptions);
      } else if (equals(method, HTTP_METHODS.DELETE)) {
        response = await httpClient.delete<any>(requestOptions);
      }
      return response;
    } catch (error: any) {
      return Promise.reject(error?.content ?? error);
    }
  }

  protected handleTestConnectionResponse(response?: HttpResponse<any>): void {
    if (!response) {
      return;
    }
    if (response?.status) {
      this.handleTestLinkResponse(response);
      return;
    }
    if ((response as any)?.response) {
      this.handleTestRequestResponse((response as any)?.response);
    }
  }

  private handleTestLinkResponse(response: HttpResponse<any>): void {
    const defaultErrorResponse = 'Please check your account info and/or permissions and try again.';
    const status = response?.status;
    if (status >= 400 && status < 500 && status !== 429) {
      let errorMessage = defaultErrorResponse;
      const body = response?.body;
      if (body && typeof body === 'string') {
        errorMessage = this.tryParseErrorMessage(JSON.parse(body), defaultErrorResponse);
      }
      throw new UserException(UserErrorCode.TEST_CONNECTION_FAILED, errorMessage);
    }
  }

  private handleTestRequestResponse(response: any): void {
    const defaultErrorResponse = 'Please check your account info and/or permissions and try again.';
    const statusCode = response?.statusCode;
    if (statusCode !== 'OK') {
      let errorMessage = defaultErrorResponse;
      const body = response?.body;
      if (body) {
        errorMessage = this.tryParseErrorMessage(body, defaultErrorResponse);
      }
      throw new UserException(UserErrorCode.TEST_CONNECTION_FAILED, errorMessage);
    }
  }

  protected tryParseErrorMessage(error: any, defaultErrorMessage?: string): string {
    return (
      error?.message ??
      error?.Message ??
      error?.error?.message ??
      error?.responseText ??
      error?.errors?.map((e: any) => e?.message ?? e)?.join(', ') ??
      defaultErrorMessage ??
      'Unknown error'
    );
  }

  protected async getConnectionsForConnector(connectorId: string, queryClient?: QueryClient): Promise<Connection[]> {
    if (isArmResourceId(connectorId)) {
      // Right now there isn't a name $filter for custom connections, so we need to filter them manually
      if (isCustomConnectorId(connectorId)) {
        const connectionsCall = queryClient
          ? queryClient.fetchQuery(['allConnections'], async () => {
              return await this.getAllConnectionsInLocation();
            })
          : this.getAllConnectionsInLocation();
        const allConnections = await connectionsCall;
        const filteredConnections = allConnections.filter((connection) => {
          return equals(connection.properties?.api?.id, connectorId);
        });
        return filteredConnections;
      }

      const { location, apiVersion, httpClient } = this.options;

      return (
        (await queryClient?.fetchQuery(['connections', connectorId?.toLowerCase()], async () => {
          const uri = `${this._subscriptionResourceGroupWebUrl}/connections`;
          const queryParameters: QueryParameters = {
            'api-version': apiVersion,
            $filter: `Location eq '${location}' and ManagedApiName eq '${connectorId.split('/').at(-1)}' and Kind eq '${this._vVersion}'`,
          };
          return await getAzureResourceRecursive(httpClient, uri, queryParameters);
        })) ?? []
      );
    }

    if (!this._allConnectionsInitialized) {
      await this.getConnections();
    }

    return Object.keys(this._connections)
      .filter((connectionId) => equals(this._connections[connectionId].properties?.api?.id, connectorId))
      .map((connectionId) => this._connections[connectionId]);
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
      const response = await httpClient.get<ConnectionsResponse>({
        uri,
        queryParameters,
      });
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
      if (isUnique) {
        return connectionName;
      }
    }
    connectionName = `${connectorName}-${++i}`;
    return this._getUniqueConnectionNameInApiHub(connectorName, connectorId, connectionName, i, connectionNames);
  }

  protected _testConnectionIdUniquenessInApiHub(id: string): Promise<boolean> {
    const request = {
      uri: id,
      queryParameters: { 'api-version': this.options.apiVersion },
      skipBatch: true,
    };

    return this.options.httpClient
      .get<Connection>(request)
      .then(() => false)
      .catch((e) => {
        if (e?.httpStatusCode === 404 || e?.status === 404) {
          return true;
        }
        return false;
      });
  }

  private async getAllConnectionsInLocation(): Promise<Connection[]> {
    const { location, httpClient, apiVersion } = this.options;
    return getAzureResourceRecursive(httpClient, `${this._subscriptionResourceGroupWebUrl}/connections`, {
      'api-version': apiVersion,
      $filter: `Location eq '${location}' and Kind eq '${this._vVersion}'`,
      $top: 200,
    });
  }
}

type ConnectionsResponse = {
  nextLink?: string;
  value: Connection[];
};

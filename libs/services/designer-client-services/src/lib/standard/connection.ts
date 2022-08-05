/* eslint-disable no-param-reassign */
import { AzureConnectorMock } from '../__test__/__mocks__/azureConnectorResponse';
import { azureOperationsResponse } from '../__test__/__mocks__/azureOperationResponse';
import { almostAllBuiltInOperations } from '../__test__/__mocks__/builtInOperationResponse';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, IConnectionService } from '../connection';
import type { IHttpClient, QueryParameters } from '../httpClient';
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
  AssertionErrorCode,
  AssertionException,
  ConnectionParameterSource,
  ConnectionType,
  safeSetObjectPropertyValue,
  ArgumentException,
  equals, // connectorsSearchResultsMock,
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
}

interface ContinuationTokenResponse<T> {
  // danielle to move
  value: T;
  nextLink: string;
}

export type getAccessTokenType = () => Promise<string>;

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

export class StandardConnectionService implements IConnectionService {
  private _connections: Record<string, Connection> = {};
  private _subscriptionResourceGroupWebUrl = '';
  private isStandalone = true;

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
    this._subscriptionResourceGroupWebUrl = `/subscriptions/${options.apiHubServiceDetails.subscriptionId}/resourceGroups/${options.apiHubServiceDetails.resourceGroup}/providers/Microsoft.Web`;
  }

  dispose(): void {
    return;
  }

  public async getAllOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> {
    return [...(await this.getAllBuiltInOperations()), ...(await this.getAllAzureOperations())];
  }

  private async getAllBuiltInOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> {
    if (this.isStandalone) {
      return Promise.resolve([...almostAllBuiltInOperations]);
    }
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/operations`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      workflowKind: 'stateful',
    };
    const response = await httpClient.get<{ value: DiscoveryOperation<DiscoveryResultTypes>[] }>({ uri, queryParameters });
    console.log(response);
    return response.value;
  }

  private async getAllAzureOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> {
    const {
      apiHubServiceDetails: { location, apiVersion, subscriptionId },
      httpClient,
    } = this.options;
    if (this.isStandalone) {
      return Promise.resolve(azureOperationsResponse);
    }
    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: "type eq 'Microsoft.Web/locations/managedApis/apiOperations' and properties/integrationServiceEnvironmentResourceId eq null",
    };
    const response = await httpClient.get<{ value: DiscoveryOperation<SomeKindOfAzureOperationDiscovery>[] }>({ uri, queryParameters });
    return response.value;
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
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/operationGroups`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
    };
    const response = await httpClient.get<{ value: Connector[] }>({ uri, queryParameters });
    console.log(response);
    return response.value;
    // return Promise.resolve(connectorsSearchResultsMock);
  }

  private async getAllAzureConnectors(): Promise<Connector[]> {
    const {
      apiHubServiceDetails: { location, apiVersion, subscriptionId },
      httpClient,
    } = this.options;
    if (this.isStandalone) {
      const connectors = AzureConnectorMock.value as Connector[];
      const formattedConnectors = this.moveGeneralInformation(connectors);
      return Promise.resolve(formattedConnectors);
    } else {
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
      };
      const response = await httpClient.get<ContinuationTokenResponse<Connector[]>>({ uri, queryParameters });
      // need to save continuation token to store
      const connectors = response.value;
      const formattedConnectors = this.moveGeneralInformation(connectors);
      console.log(formattedConnectors);
      return formattedConnectors;
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

  public async getAllOperationsForGroup(connectorId: string): Promise<SomeKindOfAzureOperationDiscovery[]> {
    if (!isArmResourceId(connectorId)) {
      const { apiVersion, baseUrl, httpClient } = this.options;
      return httpClient.get<SomeKindOfAzureOperationDiscovery[]>({
        uri: `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}/operations?api-version=${apiVersion}`, // danielle to test
      }); // danielle this should work as it is same as priti
    } else {
      const {
        apiHubServiceDetails: { apiVersion },
        httpClient,
      } = this.options;
      const response = await httpClient.get<SomeKindOfAzureOperationDiscovery[]>({
        uri: `${connectorId}/apiOperations`,
        queryParameters: { 'api-version': apiVersion },
      }); // danielle this could be wrong
      return {
        ...response,
      };
    }
    //return Promise.resolve(MockSearchOperations);
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

  private async createConnectionInApiHub(
    _connectionName: string,
    _connectorId: string,
    _connectionInfo: ConnectionCreationInfo
  ): Promise<Connection> {
    throw new Error('Not implemented for Azure connections yet');
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

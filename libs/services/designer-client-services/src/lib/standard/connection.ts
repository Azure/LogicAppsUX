import type { IConnectionService } from '../connection';
import type { IHttpClient, QueryParameters } from '../httpClient';
import { azureFunctionConnectorId } from './operationmanifest';
import type { Connection, Connector } from '@microsoft-logic-apps/utils';
import { ArgumentException, equals } from '@microsoft-logic-apps/utils';

interface ServiceProviderConnectionModel {
  parameterValues: Record<string, any>; // tslint:disable-line: no-any
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

export type getAccessTokenType = () => Promise<string>;
type LocalConnectionModel = FunctionsConnectionModel | ServiceProviderConnectionModel | APIManagementConnectionModel;
type ReadConnectionsFunc = () => Promise<Record<string, Record<string, LocalConnectionModel>>>;
type WriteConnectionFunc = (connectionData: ConnectionAndAppSetting<LocalConnectionModel>) => Promise<void>;

const serviceProviderLocation = 'serviceProviderConnections';
const functionsLocation = 'functionConnections';

export class StandardConnectionService implements IConnectionService {
  private _connections: Record<string, Connection> = {};

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
  }

  dispose(): void {
    return;
  }

  async getConnector(connectorId: string): Promise<Connector> {
    if (!isArmResourceId(connectorId)) {
      const { apiVersion, baseUrl, httpClient } = this.options;
      const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return httpClient.get<Connector>({ uri });
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

  private async getConnectionsForConnector(connectorId: string): Promise<Connection[]> {
    if (isArmResourceId(connectorId)) {
      const {
        apiHubServiceDetails: { location, subscriptionId, resourceGroup, apiVersion },
        httpClient,
      } = this.options;
      const response = await httpClient.get<ConnectionsResponse>({
        uri: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections`,
        queryParameters: {
          'api-version': apiVersion,
          $filter: `Location eq '${location}' and ManagedApiName eq '${connectorId.split('/').slice(-1)[0]}' and Kind eq 'V2'`,
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
      apiHubServiceDetails: { apiVersion, subscriptionId, resourceGroup },
      locale,
    } = this.options;

    const uri = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections`;

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

import type { ArmResources, Connection, FunctionsConnectionModel, ServiceProviderConnectionModel } from './connection';
import { HttpClient } from '../http';

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

export type getAccessTokenType = () => Promise<string>;

const serviceProviderLocation = 'serviceProviderConnections';
const functionsLocation = 'functionConnections';

export interface ApiHubServiceDetails {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  resourceGroup: string;
  locale?: string;
  location: string;
  getAccessToken: getAccessTokenType;
}

type LocalConnectionModel = FunctionsConnectionModel | ServiceProviderConnectionModel;
// type ReadConnectionsFunc = () => Promise<Record<string, Record<string, LocalConnectionModel>>>;

export class ServerlessConnectionService {
  private _httpClient: HttpClient;
  private _connections: Record<string, Connection> = {};
  //private _oauthService: OAuthService;
  //private _tokenHelper: AccessTokenHelper | undefined;
  //private _analytics: Analytics;

  constructor(public readonly apiHubServiceDetailsInput: ApiHubServiceDetails) //private readonly filterByLocation: boolean,
  //private readonly readConnections: ReadConnectionsFunc
  {
    this._httpClient = HttpClient.createInstance({
      // analytics,
      baseUrl: apiHubServiceDetailsInput.baseUrl,
      getAccessToken: apiHubServiceDetailsInput.getAccessToken,
      locale: apiHubServiceDetailsInput.locale,
    });
  }

  async _getConnectionInApiHub(connectionId: string): Promise<Connection> {
    const { apiVersion } = this.apiHubServiceDetailsInput;
    const request = {
      cache: false,
      path: connectionId,
      query: { 'api-version': apiVersion },
    };
    const response = await this._httpClient.get<Connection>(request);

    // throwWhenNotOK(response);

    const connection = response.body;
    normalizeConnection(connection);

    this._connections[connectionId] = connection;
    return connection;
  }

  // async getConnectionsFromApiHub(): Promise<Connection[]> {
  //     const localConnections = await this.options.readConnections(); // probably from some list
  //     const apiHubConnections = await this._getConnectionsInApiHub(); // makes API call for all connections; why do this if we don't get the first time?

  // }

  // async getConnectionFromAllSources(connectionId: string): Promise<Connection> {
  //     const localConnections = await this.options.readConnections(); // probably from some list
  //     const apiHubConnections = await this._getConnectionsInApiHub(); // makes API call for all connections; why do this if we don't get the first time?
  //     const serviceProviderConnections = (localConnections[serviceProviderLocation] || {}) as Record<string, ServiceProviderConnectionModel>;
  //     const functionConnections = (localConnections[functionsLocation] || {}) as Record<string, FunctionsConnectionModel>;

  //     ...Object.keys(serviceProviderConnections).map(key => {
  //         const connection =
  //         this._connections[connection.id] = connection;
  //         return connection;
  //     }),
  //     const serviceProviderConnection = convertServiceProviderConnectionDataToConnection(key, serviceProviderConnections[key]);
  //     const connection = convertFunctionsConnectionDataToConnection(key, functionConnections[key])

  //     return [
  //         ...Object.keys(serviceProviderConnections).map(key => {
  //             const connection =
  //             this._connections[connection.id] = connection;
  //             return connection;
  //         }),
  //         ...Object.keys(functionConnections).map(key => {
  //             ;
  //             this._connections[connection.id] = connection;
  //             return connection;
  //         }),
  //         ...apiHubConnections,
  //     ];
  // }

  getConnection = (connectionId: string): Promise<Connection> => {
    //if (isArmResourceId(connectionId)) {
    return this._getConnectionInApiHub(connectionId);
    // }

    // const connections = await this.getConnections();
    // const connection = this._connections[connectionId];

    // return connections;
  };

  // async getConnections(): Promise<Connection[]> {  // called in getConnection and elsewhere
  //     const localConnections = await this.options.readConnections(); // probably from some list
  //     const apiHubConnections = await this._getConnectionsInApiHub(); // makes API call; why do this after already none from _getConnectionInApiHub?
  //     const serviceProviderConnections = (localConnections[serviceProviderLocation] || {}) as Record<string, ServiceProviderConnectionModel>;
  //     const functionConnections = (localConnections[functionsLocation] || {}) as Record<string, FunctionsConnectionModel>;

  //     return [
  //         ...Object.keys(serviceProviderConnections).map(key => {
  //             const connection = convertServiceProviderConnectionDataToConnection(key, serviceProviderConnections[key]);
  //             this._connections[connection.id] = connection;
  //             return connection;
  //         }),
  //         ...Object.keys(functionConnections).map(key => {
  //             const connection = convertFunctionsConnectionDataToConnection(key, functionConnections[key]);
  //             this._connections[connection.id] = connection;
  //             return connection;
  //         }),
  //         ...apiHubConnections,
  //     ];
  // }

  public async _getConnectionsInApiHub(): Promise<Connection[]> {
    if (!this.apiHubServiceDetailsInput) {
      // Danielle what is business reason to account for null
      return [];
    }

    const { subscriptionId, resourceGroup, location, apiVersion } = this.apiHubServiceDetailsInput;

    const request = {
      cache: true,
      path: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections`,
      // TODO(psamband): [HACK] Adding the ISE filter temporarily since API returns ISE connections along with Kind filter.
      // Bug 8382814: [Bug] Do not include ISE connections when only kind=V2 filter is provided in List API Connections for LAV2 experience.
      // Remove as soon as RP fixes it.
      query: {
        'api-version': apiVersion,
        $filter: `properties/integrationServiceEnvironmentResourceId eq null and Kind eq 'V2'`,
        $top: 400,
      },
    };
    const response = await this._httpClient.get<ArmResources<Connection>>(request); // Danielle this returns multiple connections

    try {
      //throwWhenNotOK(response);
      const allConnections = await this._followContinuationTokens<Connection>(response.body);
      return (
        allConnections
          // .filter((connection: Connection) => {
          //     return this.filterByLocation ? equals(connection.location, location) : true;
          // })
          .map((connection: Connection) => {
            normalizeConnection(connection);
            this._connections[connection.id] = connection;
            return connection;
          })
      );
    } catch {
      return [];
    }
  }

  private async _followContinuationTokens<T>(response: ArmResources<T>): Promise<T[]> {
    let { nextLink, value } = response;

    while (nextLink) {
      let connectors: T[];
      try {
        ({ nextLink, value: connectors } = await this._followContinuationToken<T>(nextLink));
        value = [...value, ...connectors];
      } catch {
        // NOTE(psamband): We will return empty for the page having errors.
        nextLink = undefined;
      }
    }
    return value;
  }

  private async _followContinuationToken<T>(continuationToken: string): Promise<ArmResources<T>> {
    const request = {
      cache: true,
      url: continuationToken,
    };
    const response = await this._httpClient.get<ArmResources<T>>(request);
    //throwWhenNotOK(response);

    return response.body;
  }
}

function normalizeConnection(connection: Connection): void {
  if (connection.properties && connection.properties['api']) {
    connection.properties.apiId = connection.properties['api'].id;
  }
}
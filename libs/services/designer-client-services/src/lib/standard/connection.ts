import type { QueryParameters } from '../httpClient';
import { HttpClient } from '../httpClient';
import type { ArmResources, Connection, Connector } from '@microsoft-logic-apps/utils';
import { equals, connectionsMock } from '@microsoft-logic-apps/utils';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  filterByLocation?: boolean;
  apiHubServiceDetails?: {
    apiVersion: string;
    baseUrl: string;
    subscriptionId: string;
    resourceGroup: string;
    locale?: string;
    location: string;
    getAccessToken: getAccessTokenType;
  };
}

export type getAccessTokenType = () => Promise<string>;

export class StandardConnectionService {
  constructor(public readonly options: StandardConnectionServiceArgs) {}

  dispose(): void {
    return;
  }

  async getConnector(connectorId: string): Promise<Connector> {
    const { apiVersion, baseUrl } = this.options;
    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
    const response = await HttpClient().get<Connector>({ uri, type: 'GET' });
    console.log(response);
    //return response;
    return { properties: {} } as any;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }

  async getConnection(connectionId: string): Promise<Connection | undefined> {
    throw new Error('Function not implemented.');
    // let connection: Connection | undefined;
    // if (isArmResourceId(connectionId)) {
    //   connection = await this._getConnectionInApiHub(connectionId);
    // } else {
    //   connection = await (await this.getConnections()).find(conn => conn.id === connectionId);
    // }
    // return connection;
  }

  private async _getConnectionInApiHub(connectionId: string): Promise<Connection> {
    const connection = await HttpClient().get<Connection>({
      uri: `${connectionId}/api-version=${this.options.apiHubServiceDetails?.apiVersion}`,
      type: 'GET',
    });

    return connection;
  }

  async getConnections(): Promise<Connection[]> {
    const response = await this._getConnectionsInApiHub();
    return connectionsMock;
  }

  private async _getConnectionsInApiHub(): Promise<Connection[]> {
    const { apiHubServiceDetails, filterByLocation } = this.options;
    if (!apiHubServiceDetails) {
      return [];
    }

    const { subscriptionId, resourceGroup, location, apiVersion } = apiHubServiceDetails;

    const uri = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections`;

    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `properties/integrationServiceEnvironmentResourceId eq null and Kind eq 'V2'`,
      $top: 400,
    };

    try {
      const response = await HttpClient().get<ArmResources<Connection>>({ uri, type: 'GET', queryParameters });
      const allConnections = await this._followContinuationTokens<Connection>(response);
      return allConnections.filter((connection: Connection) => {
        return filterByLocation ? equals(connection.location, location) : true;
      });
    } catch {
      return [];
    }
  }

  // this is used if there are more connections than the API can return
  private async _followContinuationTokens<T>(response: ArmResources<T>): Promise<T[]> {
    let { nextLink, value } = response;

    while (nextLink) {
      let connectors: T[];
      try {
        ({ nextLink, value: connectors } = await this._followContinuationToken<T>(nextLink));
        value = [...value, ...connectors];
      } catch {
        nextLink = undefined;
      }
    }
    return value;
  }

  private async _followContinuationToken<T>(continuationToken: string): Promise<ArmResources<T>> {
    const response = await HttpClient().get<ArmResources<T>>({ uri: continuationToken, type: 'GET' });

    return response;
  }
}

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

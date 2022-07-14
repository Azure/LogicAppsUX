import type { IHttpClient, QueryParameters } from '../httpClient';
import type { ArmResources, Connection, Connector } from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  filterByLocation?: boolean;
  httpClient: IHttpClient;
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
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response = await httpClient.get<Connector>({ uri });
    //return response;
    return {} as any;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }

  async getAllConnectors(): Promise<Connector[]> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}/operationGroups?api-version=${apiVersion}`;
    const response = await httpClient.get<{ value: Connector[] }>({ uri });
    console.log(response);
    return response.value;
  }

  async getConnection(_connectionId: string): Promise<Connection | undefined> {
    throw new Error('Function not implemented.');
  }

  private async getConnectionInApiHub(connectionId: string): Promise<Connection> {
    const { apiHubServiceDetails, httpClient } = this.options;
    const connection = await httpClient.get<Connection>({
      uri: `${connectionId}/api-version=${apiHubServiceDetails?.apiVersion}`,
    });

    return connection;
  }

  async getConnections(): Promise<Connection[]> {
    const response = await this.getConnectionsInApiHub();
    return response;
  }

  private async getConnectionsInApiHub(): Promise<Connection[]> {
    const { apiHubServiceDetails, filterByLocation, httpClient, baseUrl } = this.options;
    if (!apiHubServiceDetails) {
      return [];
    }

    const { subscriptionId, resourceGroup, location, apiVersion } = apiHubServiceDetails;

    const uri = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections`;

    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `properties/integrationServiceEnvironmentResourceId eq null and Kind eq 'V2'`,
      $top: 400,
    };

    try {
      const response = await httpClient.get<ArmResources<Connection>>({ uri, queryParameters });
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
    const response = await this.options.httpClient.get<ArmResources<T>>({ uri: continuationToken });

    return response;
  }
}

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

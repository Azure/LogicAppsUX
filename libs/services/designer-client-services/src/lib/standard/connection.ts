import type { IHttpClient, QueryParameters } from '../httpClient';
import type { ArmResource, Connection, Connector } from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  filterByLocation?: boolean;
  httpClient: IHttpClient;
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

  async getConnection(_connectionId: string): Promise<Connection | undefined> {
    throw new Error('Function not implemented.');
  }

  private async getConnectionInApiHub(connectionId: string): Promise<Connection> {
    const { apiVersion, httpClient } = this.options;
    const connection = await httpClient.get<Connection>({
      uri: `${connectionId}/api-version=${apiVersion}`,
    });

    return connection;
  }

  async getConnections(): Promise<Connection[]> {
    const response = await this.getConnectionsInApiHub();
    return response;
  }

  private async getConnectionsInApiHub(): Promise<Connection[]> {
    const { filterByLocation, httpClient, baseUrl, apiVersion, locale } = this.options;

    const uri = `${baseUrl}/connections`;

    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `properties/integrationServiceEnvironmentResourceId eq null and Kind eq 'V2'`,
      $top: 400,
    };

    try {
      const response = await httpClient.get<ArmResource<Connection>[]>({ uri, queryParameters });
      const connections = response.map((armConnection) => armConnection.properties);
      return connections.filter((connection: Connection) => {
        return filterByLocation ? equals(connection.location, locale) : true; // danielle test locale in unit and live
      });
    } catch {
      return [];
    }
  }
}

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

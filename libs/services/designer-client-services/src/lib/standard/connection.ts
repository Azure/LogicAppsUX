import { HttpClient } from '../httpClient';
import type { UrlService } from '../urlService';
import type { Connection, Connector } from '@microsoft-logic-apps/utils';
import { connectionsMock } from '@microsoft-logic-apps/utils';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  urlService: UrlService;
}

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
    return {} as any;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }

  async getConnections(connectorId?: string /*batchable?: boolean  danielle to do */): Promise<Connection[]> {
    let uri: string;

    if (connectorId) {
      uri = this.options.urlService.getListConnectionsUri(connectorId);
    } else {
      uri = this.options.urlService.getConnectionsUri();
    }
    const response = await HttpClient().get<Connector>({ uri, type: 'GET' });
    return connectionsMock; // danielle still need to make API type and convert
  }
}

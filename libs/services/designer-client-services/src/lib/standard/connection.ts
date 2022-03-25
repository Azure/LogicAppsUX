/* eslint-disable @typescript-eslint/no-empty-function */
import type { Connector } from '../common/models/connector';
import type { IConnectionService } from '../connection';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
}

export class StandardConnectionService {
  private _httpClient: HttpClient;

  constructor(public readonly options: StandardConnectionServiceArgs) {}

  dispose(): void {

  }

  async getConnector(connectorId: string): Promise<Response> {
    // TODO(psamband): To be implemented
    const { apiVersion, baseUrl } = this.options;
    const url = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
    const response = await this._httpClient.fetch(url);
    return response;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }
}

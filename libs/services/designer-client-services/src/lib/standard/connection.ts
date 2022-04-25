import type { HttpOptions } from '../common/http/http';
import { HttpClient } from '../common/http/http';
import type { IConnectionService } from '../connection';
import type { Connector } from '@microsoft-logic-apps/utils';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  getToken: () => string;
}

export class StandardConnectionService {
  private _httpClient: HttpClient;
  private httpOptions: HttpOptions = {
    baseUrl: '',
    locale: 'en-US',
  };

  constructor(public readonly options: StandardConnectionServiceArgs) {
    this._httpClient = new HttpClient({ ...this.httpOptions, baseUrl: options.baseUrl, getToken: options.getToken });
  }

  dispose(): void {
    return;
  }

  async getConnector(connectorId: string): Promise<Connector> {
    const { apiVersion, baseUrl } = this.options;
    const url = `/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
    //const response = await this._httpClient.get<Connector>(url);
    //return response;
    return {} as any;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }
}

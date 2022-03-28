/* eslint-disable @typescript-eslint/no-empty-function */
import type { Connector } from '../common/models/connector';
import type { HttpOptions } from '@microsoft-logic-apps/designer-tools';
import { HttpClient } from '@microsoft-logic-apps/designer-tools';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
}

export class StandardConnectionService {
  private _httpClient: HttpClient;
  private httpOptions: HttpOptions = {
    baseUrl: '',
    locale: 'US',
  };

  constructor(public readonly options: StandardConnectionServiceArgs) {
    this._httpClient = new HttpClient({ ...this.httpOptions, baseUrl: options.baseUrl });
  }

  dispose(): void {}

  async getConnector(connectorId: string): Promise<Connector> {
    const { apiVersion, baseUrl } = this.options;
    const url = `/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
    const response = await this._httpClient.get<Connector>(url);
    return response;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }
}

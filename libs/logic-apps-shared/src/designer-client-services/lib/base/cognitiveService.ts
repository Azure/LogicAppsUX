import type { ICognitiveServiceService } from '../cognitiveService';
import type { IHttpClient } from '../httpClient';
import { ArgumentException } from '../../../utils/src';
import { fetchAppsByQuery } from '../common/azure';

export interface BaseCognitiveServiceServiceOptions {
  baseUrl: string;
  apiVersion: string;
  httpClient: IHttpClient;
}

export class BaseCognitiveServiceService implements ICognitiveServiceService {
  constructor(public readonly options: BaseCognitiveServiceServiceOptions) {
    const { apiVersion, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }

    if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  async fetchAllCognitiveServiceAccounts(): Promise<any> {
    const { httpClient } = this.options;

    const uri = '/providers/Microsoft.ResourceGraph/resources';

    const response = await fetchAppsByQuery(
      httpClient,
      uri,
      [],
      'Resources\n        \n        | where type == "microsoft.cognitiveservices/accounts"\n        | where kind in ("OpenAI", "AIServices")\n        \n        \n        \n        \n        \n        | order by [\'name\'] asc'
    );
    return response;
  }
}

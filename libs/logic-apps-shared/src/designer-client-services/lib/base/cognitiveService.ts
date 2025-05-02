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

  async fetchCognitiveServiceAccountById(accountId: string): Promise<any> {
    const { httpClient, baseUrl, apiVersion } = this.options;
    const uri = `${baseUrl}${accountId}`;
    try {
      const response = await httpClient.get({
        uri,
        queryParameters: {
          'api-version': apiVersion,
        },
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }

  async fetchCognitiveServiceAccountKeysById(accountId: string): Promise<any> {
    const { httpClient, baseUrl, apiVersion } = this.options;
    const uri = `${baseUrl}${accountId}/listKeys`;
    try {
      const response = await httpClient.post({
        uri,
        queryParameters: {
          'api-version': apiVersion,
        },
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }

  async fetchAllCognitiveServiceAccounts(): Promise<any> {
    const { httpClient, baseUrl } = this.options;

    const uri = `${baseUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`;

    const response = await fetchAppsByQuery(
      httpClient,
      uri,
      'Resources\n\n| where type == "microsoft.cognitiveservices/accounts"\n| where kind in ("OpenAI", "AIServices")\n        \n        \n        \n        \n        \n        | order by [\'name\'] asc'
    );
    return response;
  }
}

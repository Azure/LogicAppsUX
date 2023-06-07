import type { IFunctionService } from '../function';
import { isFunctionContainer } from '../helpers';
import type { IHttpClient } from '../httpClient';
import { ArgumentException } from '@microsoft/utils-logic-apps';

export interface BaseFunctionServiceOptions {
  baseUrl: string;
  apiVersion: string;
  subscriptionId: string;
  httpClient: IHttpClient;
}

export class BaseFunctionService implements IFunctionService {
  constructor(public readonly options: BaseFunctionServiceOptions) {
    const { apiVersion, subscriptionId, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  private getFunctionAppsRequestPath(): string {
    return `/subscriptions/${this.options.subscriptionId}/providers/Microsoft.Web/sites`;
  }

  async fetchFunctionApps(): Promise<any> {
    const functionAppsResponse = await this.options.httpClient.get<any>({
      uri: this.getFunctionAppsRequestPath(),
      queryParameters: { 'api-version': this.options.apiVersion },
    });

    const apps = functionAppsResponse.value.filter((app: any) => isFunctionContainer(app.kind));
    return apps;
  }

  async fetchFunctionAppsFunctions(functionAppId: string) {
    const { baseUrl } = this.options;
    const functionsResponse = await this.options.httpClient.get<any>({
      uri: `${baseUrl}/${functionAppId}/functions`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    return functionsResponse?.value ?? [];
  }

  async fetchFunctionKey(functionId: string) {
    const { baseUrl } = this.options;
    const keysResponse = await this.options.httpClient.post<any, any>({
      uri: `${baseUrl}/${functionId}/listkeys`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    return keysResponse?.default ?? 'NotFound';
  }
}

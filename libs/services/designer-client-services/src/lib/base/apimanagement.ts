import type { IApiManagementService } from '../apimanagement';
import type { IHttpClient } from '../httpClient';
import { ArgumentException, equals } from '@microsoft/utils-logic-apps';

export interface ApiManagementServiceOptions {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  httpClient: IHttpClient;
}

export class ApiManagementInstanceService implements IApiManagementService {
  constructor(public readonly options: ApiManagementServiceOptions) {
    const { apiVersion, baseUrl, subscriptionId, httpClient } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  async fetchApiManagementInstances(): Promise<any> {
    const { apiVersion, subscriptionId, httpClient } = this.options;
    const response = await httpClient.get<any>({
      uri: `/subscriptions/${subscriptionId}/providers/Microsoft.ApiManagement/service`,
      queryParameters: { 'api-version': apiVersion },
    });

    return response.value.filter((instance: any) => !equals(instance.sku ? instance.sku.name : '', 'Consumption'));
  }

  async fetchApisInApiM(apiInstanceId: string): Promise<any> {
    const { apiVersion, httpClient } = this.options;
    const response = await httpClient.get<any>({
      uri: `${apiInstanceId}/apis`,
      queryParameters: { 'api-version': apiVersion },
    });

    return response.value;
  }

  fetchApiMSwagger(apimApiId: string): Promise<any> {
    const { apiVersion, httpClient } = this.options;

    return httpClient.get<any>({
      uri: apimApiId,
      queryParameters: { 'api-version': apiVersion },
      headers: {
        Accept: 'application/vnd.swagger.doc+json',
      },
    });
  }
}

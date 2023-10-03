import { getAzureResourceRecursive } from '../common/azure';
import type { IGatewayService } from '../gateway';
import type { IHttpClient } from '../httpClient';
import type { Gateway, Subscription } from '@microsoft/utils-logic-apps';
import { ArgumentException } from '@microsoft/utils-logic-apps';

export interface BaseGatewayServiceOptions {
  baseUrl: string;
  locale?: string;
  httpClient: IHttpClient;
  apiVersions: {
    subscription: string;
    gateway: string;
  };
}

export class BaseGatewayService implements IGatewayService {
  constructor(public readonly options: BaseGatewayServiceOptions) {
    const { baseUrl, apiVersions } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersions) {
      throw new ArgumentException('apiVersions required');
    }
  }

  dispose(): void {
    return;
  }

  public getGateways(subscriptionId: string, connectorName: string): Promise<Gateway[]> {
    if (!connectorName) return Promise.resolve([]);
    return this.fetchGatewaysList(subscriptionId, connectorName);
  }

  private async fetchGatewaysList(subscriptionId: string, apiName: string): Promise<Gateway[]> {
    try {
      const { baseUrl, apiVersions, httpClient } = this.options;
      const uri = `${baseUrl}${subscriptionId}/providers/Microsoft.Web/connectionGateways`;
      const queryParameters = {
        'api-version': apiVersions.gateway,
        $filter: `apiName eq '${apiName}'`,
      };
      return getAzureResourceRecursive(httpClient, uri, queryParameters);
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public getSubscriptions(): Promise<Subscription[]> {
    try {
      const { baseUrl, apiVersions, httpClient } = this.options;
      const uri = `${baseUrl}/subscriptions/`;
      const queryParameters = { 'api-version': apiVersions.subscription };
      return getAzureResourceRecursive(httpClient, uri, queryParameters);
    } catch (error) {
      throw new Error(error as any);
    }
  }
}

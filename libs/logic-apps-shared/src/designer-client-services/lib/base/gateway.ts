import { getAzureResourceRecursive } from '../common/azure';
import type { IGatewayService } from '../gateway';
import type { IHttpClient } from '../httpClient';
import type { Gateway, Subscription } from '@microsoft/logic-apps-shared';
import { ArgumentException } from '@microsoft/logic-apps-shared';

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

  public async getGateways(subscriptionId: string | undefined, connectorName: string): Promise<Gateway[]> {
    const config = await (this as IGatewayService).getConfig?.();
    const isSubscriptionRequired = !config?.disableSubscriptionLookup;
    if ((isSubscriptionRequired && !subscriptionId) || !connectorName) {
      return [];
    }
    return this.fetchGatewaysList(subscriptionId, connectorName);
  }

  private async fetchGatewaysList(subscriptionId: string | undefined, apiName: string): Promise<Gateway[]> {
    try {
      if (subscriptionId === undefined) {
        throw new ArgumentException('subscriptionId required');
      }
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

import type { IGatewayService } from '../gateway';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { Gateway, ArmResources, Subscription, SubscriptionsResponse } from '@microsoft-logic-apps/utils';
import { ArgumentException } from '@microsoft-logic-apps/utils';

interface StandardGatewayServiceArgs {
  baseUrl: string;
  locale?: string;
  httpClient: IHttpClient;
  apiVersions: {
    subscription: string;
    gateway: string;
  };
}

export class StandardGatewayService implements IGatewayService {
  constructor(public readonly options: StandardGatewayServiceArgs) {
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
    if (!subscriptionId || !connectorName) return Promise.resolve([]);
    return this.fetchGatewaysList(subscriptionId, connectorName);
  }

  private async fetchGatewaysList(subscriptionId: string, apiName: string): Promise<Gateway[]> {
    const filter = `apiName eq '${apiName}'`;
    const { apiVersions } = this.options;
    const request: HttpRequestOptions<any> = {
      uri: `${subscriptionId}/providers/Microsoft.Web/connectionGateways`,
      queryParameters: {
        'api-version': apiVersions.gateway,
        $filter: filter,
      },
    };

    try {
      const response = await this.options.httpClient.get<ArmResources<Gateway>>(request);
      return response.value;
    } catch (error) {
      throw new Error(error as any);
    }
  }

  public getSubscriptions(): Promise<Subscription[]> {
    return this.fetchSubscriptions();
  }

  private async fetchSubscriptions(): Promise<Subscription[]> {
    const { apiVersions } = this.options;
    const request: HttpRequestOptions<SubscriptionsResponse> = {
      uri: '/subscriptions',
      queryParameters: {
        'api-version': apiVersions.subscription,
      },
    };

    try {
      const subscriptions: Subscription[] = [];
      let nextLink: string | undefined, value: Subscription[];
      do {
        const response = await this.options.httpClient.get<SubscriptionsResponse>(request);
        value = response.value;
        nextLink = response.nextLink;
        subscriptions.push(...value);

        if (nextLink) request.uri = '/subscriptions' + new URL(nextLink).search;
      } while (nextLink !== undefined);

      return subscriptions;

      // if (this._tenantId === undefined) {
      //   this._tenantId = await this.options.getTenantId();
      // }
      // return subscriptions.filter((subscription: Subscription) => subscription.tenantId === this._tenantId);
    } catch (error) {
      throw new Error(error as any);
    }
  }
}

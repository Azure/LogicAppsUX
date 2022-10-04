import type { IGatewayService } from '../gateway';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { Gateway, ArmResources, Subscription, SubscriptionsResponse } from '@microsoft-logic-apps/utils';
import { ArgumentException } from '@microsoft-logic-apps/utils';

interface StandardGatewayServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
  apiHubServiceDetails: {
    apiVersion: string;
    subscriptionId: string;
    resourceGroup: string;
    location: string;
  };
  httpClient: IHttpClient;
}

export class StandardGatewayService implements IGatewayService {
  constructor(public readonly options: StandardGatewayServiceArgs) {
    const { apiHubServiceDetails, apiVersion, baseUrl } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!apiHubServiceDetails) {
      throw new ArgumentException('apiHubServiceDetails required for workflow app');
    }
  }

  dispose(): void {
    return;
  }

  public getGateways(subscriptionId: string, connectorName: string): Promise<Gateway[]> {
    return this.fetchGatewaysList(subscriptionId, connectorName);
  }

  private async fetchGatewaysList(subscriptionId: string, apiName: string): Promise<Gateway[]> {
    const filter = `apiName eq '${apiName}'`;
    const { apiVersion } = this.options;
    const request: HttpRequestOptions<any> = {
      uri: `/subscriptions/${subscriptionId}/providers/Microsoft.Web/connectionGateways`,
      queryParameters: {
        'api-version': apiVersion,
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
    const { apiVersion } = this.options;
    const request: HttpRequestOptions<SubscriptionsResponse> = {
      uri: '/subscriptions',
      queryParameters: {
        'api-version': apiVersion,
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

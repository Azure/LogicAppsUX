import { getAzureResourceRecursive } from '../common/azure';
import type { IGatewayService } from '../gateway';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { Gateway, ArmResources, Subscription } from '@microsoft/utils-logic-apps';
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
    if (!subscriptionId || !connectorName) return Promise.resolve([]);
    return this.fetchGatewaysList(subscriptionId, connectorName);
  }

  private async fetchGatewaysList(subscriptionId: string, apiName: string): Promise<Gateway[]> {
    const filter = `apiName eq '${apiName}'`;
    const { baseUrl, apiVersions } = this.options;
    const request: HttpRequestOptions<any> = {
      uri: `${baseUrl}${subscriptionId}/providers/Microsoft.Web/connectionGateways`,
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
    const { baseUrl, apiVersions } = this.options;

    try {
      return getAzureResourceRecursive(this.options.httpClient, `${baseUrl}/subscriptions/`, { 'api-version': apiVersions.subscription });
    } catch (error) {
      throw new Error(error as any);
    }
  }
}

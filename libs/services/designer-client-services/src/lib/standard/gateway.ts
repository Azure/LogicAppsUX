import type { IGatewayService } from '../gateway';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { Gateway, ArmResources } from '@microsoft-logic-apps/utils';
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

  public getGateways(connectorName: string): Promise<Gateway[]> {
    return this.fetchGatewaysList(connectorName);
  }

  private fetchGatewaysList(apiName: string): Promise<Gateway[]> {
    const filter = `apiName eq '${apiName}'`;
    const {
      apiVersion,
      apiHubServiceDetails: { subscriptionId },
    } = this.options;
    const request: HttpRequestOptions<any> = {
      uri: `/subscriptions/${subscriptionId}/providers/Microsoft.Web/connectionGateways`,
      queryParameters: {
        'api-version': apiVersion,
        $filter: filter,
      },
    };

    return this.options.httpClient
      .get<ArmResources<Gateway>>(request)
      .then((response) => response.value)
      .catch((error) => {
        throw new Error(error);
      });
  }
}

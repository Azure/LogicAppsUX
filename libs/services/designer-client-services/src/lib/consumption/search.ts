import type { QueryParameters } from '../httpClient';
import type { DiscoveryOpArray } from '../standard/search';
import { StandardSearchService } from '../standard/search';
import type { Connector } from '@microsoft-logic-apps/utils';

export class ConsumptionSearchService extends StandardSearchService {
  public override async getAllOperations(): Promise<DiscoveryOpArray> {
    return [...(await this.getAllCustomApiOperations()), ...(await this.getAllAzureOperations())];
  }

  public async getAllCustomApiOperations(): Promise<DiscoveryOpArray> {
    return Promise.resolve([]);
  }

  public override async getAllConnectors(): Promise<Connector[]> {
    return Promise.all([this.getAllCustomApiConnectors(), this.getAllAzureConnectors()]).then((values) => values.flat());
  }

  public async getAllCustomApiConnectors(): Promise<Connector[]> {
    const {
      apiHubServiceDetails: { apiVersion, subscriptionId },
    } = this.options;
    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `properties/integrationServiceEnvironmentResourceId eq null`,
    };
    return await this.batchAzureResourceRequests(uri, queryParameters);
  }
}

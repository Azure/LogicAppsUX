import type { QueryParameters } from '../httpClient';
import type { DiscoveryOpArray } from '../standard/search';
import { StandardSearchService } from '../standard/search';
import type { Connector } from '@microsoft/utils-logic-apps';

export class ConsumptionSearchService extends StandardSearchService {
  public override async getAllOperations(): Promise<DiscoveryOpArray> {
    const azureOperations = await this.getAllAzureOperations();
    const customApiOperations = await this.getAllCustomApiOperations();
    return [...azureOperations, ...customApiOperations];
  }

  public async getAllCustomApiOperations(): Promise<DiscoveryOpArray> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `type eq 'Microsoft.Web/customApis/apiOperations' and properties/integrationServiceEnvironmentResourceId eq null`,
      };
      return await this.batchAzureResourceRequests(uri, queryParameters);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public override async getAllConnectors(): Promise<Connector[]> {
    const azureConnectors = await this.getAllAzureConnectors();
    const customApiConnectors = await this.getAllCustomApiConnectors();
    return [...azureConnectors, ...customApiConnectors];
  }

  public async getAllCustomApiConnectors(): Promise<Connector[]> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `properties/integrationServiceEnvironmentResourceId eq null`,
      };
      return await this.getAzureResourceRecursive(uri, queryParameters);
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}

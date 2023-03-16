import { BaseSearchService } from '../base';
import type { ContinuationTokenResponse, DiscoveryOpArray } from '../base/search';
import { getClientBuiltInConnectors } from '../base/search';
import type { QueryParameters } from '../httpClient';
import type { Connector } from '@microsoft/utils-logic-apps';
import { connectorsSearchResultsMock } from '@microsoft/utils-logic-apps';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

export class StandardSearchService extends BaseSearchService {
  // Operations

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getAllBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  public async getAllOperationsByPage(page: number): Promise<DiscoveryOpArray> {
    return Promise.all([
      this.getAllAzureOperationsByPage(page),
      this.getAllCustomApiOperationsByPage(page),
      page === 0 ? this.getAllBuiltInOperations() : [],
    ]).then((values) => values.flat());
  }

  // Connectors

  public async getAllConnectors(): Promise<Connector[]> {
    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getBuiltInConnectors()]).then((values) =>
      values.flat()
    );
  }

  public async getCustomConnectorsByNextlink(prevNextlink?: string): Promise<{ nextlink?: string; value: Connector[] }> {
    if (this._isDev) return Promise.resolve({ value: [] });

    try {
      const {
        httpClient,
        apiHubServiceDetails: { apiVersion, subscriptionId },
      } = this.options;
      const filter = `$filter=${ISE_RESOURCE_ID} eq null`;
      const startUri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis?api-version=${apiVersion}`;
      const uri = `${prevNextlink ?? startUri}&${filter}`;

      const { nextLink, value } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri });
      return { nextlink: nextLink, value };
    } catch (error) {
      return { value: [] };
    }
  }

  // TODO - Need to add extra filtering for trigger/action
  public async getBuiltInConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      return Promise.resolve([...connectorsSearchResultsMock, ...getClientBuiltInConnectors(this.options.showStatefulOperations)]);
    }
    const { apiVersion, baseUrl, httpClient, showStatefulOperations } = this.options;
    const uri = `${baseUrl}/operationGroups`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
    };
    const response = await httpClient.get<{ value: Connector[] }>({ uri, queryParameters });
    return [...response.value, ...getClientBuiltInConnectors(showStatefulOperations)];
  }
}

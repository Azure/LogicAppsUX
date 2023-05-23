import { almostAllBuiltInOperations } from '../__test__/__mocks__/builtInOperationResponse';
import { BaseSearchService } from '../base';
import type { AzureOperationsFetchResponse, ContinuationTokenResponse, DiscoveryOpArray } from '../base/search';
import { getClientBuiltInOperations, getClientBuiltInConnectors } from '../base/search';
import type { QueryParameters } from '../httpClient';
import type { Connector } from '@microsoft/utils-logic-apps';
import { connectorsSearchResultsMock } from '@microsoft/utils-logic-apps';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

export class StandardSearchService extends BaseSearchService {
  // Operations

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  // TODO - Need to add extra filtering for trigger/action
  async getBuiltInOperations(): Promise<DiscoveryOpArray> {
    if (this._isDev) {
      return Promise.resolve([...almostAllBuiltInOperations, ...getClientBuiltInOperations(this.options.showStatefulOperations)]);
    }
    const { apiVersion, baseUrl, httpClient, showStatefulOperations } = this.options;
    const uri = `${baseUrl}/operations`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      workflowKind: showStatefulOperations ? 'Stateful' : 'Stateless',
    };
    const response = await httpClient.get<AzureOperationsFetchResponse>({ uri, queryParameters });

    return [...response.value, ...getClientBuiltInOperations(showStatefulOperations)];
  }

  public async getCustomOperationsByPage(page: number): Promise<DiscoveryOpArray> {
    if (this._isDev) return Promise.resolve([]);

    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      if (this._isDev) return Promise.resolve([]);

      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `properties/trigger eq null and type eq 'Microsoft.Web/customApis/apiOperations' and ${ISE_RESOURCE_ID} eq null`,
      };
      // const response = await this.pagedBatchAzureResourceRequests(page, uri, queryParameters, 1);
      const { value } = await this.getAzureResourceByPage(uri, queryParameters, page, 100);
      return value;
    } catch (error) {
      return [];
    }
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
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const filter = `$filter=${ISE_RESOURCE_ID} eq null`;
      const startUri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis?api-version=${apiVersion}`;
      const uri = `${prevNextlink ?? startUri}&${filter}`;

      const { nextLink, value } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri });
      const filteredValue = value
        .filter((connector) => connector.properties?.supportedConnectionKinds?.includes('V2'))
        .filter((connector) => connector?.location === location);
      return { nextlink: nextLink, value: filteredValue };
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

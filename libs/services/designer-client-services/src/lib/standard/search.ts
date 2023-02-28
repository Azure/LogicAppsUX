import { BaseSearchService } from '../base';
import type { DiscoveryOpArray } from '../base/search';
import { getClientBuiltInConnectors } from '../base/search';
import type { QueryParameters } from '../httpClient';
import type { Connector } from '@microsoft/utils-logic-apps';
import { connectorsSearchResultsMock } from '@microsoft/utils-logic-apps';

export class StandardSearchService extends BaseSearchService {
  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getAllBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  async getAllConnectors(): Promise<Connector[]> {
    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getAllBuiltInConnectors()]).then((values) =>
      values.flat()
    );
  }

  // TODO - Need to add extra filtering for trigger/action
  private async getAllBuiltInConnectors(): Promise<Connector[]> {
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

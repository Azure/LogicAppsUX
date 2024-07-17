import type {
  DiscoveryOpArray,
  DiscoveryOperation,
  BuiltInOperation,
  Connector,
  SomeKindOfAzureOperationDiscovery,
} from '../../../utils/src';
import { ArgumentException, connectorsSearchResultsMock } from '../../../utils/src';
import { almostAllBuiltInOperations } from '../__test__/__mocks__/builtInOperationResponse';
import { BaseSearchService } from '../base';
import type { AzureOperationsFetchResponse, BaseSearchServiceOptions } from '../base/search';
import { getClientBuiltInOperations, getClientBuiltInConnectors } from '../base/search';
import type { ContinuationTokenResponse } from '../common/azure';
import type { QueryParameters } from '../httpClient';
import { getHybridAppBaseRelativeUrl, isHybridLogicApp } from './hybrid';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

interface StandardSearchServiceOptions extends BaseSearchServiceOptions {
  apiVersion: string;
  baseUrl: string;
  showStatefulOperations?: boolean;
  hybridLogicApp?: boolean;
}

export class StandardSearchService extends BaseSearchService {
  constructor(public override readonly options: StandardSearchServiceOptions) {
    super(options);

    const { baseUrl, apiVersion, hybridLogicApp } = options;

    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    if (hybridLogicApp) {
      this._isHybridLogicApp = true;
    }
  }

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  // TODO - Need to add extra filtering for trigger/action
  async getBuiltInOperations(): Promise<DiscoveryOpArray> {
    const filterOperation = (operation: DiscoveryOperation<BuiltInOperation>) =>
      filterStateful(operation, !!this.options.showStatefulOperations);
    if (this._isDev) {
      return Promise.resolve([...almostAllBuiltInOperations, ...getClientBuiltInOperations(filterOperation)]);
    }
    const { apiVersion, baseUrl, httpClient, showStatefulOperations, locale } = this.options;
    const uri = `${baseUrl}/operations`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      workflowKind: showStatefulOperations ? 'Stateful' : 'Stateless',
    };
    const headers = locale ? { 'Accept-Language': locale } : undefined;

    let response = null;
    if (isHybridLogicApp(uri)) {
      response = await httpClient.post<AzureOperationsFetchResponse, null>({
        uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=2024-02-02-preview`,
        headers: {
          'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operations/?workflowKind=${
            showStatefulOperations ? 'Stateful' : 'Stateless'
          }`,
          'x-ms-logicapps-proxy-method': 'GET',
        },
      });
    } else {
      response = await httpClient.get<AzureOperationsFetchResponse>({ uri, queryParameters, headers });
    }

    const isAzureConnectorsEnabled = this.options.apiHubServiceDetails.subscriptionId !== undefined;
    const filteredApiOperations = isAzureConnectorsEnabled ? response.value : filterAzureConnection(response.value);

    return [...filteredApiOperations, ...getClientBuiltInOperations(filterOperation)];
  }

  public async getCustomOperationsByPage(page: number): Promise<DiscoveryOpArray> {
    if (this._isDev || this._isHybridLogicApp) {
      return Promise.resolve([]);
    }

    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;

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
    if (this._isDev || this._isHybridLogicApp) {
      return Promise.resolve({ value: [] });
    }

    try {
      const {
        httpClient,
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
        locale,
      } = this.options;
      const filter = `$filter=${ISE_RESOURCE_ID} eq null`;
      const startUri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis?api-version=${apiVersion}`;
      const uri = `${prevNextlink ?? startUri}&${filter}`;
      const headers = locale ? { 'Accept-Language': locale } : undefined;

      const { nextLink, value } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri, headers });
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
    const filterConnector = (connector: Connector) => filterStateful(connector, !!this.options.showStatefulOperations);
    if (this._isDev) {
      return Promise.resolve([...connectorsSearchResultsMock, ...getClientBuiltInConnectors(filterConnector)]);
    }
    const { apiVersion, baseUrl, httpClient, locale } = this.options;
    const uri = `${baseUrl}/operationGroups`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
    };
    const headers = locale ? { 'Accept-Language': locale } : undefined;

    let response = null;
    if (isHybridLogicApp(uri)) {
      response = await httpClient.post<{ value: Connector[] }, null>({
        uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=2024-02-02-preview`,
        headers: {
          'x-ms-logicapps-proxy-path': '/runtime/webhooks/workflow/api/management/operationGroups/',
          'x-ms-logicapps-proxy-method': 'GET',
        },
      });
    } else {
      response = await httpClient.get<{ value: Connector[] }>({ uri, queryParameters, headers });
    }

    const isAzureConnectorsEnabled = this.options.apiHubServiceDetails.subscriptionId !== undefined;
    const filteredApiConnectors = isAzureConnectorsEnabled ? response.value : filterAzureConnection(response.value);

    return [...filteredApiConnectors, ...getClientBuiltInConnectors(filterConnector)];
  }
}

function filterStateful(operation: DiscoveryOperation<BuiltInOperation> | Connector, showStateful: boolean): boolean {
  if (operation.properties.capabilities === undefined) {
    return true;
  }
  return showStateful
    ? operation.properties.capabilities.includes('Stateful') || !operation.properties.capabilities.includes('Stateless')
    : operation.properties.capabilities.includes('Stateless') || !operation.properties.capabilities.includes('Stateful');
}

function filterAzureConnection<T extends Connector | DiscoveryOperation<SomeKindOfAzureOperationDiscovery>>(rawConnections: T[]): T[] {
  return rawConnections.filter((rawConnection: T) => !needsAzureConnection(rawConnection));
}

function needsAzureConnection(connectorOrOperation: Connector | DiscoveryOperation<SomeKindOfAzureOperationDiscovery>): boolean {
  return (connectorOrOperation.properties.capabilities || []).indexOf('azureConnection') > -1;
}

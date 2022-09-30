import { AzureConnectorMock } from '../__test__/__mocks__/azureConnectorResponse';
import { azureOperationsResponse } from '../__test__/__mocks__/azureOperationResponse';
import { almostAllBuiltInOperations } from '../__test__/__mocks__/builtInOperationResponse';
import type { IHttpClient, QueryParameters } from '../httpClient';
import { LoggerService } from '../logger';
import type { ISearchService, SearchResult } from '../search';
import * as ClientOperationsData from './operations';
import type {
  BuiltInOperation,
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  SomeKindOfAzureOperationDiscovery,
} from '@microsoft-logic-apps/utils';
import { ArgumentException, connectorsSearchResultsMock, MockSearchOperations } from '@microsoft-logic-apps/utils';

interface ContinuationTokenResponse<T> {
  // danielle to move
  value: T;
  nextLink: string;
}

type AzureOperationsFetchResponse = ContinuationTokenResponse<DiscoveryOperation<SomeKindOfAzureOperationDiscovery>[]>;
type DiscoveryOpArray = DiscoveryOperation<DiscoveryResultTypes>[];

interface StandardSearchServiceArgs {
  apiVersion: string;
  baseUrl: string;
  apiHubServiceDetails: {
    apiVersion: string;
    subscriptionId: string;
    location: string;
  };
  httpClient: IHttpClient;
  showStatefulOperations?: boolean;
  isDev?: boolean;
}

export class StandardSearchService implements ISearchService {
  private _isDev = false; // TODO: Find a better way to do this, can't use process.env.NODE_ENV here

  constructor(public readonly options: StandardSearchServiceArgs) {
    const { apiHubServiceDetails, apiVersion, baseUrl, isDev } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!apiHubServiceDetails) {
      throw new ArgumentException('apiHubServiceDetails required for workflow app');
    }
    this._isDev = isDev || false;
  }

  search = (_term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchOperations: MockSearchOperations,
    };

    return Promise.resolve(result);
  };

  public preloadOperations = async (): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> => {
    return this.getAllOperations();
  };

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return [...(await this.getAllBuiltInOperations()), ...(await this.getAllAzureOperations())];
  }

  // TODO - Need to add extra filtering for trigger/action
  private async getAllBuiltInOperations(): Promise<DiscoveryOpArray> {
    if (this._isDev) {
      return Promise.resolve([...almostAllBuiltInOperations]);
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

  private async getAzureResourceByPage(uri: string, queryParams?: any, pageNumber = 0): Promise<{ value: any[]; hasMore: boolean }> {
    if (this._isDev) return { value: [], hasMore: false };

    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this.options;

    const pageSize = 250; // This is the number of results that can be returned in a single call
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $top: pageSize.toString(),
      $skiptoken: (pageNumber * pageSize).toString(),
      ...queryParams,
    };

    const { nextLink, value } = await httpClient.get<ContinuationTokenResponse<Connector[]>>({ uri, queryParameters });
    return { value, hasMore: !!nextLink };
  }

  private async batchAzureResourceRequests(uri: string, queryParams?: any): Promise<any[]> {
    const batchSize = 50; // Number of calls to make in parallel

    const output: any[] = [];
    let batchIteration = 0;
    let continueFetching = true;

    while (continueFetching) {
      await Promise.all(
        Array.from(Array(batchSize).keys()).map(async (index) => {
          const pageNum = batchIteration * batchSize + index;
          const { value, hasMore } = await this.getAzureResourceByPage(uri, queryParams, pageNum);
          output.push(...value);
          if (index === batchSize - 1) {
            continueFetching = hasMore;
          }
        })
      );
      batchIteration++;
    }

    return output;
  }

  private async getAllAzureOperations(): Promise<DiscoveryOpArray> {
    const traceId = LoggerService().startTrace({
      name: 'Get All Azure Operations',
      action: 'getAllAzureOperations',
      source: 'connection.ts',
    });

    const {
      apiHubServiceDetails: { location, subscriptionId },
    } = this.options;
    if (this._isDev) return Promise.resolve(azureOperationsResponse);

    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
    const queryParameters: QueryParameters = {
      $filter: "type eq 'Microsoft.Web/locations/managedApis/apiOperations' and properties/integrationServiceEnvironmentResourceId eq null",
    };

    const operations = await this.batchAzureResourceRequests(uri, queryParameters);

    LoggerService().endTrace(traceId);
    return operations;
  }

  async getAllConnectors(): Promise<Connector[]> {
    const allBuiltInConnectorsPromise = this.getAllBuiltInConnectors();
    const allAzureConnectorsPromise = this.getAllAzureConnectors();
    return Promise.all([allBuiltInConnectorsPromise, allAzureConnectorsPromise]).then((values) => {
      const builtInResults = values[0];
      const azureResults = values[1];
      // danielle possibly tag built in vs azure
      return [...builtInResults, ...azureResults];
    });
  }

  // TODO - Need to add extra filtering for trigger/action
  private async getAllBuiltInConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      return Promise.resolve(connectorsSearchResultsMock);
    }
    const { apiVersion, baseUrl, httpClient, showStatefulOperations } = this.options;
    const uri = `${baseUrl}/operationGroups`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
    };
    const response = await httpClient.get<{ value: Connector[] }>({ uri, queryParameters });
    return [...response.value, ...getClientBuiltInConnectors(showStatefulOperations)];
  }

  private async getAllAzureConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      const connectors = AzureConnectorMock.value as Connector[];
      const formattedConnectors = this.moveGeneralInformation(connectors);
      return Promise.resolve(formattedConnectors);
    } else {
      const {
        apiHubServiceDetails: { location, subscriptionId },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis`;
      const responseArray = await this.batchAzureResourceRequests(uri);
      return this.moveGeneralInformation(responseArray);
    }
  }

  private moveGeneralInformation(connectors: Connector[]): Connector[] {
    connectors.forEach((connector) => {
      if (connector.properties.generalInformation) {
        // eslint-disable-next-line no-param-reassign
        connector.properties.displayName = connector.properties.generalInformation.displayName ?? '';
        // eslint-disable-next-line no-param-reassign
        connector.properties.iconUri = connector.properties.generalInformation.iconUrl ?? '';
      }
    });
    return connectors;
  }
}

function getClientBuiltInOperations(showStatefulOperations = false): DiscoveryOperation<BuiltInOperation>[] {
  const allOperations: DiscoveryOperation<BuiltInOperation>[] = [
    ClientOperationsData.requestOperation,
    ClientOperationsData.responseOperation,
    ClientOperationsData.parseJsonOperation,
    ClientOperationsData.csvTableOperation,
    ClientOperationsData.htmlTableOperation,
    ClientOperationsData.queryOperation,
    ClientOperationsData.selectOperation,
    ClientOperationsData.joinOperation,
    ClientOperationsData.scopeOperation,
    ClientOperationsData.terminateOperation,
    ClientOperationsData.ifOperation,
    ClientOperationsData.foreachOperation,
    ClientOperationsData.untilOperation,
    ClientOperationsData.switchOperation,
    ClientOperationsData.recurrenceOperation,
    ClientOperationsData.delayOperation,
    ClientOperationsData.delayUntilOperation,
    ClientOperationsData.httpActionOperation,
    ClientOperationsData.httpTriggerOperation,
    ClientOperationsData.httpWebhookActionOperation,
    ClientOperationsData.httpWebhookTriggerOperation,
    ClientOperationsData.initializeVariableOperation,
    ClientOperationsData.setVariableOperation,
    ClientOperationsData.incrementVariableOperation,
    ClientOperationsData.decrementVariableOperation,
    ClientOperationsData.appendStringVariableOperation,
    ClientOperationsData.appendArrayVariableOperation,
    ClientOperationsData.convertTimezoneOperation,
    ClientOperationsData.addToTimeOperation,
    ClientOperationsData.subtractFromTimeOperation,
    ClientOperationsData.getFutureTimeOperation,
    ClientOperationsData.getPastTimeOperation,
    ClientOperationsData.currentTimeOperation,
  ];
  return allOperations.filter((operation) => filterStateful(operation, showStatefulOperations));
}

function getClientBuiltInConnectors(showStatefulOperations = false): Connector[] {
  const allConnectors: any[] = [
    ClientOperationsData.requestGroup,
    ClientOperationsData.httpGroup,
    ClientOperationsData.variableGroup,
    ClientOperationsData.controlGroup,
    ClientOperationsData.scheduleGroup,
    ClientOperationsData.dateTimeGroup,
  ];
  return allConnectors.filter((connector) => filterStateful(connector, showStatefulOperations));
}

function filterStateful(operation: DiscoveryOperation<BuiltInOperation> | Connector, showStateful: boolean): boolean {
  return showStateful
    ? !operation.properties.capabilities ||
        operation.properties.capabilities.includes('Stateful') ||
        !operation.properties.capabilities.includes('Stateless')
    : !operation.properties.capabilities ||
        operation.properties.capabilities.includes('Stateless') ||
        !operation.properties.capabilities.includes('Stateful');
}

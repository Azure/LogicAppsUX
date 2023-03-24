import { AzureConnectorMock } from '../__test__/__mocks__/azureConnectorResponse';
import { azureOperationsResponse } from '../__test__/__mocks__/azureOperationResponse';
import type { IHttpClient, QueryParameters } from '../httpClient';
import { LoggerService } from '../logger';
import type { ISearchService } from '../search';
import * as ClientOperationsData from '../standard/operations';
import type {
  ArmResource,
  BuiltInOperation,
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  DiscoveryWorkflow,
  DiscoveryWorkflowTrigger,
  SomeKindOfAzureOperationDiscovery,
} from '@microsoft/utils-logic-apps';
import { equals, ArgumentException } from '@microsoft/utils-logic-apps';

export interface ContinuationTokenResponse<T> {
  // danielle to move
  value: T;
  nextLink: string;
}

export type AzureOperationsFetchResponse = ContinuationTokenResponse<DiscoveryOperation<SomeKindOfAzureOperationDiscovery>[]>;
export type DiscoveryOpArray = DiscoveryOperation<DiscoveryResultTypes>[];

export interface BaseSearchServiceOptions {
  [x: string]: any;
  apiVersion: string;
  baseUrl: string;
  apiHubServiceDetails: {
    [x: string]: any;
    apiVersion: string;
    subscriptionId: string;
    location: string;
  };
  httpClient: IHttpClient;
  showStatefulOperations?: boolean;
  isDev?: boolean;
}

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

export abstract class BaseSearchService implements ISearchService {
  _isDev = false; // TODO: Find a better way to do this, can't use process.env.NODE_ENV here

  constructor(public readonly options: BaseSearchServiceOptions) {
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

  public abstract getAllOperations(): Promise<DiscoveryOpArray>;

  // Paginated Preload

  public abstract getCustomConnectorsByNextlink(prevNextlink?: string): Promise<{ nextlink?: string; value: Connector[] }>;
  public abstract getBuiltInConnectors(): Promise<Connector[]>;

  public abstract getCustomOperationsByPage(page: number): Promise<DiscoveryOpArray>;
  public abstract getBuiltInOperations(): Promise<DiscoveryOpArray>;

  async getAzureResourceByPage(uri: string, queryParams?: any, pageNumber = 0): Promise<{ value: any[]; hasMore: boolean }> {
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

    try {
      const { nextLink, value = [] } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri, queryParameters });
      return { value, hasMore: !!nextLink || value.length !== 0 };
    } catch (error) {
      return { value: [], hasMore: false };
    }
  }

  async batchAzureResourceRequests(uri: string, queryParams?: any): Promise<any[]> {
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

  async pagedBatchAzureResourceRequests(batchIteration: number, uri: string, queryParams?: any, batchSize = 50): Promise<any[]> {
    const output: any[] = [];
    await Promise.all(
      Array.from(Array(batchSize).keys()).map(async (index) => {
        const pageNum = batchIteration * batchSize + index;
        const { value } = await this.getAzureResourceByPage(uri, queryParams, pageNum);
        output.push(...value);
      })
    );
    return output;
  }

  async getAzureResourceRecursive(uri: string, queryParams: any): Promise<any[]> {
    const { httpClient } = this.options;

    const requestPage = async (uri: string, value: any[], queryParameters?: any): Promise<any> => {
      try {
        const { nextLink, value: newValue } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri, queryParameters });
        value.push(...newValue);
        if (nextLink && newValue.length !== 0) return await requestPage(nextLink, value);
        return value;
      } catch (error) {
        return value;
      }
    };

    return requestPage(uri, [], queryParams);
  }

  async getAllAzureOperations(): Promise<DiscoveryOpArray> {
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

  async getAzureOperationsByPage(page: number): Promise<DiscoveryOpArray> {
    const {
      apiHubServiceDetails: { location, subscriptionId },
    } = this.options;
    if (this._isDev) {
      if (page === 0) return Promise.resolve(azureOperationsResponse);
      else return Promise.resolve([]);
    }

    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
    const queryParameters: QueryParameters = {
      $filter: "type eq 'Microsoft.Web/locations/managedApis/apiOperations' and properties/integrationServiceEnvironmentResourceId eq null",
    };

    const values = await this.pagedBatchAzureResourceRequests(page, uri, queryParameters);
    return values;
  }

  abstract getAllConnectors(): Promise<Connector[]>;

  async getAllAzureConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      const connectors = AzureConnectorMock.value as Connector[];
      const formattedConnectors = this.moveGeneralInformation(connectors);
      return Promise.resolve(formattedConnectors);
    }

    const {
      apiHubServiceDetails: { location, subscriptionId },
    } = this.options;
    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis`;
    const responseArray = await this.batchAzureResourceRequests(uri);
    return this.moveGeneralInformation(responseArray);
  }

  async getAzureConnectorsByPage(page: number): Promise<Connector[]> {
    if (this._isDev) {
      if (page === 0) {
        const connectors = AzureConnectorMock.value as Connector[];
        const formattedConnectors = this.moveGeneralInformation(connectors);
        return Promise.resolve(formattedConnectors);
      }
      return Promise.resolve([]);
    }

    const {
      apiHubServiceDetails: { location, subscriptionId },
    } = this.options;
    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis`;
    const responseArray = await this.pagedBatchAzureResourceRequests(page, uri, undefined, 5);
    return this.moveGeneralInformation(responseArray);
  }

  async getAllCustomApiOperations(): Promise<DiscoveryOpArray> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `properties/trigger eq null and type eq 'Microsoft.Web/customApis/apiOperations' and ${ISE_RESOURCE_ID} eq null`,
      };
      const response = await this.batchAzureResourceRequests(uri, queryParameters);
      return response;
    } catch (error) {
      return [];
    }
  }

  async getAllCustomApiConnectors(): Promise<Connector[]> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `${ISE_RESOURCE_ID} eq null`,
      };
      const response = await this.batchAzureResourceRequests(uri, queryParameters);
      const locationFilteredResponse = response.filter((connector: any) => equals(connector.location, location));
      return locationFilteredResponse;
    } catch (error) {
      return [];
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

  private async getWorkflows($filter: string): Promise<any[]> {
    const {
      apiHubServiceDetails: { apiVersion, subscriptionId, location },
    } = this.options;
    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Logic/workflows`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      ...($filter ? { $filter } : {}),
    };
    const response = await this.getAzureResourceRecursive(uri, queryParameters);
    return response.filter((workflow: any) => workflow.location === location);
  }

  public async getRequestWorkflows(): Promise<ArmResource<DiscoveryWorkflow>[]> {
    return this.getWorkflows(`contains(Trigger, 'Request') and (${ISE_RESOURCE_ID} eq null)`);
  }

  public async getBatchWorkflows(): Promise<ArmResource<DiscoveryWorkflow>[]> {
    return this.getWorkflows(`contains(Trigger, 'Batch') and (${ISE_RESOURCE_ID} eq null)`);
  }

  public async getWorkflowTriggers(workflowId: string): Promise<ArmResource<DiscoveryWorkflowTrigger>[]> {
    const {
      httpClient,
      apiHubServiceDetails: { apiVersion },
    } = this.options;
    const uri = `${workflowId}/triggers`;
    const queryParameters: QueryParameters = { 'api-version': apiVersion };
    const response = await httpClient.get<any>({ uri, queryParameters });
    return response?.value ?? [];
  }
}

export function getClientBuiltInOperations(showStatefulOperations = false): DiscoveryOperation<BuiltInOperation>[] {
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

export function getClientBuiltInConnectors(showStatefulOperations = false): Connector[] {
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

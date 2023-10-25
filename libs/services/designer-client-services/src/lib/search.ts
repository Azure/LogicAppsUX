import type {
  ArmResource,
  Connector,
  DiscoveryOperation,
  DiscoveryResultTypes,
  DiscoveryWorkflow,
  DiscoveryWorkflowTrigger,
} from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export type OperationRuntimeCategory = {
  key: string;
  text: string;
};

export interface ISearchService {
  getAllConnectors(): Promise<Connector[]>;
  getAzureConnectorsByPage(page: number): Promise<Connector[]>;
  getCustomConnectorsByNextlink(nextlink?: string): Promise<{ nextlink?: string; value: Connector[] }>;
  getBuiltInConnectors(): Promise<Connector[]>;
  getAllOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getRequestWorkflows?(): Promise<ArmResource<DiscoveryWorkflow>[]>;
  getBatchWorkflows?(): Promise<ArmResource<DiscoveryWorkflow>[]>;
  getWorkflowTriggers?(workflowId: string): Promise<ArmResource<DiscoveryWorkflowTrigger>[]>;
  getAzureOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getCustomOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getBuiltInOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  searchOperations?(searchTerm: string, actionType?: string, runtimeFilter?: string): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getRuntimeCategories?(): OperationRuntimeCategory[];
  filterConnector?(connector: Connector, runtimeFilter: string): boolean;
  getOperationById?(operationId: string): Promise<DiscoveryOperation<DiscoveryResultTypes> | undefined>;
  getOperationsByConnector?(connectorId: string, actionType?: string): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
}

let service: ISearchService;

export const InitSearchService = (searchService: ISearchService): void => {
  service = searchService;
};

export const SearchService = (): ISearchService => {
  // Danielle: we need this for every service, how do we extract?
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'SearchService needs to be initialized before using');
  }

  return service;
};

export interface SearchResult {
  searchOperations: DiscoveryOperation<DiscoveryResultTypes>[];
}

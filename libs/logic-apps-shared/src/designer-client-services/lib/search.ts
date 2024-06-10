import type {
  Connector,
  DiscoveryOpArray,
  ArmResource,
  DiscoveryWorkflow,
  DiscoveryWorkflowTrigger,
  DiscoveryOperation,
  DiscoveryResultTypes,
} from '../../utils/src';
import { AssertionException, AssertionErrorCode } from '../../utils/src';

export type OperationRuntimeCategory = {
  key: string;
  text: string;
};

export interface ISearchService {
  getAllConnectors(): Promise<Connector[]>;
  getAzureConnectorsByPage(page: number): Promise<Connector[]>;
  getCustomConnectorsByNextlink(nextlink?: string): Promise<{ nextlink?: string; value: Connector[] }>;
  getBuiltInConnectors(): Promise<Connector[]>;
  getAllOperations(): Promise<DiscoveryOpArray>;
  getRequestWorkflows?(): Promise<ArmResource<DiscoveryWorkflow>[]>;
  getBatchWorkflows?(): Promise<ArmResource<DiscoveryWorkflow>[]>;
  getWorkflowTriggers?(workflowId: string): Promise<ArmResource<DiscoveryWorkflowTrigger>[]>;
  getAzureOperationsByPage(page: number): Promise<DiscoveryOpArray>;
  getCustomOperationsByPage(page: number): Promise<DiscoveryOpArray>;
  getActiveSearchOperations?(searchTerm: string, actionType?: string, runtimeFilter?: string): Promise<DiscoveryOpArray>;
  getBuiltInOperations(): Promise<DiscoveryOpArray>;
  searchOperations?(searchTerm: string, actionType?: string, runtimeFilter?: string): Promise<DiscoveryOpArray>;
  getRuntimeCategories?(): OperationRuntimeCategory[];
  filterConnector?(connector: Connector, runtimeFilter: string): boolean;
  getOperationById?(operationId: string): Promise<DiscoveryOperation<DiscoveryResultTypes> | undefined>;
  getOperationsByConnector?(connectorId: string, actionType?: string): Promise<DiscoveryOpArray>;
  sortConnectors?(connectors: Connector[]): Connector[];
}

let service: ISearchService;

export const InitSearchService = (searchService: ISearchService): void => {
  service = searchService;
};

export const SearchService = (): ISearchService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'SearchService needs to be initialized before using');
  }

  return service;
};

export interface SearchResult {
  searchOperations: DiscoveryOpArray;
}

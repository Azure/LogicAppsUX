import type { Connector, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface ISearchService {
  search(term: string): Promise<SearchResult>;
  preloadOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getAllConnectors(): Promise<Connector[]>;
  getAllOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getRequestWorkflows(): Promise<any>;
  getBatchWorkflows(): Promise<any>;
  getWorkflowTriggers(workflowId: string): Promise<any[]>;
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

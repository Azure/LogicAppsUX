import type { Connector, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface ISearchService {
  search(term: string): Promise<SearchResult>;
  getAllConnectors(): Promise<Connector[]>;
  getAzureConnectorsByPage(page: number): Promise<Connector[]>;
  getCustomConnectorsByNextlink(nextlink?: string): Promise<{ nextlink?: string; value: Connector[] }>;
  getBuiltInConnectors(): Promise<Connector[]>;
  getAllOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getAzureOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getCustomOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
  getBuiltInOperations(): Promise<DiscoveryOperation<DiscoveryResultTypes>[]>;
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

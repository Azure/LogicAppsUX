import { AssertionErrorCode, AssertionException } from './common/exceptions/assertion';
import type { Connector } from './common/models/connector';
import type { Operation } from './common/models/operationmanifest';

export interface ISearchService {
  search(term: string): Promise<SearchResult>;
}

let service: ISearchService;

export const InitSearchService = (searchService: ISearchService): void => {
  service = searchService;
};

export const SearchService = (): ISearchService => {
  // Danielle: we need this for every service, how do we extract?
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'SearchService need to be initialized before using');
  }

  return service;
};

export interface SearchResult {
  searchConnectors: Connector[];
  searchOperations: Operation[];
}

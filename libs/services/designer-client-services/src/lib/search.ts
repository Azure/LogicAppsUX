import type { Connector } from '@microsoft-logic-apps/utils';
import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

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

interface Operation {
  // placeholder
  data: string;
}

export interface SearchResult {
  searchConnectors: Connector[];
  searchOperations: Operation[];
}

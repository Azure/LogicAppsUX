import { ConnectorsMock } from '../mocks/connectors';
import type { SearchResult } from '../search';

interface ISearchService {
  search(term: string): Promise<SearchResult>;
}

export class StandardSearchService implements ISearchService {
  search = (term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchConnectors: ConnectorsMock,
      searchOperations: [],
    };
    return new Promise((resolve): SearchResult => result);
  };
}

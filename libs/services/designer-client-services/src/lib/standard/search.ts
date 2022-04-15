import { ConnectorsMock } from '../mocks/connectors';
import type { ISearchService, SearchResult } from '../search';

export class StandardSearchService implements ISearchService {
  search = (term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchConnectors: ConnectorsMock,
      searchOperations: [],
    };
    return new Promise((resolve): SearchResult => result);
  };
}

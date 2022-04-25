import type { ISearchService, SearchResult } from '../search';
import { ConnectorsMock, MockSearchOperations } from '@microsoft-logic-apps/utils';

export class StandardSearchService implements ISearchService {
  search = (term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchConnectors: ConnectorsMock,
      searchOperations: MockSearchOperations,
    };

    return Promise.resolve(result);
  };
}

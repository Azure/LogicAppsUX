import type { ISearchService, SearchResult } from '../search';
import { ConnectorsMock, MockSearchOperations } from '@microsoft-logic-apps/utils';

export class StandardSearchService implements ISearchService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  search = (term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchConnectors: ConnectorsMock,
      searchOperations: MockSearchOperations,
    };

    return Promise.resolve(result);
  };
}

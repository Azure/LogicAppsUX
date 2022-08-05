import { ConnectionService } from '../connection';
import type { ISearchService, SearchResult } from '../search';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';

export class StandardSearchService implements ISearchService {
  search = (_term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchOperations: MockSearchOperations,
    };

    return Promise.resolve(result);
  };

  public preloadOperations = async (): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> => {
    const connectionService = ConnectionService();
    return connectionService.getAllOperations();
  };
}

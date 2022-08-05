// import { ConnectionService } from '../connection';
import { almostAllBuiltInOperations } from '../__test__/__mocks__/builtInOperationResponse';
import type { ISearchService, SearchResult } from '../search';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';

export class StandardSearchService implements ISearchService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  search = (term: string): Promise<SearchResult> => {
    const result: SearchResult = {
      searchOperations: MockSearchOperations,
    };

    return Promise.resolve(result);
  };

  preloadOperations = (): DiscoveryOperation<DiscoveryResultTypes>[] => {
    // const connectionService = ConnectionService();
    return [...almostAllBuiltInOperations];
  };
}

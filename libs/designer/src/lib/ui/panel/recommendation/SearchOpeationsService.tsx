import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes, ISearchService } from '@microsoft/logic-apps-shared';
import { isBuiltInConnector, isCustomConnector } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';

export class DefaultSearchOperationsService implements Pick<ISearchService, 'searchOperations'> {
  constructor(
    private allOperations: DiscoveryOpArray,
    private showParseDocWithMetadata: boolean
  ) {}

  private compareItems(
    a: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>,
    b: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>
  ): number {
    // isCustomApi can be undefined since it is up to the host to pass it; when
    // undefined we default to false so that the custom checks are not true/executed
    const isACustom: boolean = a.item.properties.isCustomApi || false;
    const isBCustom: boolean = b.item.properties.isCustomApi || false;
    if (isACustom && !isBCustom) {
      return 1;
    }
    if (!isACustom && isBCustom) {
      return -1;
    }
    if (a.score !== undefined && b.score !== undefined) {
      if (a.score < b.score) {
        return -1;
      }
      if (a.score > b.score) {
        return 1;
      }
    }
    // If a has no score and b does, put b first
    if (a.score === undefined && b.score !== undefined) {
      return 1;
    }
    // If b has no score and a does, put a first
    if (a.score !== undefined && b.score === undefined) {
      return -1;
    }
    return 0;
  }

  private searchOptions() {
    return {
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      keys: [
        {
          name: 'properties.summary', // Operation 'name'
          weight: 2.1,
        },
        {
          name: 'displayName', // Connector 'name'
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
            return operation.properties.api.displayName;
          },
          weight: 2,
        },
        {
          name: 'description', // Connector 'description'
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
            return operation.properties.api.description ?? '';
          },
          weight: 1.9,
        },
      ],
    };
  }

  public async searchOperations(
    searchTerm: string,
    actionType?: string,
    runtimeFilter?: string,
    additionalFilter?: (operation: DiscoveryOperation<DiscoveryResultTypes>) => boolean
  ): Promise<DiscoveryOpArray> {
    type FuseSearchResult = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>;

    if (!this.allOperations) {
      return [];
    }

    const showParseDocWithMetadata = this.showParseDocWithMetadata;

    const filterItems = (result: FuseSearchResult): boolean => {
      const { item } = result;

      if (!showParseDocWithMetadata && item.id === 'parsedocumentwithmetadata') {
        return false;
      }

      const api = item.properties.api;

      if (runtimeFilter) {
        if (runtimeFilter === 'inapp' && !isBuiltInConnector(api)) {
          return false;
        }
        if (runtimeFilter === 'custom' && !isCustomConnector(api)) {
          return false;
        }
        if (runtimeFilter === 'shared' && (isBuiltInConnector(api) || isCustomConnector(api))) {
          return false;
        }
      }

      if (actionType) {
        const isTrigger = item.properties?.trigger !== undefined;
        if (actionType.toLowerCase() === 'actions' && isTrigger) {
          return false;
        }
        if (actionType.toLowerCase() === 'triggers' && !isTrigger) {
          return false;
        }
      }

      if (additionalFilter && !additionalFilter(item)) {
        return false;
      }

      return true;
    };

    const fuse = new Fuse(this.allOperations, this.searchOptions());

    const results = fuse
      .search(searchTerm, { limit: 100 })
      .filter(filterItems)
      .sort(this.compareItems)
      .map((result) => result.item);

    return results;
  }
}

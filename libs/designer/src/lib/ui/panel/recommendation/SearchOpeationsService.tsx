import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { SearchService } from '@microsoft/logic-apps-shared';
import { isBuiltInConnector as isBuiltInConnectorUI, isCustomConnector as isCustomConnectorUI } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';

export class DefaultSearchOperationsService {
  constructor(
    private allOperations: DiscoveryOpArray,
    private showParseDocWithMetadata: boolean,
    private showACASession?: boolean
  ) {}

  // Comparison function for sorting Fuse results
  private compareItems(
    a: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>,
    b: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>
  ): number {
    const isACustom = a.item.properties.isCustomApi ?? false;
    const isBCustom = b.item.properties.isCustomApi ?? false;

    if (isACustom !== isBCustom) {
      return isACustom ? 1 : -1;
    }

    if (a.score !== undefined && b.score !== undefined) {
      return a.score < b.score ? -1 : a.score > b.score ? 1 : 0;
    }

    return a.score === undefined ? 1 : -1;
  }

  // Fuse search options configuration
  private searchOptions() {
    return {
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      keys: [
        { name: 'properties.summary', weight: 2.1 },
        {
          name: 'displayName',
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => operation.properties.api.displayName,
          weight: 2,
        },
        {
          name: 'description',
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => operation.properties.api.description ?? '',
          weight: 1.9,
        },
      ],
    };
  }

  // Search operation method with various filters
  public async searchOperations(
    searchTerm: string,
    actionType?: string,
    runtimeFilter?: string,
    additionalFilter?: (operation: DiscoveryOperation<DiscoveryResultTypes>) => boolean
  ): Promise<DiscoveryOpArray> {
    // Try backend fuzzy search first
    try {
      const backendResults = await SearchService().getFuzzySearchOperations?.(searchTerm, actionType);
      if (backendResults && backendResults.length > 0) {
        return this.applyClientSideFilters(backendResults, runtimeFilter, additionalFilter);
      }
    } catch (error) {
      console.warn('Backend fuzzy search failed, falling back to client-side search:', error);
    }

    // Fallback to client-side Fuse.js search
    if (!this.allOperations) {
      return [];
    }

    const filterItems = (result: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>): boolean => {
      const { item } = result;
      return this.applyItemFilters(item, runtimeFilter, actionType, additionalFilter);
    };

    const fuse = new Fuse(this.allOperations, this.searchOptions());
    return fuse
      .search(searchTerm, { limit: 100 })
      .filter(filterItems)
      .sort(this.compareItems)
      .map((result) => result.item);
  }

  // Helper method to apply client-side filters to backend results
  private applyClientSideFilters(
    operations: DiscoveryOpArray,
    runtimeFilter?: string,
    additionalFilter?: (operation: DiscoveryOperation<DiscoveryResultTypes>) => boolean
  ): DiscoveryOpArray {
    return operations.filter((operation) => this.applyItemFilters(operation, runtimeFilter, undefined, additionalFilter));
  }

  // Helper method to apply filters to individual items
  private applyItemFilters(
    item: DiscoveryOperation<DiscoveryResultTypes>,
    runtimeFilter?: string,
    actionType?: string,
    additionalFilter?: (operation: DiscoveryOperation<DiscoveryResultTypes>) => boolean
  ): boolean {
    const { api } = item.properties;

    // Skip if document with metadata should not be shown
    if (!this.showParseDocWithMetadata && item.id === 'parsedocumentwithmetadata') {
      return false;
    }

    if (!this.showACASession && api.id === '/serviceProviders/acasession') {
      return false;
    }

    // Apply runtime filters
    if (runtimeFilter) {
      if (
        (runtimeFilter === 'inapp' && !isBuiltInConnectorUI(api)) ||
        (runtimeFilter === 'custom' && !isCustomConnectorUI(api)) ||
        (runtimeFilter === 'shared' && (isBuiltInConnectorUI(api) || isCustomConnectorUI(api)))
      ) {
        return false;
      }
    }

    // Apply action type filters (actions vs triggers) - only if not already handled by backend
    if (actionType) {
      const isTrigger = item.properties?.trigger !== undefined;
      if ((actionType.toLowerCase() === 'actions' && isTrigger) || (actionType.toLowerCase() === 'triggers' && !isTrigger)) {
        return false;
      }
    }

    // Apply any additional filter provided
    return additionalFilter ? additionalFilter(item) : true;
  }
}

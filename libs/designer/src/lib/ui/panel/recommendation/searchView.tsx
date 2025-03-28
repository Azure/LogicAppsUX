import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import {
  SearchService,
  type ISearchService,
  type DiscoveryOpArray,
  type DiscoveryOperation,
  type DiscoveryResultTypes,
} from '@microsoft/logic-apps-shared';
import { SearchResultsGrid, isBuiltInConnector, isCustomConnector } from '@microsoft/designer-ui';
import { useDebouncedEffect } from '@react-hookz/web';
import Fuse from 'fuse.js';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';
import { useAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOpArray;
  isLoadingOperations?: boolean;
  groupByConnector: boolean;
  isLoading: boolean;
  filters: Record<string, string>;
  onOperationClick: (id: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
};

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector, isLoading, filters, onOperationClick, displayRuntimeInfo } = props;
  const isAgenticWorkflow = useAgenticWorkflow();
  const isRoot = useDiscoveryPanelRelationshipIds().graphId === 'root';

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<DiscoveryOpArray>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  useEffect(() => {
    if (searchTerm !== '') {
      setIsLoadingSearchResults(true);
    }
  }, [searchTerm]);

  const filterAgenticLoops = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>): boolean => {
      if ((!isAgenticWorkflow || !isRoot) && operation.type === 'Agent') {
        return false;
      }
      if (!isRoot && operation.id === 'initializevariable') {
        return false;
      }
      return true;
    },
    [isAgenticWorkflow, isRoot]
  );

  useDebouncedEffect(
    () => {
      const searchOperations = SearchService().searchOperations?.bind(SearchService());

      const searchResultsPromise = searchOperations
        ? searchOperations(searchTerm, filters['actionType'], filters['runtime'], filterAgenticLoops)
        : new DefaultSearchOperationsService(allOperations).searchOperations(
            searchTerm,
            filters['actionType'],
            filters['runtime'],
            filterAgenticLoops
          );

      searchResultsPromise.then((results) => {
        setSearchResults(results);
        setIsLoadingSearchResults(false);
      });
    },
    [searchTerm, allOperations, filters, filterAgenticLoops],
    200
  );

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  return (
    <SearchResultsGrid
      isLoadingSearch={isLoadingSearchResults}
      isLoadingMore={isLoading}
      searchTerm={searchTerm}
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults}
      groupByConnector={groupByConnector}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

class DefaultSearchOperationsService implements Pick<ISearchService, 'searchOperations'> {
  constructor(private allOperations: DiscoveryOpArray) {}

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

  public searchOperations(
    searchTerm: string,
    actionType?: string | undefined,
    runtimeFilter?: string | undefined,
    additionalFilter?: (operation: DiscoveryOperation<DiscoveryResultTypes>) => boolean
  ): Promise<DiscoveryOpArray> {
    type FuseSearchResult = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>;

    const filterItems = (searchResult: FuseSearchResult): boolean => {
      if (runtimeFilter) {
        if (runtimeFilter === 'inapp' && !isBuiltInConnector(searchResult.item.properties.api)) {
          return false;
        }
        if (runtimeFilter === 'custom' && !isCustomConnector(searchResult.item.properties.api)) {
          return false;
        }
        if (runtimeFilter === 'shared') {
          if (isBuiltInConnector(searchResult.item.properties.api) || isCustomConnector(searchResult.item.properties.api)) {
            return false;
          }
        }
      }

      if (actionType) {
        const isTrigger = searchResult.item.properties?.trigger !== undefined;
        if (actionType.toLowerCase() === 'actions' && isTrigger) {
          return false;
        }
        if (actionType.toLowerCase() === 'triggers' && !isTrigger) {
          return false;
        }
      }
      if (additionalFilter && !additionalFilter(searchResult.item)) {
        return false;
      }
      return true;
    };

    if (!this.allOperations) {
      return Promise.resolve([]);
    }

    const fuse = new Fuse(this.allOperations, this.searchOptions());
    return Promise.resolve(
      fuse
        .search(searchTerm, { limit: 200 })
        .filter(filterItems)
        .sort(this.compareItems)
        .map((result) => result.item)
    );
  }
}

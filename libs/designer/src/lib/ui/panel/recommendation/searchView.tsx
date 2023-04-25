import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { isCustomConnector, isBuiltInConnector } from '@microsoft/utils-logic-apps';
import { useDebouncedEffect } from '@react-hookz/web';
import Fuse from 'fuse.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  groupByConnector: boolean;
  isLoading: boolean;
  filters: Record<string, string>;
  onOperationClick: (id: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
};

type SearchResult = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>;
type SearchResults = SearchResult[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector, isLoading, filters, onOperationClick, displayRuntimeInfo } = props;

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<SearchResults>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  const filterItems = useCallback(
    (searchResult: SearchResult): boolean => {
      if (filters['runtime']) {
        if (filters['runtime'] === 'inapp' && !isBuiltInConnector(searchResult.item.properties.api.id)) return false;
        else if (filters['runtime'] === 'custom' && !isCustomConnector(searchResult.item.properties.api.id)) return false;
        else if (filters['runtime'] === 'shared')
          if (isBuiltInConnector(searchResult.item.properties.api.id) || isCustomConnector(searchResult.item.properties.api.id))
            return false;
      }

      if (filters['actionType']) {
        const isTrigger = searchResult.item.properties?.trigger !== undefined;
        if (filters['actionType'].toLowerCase() === 'actions' && isTrigger) return false;
        else if (filters['actionType'].toLowerCase() === 'triggers' && !isTrigger) return false;
      }

      return true;
    },
    [filters]
  );

  const searchOptions = useMemo(
    () => ({
      includeScore: true,
      threshold: 0.4,
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
    }),
    []
  );

  useEffect(() => {
    if (searchTerm !== '') setIsLoadingSearchResults(true);
  }, [searchTerm]);

  useDebouncedEffect(
    () => {
      if (!allOperations) return;
      const fuse = new Fuse(allOperations, searchOptions);
      setSearchResults(fuse.search(searchTerm, { limit: 200 }).filter(filterItems));
      setIsLoadingSearchResults(false);
    },
    [searchTerm, allOperations, filterItems, searchOptions],
    300
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
      operationSearchResults={searchResults.map((result) => result.item)}
      groupByConnector={groupByConnector}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

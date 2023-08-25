import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService2 } from '@microsoft/designer-client-services-logic-apps';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useDebouncedEffect } from '@react-hookz/web';
import React, { useEffect, useState } from 'react';
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

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector, isLoading, filters, onOperationClick, displayRuntimeInfo } = props;

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  useEffect(() => {
    if (searchTerm !== '') setIsLoadingSearchResults(true);
  }, [searchTerm]);

  useDebouncedEffect(
    () => {
      const searchSvc2 = SearchService2(allOperations);
      searchSvc2.searchOperations(searchTerm, filters['actionType'], filters['runtime']).then((results) => {
        setSearchResults(results);
        setIsLoadingSearchResults(false);
      });
    },
    [searchTerm, allOperations, filters],
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
      operationSearchResults={searchResults}
      groupByConnector={groupByConnector}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

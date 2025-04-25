import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService, type DiscoveryOpArray, type DiscoveryOperation, type DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import { useDebouncedEffect } from '@react-hookz/web';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';
import { useAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useShouldEnableParseDocumentWithMetadata } from './hooks';
import { DefaultSearchOperationsService } from './SearchOpeationsService';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOpArray;
  isLoadingOperations?: boolean;
  groupByConnector: boolean;
  setGroupByConnector: (groupedByConnector: boolean) => void;
  isLoading: boolean;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
  onOperationClick: (id: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
};

export const SearchView: React.FC<SearchViewProps> = ({
  searchTerm,
  allOperations,
  groupByConnector,
  setGroupByConnector,
  isLoading,
  filters,
  setFilters,
  onOperationClick,
  displayRuntimeInfo,
}) => {
  const isAgenticWorkflow = useAgenticWorkflow();
  const shouldEnableParseDocWithMetadata = useShouldEnableParseDocumentWithMetadata();
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
        : new DefaultSearchOperationsService(allOperations, shouldEnableParseDocWithMetadata ?? false).searchOperations(
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
    [searchTerm, allOperations, filters, filterAgenticLoops, shouldEnableParseDocWithMetadata],
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
      setGroupByConnector={setGroupByConnector}
      filters={filters}
      setFilters={setFilters}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

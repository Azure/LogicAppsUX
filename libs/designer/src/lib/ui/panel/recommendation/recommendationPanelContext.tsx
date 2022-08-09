import { useSelectedOperationGroupId } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { BrowseView } from './browseView';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationApi } from '@microsoft-logic-apps/utils';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { DesignerSearchBox, SearchResultsGrid, RecommendationPanel } from '@microsoft/designer-ui';
import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = React.useState('');

  const searchResponse = useQuery(['searchResult', searchTerm], () => getSearchResult(searchTerm), {
    enabled: !!searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const searchOperations = useMemo(() => searchResponse.data?.searchOperations ?? [], [searchResponse.data]);
  const selectedOperationGroupId: string = useSelectedOperationGroupId();
  const selectedOperationGroup: OperationApi | undefined = useMemo(
    () => searchOperations?.find((op) => op.properties.api.id === selectedOperationGroupId)?.properties.api,
    [searchOperations, selectedOperationGroupId]
  );
  const selectedSearchedOperations = useMemo(
    () => searchOperations.filter((op) => op.properties.api.id === selectedOperationGroupId),
    [searchOperations, selectedOperationGroupId]
  );

  const onOperationClick = (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    const apiId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
    dispatch(selectOperationGroupId(apiId));
  };

  return (
    <RecommendationPanel placeholder={''} {...props}>
      {selectedOperationGroup ? (
        <OperationGroupDetailView operationApi={selectedOperationGroup} selectedSearchedOperations={selectedSearchedOperations} />
      ) : (
        <>
          <DesignerSearchBox onSearch={setSearchTerm} />
          {searchTerm ? (
            <SearchResultsGrid onOperationClick={onOperationClick} operationSearchResults={searchOperations} />
          ) : (
            <BrowseView />
          )}
        </>
      )}
    </RecommendationPanel>
  );
};

import { useSelectedOperationGroupId } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { BrowseView } from './browseView';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationApi } from '@microsoft-logic-apps/utils';
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

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  const onOperationClick = (operationId: string) => {
    // TODO: dispatch action to add operation
    alert('Adding operation: ' + operationId);
  };

  return (
    <RecommendationPanel placeholder={''} {...props}>
      {selectedOperationGroup ? (
        <OperationGroupDetailView operationApi={selectedOperationGroup} selectedSearchedOperations={selectedSearchedOperations} />
      ) : (
        <>
          <DesignerSearchBox onSearch={setSearchTerm} />
          {searchTerm ? (
            <SearchResultsGrid
              onConnectorClick={onConnectorClick}
              onOperationClick={onOperationClick}
              operationSearchResults={searchOperations}
            />
          ) : (
            <BrowseView />
          )}
        </>
      )}
    </RecommendationPanel>
  );
};

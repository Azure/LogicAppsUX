import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import { BrowseView } from './browseView';
import { SearchView } from './searchView';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { RecommendationPanel } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const dispatch = useDispatch();

  const { childId, parentId, selectedNode } = useSelector((state: RootState) => {
    return state.panel;
  });

  const [searchTerm, setSearchTerm] = React.useState('');
  const search = (term: string) => {
    setSearchTerm(term);
  };

  const searchResponse = useQuery(['searchResult', { searchTerm }], () => getSearchResult(searchTerm), {
    enabled: !!searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const searchResults = searchResponse.data;

  const onOperationClick = (_typeId: string) => {
    const addPayload: AddNodePayload = {
      id: selectedNode,
      parentId: parentId,
      childId: childId,
      graphId: 'root',
    };
    dispatch(addNode(addPayload));
    dispatch(switchToOperationPanel(selectedNode));
    return;
  };

  return (
    <RecommendationPanel
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults?.searchOperations || []}
      placeholder={''}
      {...props}
      onSearch={search}
    >
      {searchTerm ? <SearchView searchTerm={searchTerm}></SearchView> : <BrowseView></BrowseView>}
    </RecommendationPanel>
  );
};

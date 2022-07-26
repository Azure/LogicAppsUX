import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

type SearchViewProps = {
  searchTerm: string;
};

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const dispatch = useDispatch();

  const { childId, parentId, selectedNode } = useSelector((state: RootState) => {
    return state.panel;
  });

  const searchResponse = useQuery(['searchResult', props.searchTerm], () => getSearchResult(props.searchTerm), {
    enabled: !!props.searchTerm,
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
    <SearchResultsGrid
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults?.searchOperations || []}
    ></SearchResultsGrid>
  );
};

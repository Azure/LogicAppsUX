import type { AddNodePayload } from '../../../core/state/workflowSlice';
import { addNode } from '../../../core/state/workflowSlice';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import { connectorsSearchResultsMock } from '@microsoft-logic-apps/utils';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { RecommendationPanel } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

const getBrowseResult = () => {
  const data = connectorsSearchResultsMock;
  return data;
};

export type RecommendationPanelContextProps = {
  parentId?: string;
  childId?: string;
} & CommonPanelProps;

export const RecommendationPanelContext = (props: RecommendationPanelContextProps) => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = React.useState('');
  const search = (term: string) => {
    setSearchTerm(term);
  };

  const searchResponse = useQuery(['searchResult', { searchTerm }], () => getSearchResult(searchTerm), {
    enabled: !!searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const browseResponse = useQuery(['browseResult'], () => getBrowseResult(), {
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });
  const searchResults = searchResponse.data;
  const browseResults = browseResponse.data;

  const onOperationClick = (id: string) => {
    const addPayload: AddNodePayload = {
      id,
      parentId: 'Initialize_variable', // Danielle fix
      graphId: 'root',
    };
    dispatch(addNode(addPayload));
    return;
  };

  return (
    <RecommendationPanel
      onOperationClick={onOperationClick}
      placeholder={''}
      operationSearchResults={searchResults?.searchOperations || []}
      connectorBrowse={browseResults || []}
      {...props}
      onSearch={search}
    ></RecommendationPanel>
  );
};

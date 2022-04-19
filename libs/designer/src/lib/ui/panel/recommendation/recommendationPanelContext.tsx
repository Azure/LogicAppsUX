import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import { ConnectorsMock } from '@microsoft-logic-apps/utils';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { RecommendationPanel } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

const getBrowseResult = () => {
  const data = ConnectorsMock;
  return data;
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
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

  return (
    <RecommendationPanel
      placeholder={''}
      operationSearchResults={searchResults ? searchResults.searchOperations : []}
      connectorBrowse={browseResults ? browseResults : []}
      {...props}
      onSearch={search}
    ></RecommendationPanel>
  );
};

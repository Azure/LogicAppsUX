import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import { RecommendationPanel } from '@microsoft/designer-ui';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import type { CommonPanelProps } from 'libs/designer-ui/src/lib/panel/panelUtil';
import React from 'react';
import { useQuery } from 'react-query';

const getSearchResult = (term: string) => {
  console.log('searching...');
  const searchService = SearchService();
  const data = searchService.search(term);
  console.log(data);
  return data;
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const search = (term: string) => {
    setSearchTerm(term);
  };

  const response = useQuery(['searchResult', { searchTerm }], () => getSearchResult(searchTerm), {
    enabled: !!searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });
  const data = response.data;
  const str = JSON.stringify(data ?? '');
  console.log('data: ' + str);

  return (
    <RecommendationPanel
      placeholder={''}
      operationSearchResults={data ? data.searchOperations : []}
      {...props}
      onSearch={search}
    ></RecommendationPanel>
  );
};

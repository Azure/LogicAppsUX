import { BrowseView } from './browseView';
import { SearchView } from './searchView';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { RecommendationPanel } from '@microsoft/designer-ui';
import React from 'react';

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const search = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <RecommendationPanel placeholder={''} {...props} onSearch={search}>
      {searchTerm ? <SearchView searchTerm={searchTerm}></SearchView> : <BrowseView></BrowseView>}
    </RecommendationPanel>
  );
};

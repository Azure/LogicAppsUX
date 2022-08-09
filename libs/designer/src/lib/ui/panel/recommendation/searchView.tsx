import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import React from 'react';

type SearchViewProps = {
  searchTerm: string;
};

// type SearchResults = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];

export const SearchView: React.FC<SearchViewProps> = (_props) => {
  // const rootState = useSelector((state: RootState) => state);
  // const { discoveryIds, selectedNode } = useSelector((state: RootState) => {
  //   return state.panel;
  // });

  const onOperationClick = (_operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    console.log('clicked');
  };

  return <SearchResultsGrid onOperationClick={onOperationClick} operationSearchResults={[]}></SearchResultsGrid>;
};

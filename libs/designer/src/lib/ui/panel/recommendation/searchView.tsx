import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

type SearchViewProps = {
  searchTerm: string;
};

type SearchResults = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  // const rootState = useSelector((state: RootState) => state);
  // const { discoveryIds, selectedNode } = useSelector((state: RootState) => {
  //   return state.panel;
  // });

  const [searchResults, setSearchResults] = useState<SearchResults>([]);

  const searchTerms = useQuery(
    ['allOperations'],
    () => {
      const searchService = SearchService();
      return searchService.preloadOperations();
    },
    {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
    }
  );

  useEffect(() => {
    const options = {
      includeScore: true,
      keys: ['properties.summary', 'properties.description'],
    };
    if (searchTerms.data) {
      const fuse = new Fuse(searchTerms.data, options);

      setSearchResults(fuse.search(props.searchTerm));
    }
  }, [props.searchTerm, searchTerms]);

  const onOperationClick = (_operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    console.log('clicked');
  };

  return <SearchResultsGrid onOperationClick={onOperationClick} operationSearchResults={searchResults}></SearchResultsGrid>;
};

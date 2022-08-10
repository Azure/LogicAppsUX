import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
};

type SearchResults = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const dispatch = useDispatch();

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

  const onOperationClick = (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    const apiId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
    dispatch(selectOperationGroupId(apiId));
  };

  return <SearchResultsGrid onOperationClick={onOperationClick} operationSearchResults={searchResults}></SearchResultsGrid>;
};

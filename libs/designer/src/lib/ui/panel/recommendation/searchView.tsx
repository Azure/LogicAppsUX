import type { RootState } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useDiscoveryIds } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
};

type SearchResults = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const dispatch = useDispatch();

  const rootState: RootState = useSelector((state: RootState) => state);
  const discoveryIds = useDiscoveryIds();

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

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  const onOperationClick = (id: string) => {
    const operation = searchResults.map((result) => result.item).find((o) => o.id === id);
    addOperation(operation, discoveryIds, id, dispatch, rootState);
  };

  return (
    <SearchResultsGrid
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults.map((result) => result.item)}
    />
  );
};

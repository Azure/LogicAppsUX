import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useDiscoveryIds } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  groupByConnector: boolean;
};

type SearchResults = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector } = props;

  const dispatch = useDispatch<AppDispatch>();

  const discoveryIds = useDiscoveryIds();

  const [searchResults, setSearchResults] = useState<SearchResults>([]);

  useEffect(() => {
    if (!allOperations) return;
    const options = {
      includeScore: true,
      keys: ['properties.summary', 'properties.description'],
    };
    if (allOperations) {
      const fuse = new Fuse(allOperations, options);
      setSearchResults(fuse.search(searchTerm));
    }
  }, [searchTerm, allOperations]);

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  const onOperationClick = (id: string) => {
    const operation = searchResults.map((result) => result.item).find((o: any) => o.id === id);
    dispatch(addOperation({ operation, discoveryIds, nodeId: id }));
  };

  return (
    <SearchResultsGrid
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults.map((result) => result.item)}
      groupByConnector={groupByConnector}
    />
  );
};

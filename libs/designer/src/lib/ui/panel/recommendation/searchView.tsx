import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useDiscoveryIds } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  groupByConnector: boolean;
  isLoading: boolean;
};

type SearchResults = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector, isLoading } = props;
  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();

  const discoveryIds = useDiscoveryIds();

  const [searchResults, setSearchResults] = useState<SearchResults>([]);

  useEffect(() => {
    if (!allOperations) return;
    const options = {
      includeScore: true,
      keys: [
        {
          name: 'properties.summary', // Operation 'name'
          weight: 2,
        },
        {
          name: 'properties.description',
          weight: 1,
        },
        {
          name: 'properties.api.displayName', // Connector 'name'
          weight: 2,
        },
        {
          name: 'properties.api.description',
          weight: 1,
        },
      ],
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

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading operations...',
    description: 'Message to show under the loading icon when loading operationst',
  });

  if (isLoading)
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );

  return (
    <SearchResultsGrid
      searchTerm={searchTerm}
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults.map((result) => result.item)}
      groupByConnector={groupByConnector}
    />
  );
};

import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useRelationshipIds, useIsParallelBranch } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { isBuiltInConnector, guid } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  groupByConnector: boolean;
  isLoading: boolean;
  filters: Record<string, string>;
};
type SearchResult = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>;
type SearchResults = SearchResult[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector, isLoading, filters } = props;
  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();

  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();

  const [searchResults, setSearchResults] = useState<SearchResults>([]);

  const filterItems = useCallback(
    (searchResult: SearchResult): boolean => {
      let ret = true;
      if (filters['runtime']) {
        if (filters['runtime'] === 'inapp') {
          ret = isBuiltInConnector(searchResult.item.properties.api.id);
        } else {
          ret = !isBuiltInConnector(searchResult.item.properties.api.id);
        }
      }
      return ret;
    },
    [filters]
  );

  useEffect(() => {
    if (!allOperations) return;
    const options = {
      includeScore: true,
      threshold: 0.4,
      keys: [
        {
          name: 'properties.summary', // Operation 'name'
          weight: 2.1,
        },
        {
          name: 'displayName', // Connector 'name'
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
            return operation.properties.api.displayName;
          },
          weight: 2,
        },
        {
          name: 'description', // Connector 'description'
          getFn: (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
            return operation.properties.api.description ?? '';
          },
          weight: 1.9,
        },
      ],
    };
    if (allOperations) {
      const fuse = new Fuse(allOperations, options);
      const searchResults = fuse.search(searchTerm).filter(filterItems);
      setSearchResults(searchResults.slice(0, 199));
    }
  }, [searchTerm, allOperations, filterItems]);

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  const onOperationClick = (id: string) => {
    const operation = searchResults.map((result) => result.item).find((o: any) => o.id === id);
    const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
    dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch }));
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

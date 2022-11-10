import type { AppDispatch, RootState } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useRelationshipIds, useIsParallelBranch } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { isBuiltInConnector, guid } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import { useDebouncedEffect } from '@react-hookz/web';
import Fuse from 'fuse.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

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
  const isTrigger = useSelector((state: RootState) => state.panel.addingTrigger);

  const [searchResults, setSearchResults] = useState<SearchResults>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

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
      if (filters['actionType']) {
        if (filters['actionType'] === 'actions') {
          ret = ret ? !searchResult.item.properties.trigger : false;
        } else {
          ret = ret ? !!searchResult.item.properties.trigger : false;
        }
      }

      return ret;
    },
    [filters]
  );

  const searchOptions = useMemo(
    () => ({
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
    }),
    []
  );

  useEffect(() => {
    if (searchTerm !== '') setIsLoadingSearchResults(true);
  }, [searchTerm]);

  useDebouncedEffect(
    () => {
      if (!allOperations) return;
      const fuse = new Fuse(allOperations, searchOptions);
      setSearchResults(fuse.search(searchTerm, { limit: 200 }).filter(filterItems));
      setIsLoadingSearchResults(false);
    },
    [searchTerm, allOperations, filterItems, searchOptions],
    300
  );

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  const onOperationClick = (id: string) => {
    const operation = searchResults.map((result) => result.item).find((o: any) => o.id === id);
    const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
    dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
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
      isLoading={isLoadingSearchResults}
      searchTerm={searchTerm}
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults.map((result) => result.item)}
      groupByConnector={groupByConnector}
    />
  );
};

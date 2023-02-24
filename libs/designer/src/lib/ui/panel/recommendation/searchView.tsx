import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { isCustomConnector, isBuiltInConnector } from '@microsoft/utils-logic-apps';
import { useDebouncedEffect } from '@react-hookz/web';
import Fuse from 'fuse.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  groupByConnector: boolean;
  isLoading: boolean;
  filters: Record<string, string>;
  onOperationClick: (id: string) => void;
};

type SearchResult = Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>;
type SearchResults = SearchResult[];

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const { searchTerm, allOperations, groupByConnector, isLoading, filters, onOperationClick } = props;
  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<SearchResults>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  const filterItems = useCallback(
    (searchResult: SearchResult): boolean => {
      let ret = true;
      if (filters['runtime']) {
        if (filters['runtime'] === 'inapp') {
          ret = isBuiltInConnector(searchResult.item.properties.api.id);
        } else if (filters['runtime'] === 'custom') {
          ret = isCustomConnector(searchResult.item.properties.api.id);
        } else if (filters['runtime'] === 'shared') {
          ret = !isBuiltInConnector(searchResult.item.properties.api.id) && !isCustomConnector(searchResult.item.properties.api.id);
        }
      }
      if (filters['actionType']) {
        if (filters['actionType'] === 'actions') {
          ret = ret ? !searchResult.item.properties.trigger : false;
        } else if (filters['actionType'] === 'triggers') {
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

import NoResultsSvg from '../../../../../assets/search/noResults.svg';
import { AriaSearchResultsAlert } from '../../../../ariaSearchResults/ariaSearchResultsAlert';

import type { SearchResultSortOption } from '../../../types';
import { SearchResultSortOptions } from '../../../types';

import { OperationSearchGroup } from '../../operationSearchGroup';
import { List } from '@fluentui/react';
import { Spinner, Text } from '@fluentui/react-components';
import type { DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { RuntimeFilterTagList } from '../../runtimeFilterTagList';
import { BrowseGrid } from '../../browseResults';
import { getOperationCardDataFromOperation } from '../../helpers';
import { RecommendationPanelConstants } from '../../../../constants';
import { OperationActionDataFromOperation } from './helper';

export type SearchResultsGridProps = {
  isLoadingMore: boolean;
  isLoadingSearch: boolean;
  searchTerm: string;
  operationSearchResults: DiscoveryOpArray;
  onConnectorClick: (connectorId: string) => void;
  onOperationClick: (operationId: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
  groupByConnector: boolean;
  setGroupByConnector: (groupByConnector: boolean) => void;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
};

const maxOperationsToDisplay = RecommendationPanelConstants.SEARCH_VIEW.MAX_OPERATIONS_IN_SEARCH_GROUP;

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = ({
  isLoadingMore,
  isLoadingSearch,
  searchTerm,
  operationSearchResults,
  onConnectorClick,
  onOperationClick,
  groupByConnector,
  setGroupByConnector,
  displayRuntimeInfo,
  filters,
  setFilters,
}: SearchResultsGridProps) => {
  const intl = useIntl();

  const [resultsSorting, setResultsSorting] = React.useState<SearchResultSortOption>(SearchResultSortOptions.unsorted);

  const apiIds = useMemo(
    () => {
      const apiMap = new Map<string, { displayName?: string; name?: string }>();
      
      operationSearchResults
        .filter((r) => r !== undefined)
        .forEach((res) => {
          const api = res.properties.api;
          if (!apiMap.has(api.id)) {
            apiMap.set(api.id, { displayName: api.displayName, name: api.name });
          }
        });

      return Array.from(apiMap.keys()).sort((a, b) => {
        if (resultsSorting === SearchResultSortOptions.unsorted) {
          return 0;
        }

        const aApi = apiMap.get(a);
        const bApi = apiMap.get(b);
        const aName = aApi?.displayName ?? aApi?.name ?? a;
        const bName = bApi?.displayName ?? bApi?.name ?? b;

        return resultsSorting === SearchResultSortOptions.ascending ? aName.localeCompare(bName) : bName.localeCompare(aName);
      });
    },
    [operationSearchResults, resultsSorting]
  );

  const onRenderOperationGroup = React.useCallback(
    (apiId: string | undefined, _index: number | undefined) => {
      if (!apiId) {
        return;
      }
      const operations = operationSearchResults.filter((res) => res?.properties.api.id === apiId);
      if (operations.length === 0) {
        return null;
      }
      const api = operations[0].properties.api;
      return (
        <div style={{ marginBottom: '24px' }}>
          <OperationSearchGroup
            key={apiId}
            operationApi={api}
            operationActionsData={operations.map((operation) => getOperationCardDataFromOperation(operation))}
            onConnectorClick={onConnectorClick}
            onOperationClick={onOperationClick}
            maxOperationsToDisplay={maxOperationsToDisplay}
          />
        </div>
      );
    },
    [onConnectorClick, onOperationClick, operationSearchResults]
  );

  const sortedOperationsData = useMemo(() => {
    const operationCardData = operationSearchResults.map((operation) => OperationActionDataFromOperation(operation));

    if (resultsSorting !== SearchResultSortOptions.unsorted) {
      operationCardData.sort((a, b) =>
        resultsSorting === SearchResultSortOptions.ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      );
    }

    return operationCardData;
  }, [operationSearchResults, resultsSorting]);

  const noResultsText = intl.formatMessage(
    {
      defaultMessage: 'No results found for {searchTermBeingSearchedFor_DO_NOT_TRANSLATE}',
      id: '4hlqgK',
      description: 'Text to show when there are no search results',
    },
    {
      searchTermBeingSearchedFor_DO_NOT_TRANSLATE: <strong>{`"${searchTerm}"`}</strong>,
    }
  );

  const loadingText = intl.formatMessage({
    defaultMessage: 'Searching for results...',
    id: 'WyH1wr',
    description: 'Message to show when loading search results',
  });

  const connectorText = intl.formatMessage({
    defaultMessage: 'connector',
    id: 'lk/Qic',
    description: 'Connector text',
  });

  const actionText = intl.formatMessage({
    defaultMessage: 'action',
    id: 'D89UXR',
    description: 'Action text',
  });

  if (isLoadingSearch) {
    return (
      <div>
        <Spinner label={loadingText} size="extra-small" />
      </div>
    );
  }

  if (!isLoadingMore && !isLoadingSearch && operationSearchResults.length === 0) {
    return (
      <>
        <RuntimeFilterTagList
          filters={filters}
          setFilters={setFilters}
          isSearchResult={true}
          setGroupedByConnector={setGroupByConnector}
          groupedByConnector={groupByConnector}
          resultsSorting={resultsSorting}
          setResultsSorting={setResultsSorting}
        />
        <div className="msla-no-results-container">
          <img src={NoResultsSvg} alt={noResultsText?.toString()} />
          <Text role="alert">{noResultsText}</Text>
        </div>
      </>
    );
  }

  return (
    <div className="msla-result-list">
      <RuntimeFilterTagList
        filters={filters}
        setFilters={setFilters}
        isSearchResult={true}
        setGroupedByConnector={setGroupByConnector}
        groupedByConnector={groupByConnector}
        resultsSorting={resultsSorting}
        setResultsSorting={setResultsSorting}
      />
      {isLoadingMore && (
        <div style={{ marginBottom: '16px' }}>
          <Spinner label={loadingText} size="extra-small" aria-live="assertive" />
        </div>
      )}
      {groupByConnector ? (
        <>
          <AriaSearchResultsAlert resultCount={apiIds.length} resultDescription={connectorText} />
          <List items={apiIds} onRenderCell={onRenderOperationGroup} />
        </>
      ) : (
        <>
          <AriaSearchResultsAlert resultCount={operationSearchResults.length} resultDescription={actionText} />
          <BrowseGrid
            // Loading spinner is shown at top of search results view, so avoid showing it again
            isLoading={false}
            operationsData={sortedOperationsData}
            onOperationSelected={onOperationClick}
            showConnectorName={!groupByConnector}
            displayRuntimeInfo={displayRuntimeInfo}
          />
        </>
      )}
    </div>
  );
};

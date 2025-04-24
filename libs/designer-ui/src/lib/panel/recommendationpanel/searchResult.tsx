import NoResultsSvg from '../../../assets/search/noResults.svg';
import { AriaSearchResultsAlert } from '../../ariaSearchResults/ariaSearchResultsAlert';
import { isBuiltInConnector } from '../../connectors';
import { getConnectorCategoryString } from '../../utils';
import type { SearchResultSortOption } from '../types';
import { SearchResultSortOptions } from '../types';
import type { OperationActionData } from './interfaces';
import { OperationSearchGroup } from './operationSearchGroup';
import { List } from '@fluentui/react';
import { Spinner, Text } from '@fluentui/react-components';
import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes, OperationApi } from '@microsoft/logic-apps-shared';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { RuntimeFilterTagList } from './runtimeFilterTagList';
import { BrowseGrid } from './browseResults';
import { getOperationCardDataFromOperation } from './helpers';
import { RecommendationPanelConstants } from '../../constants';

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

  const getApiNameWithFallback = (api: OperationApi): string => {
    return api.name ?? api.id;
  };

  const apiNames = useMemo(
    () =>
      Array.from(
        new Set(
          operationSearchResults
            .filter((r) => r !== undefined)
            .map((res) => getApiNameWithFallback(res.properties.api))
            .sort((a, b) =>
              resultsSorting === SearchResultSortOptions.unsorted
                ? 0
                : resultsSorting === SearchResultSortOptions.ascending
                  ? a.localeCompare(b)
                  : b.localeCompare(a)
            )
        )
      ),
    [operationSearchResults, resultsSorting]
  );

  const onRenderOperationGroup = React.useCallback(
    (apiName: string | undefined, _index: number | undefined) => {
      if (!apiName) {
        return;
      }
      const operations = operationSearchResults.filter((res) => res?.properties.api.name === apiName);
      if (operations.length === 0) {
        return null;
      }
      const api = operations[0].properties.api;
      return (
        <div style={{ marginBottom: '24px' }}>
          <OperationSearchGroup
            key={apiName}
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
    defaultMessage: 'Loading more results...',
    id: 'AoalgS',
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
          <AriaSearchResultsAlert resultCount={apiNames.length} resultDescription={connectorText} />
          <List items={apiNames} onRenderCell={onRenderOperationGroup} />
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

export const OperationActionDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => ({
  id: operation.id,
  title: operation.properties.summary,
  description: operation.properties.description,
  brandColor: operation.properties.api.brandColor,
  iconUri: operation.properties.api.iconUri,
  connectorName: operation.properties.api.displayName,
  category: getConnectorCategoryString(operation.properties.api),
  isTrigger: !!operation.properties?.trigger,
  isBuiltIn: isBuiltInConnector(operation.properties.api),
  apiId: operation.properties.api.id,
  releaseStatus: operation.properties.annotation?.status,
});

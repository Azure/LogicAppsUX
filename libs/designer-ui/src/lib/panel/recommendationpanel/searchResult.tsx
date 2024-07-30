import NoResultsSvg from '../../../assets/search/noResults.svg';
import { AriaSearchResultsAlert } from '../../ariaSearchResults/ariaSearchResultsAlert';
import { isBuiltInConnector, isPremiumConnector } from '../../connectors';
import { getConnectorCategoryString } from '../../utils';
import type { OperationActionData } from './interfaces';
import { OperationSearchCard } from './operationSearchCard';
import { OperationSearchGroup } from './operationSearchGroup';
import { List } from '@fluentui/react';
import { Spinner, Text } from '@fluentui/react-components';
import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

export type SearchResultsGridProps = {
  isLoadingMore: boolean;
  isLoadingSearch: boolean;
  searchTerm: string;
  operationSearchResults: DiscoveryOpArray;
  onConnectorClick: (connectorId: string) => void;
  onOperationClick: (operationId: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
  groupByConnector?: boolean;
};

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = (props) => {
  const {
    isLoadingMore,
    isLoadingSearch,
    searchTerm,
    operationSearchResults,
    onConnectorClick,
    onOperationClick,
    groupByConnector,
    displayRuntimeInfo,
  } = props;

  const intl = useIntl();

  const apiIds = useMemo(
    () => Array.from(new Set(operationSearchResults.filter((r) => r !== undefined).map((res) => res.properties?.api?.id))),
    [operationSearchResults]
  );

  const onRenderOperationCell = React.useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes> | undefined, _index: number | undefined) => {
      if (!operation) {
        return;
      }
      return (
        <OperationSearchCard
          key={operation.id}
          operationActionData={OperationActionDataFromOperation(operation)}
          onClick={() => onOperationClick(operation.id, operation.properties.api.id)}
          showImage={true}
          style={{ marginBottom: '8px' }}
          displayRuntimeInfo={displayRuntimeInfo}
        />
      );
    },
    [onOperationClick, displayRuntimeInfo]
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
            operationActionsData={operations.map((operation) => OperationActionDataFromOperation(operation))}
            onConnectorClick={onConnectorClick}
            onOperationClick={onOperationClick}
            displayRuntimeInfo={displayRuntimeInfo}
          />
        </div>
      );
    },
    [onConnectorClick, onOperationClick, operationSearchResults, displayRuntimeInfo]
  );

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
      <div className="msla-no-results-container">
        <img src={NoResultsSvg} alt={noResultsText?.toString()} />
        <Text role="alert">{noResultsText}</Text>
      </div>
    );
  }

  return (
    <div className="msla-result-list">
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
          <List items={operationSearchResults} onRenderCell={onRenderOperationCell} />
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
  isPremium: isPremiumConnector(operation.properties.api),
  apiId: operation.properties.api.id,
  releaseStatus: operation.properties.annotation?.status,
});

import { getConnectorCategoryString } from '../../utils';
import type { OperationActionData } from './interfaces';
import { OperationSearchCard } from './operationSearchCard';
import { OperationSearchGroup } from './operationSearchGroup';
import { List, Spinner, SpinnerSize, Text } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

export type SearchResultsGridProps = {
  isLoading?: boolean;
  searchTerm: string;
  operationSearchResults: DiscoveryOperation<DiscoveryResultTypes>[];
  onConnectorClick: (connectorId: string) => void;
  onOperationClick: (operationId: string) => void;
  groupByConnector?: boolean;
};

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = (props) => {
  const { isLoading = false, searchTerm, operationSearchResults, onConnectorClick, onOperationClick, groupByConnector } = props;

  const intl = useIntl();

  const apiIds = useMemo(
    () => Array.from(new Set(operationSearchResults.filter((r) => r !== undefined).map((res) => res.properties?.api?.id))),
    [operationSearchResults]
  );

  const onRenderOperationCell = React.useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes> | undefined, _index: number | undefined) => {
      if (!operation) return;
      return (
        <OperationSearchCard
          key={operation.id}
          operationActionData={OperationActionDataFromOperation(operation)}
          onClick={() => onOperationClick(operation.id)}
          showImage={true}
          style={{ marginBottom: '8px' }}
        />
      );
    },
    [onOperationClick]
  );

  const onRenderOperationGroup = React.useCallback(
    (apiId: string | undefined, _index: number | undefined) => {
      if (!apiId) return;
      const operations = operationSearchResults.filter((res) => res?.properties.api.id === apiId);
      if (operations.length === 0) return null;
      const api = operations[0].properties.api;
      return (
        <div style={{ marginBottom: '24px' }}>
          <OperationSearchGroup
            key={apiId}
            operationApi={api}
            operationActionsData={operations.map((operation) => OperationActionDataFromOperation(operation))}
            onConnectorClick={onConnectorClick}
            onOperationClick={onOperationClick}
          />
        </div>
      );
    },
    [onConnectorClick, onOperationClick, operationSearchResults]
  );

  const noResultsText = intl.formatMessage(
    {
      defaultMessage: 'No results found for: {searchTerm}',
      description: 'Text to show when there are no search results',
    },
    {
      searchTerm: <strong>{`"${searchTerm}"`}</strong>,
    }
  );

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading search results...',
    description: 'Message to show under the loading icon when loading search results',
  });

  if (isLoading)
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );

  if (operationSearchResults.length === 0)
    return (
      <div className="msla-no-results-container">
        <Text>{noResultsText}</Text>
      </div>
    );

  return (
    <div className="msla-result-list">
      {groupByConnector ? (
        <List items={apiIds} onRenderCell={onRenderOperationGroup} />
      ) : (
        <List items={operationSearchResults} onRenderCell={onRenderOperationCell} />
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
  category: getConnectorCategoryString(operation.properties.api.id),
  isTrigger: !!operation.properties?.trigger,
});

import type { OperationActionData } from './interfaces';
import { OperationSearchCard } from './operationSearchCard';
import { OperationSearchGroup } from './operationSearchGroup';
import { List } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { labelCase, isBuiltInConnector } from '@microsoft-logic-apps/utils';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

export type SearchResultsGridProps = {
  operationSearchResults: DiscoveryOperation<DiscoveryResultTypes>[];
  onConnectorClick: (connectorId: string) => void;
  onOperationClick: (operationId: string) => void;
  groupByConnector?: boolean;
};

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = (props) => {
  const { operationSearchResults, onConnectorClick, onOperationClick, groupByConnector } = props;

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

  if (operationSearchResults.length === 0) {
    return <p>{'No Results'}</p>;
  }

  return (
    <div className="msla-result-list">
      {groupByConnector ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {apiIds.map((apiId) => {
            const operations = operationSearchResults.filter((res) => res?.properties.api.id === apiId);
            if (operations.length === 0) return null;
            const api = operations[0].properties.api;
            return (
              <OperationSearchGroup
                key={apiId}
                operationApi={api}
                operationActionsData={operations.map((operation) => OperationActionDataFromOperation(operation))}
                onConnectorClick={onConnectorClick}
                onOperationClick={onOperationClick}
              />
            );
          })}
        </div>
      ) : (
        <List items={operationSearchResults} onRenderCell={onRenderOperationCell} />
      )}
    </div>
  );
};

const OperationActionDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => ({
  id: operation.id,
  title: labelCase(operation.name),
  description: operation.properties.description,
  brandColor: operation.properties.api.brandColor,
  iconUri: operation.properties.api.iconUri,
  connectorName: operation.properties.api.displayName,
  category: isBuiltInConnector(operation.properties.api.id) ? 'Built-in' : 'Azure',
});

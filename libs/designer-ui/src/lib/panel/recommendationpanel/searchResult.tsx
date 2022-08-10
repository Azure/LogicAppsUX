import type { OperationActionData } from './interfaces';
import { OperationSearchCard } from './operationSearchCard';
import { OperationSearchGroup } from './operationSearchGroup';
import { List } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { labelCase, isBuiltInConnector } from '@microsoft-logic-apps/utils';
import type { PropsWithChildren } from 'react';
import React, { useMemo, useEffect } from 'react';

export type SearchResultsGridProps = {
  operationSearchResults: DiscoveryOperation<DiscoveryResultTypes>[];
  onOperationClick: (operation: DiscoveryOperation<DiscoveryResultTypes>) => void;
  groupByConnector?: boolean;
};

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = (props) => {
  const [operationSearchResults, setOperationSearchResults] = React.useState([...props.operationSearchResults]);

  useEffect(() => {
    setOperationSearchResults([...props.operationSearchResults]);
  }, [props.operationSearchResults]);

  console.log(operationSearchResults.map((res) => res.properties.api.id));
  console.log([...new Set(operationSearchResults.map((res) => res.properties.api.id))]);

  const apiIds = useMemo(() => Array.from(new Set(operationSearchResults.map((res) => res.properties.api.id))), [operationSearchResults]);

  const onRenderOperationCell = React.useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes> | undefined, _index: number | undefined) => {
      if (!operation) return;
      return (
        <OperationSearchCard
          key={operation.id}
          operationActionData={OperationActionDataFromOperation(operation)}
          onClick={() => props.onOperationClick(operation)}
          showImage={true}
          style={{ marginBottom: '4px' }}
        />
      );
    },
    [props]
  );

  return (
    <div className="msla-result-list">
      {props.groupByConnector ? (
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
                onClickOperation={(id: string) => alert('clicked search group tile: ' + id)}
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

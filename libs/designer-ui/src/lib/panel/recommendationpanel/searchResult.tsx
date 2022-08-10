import { OperationCard } from '../../actionsummarycard/card';
import { List } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import type Fuse from 'fuse.js';
import type { PropsWithChildren } from 'react';
import React from 'react';

export type SearchResultsGridProps = {
  operationSearchResults: Fuse.FuseResult<DiscoveryOperation<DiscoveryResultTypes>>[];
  onOperationClick: (operation: DiscoveryOperation<DiscoveryResultTypes>) => void;
};

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = (props) => {
  const [operationSearchResults, setOperationSearchResults] = React.useState([...props.operationSearchResults]);

  React.useEffect(() => {
    setOperationSearchResults([...props.operationSearchResults]);
  }, [props.operationSearchResults]);

  const onRenderOperationCell = React.useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes> | undefined, _index: number | undefined) => {
      if (!operation) return;
      const properties = operation.properties;

      return (
        <OperationCard
          category="Azure"
          onClick={() => props.onOperationClick(operation)}
          iconUrl={properties.api.iconUri}
          title={properties.description}
          key={operation.id}
          id={operation.id}
          connectorName={properties.api.displayName}
          subtitle={properties.description}
        />
      );
    },
    [props]
  );

  return (
    <div className="msla-result-list">
      <List items={operationSearchResults.map((result) => result.item)} onRenderCell={onRenderOperationCell}></List>
    </div>
  );
};

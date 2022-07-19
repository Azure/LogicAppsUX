import { OperationCard } from '../../actionsummarycard/card';
import { List } from '@fluentui/react';
import type { OperationSearchResult } from '@microsoft-logic-apps/utils';
import type { PropsWithChildren } from 'react';
import React from 'react';

export type SearchResultsGridProps = {
  operationSearchResults: OperationSearchResult[];
  onOperationClick: (id: string) => void;
};

export const SearchResultsGrid: React.FC<PropsWithChildren<SearchResultsGridProps>> = (props) => {
  const [operationSearchResults, setOperationSearchResults] = React.useState([...props.operationSearchResults]);

  React.useEffect(() => {
    setOperationSearchResults([...props.operationSearchResults]);
  }, [props.operationSearchResults]);

  const onRenderOperationCell = React.useCallback(
    (operation: OperationSearchResult | undefined, _index: number | undefined) => {
      if (!operation) return;
      const properties = operation.properties;

      return (
        <OperationCard
          onClick={props.onOperationClick}
          category={properties.category}
          iconUrl={properties.api.iconUri}
          title={properties.summary}
          key={operation.id}
          id={operation.id}
          connectorName={properties.api.displayName}
          subtitle={properties.description}
        ></OperationCard>
      );
    },
    [props.onOperationClick]
  );

  return (
    <div className="msla-result-list">
      <List items={operationSearchResults} onRenderCell={onRenderOperationCell}></List>
    </div>
  );
};

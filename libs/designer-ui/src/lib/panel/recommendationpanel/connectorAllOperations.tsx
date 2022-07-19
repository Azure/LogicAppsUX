import { List } from '@fluentui/react';
import type { OperationDiscoveryResult } from '@microsoft-logic-apps/utils';
import React from 'react';

export type ConnectorAllOperationsSummaryProps = {
  operations: OperationDiscoveryResult[];
  // onOperationSelected: () => void;
};

export const ConnectorAllOperationsSummary = (props: ConnectorAllOperationsSummaryProps) => {
  const onRenderOperationCell = React.useCallback((operation: OperationDiscoveryResult | undefined, _index: number | undefined) => {
    if (!operation) return;

    return (
      <button style={{ minHeight: '40px', border: '1px solid black' }}>
        <div>{operation.properties.summary}</div>
        <div>{operation.properties.description}</div>
      </button>
    );
  }, []);

  return (
    <div className="msla-result-list">
      <List items={props.operations} onRenderCell={onRenderOperationCell}></List>
    </div>
  );
};

import { Stack } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import React from 'react';

export type ConnectorAllOperationsSummaryProps = {
  operations: DiscoveryOperation<DiscoveryResultTypes>[];
  // onOperationSelected: () => void;
};

export const ConnectorAllOperationsSummary = (props: ConnectorAllOperationsSummaryProps) => {
  const onRenderOperationCells = () => {
    return props.operations.map((operation) => {
      return (
        <button key={operation.id} style={{ minHeight: '40px', border: '1px solid black' }}>
          <div>{operation.properties.summary}</div>
          <div>{operation.properties.description}</div>
        </button>
      );
    });
  };

  return (
    <div className="msla-result-list">
      <Stack>{onRenderOperationCells()}</Stack>
    </div>
  );
};

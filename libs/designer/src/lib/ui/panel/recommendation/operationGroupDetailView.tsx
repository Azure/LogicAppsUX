import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';

type OperationGroupDetailViewProps = {
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  filters: Record<string, string>;
  onOperationClick: (id: string) => void;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { groupOperations, filters, onOperationClick } = props;

  const filterItems = useCallback(
    (data: OperationActionData): boolean =>
      !filters?.['actionType'] ||
      (filters?.['actionType'] === 'actions' && !data.isTrigger) ||
      (filters?.['actionType'] === 'triggers' && data.isTrigger),
    [filters]
  );

  const operationGroupActions: OperationActionData[] = groupOperations
    .map((operation) => OperationActionDataFromOperation(operation))
    .filter(filterItems);

  return operationGroupActions.length > 0 ? (
    <OperationGroupDetailsPage
      operationApi={groupOperations[0].properties.api}
      operationActionsData={operationGroupActions}
      onOperationClick={onOperationClick}
    />
  ) : null; // loading logic goes here
};

import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import type { Connector, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';

type OperationGroupDetailViewProps = {
  connector: Connector;
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  filters: Record<string, string>;
  onOperationClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { connector, groupOperations, filters, onOperationClick, isLoading } = props;

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

  return (
    <OperationGroupDetailsPage
      connector={connector}
      operationActionsData={operationGroupActions}
      onOperationClick={onOperationClick}
      isLoading={isLoading}
    />
  );
};

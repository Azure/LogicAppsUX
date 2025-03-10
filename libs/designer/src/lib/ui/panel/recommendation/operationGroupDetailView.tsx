import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import type { Connector, DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';

type OperationGroupDetailViewProps = {
  connector?: Connector;
  groupOperations: DiscoveryOpArray;
  filters: Record<string, string>;
  onOperationClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
  displayRuntimeInfo: boolean;
  ignoreActionsFilter: boolean;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { connector, groupOperations, filters, onOperationClick, isLoading, displayRuntimeInfo, ignoreActionsFilter } = props;
  const isRoot = useDiscoveryPanelRelationshipIds().graphId === 'root';

  const filterItems = useCallback(
    (data: OperationActionData): boolean => {
      if (!isRoot && data.apiId === 'connectionProviders/variable' && data.id === 'initializevariable') {
        return false; // Filter out initialize variables when in a scope
      }

      return (
        !filters?.['actionType'] || // if I don't have a filter
        (filters?.['actionType'] === 'actions' && !data.isTrigger) || // or that the filter is actions, and the operation is not a trigger
        (filters?.['actionType'] === 'triggers' && data.isTrigger) || // or that the filter is triggers, and the operation is a trigger
        (filters?.['actionType'] === 'actions' && ignoreActionsFilter) // or that the filter is action, and that I should ignore the actions filter
      );
    },
    [filters, ignoreActionsFilter, isRoot]
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
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};

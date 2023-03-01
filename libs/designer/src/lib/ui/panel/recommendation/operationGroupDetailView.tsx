import { MessageBar, MessageBarType } from '@fluentui/react';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

type OperationGroupDetailViewProps = {
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  filters: Record<string, string>;
  onOperationClick: (id: string) => void;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { groupOperations, filters, onOperationClick } = props;

  const intl = useIntl();

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

  const operationApi = groupOperations?.[0]?.properties?.api;

  return operationApi ? (
    <OperationGroupDetailsPage
      operationApi={operationApi}
      operationActionsData={operationGroupActions}
      onOperationClick={onOperationClick}
    />
  ) : (
    <MessageBar messageBarType={MessageBarType.error}>
      {intl.formatMessage({
        defaultMessage: 'No operations found',
        description: 'Message to show when no operations are found',
      })}
    </MessageBar>
  );
};

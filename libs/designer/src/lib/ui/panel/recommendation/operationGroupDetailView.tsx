import type { AppDispatch, RootState } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useRelationshipIds, useIsParallelBranch } from '../../../core/state/panel/panelSelectors';
import { MessageBar, MessageBarType } from '@fluentui/react';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

type OperationGroupDetailViewProps = {
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  filters: Record<string, string>;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { groupOperations, filters } = props;

  const intl = useIntl();

  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();
  const isTrigger = useSelector((state: RootState) => state.panel.addingTrigger);
  const dispatch = useDispatch<AppDispatch>();
  const onOperationClick = (id: string) => {
    const operation = groupOperations.find((o) => o.id === id);
    const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
    dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
  };

  const filterItems = useCallback(
    (data: OperationActionData): boolean => {
      const isTrigger = data?.isTrigger === true;
      if (!filters['actionType']) return true;
      if (filters['actionType'].toLowerCase() === 'actions' && isTrigger) return false;
      else if (filters['actionType'].toLowerCase() === 'triggers' && !isTrigger) return false;
      return true;
    },
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

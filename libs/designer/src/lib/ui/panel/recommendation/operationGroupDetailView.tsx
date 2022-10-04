import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useRelationshipIds, useIsParallelBranch } from '../../../core/state/panel/panelSelectors';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { guid } from '@microsoft-logic-apps/utils';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

type OperationGroupDetailViewProps = {
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
  filters: Record<string, string>;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { groupOperations, filters } = props;

  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();
  const dispatch = useDispatch<AppDispatch>();
  const onOperationClick = (id: string) => {
    const operation = groupOperations.find((o) => o.id === id);
    const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
    dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch }));
  };

  const filterItems = useCallback(
    (data: OperationActionData): boolean => {
      let ret = true;
      if (filters['actionType']) {
        if (filters['actionType'] === 'actions') {
          ret = ret ? !data.isTrigger : false;
        } else {
          ret = ret ? data.isTrigger : false;
        }
      }

      return ret;
    },
    [filters]
  );

  const operationGroupActions: OperationActionData[] = groupOperations
    .map((operation) => OperationActionDataFromOperation(operation))
    .filter(filterItems);

  return groupOperations.length > 0 ? (
    <OperationGroupDetailsPage
      operationApi={groupOperations[0].properties.api}
      operationActionsData={operationGroupActions}
      onOperationClick={onOperationClick}
    />
  ) : null; // loading logic goes here
};

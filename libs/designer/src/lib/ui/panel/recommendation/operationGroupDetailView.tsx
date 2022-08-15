import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useDiscoveryIds, useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import type { RootState } from '../../../core/store';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { getConnectorCategoryString } from '@microsoft-logic-apps/utils';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationGroupDetailsPage } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';

type OperationGroupDetailViewProps = {
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const dispatch = useDispatch();

  const { groupOperations } = props;

  const rootState = useSelector((state: RootState) => state);

  const discoveryIds = useDiscoveryIds();
  const selectedNode = useSelectedNodeId();

  const onOperationClick = (id: string) => {
    const operation = groupOperations.find((o) => o.id === id);
    addOperation(operation, discoveryIds, selectedNode, dispatch, rootState);
  };

  const operationGroupActions: OperationActionData[] = groupOperations.map((operation) => {
    return {
      id: operation.id,
      title: operation.name,
      description: operation.description ?? operation.properties.description,
      summary: operation.properties.summary,
      category: getConnectorCategoryString(operation.properties.api.id),
      connectorName: operation.properties.api.displayName,
      brandColor: operation.properties.api.brandColor,
    };
  });

  return (
    <>
      {
        groupOperations.length > 0 ? (
          <OperationGroupDetailsPage
            operationApi={groupOperations[0].properties.api}
            operationActionsData={operationGroupActions}
            onOperationClick={onOperationClick}
          />
        ) : null // loading logic goes here
      }
    </>
  );
};

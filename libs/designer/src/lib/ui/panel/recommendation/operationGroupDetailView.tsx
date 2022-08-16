import { store } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useDiscoveryIds, useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import type { OperationActionData } from '@microsoft/designer-ui';
import { getConnectorCategoryString, OperationGroupDetailsPage } from '@microsoft/designer-ui';

type OperationGroupDetailViewProps = {
  groupOperations: DiscoveryOperation<DiscoveryResultTypes>[];
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { groupOperations } = props;

  const discoveryIds = useDiscoveryIds();
  const selectedNode = useSelectedNodeId();

  const onOperationClick = (id: string) => {
    const operation = groupOperations.find((o) => o.id === id);
    store.dispatch(addOperation(operation, discoveryIds, selectedNode));
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

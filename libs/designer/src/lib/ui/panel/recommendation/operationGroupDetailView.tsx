import { isBuiltInConnector } from '../../../core/actions/bjsworkflow/connections';
import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import { getOperationManifest } from '../../../core/queries/operation';
import type { AddNodeOperationPayload } from '../../../core/state/operation/operationMetadataSlice';
import { initializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationApi } from '@microsoft-logic-apps/utils';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationGroupDetailsPage } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';

type OperationGroupDetailViewProps = {
  operationApi: OperationApi;
  selectedSearchedOperations: DiscoveryOperation<DiscoveryResultTypes>[];
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const dispatch = useDispatch();

  const { operationApi, selectedSearchedOperations } = props;

  const { discoveryIds, selectedNode } = useSelector((state: RootState) => state.panel);

  const onOperationClick = (id: string) => {
    const operation = selectedSearchedOperations.find((o) => o.id === id);
    if (!operation) return; // Just an optional catch, should never happen

    const addPayload: AddNodePayload = {
      operation,
      id: selectedNode,
      parentId: discoveryIds.parentId ?? '',
      childId: discoveryIds.childId ?? '',
      graphId: discoveryIds.graphId,
    };
    const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
    const operationId = operation.id;
    dispatch(addNode(addPayload));
    const operationPayload: AddNodeOperationPayload = {
      id: selectedNode,
      type: operation.type,
      connectorId,
      operationId,
    };
    dispatch(initializeOperationInfo(operationPayload));
    getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id });
    dispatch(switchToOperationPanel(selectedNode));
    return;
  };

  const operationGroupActions: OperationActionData[] = selectedSearchedOperations.map((operation) => {
    return {
      id: operation.id,
      title: operation.name,
      subtitle: operation.description,
      category: isBuiltInConnector(operation.properties.api.id) ? 'Built-in' : 'Azure',
      connectorName: operation.properties.api.displayName,
    };
  });

  return (
    <OperationGroupDetailsPage
      operationApi={operationApi}
      operationActionsData={operationGroupActions}
      onClickOperation={onOperationClick}
    />
  );
};

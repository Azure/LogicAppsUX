import { initializeOperationDetails } from '../../../core/actions/bjsworkflow/add';
import { isBuiltInConnector } from '../../../core/actions/bjsworkflow/connections';
import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import { getConnectionsForConnector } from '../../../core/queries/connections';
import { getOperationManifest } from '../../../core/queries/operation';
import { changeConnectionMapping } from '../../../core/state/connection/connectionSlice';
import type { AddNodeOperationPayload } from '../../../core/state/operation/operationMetadataSlice';
import { initializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';
import { selectOperationGroupId, switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationGroupDetailsPage } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

type OperationGroupDetailViewProps = {
  selectedSearchedOperations: DiscoveryOperation<DiscoveryResultTypes>[];
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const dispatch = useDispatch();

  const { selectedSearchedOperations } = props;

  const rootState = useSelector((state: RootState) => state);
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
    const operationType = operation.properties.operationType ?? '';
    const operationKind = operation.properties.operationKind ?? '';
    dispatch(addNode(addPayload));
    const operationPayload: AddNodeOperationPayload = {
      id: selectedNode,
      type: operationType,
      connectorId,
      operationId,
    };
    dispatch(initializeOperationInfo(operationPayload));

    initializeOperationDetails(selectedNode, { connectorId, operationId }, operationType, operationKind, rootState, dispatch);
    setDefaultConnectionForNode(selectedNode, connectorId, dispatch);

    getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id });
    dispatch(switchToOperationPanel(selectedNode));
    return;
  };

  const setDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
    const connections = await getConnectionsForConnector(connectorId);
    if (connections.length !== 0) {
      dispatch(changeConnectionMapping({ nodeId, connectionId: connections[0].id }));
    }
  };

  const onClickBack = () => {
    dispatch(selectOperationGroupId(''));
  };

  const operationGroupActions: OperationActionData[] = selectedSearchedOperations.map((operation) => {
    return {
      id: operation.id,
      title: operation.name,
      description: operation.description ?? operation.properties.description,
      summary: operation.properties.summary,
      category: isBuiltInConnector(operation.properties.api.id) ? 'Built-in' : 'Azure',
      connectorName: operation.properties.api.displayName,
      brandColor: operation.properties.api.brandColor,
    };
  });

  return (
    <OperationGroupDetailsPage
      operationApi={selectedSearchedOperations[0].properties.api}
      operationActionsData={operationGroupActions}
      onClickOperation={onOperationClick}
      onClickBack={onClickBack}
    />
  );
};

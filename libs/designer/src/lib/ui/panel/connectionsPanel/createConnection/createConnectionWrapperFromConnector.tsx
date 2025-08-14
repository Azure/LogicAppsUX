import type { AppDispatch, RootState } from '../../../../core';
import { useOperationInfo } from '../../../../core';
import { closeConnectionsFlow, getConnectionMetadata, updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnector, useConnectorByNodeId } from '../../../../core/state/connection/connectionSelector';
import {
  useConnectionPanelSelectedNodeIds,
  useOperationPanelSelectedNodeId,
  usePreviousPanelMode,
} from '../../../../core/state/panel/panelSelectors';
import { useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps } from '../../../../core/utils/connectors/connections';
import { getRecordEntry, guid, type Connection, type Connector } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ApiHubAuthentication } from '../../../../common/models/workflow';
import { CreateConnectionInternal } from './createConnectionInternal';
import { updateNodeParameters } from '../../../../core/state/operation/operationMetadataSlice';

export const CreateConnectionWrapper = ({connectorId, onConnectionSuccessful}: {connectorId: string, onConnectionSuccessful: (connection: Connection) => void}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isAgentSubgraph = false
  const nodeIds = useConnectionPanelSelectedNodeIds();
  const { data: connector } = useConnector(connectorId);
  // const operationInfo = useOperationInfo(nodeId);
  // const { data: operationManifest } = useOperationManifest(operationInfo);
  // const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = false; //useSelector((state: RootState) => !!getRecordEntry(state.connections.connectionsMapping, nodeId));
  // const { nodeInputs, workflowKind } = useSelector((state: RootState) => ({
  //   nodeInputs: state.operations.inputParameters[nodeId],
  //   dependencies: state.operations.dependencies[nodeId],
  //   workflowKind: state.workflow.workflowKind,
  // }));

  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector) : undefined),
    [connector]
  );

  // const referencePanelMode = usePreviousPanelMode();
  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of nodeIds) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch, nodeIds]
  );


  return (
    <CreateConnectionInternal
      connectorId={connector?.id ?? ''}
      operationType={'managedApiConnections'}
      existingReferences={existingReferences}
      isAgentSubgraph={isAgentSubgraph ?? false}s
      nodeIds={nodeIds}
      assistedConnectionProps={assistedConnectionProps}
      // connectionMetadata={connectionMetadata}
      showActionBar={true}
      hideCancelButton={!hasExistingConnection}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={() => {}}
      // operationManifest={operationManifest}
      workflowKind={'stateful'}
      onConnectionSuccessful={onConnectionSuccessful}
    />
  );
};

export interface CreatedConnectionPayload {
  connector: Connector;
  connection: Connection;
  connectionProperties?: Record<string, any>;
  authentication?: ApiHubAuthentication;
}

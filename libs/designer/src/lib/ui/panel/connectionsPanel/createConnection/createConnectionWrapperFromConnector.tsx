import type { AppDispatch, RootState } from '../../../../core';
import { updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds } from '../../../../core/state/panel/panelSelectors';
import { getAssistedConnectionProps } from '../../../../core/utils/connectors/connections';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ApiHubAuthentication } from '../../../../common/models/workflow';
import { CreateConnectionInternal } from './createConnectionInternal';

export const CreateConnectionWrapper = ({
  connectorId,
  onConnectionSuccessful,
}: { connectorId: string; onConnectionSuccessful: (connection: Connection) => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isAgentSubgraph = false;
  const nodeIds = useConnectionPanelSelectedNodeIds();
  const { data: connector } = useConnector(connectorId);
  const hasExistingConnection = false; //useSelector((state: RootState) => !!getRecordEntry(state.connections.connectionsMapping, nodeId));
  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));
  const assistedConnectionProps = useMemo(() => (connector ? getAssistedConnectionProps(connector) : undefined), [connector]);

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
      operationType={'managedApiConnections'} // need to do this
      existingReferences={existingReferences}
      isAgentSubgraph={isAgentSubgraph ?? false}
      nodeIds={nodeIds}
      assistedConnectionProps={assistedConnectionProps}
      showActionBar={true}
      hideCancelButton={!hasExistingConnection}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={() => onConnectionSuccessful}
      workflowKind={'stateful'} //need to update this
    />
  );
};

export interface CreatedConnectionPayload {
  connector: Connector;
  connection: Connection;
  connectionProperties?: Record<string, any>;
  authentication?: ApiHubAuthentication;
}

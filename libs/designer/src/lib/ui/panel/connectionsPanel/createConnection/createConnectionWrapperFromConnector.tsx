import type { AppDispatch, RootState } from '../../../../core';
import { updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import { getAssistedConnectionProps } from '../../../../core/utils/connectors/connections';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ApiHubAuthentication } from '../../../../common/models/workflow';
import { CreateConnectionInternal } from './createConnectionInternal';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import Constants from '../../../../common/constants';

export const CreateConnectionWrapper = ({
  connectorId,
  onConnectionSuccessful,
  connectorType,
}: { connectorId: string; connectorType: string; onConnectionSuccessful: (connection: Connection) => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isAgentSubgraph = false;
  const { data: connector } = useConnector(connectorId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery?.data ?? [], [connectionQuery]);
  const hasExistingConnection = connections.length > 0;
  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));
  const assistedConnectionProps = useMemo(() => (connector ? getAssistedConnectionProps(connector) : undefined), [connector]);
  const operationInfo = {
    connectorId: connector?.id,
    operationId: connector?.name,
    type: Constants.NODE.TYPE.AGENT,
  } as any;
  const { data: operationManifest } = useOperationManifest(operationInfo);

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of ['temp-node-id']) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch]
  );

  return (
    <CreateConnectionInternal
      connectorId={connector?.id ?? ''}
      operationType={connectorType}
      existingReferences={existingReferences}
      isAgentSubgraph={isAgentSubgraph ?? false}
      assistedConnectionProps={assistedConnectionProps}
      showActionBar={true}
      hideCancelButton={!hasExistingConnection}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={onConnectionSuccessful}
      operationManifest={operationManifest}
      workflowKind={'stateful'} // TODO (ccastrotrejo) - Need to update this onece its clear
    />
  );
};

export interface CreatedConnectionPayload {
  connector: Connector;
  connection: Connection;
  connectionProperties?: Record<string, any>;
  authentication?: ApiHubAuthentication;
}

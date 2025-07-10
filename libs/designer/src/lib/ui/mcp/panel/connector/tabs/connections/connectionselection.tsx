import { type Connection, ConnectionService, type Connector, parseErrorMessage } from '@microsoft/logic-apps-shared';
import { updateNodeConnection } from '../../../../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../../../../core/queries/connections';
import { useConnector } from '../../../../../../core/state/connection/connectionSelector';
import { useAllReferenceKeys, useConnectionReference, useOperationNodeIds } from '../../../../../../core/state/mcp/selector';
import type { AppDispatch } from '../../../../../../core/state/mcp/store';
import { isConnectionValid } from '../../../../../../core/utils/connectors/connections';
import { CreateConnectionInternal } from '../../../../../panel/connectionsPanel/createConnection/createConnectionInternal';
import type { CreatedConnectionPayload } from '../../../../../panel/connectionsPanel/createConnection/createConnectionWrapper';
import { SelectConnection } from '../../../../../panel/connectionsPanel/selectConnection/selectConnection';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const ConnectionSelection = ({ connectorId }: { connectorId: string }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { data: connector } = useConnector(connectorId, /* enabled */ true, /* useCachedData */ true);
  const connectionsQuery = useConnectionsForConnector(connectorId, /* shouldNotRefetch */ true);
  const existingReferences = useAllReferenceKeys();
  const reference = useConnectionReference();
  const operationNodeIds = useOperationNodeIds(connectorId);

  const validConnections = useMemo(() => (connectionsQuery.data ?? []).filter(isConnectionValid), [connectionsQuery.data]);
  const hasConnections = useMemo(() => validConnections.length > 0, [validConnections]);
  const [showCreate, setShowCreate] = useState(!hasConnections);

  const buttonAddText = intl.formatMessage({
    defaultMessage: 'Add new',
    id: 'Lft/is',
    description: 'Button to add a new connection',
  });

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection) {
        return;
      }
      for (const nodeId of operationNodeIds) {
        dispatch(
          updateNodeConnection({
            nodeId,
            connection,
            connector: connector as Connector,
          })
        );
        ConnectionService().setupConnectionIfNeeded(connection);
      }
    },
    [operationNodeIds, dispatch, connector]
  );

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of operationNodeIds) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch, operationNodeIds]
  );

  const handleOnAdd = useCallback(() => setShowCreate(true), []);
  const handleCreateComplete = useCallback(() => setShowCreate(false), []);

  return showCreate ? (
    <CreateConnectionInternal
      connectorId={connector?.id ?? ''}
      operationType={'ApiConnection'}
      existingReferences={existingReferences}
      nodeIds={operationNodeIds}
      showActionBar={true}
      hideCancelButton={!hasConnections}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={handleCreateComplete}
    />
  ) : (
    <SelectConnection
      connections={validConnections}
      currentConnectionId={reference?.connection.id ?? ''}
      saveSelectionCallback={saveSelectionCallback}
      isXrmConnectionReferenceMode={false}
      addButton={{
        text: buttonAddText,
        onAdd: handleOnAdd,
      }}
      errorMessage={connectionsQuery.isError ? parseErrorMessage(connectionsQuery.error) : undefined}
    />
  );
};

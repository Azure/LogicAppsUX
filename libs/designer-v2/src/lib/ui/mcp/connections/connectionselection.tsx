import { type Connection, ConnectionService, type Connector, parseErrorMessage } from '@microsoft/logic-apps-shared';
import { updateMcpConnection } from '../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { useAllReferenceKeys, useAreMappingsInitialized, useConnectionReference } from '../../../core/state/mcp/selector';
import type { AppDispatch } from '../../../core/state/mcp/store';
import { isConnectionValid } from '../../../core/utils/connectors/connections';
import { CreateConnectionInternal } from '../../panel/connectionsPanel/createConnection/createConnectionInternal';
import type { CreatedConnectionPayload } from '../../panel/connectionsPanel/createConnection/createConnectionWrapper';
import { SelectConnection } from '../../panel/connectionsPanel/selectConnection/selectConnection';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Spinner } from '@fluentui/react-components';
import { useConnectionSelectionStyles } from './styles';

export const ConnectionSelection = ({ connectorId, operations }: { connectorId: string; operations: string[] }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useConnectionSelectionStyles();
  const { data: connector } = useConnector(connectorId, /* enabled */ true, /* useCachedData */ true);
  const connectionsQuery = useConnectionsForConnector(connectorId, /* shouldNotRefetch */ true);
  const existingReferences = useAllReferenceKeys();
  const reference = useConnectionReference();
  const areMappingsInitialized = useAreMappingsInitialized(operations);

  const validConnections = useMemo(() => (connectionsQuery.data ?? []).filter(isConnectionValid), [connectionsQuery.data]);
  const hasConnections = useMemo(() => validConnections.length > 0, [validConnections]);
  const [showCreate, setShowCreate] = useState(!hasConnections);

  useEffect(() => {
    if (hasConnections !== undefined) {
      setShowCreate(!hasConnections);
    }
  }, [hasConnections]);

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
      dispatch(
        updateMcpConnection({
          nodeIds: operations,
          connection,
          connector: connector as Connector,
        })
      );
      ConnectionService().setupConnectionIfNeeded(connection);
    },
    [dispatch, operations, connector]
  );

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      dispatch(updateMcpConnection({ ...payload, nodeIds: operations }));
    },
    [dispatch, operations]
  );

  const handleOnAdd = useCallback(() => setShowCreate(true), []);
  const handleCreateComplete = useCallback(() => setShowCreate(false), []);

  if (connectionsQuery.isLoading || !areMappingsInitialized) {
    return (
      <Spinner
        className={styles.loadingContainer}
        label={intl.formatMessage({ defaultMessage: 'Loading...', id: '4yQ6LA', description: 'Text for loading connections' })}
      />
    );
  }

  return (
    <div className={styles.container}>
      {showCreate ? (
        <CreateConnectionInternal
          connectorId={connector?.id ?? ''}
          operationType={'ApiConnection'}
          existingReferences={existingReferences}
          nodeIds={operations}
          showActionBar={false}
          hideCancelButton={!hasConnections}
          updateConnectionInState={updateConnectionInState}
          onConnectionCreated={handleCreateComplete}
          onConnectionCancelled={handleCreateComplete}
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
      )}
    </div>
  );
};

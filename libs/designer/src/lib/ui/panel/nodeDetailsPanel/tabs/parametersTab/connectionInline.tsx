import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { getConnectionMetadata, reloadParametersTab, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId, useNodeConnectionId } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds, useOperationPanelSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useOperationManifest } from '../../../../../core/state/selectors/actionMetadataSelector';
import { useOperationInfo } from '../../../../../core';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';
import { getAssistedConnectionProps } from '../../../../../core/utils/connectors/connections';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { Button, Text } from '@fluentui/react-components';
import type { CreatedConnectionPayload } from '../../../connectionsPanel/createConnection/createConnectionWrapper';
import { CreateConnectionInternal } from '../../../connectionsPanel/createConnection/createConnectionInternal';
import type { AppDispatch, RootState } from '../../../../../core';

interface ConnectionInlineProps {
  setShowSubComponent?: React.Dispatch<React.SetStateAction<boolean>>;
  showSubComponent?: boolean;
}

export const ConnectionInline: React.FC<ConnectionInlineProps> = ({ showSubComponent, setShowSubComponent }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const nodeId: string = useOperationPanelSelectedNodeId();
  const nodeIds = useConnectionPanelSelectedNodeIds();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery?.data ?? [], [connectionQuery]);
  const hasExistingConnections = useMemo(() => connections.length > 0, [connections]);
  const [showCreateConnection, setShowCreateConnection] = useState(hasExistingConnections);
  const currentConnectionId = useNodeConnectionId(nodeId);
  const selectedConnection = useMemo(
    () => connections.find((connection) => connection.id === currentConnectionId),
    [connections, currentConnectionId]
  );

  const setConnection = useCallback(() => {
    setShowCreateConnection(true);
  }, [setShowCreateConnection]);

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  useEffect(() => {
    setShowCreateConnection(hasExistingConnections);
  }, [hasExistingConnections]);

  const intlText = useMemo(
    () => ({
      CONNECT: intl.formatMessage({
        defaultMessage: 'Connect',
        id: 'F0rSr0',
        description: 'Text to show that the user can create the connection',
      }),
      NO_CONNECTION_SELECTED: intl.formatMessage({
        defaultMessage: 'No connection has been selected',
        id: 'WtO4Wv',
        description: 'Text to show that no connection has been selected',
      }),
      CURRENT_CONNECTION: intl.formatMessage({
        defaultMessage: 'Current connection: ',
        id: 'y3bDyD',
        description: 'Current connection title',
      }),
    }),
    [intl]
  );

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of nodeIds) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch, nodeIds]
  );

  if (!showSubComponent && hasExistingConnections) {
    const connectionText = isNullOrUndefined(selectedConnection)
      ? intlText.NO_CONNECTION_SELECTED
      : `${intlText.CURRENT_CONNECTION}${selectedConnection.properties.displayName}`;
    return <Text style={{ fontSize: 12 }}>{connectionText} </Text>;
  }

  return showCreateConnection ? (
    <CreateConnectionInternal
      connectorId={connector?.id ?? ''}
      operationType={operationInfo?.type}
      existingReferences={existingReferences}
      nodeIds={nodeIds}
      assistedConnectionProps={assistedConnectionProps}
      connectionMetadata={connectionMetadata}
      showActionBar={false}
      hideCancelButton={false}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={() => dispatch(reloadParametersTab())}
      onConnectionCancelled={() => {
        if (hasExistingConnections) {
          setShowSubComponent && setShowSubComponent(false);
        } else {
          setShowCreateConnection(false);
        }
      }}
    />
  ) : (
    <Button
      className="change-connection-button"
      id="change-connection-button"
      size="small"
      appearance="subtle"
      onClick={setConnection}
      style={{ color: 'var(--colorBrandForeground1)' }}
      aria-label={`${intlText.CONNECT}, ${connector?.id}`}
    >
      {intlText.CONNECT}
    </Button>
  );
};

import { Button } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import {
  CreateConnectionInternal,
  type CreatedConnectionPayload,
} from '../../../connectionsPanel/createConnection/createConnectionWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { getConnectionMetadata, reloadParametersTab, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds, useOperationPanelSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useOperationManifest } from '../../../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps } from '../../../../../core/utils/connectors/connections';
import type { AppDispatch, RootState } from '../../../../../core';
import { useOperationInfo } from '../../../../../core';
import { useIntl } from 'react-intl';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';

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
  const hasExistingConnections = connections.length > 0;

  const [createConnection, setCreateConnection] = useState(hasExistingConnections);
  const setConnection = useCallback(() => {
    setCreateConnection(true);
  }, []);

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  const intlText = useMemo(
    () => ({
      CONNECT: intl.formatMessage({
        defaultMessage: 'Connect',
        id: 'F0rSr0',
        description: 'Text to show that the user can create the connection',
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
    return null;
  }

  return createConnection ? (
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
          setCreateConnection(false);
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

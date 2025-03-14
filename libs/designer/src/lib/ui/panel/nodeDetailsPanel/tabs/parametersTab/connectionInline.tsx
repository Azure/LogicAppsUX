import { Button } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import {
  CreateConnectionInternal,
  type CreatedConnectionPayload,
} from '../../../connectionsPanel/createConnection/createConnectionWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { getConnectionMetadata, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionPanelSelectedNodeIds, useOperationPanelSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useOperationManifest } from '../../../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps } from '../../../../../core/utils/connectors/connections';
import type { AppDispatch, RootState } from '../../../../../core';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { useOperationInfo } from '../../../../../core';

export const ConnectionInline = () => {
  const [hasConnectionCreated, setHasConnectionCreated] = useState(false);
  const setConnection = useCallback(() => {
    setHasConnectionCreated(true);
  }, []);

  const dispatch = useDispatch<AppDispatch>();
  const nodeId: string = useOperationPanelSelectedNodeId();
  const nodeIds = useConnectionPanelSelectedNodeIds();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = useSelector((state: RootState) => !!getRecordEntry(state.connections.connectionsMapping, nodeId));
  const existingReferences = useSelector((state: RootState) => Object.keys(state.connections.connectionReferences));
  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      for (const nodeId of nodeIds) {
        dispatch(updateNodeConnection({ ...payload, nodeId }));
      }
    },
    [dispatch, nodeIds]
  );

  if (hasExistingConnection) {
    return null;
  }

  return hasConnectionCreated ? (
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
      onConnectionCreated={() => {}}
      onConnectionCancelled={() => {
        setHasConnectionCreated(false);
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
      // aria-label={`${connectionLabel}, ${openChangeConnectionText}`}
    >
      {'Connect'}
    </Button>
  );
};

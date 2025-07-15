import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useCallback, useMemo } from 'react';
import { ConnectorFilled } from '@fluentui/react-icons';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useMcpWizardStyles } from '../wizard/styles';
import { deinitializeNodes, deinitializeOperationInfos } from '../../../core/state/operation/operationMetadataSlice';
import { ConnectorItem } from '../wizard/ConnectorItem';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import { McpPanelView, openConnectorPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/connector/connectorSlice';

export const ListConnectors = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, operationMetadata, connectionsMapping, connectionReferences } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    operationMetadata: state.operation.operationMetadata,
    connectionsMapping: state.connection.connectionsMapping,
    connectionReferences: state.connection.connectionReferences,
  }));

  const styles = useMcpWizardStyles();

  const connectorIds = useMemo(() => {
    const ids = Object.values(operationInfos)
      .map((info) => info?.connectorId)
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }, [operationInfos]);

  const connectorsDisplayInfo = useMemo(() => {
    const map: Record<
      string,
      {
        displayName?: string;
        iconUri?: string;
        connectionName?: string;
        connectionStatus: 'connected' | 'disconnected';
      }
    > = {};

    for (const info of Object.values(operationInfos)) {
      const connectorId = info?.connectorId;
      if (!connectorId || map[connectorId]) {
        continue;
      }

      const metadata = operationMetadata[info.operationId];
      const referenceKey = connectionsMapping[info.operationId];
      const reference = referenceKey ? connectionReferences[referenceKey] : null;

      const isConnected = !!reference;
      const connectionStatus = isConnected ? 'connected' : 'disconnected';
      const connectionName = isConnected
        ? (reference.connectionName ?? getResourceNameFromId(reference.connection?.id) ?? 'Default Connection')
        : referenceKey === null
          ? 'No Connection'
          : 'Default Connection';

      map[connectorId] = {
        displayName: metadata?.connectorTitle,
        iconUri: metadata?.iconUri,
        connectionName,
        connectionStatus,
      };
    }

    return map;
  }, [connectionReferences, connectionsMapping, operationInfos, operationMetadata]);

  const hasConnectors = connectorIds.length > 0;

  const handleEditConnector = useCallback(
    (connectorId: string) => {
      dispatch(
        openConnectorPanelView({
          panelView: McpPanelView.SelectConnector,
        })
      );
      dispatch(selectConnectorId(connectorId));
      dispatch(selectOperations([]));
    },
    [dispatch]
  );

  const handleDeleteConnector = useCallback(
    (connectorId: string) => {
      const operationIdsToDelete = Object.entries(operationInfos)
        .filter(([_, info]) => info?.connectorId === connectorId)
        .map(([operationId, _]) => operationId);

      if (operationIdsToDelete.length > 0) {
        dispatch(deinitializeNodes(operationIdsToDelete));
        dispatch(deinitializeOperationInfos({ ids: operationIdsToDelete }));
      }
    },
    [operationInfos, dispatch]
  );

  const INTL_TEXT = {
    noConnectors: intl.formatMessage({
      id: 'xyhnsP',
      defaultMessage: 'No connectors added yet',
      description: 'Message displayed when no connectors are available',
    }),
    addFirstConnector: intl.formatMessage({
      id: 'i/0DrA',
      defaultMessage: 'Add your first connector to get started',
      description: 'Message prompting the user to add their first connector',
    }),
  };

  return (
    <div>
      {hasConnectors ? (
        <div className={styles.connectorsList}>
          {connectorIds.map((connectorId) => {
            const connectorInfo = connectorsDisplayInfo[connectorId];
            return (
              <ConnectorItem
                key={connectorId}
                connectorId={connectorId}
                displayName={connectorInfo?.displayName ?? connectorId}
                connectionName={connectorInfo?.connectionName ?? 'Default Connection'}
                status={connectorInfo?.connectionStatus}
                icon={connectorInfo?.iconUri}
                onEdit={handleEditConnector}
                onDelete={handleDeleteConnector}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <ConnectorFilled />
          </div>
          <Text size={400} weight="semibold" style={{ marginBottom: '8px' }}>
            {INTL_TEXT.noConnectors}
          </Text>
          <Text size={200} style={{ opacity: 0.7, marginBottom: '24px' }}>
            {INTL_TEXT.addFirstConnector}
          </Text>
        </div>
      )}
    </div>
  );
};

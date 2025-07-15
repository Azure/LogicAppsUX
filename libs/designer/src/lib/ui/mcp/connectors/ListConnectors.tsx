import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useCallback, useMemo } from 'react';
import { CheckmarkCircleFilled, ConnectorFilled, Delete24Regular, Edit24Regular } from '@fluentui/react-icons';
import {
  Text,
  TableCell,
  TableRow,
  Table,
  TableHeader,
  TableHeaderCell,
  Button,
  TableBody,
  tokens,
  Link,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useMcpWizardStyles } from '../wizard/styles';
import { deinitializeNodes, deinitializeOperationInfos } from '../../../core/state/operation/operationMetadataSlice';
import { ConnectorItem } from '../wizard/ConnectorItem';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import { McpPanelView, openConnectorPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/connector/connectorSlice';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';

const tableCellStyles = {
  border: 'none',
};

export const ListConnectors = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, operationMetadata, connectionsMapping, connectionReferences } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    operationMetadata: state.operation.operationMetadata,
    connectionsMapping: state.connection.connectionsMapping,
    connectionReferences: state.connection.connectionReferences,
  }));

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
    connectorLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'T1q9LE',
      description: 'The label for the connector column',
    }),
    connectionLabel: intl.formatMessage({
      defaultMessage: 'Connection',
      id: 'cjWC0X',
      description: 'The label for the connection column',
    }),
    statusLabel: intl.formatMessage({
      defaultMessage: 'Status',
      id: 'ozFnEE',
      description: 'The label for the status column',
    }),
    tableAriaLabel: intl.formatMessage({
      defaultMessage: 'List of connectors with their connections',
      id: 'd9Ooue',
      description: 'The aria label for the connections table',
    }),
    editButtonLabel: intl.formatMessage({
      defaultMessage: 'Edit connector',
      id: 'RTfra/',
      description: 'Label for the edit connector button',
    }),
    deleteButtonLabel: intl.formatMessage({
      defaultMessage: 'Delete connector',
      id: '8e1bKU',
      description: 'Label for the delete connector button',
    }),
  };

  const styles = useMcpWizardStyles();

  const connectorIds = useMemo(() => {
    const ids = Object.values(operationInfos)
      .map((info) => info?.connectorId)
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }, [operationInfos]);

  const items = useMemo(() => {
    const seen = new Set<string>();

    return Object.values(operationInfos).reduce<
      Array<{
        connectorId: string;
        displayName?: string;
        iconUri?: string;
        connectionName: string;
        connectionStatus: 'connected' | 'disconnected';
      }>
    >((acc, info) => {
      const connectorId = info?.connectorId;
      if (!connectorId || seen.has(connectorId)) {
        return acc;
      }

      seen.add(connectorId);

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

      acc.push({
        connectorId: connectorId,
        displayName: metadata?.connectorTitle,
        iconUri: metadata?.iconUri,
        connectionName,
        connectionStatus,
      });

      return acc;
    }, []);
  }, [connectionReferences, connectionsMapping, operationInfos, operationMetadata]);

  const columns = [
    { columnKey: 'connector', label: INTL_TEXT.connectorLabel },
    { columnKey: 'connection', label: INTL_TEXT.connectionLabel },
    { columnKey: 'status', label: INTL_TEXT.statusLabel },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

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

  return (
    <div>
      <Table
        aria-label={INTL_TEXT.tableAriaLabel}
        size="small"
        style={{
          width: '90%',
          margin: '0 auto',
          border: 'none',
        }}
      >
        <TableHeader style={tableCellStyles}>
          <TableRow style={tableCellStyles}>
            {columns.map((column) => (
              <TableHeaderCell key={column.columnKey} style={tableCellStyles}>
                <Text weight="semibold">{column.label}</Text>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody style={tableCellStyles}>
          {items.map((item) => (
            <TableRow key={item.connectorId} style={tableCellStyles}>
              <TableCell style={tableCellStyles}>
                <div>
                  <div>
                    <img
                      src={item.iconUri ?? DefaultIcon}
                      alt={`${item.displayName} icon`}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain',
                      }}
                    />
                    <Link as="button" onClick={() => {}}>
                      {item.displayName}
                    </Link>
                  </div>
                </div>
              </TableCell>
              <TableCell style={tableCellStyles}>{item?.connectionName}</TableCell>
              <TableCell style={tableCellStyles}>
                {<CheckmarkCircleFilled color={tokens.colorPaletteGreenBackground3} />}
                {item?.connectionStatus}
              </TableCell>
              <TableCell style={{ ...tableCellStyles, textAlign: 'right', width: '1%' }}>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Edit24Regular />}
                  onClick={() => handleEditConnector(item.connectorId)}
                  aria-label={INTL_TEXT.editButtonLabel}
                />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Delete24Regular />}
                  onClick={() => handleDeleteConnector(item.connectorId)}
                  aria-label={INTL_TEXT.deleteButtonLabel}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasConnectors ? (
        <div className={styles.connectorsList}>
          {items.map((connectorInfo) => {
            return (
              <ConnectorItem
                key={connectorInfo?.connectorId}
                connectorId={connectorInfo?.connectorId}
                displayName={connectorInfo?.displayName ?? connectorInfo?.connectorId}
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

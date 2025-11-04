import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useCallback, useMemo } from 'react';
import { Add24Regular, CheckmarkCircle20Filled, Delete24Regular, Edit24Regular, AppsRegular } from '@fluentui/react-icons';
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
  mergeClasses,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useConnectorSectionStyles } from '../wizard/styles';
import { McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/mcpselectionslice';
import { ConnectorIconWithName } from '../../templates/connections/connector';
import { useConnectionById } from '../../../core/queries/connections';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import { deinitializeOperations, MCP_ConnectionKey } from '../../../core/actions/bjsworkflow/mcp';

const connectorTableCellStyles = {
  border: 'none',
  paddingBottom: '8px',
};
const lastCellStyles = {
  width: '8%',
};

export const ListConnectors = ({ addConnectors, addDisabled }: { addConnectors: () => void; addDisabled: boolean }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, connectionsMapping, connectionReferences, logicAppName, disableConnectorSelection, connectorId } = useSelector(
    (state: RootState) => ({
      operationInfos: state.operations.operationInfo,
      connectionsMapping: state.connection.connectionsMapping,
      connectionReferences: state.connection.connectionReferences,
      logicAppName: state.resource.logicAppName,
      disableConnectorSelection: state.mcpSelection.disableConnectorSelection,
      connectorId: state.mcpSelection.selectedConnectorId,
    })
  );

  const INTL_TEXT = {
    addButtonLabel: intl.formatMessage({
      id: 'pSIcsd',
      defaultMessage: 'Add',
      description: 'Label for the add connector button',
    }),
    addConnector: intl.formatMessage({
      id: 'XLhNNP',
      defaultMessage: 'Add connector',
      description: 'Message displayed when no connectors are available',
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
    connectedText: intl.formatMessage({
      defaultMessage: 'Connected',
      id: 'V7NT3q',
      description: 'Text indicating a connector is connected',
    }),
    disconnectedText: intl.formatMessage({
      defaultMessage: 'Disconnected',
      id: 'ssR+UG',
      description: 'Text indicating a connector is disconnected',
    }),
    noConnectionText: intl.formatMessage({
      defaultMessage: 'No connection',
      id: 'fCQPmw',
      description: 'Text indicating there is no connection for the connector',
    }),
    loadingConnectorsText: intl.formatMessage({
      defaultMessage: 'Loading connectors...',
      id: 'TWeskw',
      description: 'Loading message for connectors',
    }),
  };

  const styles = useConnectorSectionStyles();

  const items = useMemo(() => {
    const seen = new Set<string>();
    const allOperations = Object.values(operationInfos);

    if (allOperations.length === 0 && disableConnectorSelection && connectorId) {
      const referenceKey = connectionsMapping[MCP_ConnectionKey];
      const reference = referenceKey ? connectionReferences[referenceKey] : null;

      const isConnected = !!reference;
      return [
        {
          connectorId,
          connectionId: reference?.connection?.id ?? '',
          isConnected,
        },
      ];
    }

    return allOperations.reduce<
      Array<{
        connectorId: string;
        connectionId: string;
        isConnected: boolean;
      }>
    >((acc, info) => {
      const connectorId = info?.connectorId;
      if (!connectorId || seen.has(connectorId)) {
        return acc;
      }

      seen.add(connectorId);

      const referenceKey = connectionsMapping[info.operationId];
      const reference = referenceKey ? connectionReferences[referenceKey] : null;

      const isConnected = !!reference;

      acc.push({
        connectorId,
        connectionId: reference?.connection?.id ?? '',
        isConnected,
      });

      return acc;
    }, []);
  }, [connectionReferences, connectionsMapping, connectorId, disableConnectorSelection, operationInfos]);

  const columns = [
    { columnKey: 'connector', label: INTL_TEXT.connectorLabel },
    { columnKey: 'connection', label: INTL_TEXT.connectionLabel },
    { columnKey: 'status', label: INTL_TEXT.statusLabel },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

  const shouldDisableEdits = useMemo(() => disableConnectorSelection && !logicAppName, [disableConnectorSelection, logicAppName]);
  const handleEditConnector = useCallback(
    (connectorId: string) => {
      // Get all operations for this specific connector
      const connectorOperations = Object.entries(operationInfos)
        .filter(([_, info]) => info?.connectorId === connectorId)
        .map(([operationId, _]) => operationId);

      dispatch(selectConnectorId(connectorId));
      dispatch(selectOperations(connectorOperations));
      dispatch(
        openMcpPanelView({
          panelView: McpPanelView.CreateConnection,
        })
      );
    },
    [dispatch, operationInfos]
  );

  const handleDeleteConnector = useCallback(
    (connectorId: string) => {
      const operationIdsToDelete = Object.entries(operationInfos)
        .filter(([_, info]) => info?.connectorId === connectorId)
        .map(([operationId, _]) => operationId);

      if (operationIdsToDelete.length > 0) {
        dispatch(deinitializeOperations({ operationIds: operationIdsToDelete }));
      }
    },
    [operationInfos, dispatch]
  );

  if (!items || items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={mergeClasses(styles.emptyStateIcon, addDisabled ? styles.emptyStateDisabled : '')}>
          <AppsRegular aria-label={INTL_TEXT.addConnector} />
        </div>
        <Text size={500}>{INTL_TEXT.addConnector}</Text>
        <Button
          size="medium"
          className={styles.addConnectorButton}
          icon={<Add24Regular />}
          appearance="secondary"
          onClick={addConnectors}
          disabled={addDisabled}
        >
          {INTL_TEXT.addButtonLabel}
        </Button>
      </div>
    );
  }

  return (
    <Table className={styles.tableStyle} aria-label={INTL_TEXT.tableAriaLabel} size="small">
      <TableHeader>
        <TableRow className={addDisabled ? styles.emptyStateDisabled : ''} style={connectorTableCellStyles}>
          {columns.map((column, i) => (
            <TableHeaderCell key={column.columnKey} style={i === columns.length - 1 ? lastCellStyles : connectorTableCellStyles}>
              <Text weight="semibold">{column.label}</Text>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody style={connectorTableCellStyles}>
        {items.map((item) => (
          <TableRow key={item.connectorId} className={addDisabled ? styles.emptyStateDisabled : ''} style={connectorTableCellStyles}>
            <TableCell className={styles.iconTextCell} style={connectorTableCellStyles}>
              <ConnectorIconWithName
                classes={{
                  root: 'msla-template-create-connector',
                  icon: 'msla-template-create-connector-icon',
                  text: 'msla-template-create-connector-text',
                }}
                connectorId={item.connectorId}
                onNameClick={shouldDisableEdits ? undefined : () => handleEditConnector(item.connectorId)}
              />
            </TableCell>
            <TableCell style={connectorTableCellStyles}>
              {item?.isConnected ? (
                <ConnectionDisplayName connectorId={item.connectorId} connectionId={item.connectionId} />
              ) : (
                INTL_TEXT.noConnectionText
              )}
            </TableCell>
            <TableCell className={styles.iconTextCell} style={connectorTableCellStyles}>
              {item?.isConnected ? <CheckmarkCircle20Filled className={styles.icon} color={tokens.colorPaletteGreenBackground3} /> : null}
              <Text className={styles.iconText}>{item?.isConnected ? INTL_TEXT.connectedText : INTL_TEXT.disconnectedText}</Text>
            </TableCell>
            <TableCell className={styles.iconsCell} style={{ ...connectorTableCellStyles }}>
              <Button
                className={styles.icon}
                appearance="subtle"
                size="small"
                icon={<Edit24Regular />}
                disabled={shouldDisableEdits}
                onClick={() => handleEditConnector(item.connectorId)}
                aria-label={INTL_TEXT.editButtonLabel}
              />
              {disableConnectorSelection ? null : (
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Delete24Regular />}
                  onClick={() => handleDeleteConnector(item.connectorId)}
                  aria-label={INTL_TEXT.deleteButtonLabel}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const ConnectionDisplayName = ({
  connectorId,
  connectionId,
}: {
  connectorId: string;
  connectionId: string;
}) => {
  const connectionInfo = useConnectionById(connectionId, connectorId);

  return <Text>{connectionInfo?.result?.properties?.displayName ?? getResourceNameFromId(connectionId)}</Text>;
};

import { Text, Button } from '@fluentui/react-components';
import { Add24Regular, ConnectorFilled, AppGeneric24Regular } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openConnectorPanelView, openOperationPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';
import { LogicAppSelector } from '../details/logicAppSelector';
import { ConnectorItem } from './ConnectorItem';
import { OperationItem } from './OperationItem';
import { useMemo, useCallback } from 'react';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/connector/connectorSlice';

export const McpWizard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();

  const { operationInfos } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
  }));

  const connectorIds = useMemo(() => {
    const ids = Object.values(operationInfos)
      .map((info) => info?.connectorId)
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }, [operationInfos]);

  const allOperations = useMemo(() => {
    return Object.values(operationInfos).filter((info) => Boolean(info?.operationId));
  }, [operationInfos]);

  const hasConnectors = connectorIds.length > 0;
  const hasOperations = allOperations.length > 0;

  const handleAddConnectors = useCallback(() => {
    dispatch(
      openConnectorPanelView({
        panelView: McpPanelView.SelectConnector,
      })
    );
  }, [dispatch]);

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

  const handleDeleteConnector = useCallback((connectorId: string) => {
    // TODO: Implement delete connector logic
    console.log('Delete connector:', connectorId);
  }, []);

  const handleEditOperation = useCallback(
    (operationId: string) => {
      dispatch(
        openOperationPanelView({
          selectedOperationId: operationId,
        })
      );
    },
    [dispatch]
  );

  const handleDeleteOperation = useCallback((operationId: string) => {
    // TODO: Implement delete operation logic
    console.log('Delete operation:', operationId);
  }, []);

  const INTL_TEXT = {
    connectorsTitle: intl.formatMessage({
      id: 'rCjtl8',
      defaultMessage: 'Connectors',
      description: 'Title for the connectors section',
    }),
    detailsTitle: intl.formatMessage({
      id: '1Orv4i',
      defaultMessage: 'Details',
      description: 'Title for the details section',
    }),
    operationsTitle: intl.formatMessage({
      id: 'FwHl49',
      defaultMessage: 'Operations',
      description: 'Title for the operations section',
    }),
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
    addConnectorsButton: intl.formatMessage({
      id: 'Q54uLy',
      defaultMessage: 'Add Connectors',
      description: 'Button text to add connectors',
    }),
    noOperations: intl.formatMessage({
      id: '04idsj',
      defaultMessage: 'No operations configured yet',
      description: 'Message when no operations are configured',
    }),
    addOperationsFirst: intl.formatMessage({
      id: 'iWZd2h',
      defaultMessage: 'Add connectors and operations to see them here',
      description: 'Message prompting to add operations',
    }),
  };

  return (
    <div className={styles.wizardContainer}>
      {/* Details Section */}
      <div className={styles.header}>
        <Text size={600} weight="semibold">
          {INTL_TEXT.detailsTitle}
        </Text>
      </div>

      <div className={styles.content}>
        <LogicAppSelector />
      </div>

      {/* Connectors Section */}
      <div className={styles.header}>
        <Text size={600} weight="semibold">
          {INTL_TEXT.connectorsTitle}
        </Text>
        <Button appearance="primary" icon={<Add24Regular />} onClick={handleAddConnectors}>
          {INTL_TEXT.addConnectorsButton}
        </Button>
      </div>

      <div className={styles.content}>
        {hasConnectors ? (
          <div className={styles.connectorsList}>
            {connectorIds.map((connectorId) => {
              return (
                <ConnectorItem
                  key={connectorId}
                  connectorId={connectorId}
                  displayName={connectorId}
                  connectionName="Default Connection" // Mock for now
                  status="connected" // Mock for now
                  icon="🔗" // Mock for now
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
            <Text size={500} weight="semibold" style={{ marginBottom: '8px' }}>
              {INTL_TEXT.noConnectors}
            </Text>
            <Text size={300} style={{ opacity: 0.7, marginBottom: '24px' }}>
              {INTL_TEXT.addFirstConnector}
            </Text>
            <Button appearance="primary" icon={<Add24Regular />} onClick={handleAddConnectors} size="large">
              {INTL_TEXT.addConnectorsButton}
            </Button>
          </div>
        )}
      </div>

      {/* Operations Section */}
      <div className={styles.header}>
        <Text size={600} weight="semibold">
          {INTL_TEXT.operationsTitle}
        </Text>
      </div>

      <div className={styles.content}>
        {hasOperations ? (
          <div className={styles.operationsList}>
            {allOperations.map((operationInfo) => {
              if (!operationInfo?.operationId || !operationInfo?.connectorId) {
                return null;
              }

              return (
                <OperationItem
                  key={operationInfo.operationId}
                  operationId={operationInfo.operationId}
                  operationName={operationInfo.operationId}
                  connectorIcon="🔗" // Mock for now
                  connectorName={operationInfo.connectorId}
                  onEdit={handleEditOperation}
                  onDelete={handleDeleteOperation}
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyOperationsIcon}>
              <AppGeneric24Regular />
            </div>
            <Text size={400} weight="medium" style={{ marginBottom: '8px' }}>
              {INTL_TEXT.noOperations}
            </Text>
            <Text size={300} style={{ opacity: 0.7 }}>
              {INTL_TEXT.addOperationsFirst}
            </Text>
          </div>
        )}
      </div>

      <McpPanelRoot />
    </div>
  );
};

import { Text, Button, Spinner } from '@fluentui/react-components';
import { ConnectorFilled, AppGeneric24Regular, Add16Regular } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openConnectorPanelView, openOperationPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';
import { type McpWorkflowsData, serializeMcpWorkflows } from '../../../core/mcp/utils/serializer';
import { resetQueriesOnRegisterMcpServer } from '../../../core/mcp/utils/queries';
import { LogicAppSelector } from '../details/logicAppSelector';
import { ConnectorItem } from './ConnectorItem';
import { OperationItem } from './OperationItem';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/connector/connectorSlice';
import { getConnector } from '../../../core/queries/operation';
import {
  deinitializeNodes,
  deinitializeOperationInfo,
  deinitializeOperationInfos,
} from '../../..//core/state/operation/operationMetadataSlice';
import type { Connector } from '@microsoft/logic-apps-shared';
import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';

export type RegisterMcpServerHandler = (workflowsData: McpWorkflowsData, onCompleted?: () => void) => Promise<void>;

export const McpWizard = ({ registerMcpServer }: { registerMcpServer: RegisterMcpServerHandler }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();
  const {
    connection,
    operation,
    resource: { subscriptionId, resourceGroup, logicAppName },
  } = useSelector((state: RootState) => state);

  const { operationInfos, isInitializingOperations } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    isInitializingOperations: state.operation.loadStatus.isInitializingOperations,
  }));

  const disableConfiguration = useMemo(() => !logicAppName, [logicAppName]);
  const [connectorsMap, setConnectorsMap] = useState<Record<string, Connector>>({});
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);

  const connectorIds = useMemo(() => {
    const ids = Object.values(operationInfos)
      .map((info) => info?.connectorId)
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }, [operationInfos]);

  const allOperations = useMemo(() => {
    return Object.values(operationInfos).filter((info) => Boolean(info?.operationId));
  }, [operationInfos]);

  // Fetch all connector data when connectorIds change
  useEffect(() => {
    const fetchConnectorsData = async () => {
      if (connectorIds.length === 0) {
        setConnectorsMap({});
        return;
      }

      setIsLoadingConnectors(true);

      try {
        // Fetch all connectors in parallel
        const connectorPromises = connectorIds.map(async (connectorId) => {
          try {
            const connector = await getConnector(connectorId, true);
            return { connectorId, connector };
          } catch (error) {
            console.error(`Failed to fetch connector ${connectorId}:`, error);
            return { connectorId, connector: null };
          }
        });

        const results = await Promise.allSettled(connectorPromises);

        // Build the connectors map
        const newConnectorsMap: Record<string, Connector> = {};
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.connector) {
            const { connectorId, connector } = result.value;
            newConnectorsMap[connectorId] = connector;
          }
        });

        setConnectorsMap(newConnectorsMap);
      } catch (error) {
        console.error('Error fetching connectors data:', error);
      } finally {
        setIsLoadingConnectors(false);
      }
    };

    fetchConnectorsData();
  }, [connectorIds]);

  const hasConnectors = connectorIds.length > 0;
  const hasOperations = allOperations.length > 0;
  const isLoadingOperations = isInitializingOperations || (connectorIds.length > 0 && allOperations.length === 0);

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

  const handleDeleteConnector = useCallback(
    (connectorId: string) => {
      const operationIdsToDelete = Object.entries(operationInfos)
        .filter(([_, info]) => info?.connectorId === connectorId)
        .map(([operationId, _]) => operationId);

      if (operationIdsToDelete.length > 0) {
        dispatch(deinitializeNodes(operationIdsToDelete));
        dispatch(deinitializeOperationInfos({ ids: operationIdsToDelete }));
      }

      setConnectorsMap((prev) => {
        const newMap = { ...prev };
        delete newMap[connectorId];
        return newMap;
      });
    },
    [operationInfos, dispatch]
  );

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

  const handleDeleteOperation = useCallback(
    (operationId: string) => {
      dispatch(deinitializeOperationInfo({ id: operationId }));
      dispatch(deinitializeNodes([operationId]));
    },
    [dispatch]
  );

  const onRegisterCompleted = useCallback(() => {
    resetQueriesOnRegisterMcpServer(subscriptionId, resourceGroup, logicAppName as string);
  }, [logicAppName, resourceGroup, subscriptionId]);

  const handleRegisterMcpServer = useCallback(async () => {
    const workflowsData = await serializeMcpWorkflows(
      {
        subscriptionId,
        resourceGroup,
        logicAppName: logicAppName as string,
      },
      connection,
      operation
    );
    console.log('Generated workflows:', workflowsData);
    await registerMcpServer(workflowsData, onRegisterCompleted);
  }, [connection, logicAppName, operation, registerMcpServer, resourceGroup, subscriptionId, onRegisterCompleted]);

  const handleCancel = useCallback(() => {
    // TODO: Implement cancel logic
    console.log('Cancel clicked');
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
    save: intl.formatMessage({
      id: 'RT8KNi',
      defaultMessage: 'Save',
      description: 'Save button text',
    }),
    cancel: intl.formatMessage({
      id: 'hHNj31',
      defaultMessage: 'Cancel',
      description: 'Cancel button text',
    }),
    loadingConnectorsText: intl.formatMessage({
      id: 'TWeskw',
      defaultMessage: 'Loading connectors...',
      description: 'Loading message for connectors',
    }),
    loadingOperationsText: intl.formatMessage({
      id: 'VFaFVs',
      defaultMessage: 'Loading operations...',
      description: 'Loading message for operations',
    }),
  };

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Save',
            id: 'ZigP3P',
            description: 'Button text for registering the MCP server',
          }),
          appearance: 'primary',
          onClick: () => {
            handleRegisterMcpServer();
          },
          disabled: !logicAppName || !subscriptionId || !resourceGroup || !connection || !operation,
        },
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Cancel',
            id: 'OA8qkc',
            description: 'Button text for closing the wizard without saving',
          }),
          onClick: handleCancel,
        },
      ],
    };
  }, [intl, logicAppName, subscriptionId, resourceGroup, connection, operation, handleCancel, handleRegisterMcpServer]);

  return (
    <div className={styles.wizardContainer}>
      <McpPanelRoot />

      {/* Details Section */}
      <div className={styles.section}>
        <div className={styles.header}>
          <Text size={400} weight="semibold">
            {INTL_TEXT.detailsTitle}
          </Text>
        </div>

        <div className={styles.content}>
          <LogicAppSelector />
        </div>
      </div>

      {/* Connectors Section */}
      <div className={styles.section}>
        <div className={styles.header}>
          <Text size={400} weight="semibold">
            {INTL_TEXT.connectorsTitle}
          </Text>
          <Button appearance="outline" icon={<Add16Regular />} onClick={handleAddConnectors} size="small" disabled={disableConfiguration}>
            {INTL_TEXT.addConnectorsButton}
          </Button>
        </div>

        <div className={styles.content}>
          {hasConnectors ? (
            <div className={styles.connectorsList}>
              {isLoadingConnectors ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                  <Spinner size="medium" label={INTL_TEXT.loadingConnectorsText} />
                </div>
              ) : (
                connectorIds.map((connectorId) => {
                  const connector = connectorsMap[connectorId];
                  return (
                    <ConnectorItem
                      key={connectorId}
                      connectorId={connectorId}
                      displayName={connector?.properties.displayName || connectorId}
                      connectionName="Default Connection"
                      status="connected"
                      icon={connector?.properties.iconUri ?? connector?.properties?.iconUrl}
                      onEdit={handleEditConnector}
                      onDelete={handleDeleteConnector}
                    />
                  );
                })
              )}
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
      </div>

      {/* Operations Section */}
      <div className={styles.section}>
        <div className={styles.header}>
          <Text size={400} weight="semibold">
            {INTL_TEXT.operationsTitle}
          </Text>
        </div>

        <div className={styles.content}>
          {isLoadingOperations ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
              <Spinner size="medium" label={INTL_TEXT.loadingOperationsText} />
            </div>
          ) : hasOperations ? (
            <div className={styles.operationsList}>
              {allOperations.map((operationInfo) => {
                if (!operationInfo?.operationId || !operationInfo?.connectorId) {
                  return null;
                }

                const connector = connectorsMap[operationInfo.connectorId];

                return (
                  <OperationItem
                    key={operationInfo.operationId}
                    operationId={operationInfo.operationId}
                    operationName={operationInfo.operationId}
                    connectorIcon={connector?.properties.iconUri ?? connector?.properties?.iconUrl}
                    connectorName={connector?.properties.displayName || operationInfo.connectorId}
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
      </div>

      <div className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </div>
    </div>
  );
};

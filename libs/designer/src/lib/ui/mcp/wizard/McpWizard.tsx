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
import { useMemo, useCallback } from 'react';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/connector/connectorSlice';
import {
  deinitializeNodes,
  deinitializeOperationInfo,
  deinitializeOperationInfos,
} from '../../../core/state/operation/operationMetadataSlice';
import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';

export type RegisterMcpServerHandler = (workflowsData: McpWorkflowsData, onCompleted?: () => void) => Promise<void>;

export const McpWizard = ({ registerMcpServer, onClose }: { registerMcpServer: RegisterMcpServerHandler; onClose: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();
  const {
    connection,
    operation,
    resource: { subscriptionId, resourceGroup, logicAppName },
  } = useSelector((state: RootState) => state);

  const { operationInfos, isInitializingOperations, operationMetadata, connectionsMapping, connectionReferences } = useSelector(
    (state: RootState) => ({
      operationInfos: state.operation.operationInfo,
      isInitializingOperations: state.operation.loadStatus.isInitializingOperations,
      operationMetadata: state.operation.operationMetadata,
      connectionsMapping: state.connection.connectionsMapping,
      connectionReferences: state.connection.connectionReferences,
    })
  );

  const disableConfiguration = useMemo(() => !logicAppName, [logicAppName]);

  const connectorIds = useMemo(() => {
    const ids = Object.values(operationInfos)
      .map((info) => info?.connectorId)
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }, [operationInfos]);

  const allOperations = useMemo(() => {
    return Object.values(operationInfos).filter((info) => Boolean(info?.operationId));
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
        displayName: connectorId,
        iconUri: metadata?.iconUri,
        connectionName,
        connectionStatus,
      };
    }

    return map;
  }, [connectionReferences, connectionsMapping, operationInfos, operationMetadata]);

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
    await registerMcpServer(workflowsData, onRegisterCompleted);
  }, [connection, logicAppName, operation, registerMcpServer, resourceGroup, subscriptionId, onRegisterCompleted]);

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
          onClick: onClose,
        },
      ],
    };
  }, [intl, logicAppName, subscriptionId, resourceGroup, connection, operation, onClose, handleRegisterMcpServer]);

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

                const metadata = operationMetadata[operationInfo.operationId];

                return (
                  <OperationItem
                    key={operationInfo.operationId}
                    operationId={operationInfo.operationId}
                    operationName={operationInfo.operationId}
                    connectorIcon={metadata?.iconUri}
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
      </div>

      <div className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </div>
    </div>
  );
};

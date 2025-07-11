import { Text, Button } from '@fluentui/react-components';
import { Add24Regular, ConnectorFilled } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openConnectorPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';
import { initializeOperationsMetadata } from '../../../core/actions/bjsworkflow/mcp';
import { ListOperations } from '../operations/ListOperations';
import { type McpWorkflowsData, serializeMcpWorkflows } from '../../../core/mcp/utils/serializer';
import { useCallback } from 'react';
import { resetQueriesOnRegisterMcpServer } from '../../../core/mcp/utils/queries';
import { LogicAppSelector } from '../details/logicAppSelector';

const sampleConnectorId =
  '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/northcentralus/managedApis/office365';

export type RegisterMcpServerHandler = (workflowsData: McpWorkflowsData, onCompleted?: () => void) => Promise<void>;
export const McpWizard = ({ registerMcpServer }: { registerMcpServer: RegisterMcpServerHandler }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();
  const connectors = [];
  const {
    connection,
    operation,
    resource: { subscriptionId, resourceGroup, logicAppName },
  } = useSelector((state: RootState) => state);

  const handleAddConnectors = () => {
    dispatch(
      openConnectorPanelView({
        panelView: McpPanelView.SelectConnector,
        selectedConnectorId: undefined,
      })
    );
  };

  const handleLoadOperations = () => {
    dispatch(
      initializeOperationsMetadata({
        operations: [
          { connectorId: sampleConnectorId, operationId: 'SendEmailV2', type: 'apiconnection' },
          { connectorId: sampleConnectorId, operationId: 'ForwardEmail_V2', type: 'apiconnection' },
          { connectorId: sampleConnectorId, operationId: 'ContactGetItems_V2', type: 'apiconnection' },
        ],
      })
    );
  };

  const onRegisterCompleted = useCallback(() => {
    resetQueriesOnRegisterMcpServer(subscriptionId, resourceGroup, logicAppName as string);
  }, [logicAppName, resourceGroup, subscriptionId]);

  const handleRegisterMcpServer = async () => {
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
  };

  const INTL_TEXT = {
    connectorsTitle: intl.formatMessage({ id: 'ERYPWh', defaultMessage: 'Connector', description: 'Title for the connector section' }),
    detailsTitle: intl.formatMessage({ id: '1Orv4i', defaultMessage: 'Details', description: 'Title for the details section' }),
    operationsTitle: intl.formatMessage({ id: 'FwHl49', defaultMessage: 'Operations', description: 'Title for the operations section' }),
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
  };

  return (
    <div className={styles.wizardContainer}>
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

      <div className={styles.section}>
        <div className={styles.header}>
          <Text size={400} weight="semibold">
            {INTL_TEXT.connectorsTitle}
          </Text>
          <Button appearance="primary" icon={<Add24Regular />} onClick={handleAddConnectors}>
            {INTL_TEXT.addConnectorsButton}
          </Button>
        </div>
        <div className={styles.content}>
          {connectors.length === 0 ? (
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
          ) : (
            <div className={styles.connectorsList}>{/* Connector items will go here */}</div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.header}>
            <Text size={400} weight="semibold">
              {INTL_TEXT.operationsTitle}
            </Text>
          </div>
          <div className={styles.content}>
            <ListOperations connectorId={sampleConnectorId} />
          </div>
        </div>
      </div>

      <McpPanelRoot />

      {/* TO BE REMOVED */}
      <div>
        <Text size={600} weight="semibold">
          {'Test section'}
        </Text>
        <div>
          <Button onClick={handleLoadOperations}>{'Load operations'}</Button>
          <Button onClick={handleRegisterMcpServer}>{'Register MCP Server'}</Button>
        </div>
      </div>
    </div>
  );
};

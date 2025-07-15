import { Text, Button } from '@fluentui/react-components';
import { Add16Regular } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openConnectorPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';
import { type McpWorkflowsData, serializeMcpWorkflows } from '../../../core/mcp/utils/serializer';
import { resetQueriesOnRegisterMcpServer } from '../../../core/mcp/utils/queries';
import { LogicAppSelector } from '../details/logicAppSelector';
import { useMemo, useCallback } from 'react';
import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { ListOperations } from '../operations/ListOperations';
import { ListConnectors } from '../connectors/ListConnectors';

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

  const disableConfiguration = useMemo(() => !logicAppName, [logicAppName]);

  const handleAddConnectors = useCallback(() => {
    dispatch(
      openConnectorPanelView({
        panelView: McpPanelView.SelectConnector,
      })
    );
  }, [dispatch]);

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
    addConnectorsButton: intl.formatMessage({
      id: 'Q54uLy',
      defaultMessage: 'Add Connectors',
      description: 'Button text to add connectors',
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
          <ListConnectors />
        </div>

        {/* Operations Section */}
        <div className={styles.section}>
          <div className={styles.header}>
            <Text size={400} weight="semibold">
              {INTL_TEXT.operationsTitle}
            </Text>
          </div>

          <div className={styles.content}>
            <ListOperations />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </div>
    </div>
  );
};

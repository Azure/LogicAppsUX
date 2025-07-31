import { Text, Button } from '@fluentui/react-components';
import { Add16Regular } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openConnectorPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';
import { type McpServerCreateData, serializeMcpWorkflows } from '../../../core/mcp/utils/serializer';
import { resetQueriesOnRegisterMcpServer } from '../../../core/mcp/utils/queries';
import { LogicAppSelector } from '../details/logicAppSelector';
import { useMemo, useCallback } from 'react';
import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { ListOperations } from '../operations/ListOperations';
import { ListConnectors } from '../connectors/ListConnectors';
import { DescriptionWithLink } from '../../configuretemplate/common';

export type RegisterMcpServerHandler = (workflowsData: McpServerCreateData, onCompleted?: () => void) => Promise<void>;

export const McpWizard = ({ registerMcpServer, onClose }: { registerMcpServer: RegisterMcpServerHandler; onClose: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();
  const {
    connection,
    operations,
    resource: { subscriptionId, resourceGroup, logicAppName },
  } = useSelector((state: RootState) => state);

  const disableConfiguration = useMemo(() => !logicAppName, [logicAppName]);
  const connectorExists = useMemo(() => Object.keys(operations.operationInfo).length > 0, [operations.operationInfo]);

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
      operations
    );
    await registerMcpServer(workflowsData, onRegisterCompleted);
  }, [connection, logicAppName, operations, registerMcpServer, resourceGroup, subscriptionId, onRegisterCompleted]);

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: '8p/J8u',
      defaultMessage: 'Register Logic Apps',
      description: 'Title for the MCP server registration wizard',
    }),
    description: intl.formatMessage({
      id: '9LxnGv',
      defaultMessage: 'Subscription details are pulled from API Center project details.',
      description: 'Description for the MCP server registration wizard',
    }),
    learnMore: intl.formatMessage({
      id: 'JJGVdl',
      defaultMessage: 'Learn more',
      description: 'Learn more link text.',
    }),
    howToSetup: intl.formatMessage({
      id: 'H94rqk',
      defaultMessage: 'How to set up?',
      description: 'Title for the setup instructions link',
    }),
    howToSetupConnectors: intl.formatMessage({
      id: 'Xy2H+g',
      defaultMessage: 'How to set up your connectors?',
      description: 'Text for the how to set up connectors link',
    }),
    connectorsTitle: intl.formatMessage({
      id: 'rCjtl8',
      defaultMessage: 'Connectors',
      description: 'Title for the connectors section',
    }),
    connectorsDescription: intl.formatMessage({
      id: 'dg91jv',
      defaultMessage:
        'Connectors allow your logic app to interact with other services. Add connectors to enable operations and parameters.',
      description: 'Description for the connectors section',
    }),
    detailsTitle: intl.formatMessage({
      id: '1Orv4i',
      defaultMessage: 'Details',
      description: 'Title for the details section',
    }),
    detailsDescription: intl.formatMessage({
      id: 'FVQTll',
      defaultMessage: 'Select an existing empty logic app instance.',
      description: 'Description for the details section',
    }),
    mainSectionTitle: intl.formatMessage({
      id: 'UaGLXG',
      defaultMessage: 'Knowledge',
      description: 'Title for the main section',
    }),
    mainSectionDescription: intl.formatMessage({
      id: 'fXzK6b',
      defaultMessage:
        'Connectors include operations and parameters. Add connectors to your logic app to enable it to interact with other services.',
      description: 'Description for the main section',
    }),
    toolsTitle: intl.formatMessage({
      id: 'q25VR+',
      defaultMessage: 'Tools',
      description: 'Title for the tools section',
    }),
    toolsDescription: intl.formatMessage({
      id: 'JUgajj',
      defaultMessage:
        'Tools include operations from connector and its corresponding parameters. Add and customize tool and its parameters.',
      description: 'Description for the tools section',
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
          disabled: !logicAppName || !subscriptionId || !resourceGroup || !connection || !operations,
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
  }, [intl, logicAppName, subscriptionId, resourceGroup, connection, operations, onClose, handleRegisterMcpServer]);

  return (
    <div className={styles.wizardContainer}>
      <McpPanelRoot />

      <Text size={700} weight="bold">
        {INTL_TEXT.title}
      </Text>
      <DescriptionWithLink
        text={INTL_TEXT.description}
        linkUrl="https://go.microsoft.com/fwlink/?linkid=2330611"
        linkText={INTL_TEXT.learnMore}
      />

      <div className={styles.scrollableContent}>
        {/* Details Section */}
        <div className={styles.mainSection}>
          <div className={styles.header}>
            <Text size={400} weight="bold">
              {INTL_TEXT.detailsTitle}
            </Text>
          </div>

          <DescriptionWithLink
            text={INTL_TEXT.detailsDescription}
            linkUrl="https://go.microsoft.com/fwlink/?linkid=2330610"
            linkText={INTL_TEXT.howToSetup}
          />
          <div className={styles.section}>
            <LogicAppSelector />
          </div>
        </div>

        {/* Main Section */}
        <div className={styles.mainSection}>
          <div className={styles.header}>
            <Text size={400} weight="bold">
              {INTL_TEXT.mainSectionTitle}
            </Text>
          </div>
          <DescriptionWithLink
            text={INTL_TEXT.mainSectionDescription}
            linkUrl="https://go.microsoft.com/fwlink/?linkid=2330612"
            linkText={INTL_TEXT.howToSetupConnectors}
          />

          <div className={styles.section}>
            <div className={styles.header}>
              <Text size={400} weight="semibold">
                {INTL_TEXT.connectorsTitle}
              </Text>
              <Button
                appearance="secondary"
                icon={<Add16Regular />}
                onClick={handleAddConnectors}
                size="small"
                disabled={disableConfiguration || connectorExists}
              >
                {INTL_TEXT.addConnectorsButton}
              </Button>
            </div>
            <DescriptionWithLink text={INTL_TEXT.connectorsDescription} />
            <ListConnectors addConnectors={handleAddConnectors} addDisabled={disableConfiguration} />
          </div>

          {connectorExists ? (
            <div className={styles.content}>
              {/* Operations Section */}
              <div className={styles.section}>
                <div className={styles.header}>
                  <Text size={400} weight="semibold">
                    {INTL_TEXT.toolsTitle}
                  </Text>
                </div>
                <DescriptionWithLink text={INTL_TEXT.toolsDescription} />

                <ListOperations />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </div>
    </div>
  );
};

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
import { operationHasEmptyStaticDependencies } from '../../../core/mcp/utils/helper';

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
  const hasIncompleteOperationConfiguration = useMemo(() => {
    return Object.entries(operations.inputParameters).some(([operationId, nodeInputs]) =>
      operationHasEmptyStaticDependencies(nodeInputs, operations.dependencies[operationId]?.inputs ?? {})
    );
  }, [operations.dependencies, operations.inputParameters]);

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
      id: 'fs3SkE',
      defaultMessage: 'Register logic apps',
      description: 'Title for the MCP server registration wizard',
    }),
    description: intl.formatMessage({
      id: 'xPO/1M',
      defaultMessage:
        'Register an MCP server that you create, starting with an empty logic app. Create tools that run connector actions so your server can perform tasks. Available logic apps depend on the Azure subscription for your API Center resource.',
      description: 'Description for the MCP server registration wizard',
    }),
    learnMore: intl.formatMessage({
      id: 'JJGVdl',
      defaultMessage: 'Learn more',
      description: 'Learn more link text.',
    }),
    howToSetup: intl.formatMessage({
      id: 'sBvjoY',
      defaultMessage: 'How to set up a logic app?',
      description: 'Title for the setup instructions link',
    }),
    howToSetupConnectors: intl.formatMessage({
      id: '7p0pJS',
      defaultMessage: 'What are connectors?',
      description: 'Text for connectors link',
    }),
    connectorsTitle: intl.formatMessage({
      id: 'rCjtl8',
      defaultMessage: 'Connectors',
      description: 'Title for the connectors section',
    }),
    connectorsDescription: intl.formatMessage({
      id: 'HRXRwg',
      defaultMessage:
        'Connectors provide actions for you to create tools. Select a connector and the actions you want. Finish by creating any needed connections.',
      description: 'Description for the connectors section',
    }),
    resourcesTitle: intl.formatMessage({
      id: 'CaiUX0',
      defaultMessage: 'Resources',
      description: 'Title for the resources section',
    }),
    resourcesDescription: intl.formatMessage({
      id: 'x2Osbf',
      defaultMessage: 'Select an empty logic app.',
      description: 'Description for the resources section',
    }),
    mainSectionTitle: intl.formatMessage({
      id: 'nvkl5y',
      defaultMessage: 'Toolbox',
      description: 'Title for the main section',
    }),
    mainSectionDescription: intl.formatMessage({
      id: 'qif1I+',
      defaultMessage: 'Build tools for your MCP server by selecting connectors and their actions.',
      description: 'Description for the main section',
    }),
    toolsTitle: intl.formatMessage({
      id: 'q25VR+',
      defaultMessage: 'Tools',
      description: 'Title for the tools section',
    }),
    toolsDescription: intl.formatMessage({
      id: 'blSUye',
      defaultMessage:
        'Each tool uses an action and has parameters that accept input. Check the default input sources and make any necessary changes to meet your scenario.',
      description: 'Description for the tools section',
    }),
    addConnectorsButton: intl.formatMessage({
      id: 'RcyaI2',
      defaultMessage: 'Add connector',
      description: 'Button text to add connector',
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
            defaultMessage: 'Rgister',
            id: 'RtP37y',
            description: 'Button text for registering the MCP server',
          }),
          appearance: 'primary',
          onClick: () => {
            handleRegisterMcpServer();
          },
          disabled: !logicAppName || !subscriptionId || !resourceGroup || !connection || !operations || hasIncompleteOperationConfiguration,
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
  }, [
    intl,
    logicAppName,
    subscriptionId,
    resourceGroup,
    connection,
    operations,
    hasIncompleteOperationConfiguration,
    onClose,
    handleRegisterMcpServer,
  ]);

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
              {INTL_TEXT.resourcesTitle}
            </Text>
          </div>

          <DescriptionWithLink
            text={INTL_TEXT.resourcesDescription}
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

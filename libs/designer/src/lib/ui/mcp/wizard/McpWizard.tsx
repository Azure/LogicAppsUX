import { Text, Button, MessageBar, MessageBarBody, MessageBarTitle, mergeClasses, tokens } from '@fluentui/react-components';
import { Add16Regular, Settings16Regular } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';
import { type McpServerCreateData, serializeMcpWorkflows } from '../../../core/mcp/utils/serializer';
import { resetQueriesOnRegisterMcpServer, useAllMcpServersFromVfs } from '../../../core/mcp/utils/queries';
import { LogicAppSelector } from '../details/logicAppSelector';
import { useMemo, useCallback, useState } from 'react';
import type { TemplatePanelFooterProps, TemplatesSectionItem } from '@microsoft/designer-ui';
import { TemplatesPanelFooter, TemplatesSection } from '@microsoft/designer-ui';
import { ListOperations } from '../operations/ListOperations';
import { ListConnectors } from '../connectors/ListConnectors';
import { DescriptionWithLink } from '../../configuretemplate/common';
import { operationHasEmptyStaticDependencies } from '../../../core/mcp/utils/helper';
import { validateMcpServerDescription, validateMcpServerName } from '../../../core/mcp/utils/server';
import { equals, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { selectConnectorId, selectOperations } from '../../../core/state/mcp/mcpselectionslice';
import { SuccessToast } from '../logicapps/common';
import { useValidMcpConnection } from '../hooks/connection';
import { getStandardLogicAppId } from '../../../core/configuretemplate/utils/helper';

export type RegisterMcpServerHandler = (workflowsData: McpServerCreateData, onCompleted?: () => void) => Promise<void>;

interface McpWizardProps {
  registerMcpServer: RegisterMcpServerHandler;
  onClose: () => void;
}

export const McpWizard = ({ registerMcpServer, onClose }: McpWizardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();
  const {
    connection,
    operations,
    resource: { subscriptionId, resourceGroup, location, logicAppName, newLogicAppDetails },
    mcpOptions: { disableConfiguration },
    mcpSelection: { selectedConnectorId, disableConnectorSelection },
  } = useSelector((state: RootState) => state);

  const logicAppId = useMemo(
    () => getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName ?? ''),
    [subscriptionId, resourceGroup, logicAppName]
  );
  const { data: existingServers } = useAllMcpServersFromVfs(logicAppId);

  const [serverName, setServerName] = useState('');
  const [serverDescription, setServerDescription] = useState('');
  const [serverNameError, setServerNameError] = useState<string | undefined>(undefined);
  const [serverDescriptionError, setServerDescriptionError] = useState<string | undefined>(undefined);

  const connectorExists = useMemo(() => {
    return (disableConnectorSelection && !!selectedConnectorId) || Object.keys(operations.operationInfo).length > 0;
  }, [disableConnectorSelection, operations.operationInfo, selectedConnectorId]);

  const hasIncompleteOperationConfiguration = useMemo(() => {
    return Object.entries(operations.inputParameters).some(([operationId, nodeInputs]) =>
      operationHasEmptyStaticDependencies(nodeInputs, operations.dependencies[operationId]?.inputs ?? {})
    );
  }, [operations.dependencies, operations.inputParameters]);
  const toolsCount = Object.values(operations?.operationInfo || {}).filter((info) => Boolean(info?.operationId)).length;

  const handleAddConnectors = useCallback(() => {
    dispatch(
      openMcpPanelView({
        panelView: McpPanelView.SelectConnector,
      })
    );

    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'MCP.McpWizard',
      message: 'Add connector button clicked',
      args: [`subscriptionId:${subscriptionId}`, `resourceGroup:${resourceGroup}`, `location:${location}`, `logicAppName:${logicAppName}`],
    });
  }, [dispatch, logicAppName, resourceGroup, location, subscriptionId]);

  const onRegisterCompleted = useCallback(() => {
    resetQueriesOnRegisterMcpServer(subscriptionId, resourceGroup, logicAppName as string);

    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'MCP.McpWizard',
      message: 'Successfully registered MCP server',
      args: [
        `subscriptionId:${subscriptionId}`,
        `resourceGroup:${resourceGroup}`,
        `location:${location}`,
        `logicAppName:${logicAppName}`,
        `operationInfos:${Object.values(operations.operationInfo)
          .map((info) => `${info.connectorId}:${info.operationId}`)
          .join(',')}`,
        'isExistingLogicApp:false', // TODO: When we support create logic apps, this will need to be dynamic
      ],
    });
  }, [logicAppName, resourceGroup, location, subscriptionId, operations.operationInfo]);

  const setupConnectorAndOperations = useCallback(() => {
    // Get all operations for this specific connector
    const selectedOperations: string[] = [];
    let connectorIdToSet: string | undefined;
    for (const { connectorId, operationId } of Object.values(operations.operationInfo)) {
      if (!connectorIdToSet) {
        connectorIdToSet = connectorId;
      }

      selectedOperations.push(operationId);
    }

    if (connectorIdToSet !== undefined) {
      dispatch(selectConnectorId(connectorIdToSet));
      dispatch(selectOperations(selectedOperations));
    }
  }, [dispatch, operations.operationInfo]);

  const handleAddOperations = useCallback(() => {
    setupConnectorAndOperations();

    dispatch(
      openMcpPanelView({
        panelView: McpPanelView.UpdateOperation,
      })
    );

    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'MCP.McpWizard',
      message: 'Add actions button clicked',
      args: [`connectorId:${selectedConnectorId}`],
    });
  }, [dispatch, selectedConnectorId, setupConnectorAndOperations]);

  const handleSetup = useCallback(() => {
    setupConnectorAndOperations();
    dispatch(
      openMcpPanelView({
        panelView: McpPanelView.SelectOperation,
      })
    );
  }, [dispatch, setupConnectorAndOperations]);

  const isExistingLogicApp = useMemo(() => {
    return !!newLogicAppDetails?.appName && equals(newLogicAppDetails.appName, logicAppName);
  }, [newLogicAppDetails, logicAppName]);

  const handleRegisterMcpServer = useCallback(async () => {
    try {
      const workflowsData = await serializeMcpWorkflows(
        {
          subscriptionId,
          resourceGroup,
          logicAppName: logicAppName as string,
        },
        connection,
        operations
      );
      await registerMcpServer({ ...workflowsData, serverInfo: { name: serverName, description: serverDescription } }, () =>
        onRegisterCompleted()
      );
    } catch (error: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'MCP.McpWizard',
        message: 'Failed to register MCP server',
        error: error instanceof Error ? error : undefined,
        args: [
          `subscriptionId:${subscriptionId}`,
          `resourceGroup:${resourceGroup}`,
          `location:${location}`,
          `logicAppName:${logicAppName}`,
          `operationInfos:${Object.values(operations.operationInfo)
            .map((info) => `${info.connectorId}:${info.operationId}`)
            .join(',')}`,
          `isExistingLogicApp:${isExistingLogicApp}`,
          `serverName:${serverName}`,
          `serverDescription:${serverDescription}`,
        ],
      });
    }
  }, [
    subscriptionId,
    resourceGroup,
    logicAppName,
    connection,
    operations,
    registerMcpServer,
    serverName,
    serverDescription,
    onRegisterCompleted,
    location,
    isExistingLogicApp,
  ]);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const handleAppCreate = useCallback(() => {
    setShowSuccessToast(!showSuccessToast);
  }, [showSuccessToast]);

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'EjYF8U',
      defaultMessage: 'Register an MCP server with Azure Logic Apps',
      description: 'Title for the MCP server registration wizard',
    }),
    description: intl.formatMessage({
      id: 'ifZ8ok',
      defaultMessage:
        'Register an MCP server that you create, starting with a logic app. Create tools that run connector actions so your server can perform tasks. Available logic apps depend on your current Azure subscription.',
      description: 'Description for the MCP server registration wizard',
    }),
    learnMore: intl.formatMessage({
      id: 'nwZ0IY',
      defaultMessage: 'Learn about logic apps',
      description: 'Learn more link text.',
    }),
    howToSetup: intl.formatMessage({
      id: 'ZmSjQV',
      defaultMessage: 'Learn how to set up a logic app',
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
    detailsSectionTitle: intl.formatMessage({
      id: '7pjV7b',
      defaultMessage: 'Project details',
      description: 'Title for the details section',
    }),
    detailsSectionDescription: intl.formatMessage({
      id: 'PFjaC0',
      defaultMessage: 'Select an existing logic app or create a new logic app.',
      description: 'Description for the details section',
    }),
    mainSectionDescription: intl.formatMessage({
      id: 'qif1I+',
      defaultMessage: 'Build tools for your MCP server by selecting connectors and their actions.',
      description: 'Description for the main section',
    }),
    serverNameLabel: intl.formatMessage({
      id: 'Iov0/J',
      defaultMessage: 'MCP server name',
      description: 'Label for the MCP server name field',
    }),
    serverNamePlaceholder: intl.formatMessage({
      id: 'qKVOwV',
      defaultMessage: 'Enter a name for the MCP server',
      description: 'Placeholder text for the MCP server name field',
    }),
    serverDescriptionLabel: intl.formatMessage({
      id: '0l+F9w',
      defaultMessage: 'Description',
      description: 'Label for the MCP server description field',
    }),
    serverDescriptionPlaceholder: intl.formatMessage({
      id: 'SYDKyg',
      defaultMessage: 'Enter a description for the MCP server',
      description: 'Placeholder text for the MCP server description field',
    }),
    logicAppLabel: intl.formatMessage({
      id: 'BsZRu5',
      defaultMessage: 'Logic app',
      description: 'Label field for logic app selector',
    }),
    actionsTitle: intl.formatMessage({
      id: 'ao1O9z',
      defaultMessage: 'Actions',
      description: 'Title for the actions section',
    }),
    actionsDescription: intl.formatMessage({
      id: 'SY9ptd',
      defaultMessage:
        'Each action has parameters that accept input. Check the default input sources and make any necessary changes to meet your scenario.',
      description: 'Description for the actions section',
    }),
    parametersTitle: intl.formatMessage({
      id: '8f/OBl',
      defaultMessage: 'Parameters',
      description: 'The title for the action parameters section',
    }),
    toolsInfoDescription: intl.formatMessage({
      id: 'EMcFck',
      defaultMessage: 'Some parameters might need configuration. Review before you continue.',
      description: 'The description for the actions information section',
    }),
    addToolsButton: intl.formatMessage({
      id: 'c3Ff/+',
      defaultMessage: 'Add',
      description: 'Button text to add tools',
    }),
    addConnectorsButton: intl.formatMessage({
      id: '9III/+',
      defaultMessage: 'Add',
      description: 'Button text to add connector',
    }),
    setupButton: intl.formatMessage({
      id: 'sNWUvE',
      defaultMessage: 'Set up',
      description: 'Button text to setup tools',
    }),
    loadingConnectorsText: intl.formatMessage({
      id: 'TWeskw',
      defaultMessage: 'Loading connectors...',
      description: 'Loading message for connectors',
    }),
  };

  const setMcpServerName = useCallback(
    (value: string) => {
      setServerName(value);
      const errorMessage = validateMcpServerName(value, existingServers ?? []);
      setServerNameError(errorMessage);
    },
    [existingServers]
  );

  const setMcpServerDescription = useCallback((value: string) => {
    setServerDescription(value);
    const errorMessage = validateMcpServerDescription(value);
    setServerDescriptionError(errorMessage);
  }, []);

  const serverFields = useMemo(
    () =>
      [
        {
          label: INTL_TEXT.serverNameLabel,
          value: serverName,
          type: 'textfield',
          placeholder: INTL_TEXT.serverNamePlaceholder,
          required: true,
          onChange: setMcpServerName,
          errorMessage: serverNameError,
        },
        {
          label: INTL_TEXT.serverDescriptionLabel,
          value: serverDescription,
          type: 'textarea',
          placeholder: INTL_TEXT.serverDescriptionPlaceholder,
          required: true,
          onChange: setMcpServerDescription,
          errorMessage: serverDescriptionError,
        },
        {
          label: INTL_TEXT.logicAppLabel,
          value: logicAppName || '',
          type: 'custom',
          required: true,
          onRenderItem: () => <LogicAppSelector />,
        },
      ] as TemplatesSectionItem[],
    [
      INTL_TEXT.logicAppLabel,
      INTL_TEXT.serverDescriptionLabel,
      INTL_TEXT.serverDescriptionPlaceholder,
      INTL_TEXT.serverNameLabel,
      INTL_TEXT.serverNamePlaceholder,
      logicAppName,
      serverDescription,
      serverDescriptionError,
      serverName,
      serverNameError,
      setMcpServerDescription,
      setMcpServerName,
    ]
  );

  const hasValidConnection = useValidMcpConnection();

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Register',
            id: 'YZaLxg',
            description: 'Button text for registering the MCP server',
          }),
          appearance: 'primary',
          onClick: () => {
            handleRegisterMcpServer();
          },
          disabled:
            !serverName ||
            !!serverNameError ||
            !serverDescription ||
            !!serverDescriptionError ||
            !logicAppName ||
            !subscriptionId ||
            !resourceGroup ||
            !connectorExists ||
            !hasValidConnection ||
            !Object.keys(operations.operationInfo).length ||
            hasIncompleteOperationConfiguration,
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
    serverName,
    serverNameError,
    serverDescription,
    serverDescriptionError,
    logicAppName,
    subscriptionId,
    resourceGroup,
    connectorExists,
    hasValidConnection,
    operations.operationInfo,
    hasIncompleteOperationConfiguration,
    onClose,
    handleRegisterMcpServer,
  ]);

  return (
    <div className={styles.wizardContainer}>
      {showSuccessToast ? <SuccessToast show={showSuccessToast} /> : null}
      <McpPanelRoot onCreateApp={handleAppCreate} />

      <DescriptionWithLink
        text={INTL_TEXT.description}
        linkUrl="https://go.microsoft.com/fwlink/?linkid=2330611"
        linkText={INTL_TEXT.learnMore}
      />

      <div className={styles.scrollableContent}>
        {/* Details Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Text size={400} weight="bold">
              {INTL_TEXT.detailsSectionTitle}
            </Text>
          </div>

          <DescriptionWithLink
            className={styles.sectionDescription}
            text={INTL_TEXT.detailsSectionDescription}
            linkUrl="https://go.microsoft.com/fwlink/?linkid=2330610"
            linkText={INTL_TEXT.howToSetup}
          />

          <TemplatesSection items={serverFields} cssOverrides={{ sectionItems: styles.serverSection }} />
        </div>

        {/* Main Section */}
        <div style={{ margin: 0 }}>
          <div className={styles.sectionHeader}>
            <div className={styles.toolsHeader}>
              <Text size={400} weight="bold">
                {intl.formatMessage({
                  id: 'tHFp5l',
                  defaultMessage: 'Tools',
                  description: 'Title for the main section with the count of tools',
                })}
              </Text>
              <div style={{ color: tokens.colorPaletteRedForeground3 }}>{'*'}</div>
              <div style={{ paddingLeft: tokens.spacingHorizontalXS }}>{`(${toolsCount})`}</div>
            </div>
            {disableConnectorSelection ? (
              <Button
                appearance="secondary"
                icon={<Settings16Regular />}
                onClick={handleSetup}
                size="small"
                disabled={disableConfiguration}
              >
                {INTL_TEXT.setupButton}
              </Button>
            ) : null}
          </div>
          <DescriptionWithLink
            text={INTL_TEXT.mainSectionDescription}
            linkUrl="https://go.microsoft.com/fwlink/?linkid=2330612"
            linkText={INTL_TEXT.howToSetupConnectors}
          />

          <div className={mergeClasses(styles.section, disableConfiguration ? styles.sectionDisabled : '')}>
            <div className={styles.header}>
              <Text size={400} weight="semibold">
                {INTL_TEXT.connectorsTitle}
              </Text>
              {disableConnectorSelection || connectorExists ? null : (
                <Button
                  appearance="secondary"
                  icon={<Add16Regular />}
                  onClick={handleAddConnectors}
                  size="small"
                  disabled={disableConfiguration}
                >
                  {INTL_TEXT.addConnectorsButton}
                </Button>
              )}
            </div>
            <DescriptionWithLink text={INTL_TEXT.connectorsDescription} />
            <ListConnectors addConnectors={handleAddConnectors} addDisabled={disableConfiguration} />
          </div>

          {connectorExists && !!logicAppName ? (
            <div className={styles.content}>
              {/* Operations Section */}
              <div className={styles.section}>
                <div className={styles.header}>
                  <Text size={400} weight="semibold">
                    {INTL_TEXT.actionsTitle}
                  </Text>
                  <Button
                    appearance="secondary"
                    icon={<Add16Regular />}
                    disabled={!hasValidConnection}
                    onClick={handleAddOperations}
                    size="small"
                  >
                    {INTL_TEXT.addToolsButton}
                  </Button>
                </div>
                <DescriptionWithLink text={INTL_TEXT.actionsDescription} />

                {hasIncompleteOperationConfiguration ? (
                  <MessageBar intent="info" className="msla-templates-error-message-bar">
                    <MessageBarBody>
                      <MessageBarTitle>{INTL_TEXT.parametersTitle}</MessageBarTitle>
                      <Text>{INTL_TEXT.toolsInfoDescription}</Text>
                    </MessageBarBody>
                  </MessageBar>
                ) : null}

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

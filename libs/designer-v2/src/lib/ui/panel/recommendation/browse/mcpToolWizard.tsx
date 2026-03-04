import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Text, Spinner, Button, MessageBar, MessageBarBody, Label, Radio, RadioGroup } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { TemplatesPanelFooter, type TemplatePanelFooterProps, SimpleDictionary, SearchableDropdown } from '@microsoft/designer-ui';
import { ConnectionType, ConnectorService, removeConnectionPrefix } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../../core';
import { ConnectionTable } from '../../../panel/connectionsPanel/selectConnection/connectionTable';
import { CreateConnectionInternal } from '../../../panel/connectionsPanel/createConnection/createConnectionInternal';
import type { CreatedConnectionPayload } from '../../../panel/connectionsPanel/createConnection/createConnectionWrapper';
import {
  useMcpToolWizard,
  useMcpWizardStep,
  useMcpWizardConnectionId,
  useMcpWizardAllowedTools,
  useMcpWizardHeaders,
  useDiscoveryPanelRelationshipIds,
} from '../../../../core/state/panel/panelSelectors';
import {
  closeMcpToolWizard,
  setMcpWizardStep,
  setMcpWizardConnection,
  setMcpWizardTools,
  setMcpWizardHeaders,
} from '../../../../core/state/panel/panelSlice';
import { MCP_WIZARD_STEP } from '../../../../core/state/panel/panelTypes';
import { useConnectionsForConnector, getConnectorWithSwagger } from '../../../../core/queries/connections';
import { isConnectionValid, getAssistedConnectionProps } from '../../../../core/utils/connectors/connections';
import { addOperation } from '../../../../core/actions/bjsworkflow/add';
import { useMcpToolWizardStyles } from './styles/McpToolWizard.styles';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import type { Connection, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { MCP_CLIENT_CONNECTOR_ID } from '../helpers';

export const McpToolWizard = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const classes = useMcpToolWizardStyles();

  const wizardState = useMcpToolWizard();
  const currentStep = useMcpWizardStep();
  const connectionId = useMcpWizardConnectionId();
  const allowedTools = useMcpWizardAllowedTools();
  const headers = useMcpWizardHeaders();
  const relationshipIds = useDiscoveryPanelRelationshipIds();

  // Determine if this is a managed MCP server (vs built-in)
  const isManagedMcpServer = wizardState?.operation?.properties?.operationKind === 'Managed';

  // Get the appropriate connector ID based on server type
  // For managed MCP servers, use the api.id from the server properties
  // For built-in MCP servers, use the default MCP client connector ID
  const connectorId = useMemo(() => {
    if (isManagedMcpServer && wizardState?.operation?.properties?.api?.id) {
      return wizardState.operation.properties.api.id;
    }
    return MCP_CLIENT_CONNECTOR_ID;
  }, [isManagedMcpServer, wizardState?.operation?.properties?.api?.id]);

  // Fetch connector for create connection
  const { data: connector } = useConnector(connectorId);
  const assistedConnectionProps = useMemo(() => (connector ? getAssistedConnectionProps(connector) : undefined), [connector]);

  // Fetch connections for the appropriate connector
  const {
    data: connectionsData,
    isLoading: isConnectionsLoading,
    refetch: refetchConnections,
  } = useConnectionsForConnector(connectorId, true);
  const validConnections = useMemo(() => (connectionsData ?? []).filter(isConnectionValid), [connectionsData]);

  // Track if user has visited create connection step (to prevent auto-navigation after cancel)
  const [hasVisitedCreateConnection, setHasVisitedCreateConnection] = useState(false);

  // Auto-navigate to create connection step if no connections exist (only on first load)
  useEffect(() => {
    if (
      !isConnectionsLoading &&
      validConnections.length === 0 &&
      currentStep === MCP_WIZARD_STEP.CONNECTION &&
      !hasVisitedCreateConnection
    ) {
      setHasVisitedCreateConnection(true);
      dispatch(setMcpWizardStep(MCP_WIZARD_STEP.CREATE_CONNECTION));
    }
  }, [isConnectionsLoading, validConnections.length, currentStep, dispatch, hasVisitedCreateConnection]);

  // Track local selection before committing
  const [localConnectionId, setLocalConnectionId] = useState<string | undefined>(connectionId);

  // Track if connection was pre-selected from browse when wizard opened (locked - can't go back to step 1)
  // Read from Redux state - this is set once when the wizard opens and survives re-mounts
  const isConnectionLocked = wizardState?.isConnectionLocked ?? false;

  // Track if wizard was opened directly at CREATE_CONNECTION step (for builtin MCP server)
  // If so, cancel should close the wizard instead of going to CONNECTION step
  const [wasOpenedAtCreateConnection] = useState(() => currentStep === MCP_WIZARD_STEP.CREATE_CONNECTION);

  // Fetch tools for the selected connection
  const {
    data: toolsData,
    isLoading: isToolsLoading,
    error: toolsError,
    refetch: refetchTools,
  } = useQuery({
    queryKey: ['mcpTools', localConnectionId, wizardState?.operation?.id, isManagedMcpServer, connectorId],
    queryFn: async () => {
      if (!localConnectionId) {
        return [];
      }

      const operationId = wizardState?.operation?.name;

      // mcpServerPath only applies for managed MCP servers
      let mcpServerPath: string | undefined;
      if (isManagedMcpServer) {
        const { parsedSwagger } = await getConnectorWithSwagger(connectorId);
        const swaggerOperation = operationId ? parsedSwagger.getOperationByOperationId(operationId) : undefined;
        mcpServerPath = swaggerOperation?.path ? removeConnectionPrefix(swaggerOperation.path) : undefined;
      }

      // Use ConnectorService.getListDynamicValues with MCP-specific dynamic state
      const dynamicState = {
        operationId: 'listMcpTools',
        apiType: 'mcp',
      };

      const tools = await ConnectorService().getListDynamicValues(
        localConnectionId,
        connectorId,
        operationId ?? '',
        {}, // parameters
        dynamicState,
        false, // isManagedIdentityConnection
        mcpServerPath
      );

      return tools;
    },
    enabled: currentStep === MCP_WIZARD_STEP.PARAMETERS && !!localConnectionId,
    retry: false, // Don't retry on failure - show error immediately
    staleTime: 0, // Always refetch when connection changes
  });

  // Extract error message from various error formats
  const getToolsErrorMessage = (error: unknown): string | null => {
    if (!error) {
      return null;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      if (typeof errObj.message === 'string') {
        return errObj.message;
      }
      if (typeof errObj.error === 'string') {
        return errObj.error;
      }
      if (typeof errObj.errorMessage === 'string') {
        return errObj.errorMessage;
      }
      try {
        return JSON.stringify(error);
      } catch {
        return 'Unknown error';
      }
    }
    return String(error);
  };

  const toolsErrorMessage = getToolsErrorMessage(toolsError);

  // Track tool selection mode: 'all' means all tools allowed, 'selected' means only selected tools
  // Initialize based on whether allowedTools was previously set (empty means all)
  const [toolSelectionMode, setToolSelectionMode] = useState<'all' | 'selected'>(
    allowedTools && allowedTools.length > 0 ? 'selected' : 'all'
  );

  // Track local tool selection
  const [localAllowedTools, setLocalAllowedTools] = useState<string[]>(allowedTools ?? []);

  // Track if initial auto-select has been done (to prevent re-selecting when user deselects all)
  const [hasInitializedTools, setHasInitializedTools] = useState(false);

  // Auto-select all tools when tools are first loaded (regardless of mode)
  useEffect(() => {
    if (!hasInitializedTools && toolsData && toolsData.length > 0 && localAllowedTools.length === 0) {
      const allToolValues = toolsData.map((tool) => tool.value);
      setLocalAllowedTools(allToolValues);
      dispatch(setMcpWizardTools(allToolValues));
      setHasInitializedTools(true);
    }
  }, [toolsData, localAllowedTools.length, dispatch, hasInitializedTools]);

  // Track headers as key-value pairs (initialized from Redux)
  const [localHeaders, setLocalHeaders] = useState<Record<string, string>>(headers ?? {});

  const [showHeaders, setShowHeaders] = useState(() => {
    return headers && Object.keys(headers).length > 0;
  });

  const handleBack = useCallback(() => {
    if (currentStep === MCP_WIZARD_STEP.PARAMETERS) {
      // If connection was pre-selected from browse or wizard was opened at CREATE_CONNECTION, close wizard
      if (isConnectionLocked || wasOpenedAtCreateConnection) {
        dispatch(closeMcpToolWizard());
      } else {
        dispatch(setMcpWizardStep(MCP_WIZARD_STEP.CONNECTION));
      }
    } else if (currentStep === MCP_WIZARD_STEP.CREATE_CONNECTION) {
      // If wizard was opened at CREATE_CONNECTION, close wizard
      if (wasOpenedAtCreateConnection) {
        dispatch(closeMcpToolWizard());
      } else {
        dispatch(setMcpWizardStep(MCP_WIZARD_STEP.CONNECTION));
      }
    } else if (currentStep === MCP_WIZARD_STEP.CONNECTION) {
      dispatch(closeMcpToolWizard());
    }
  }, [dispatch, currentStep, isConnectionLocked, wasOpenedAtCreateConnection]);

  const handleAddConnectionClick = useCallback(() => {
    dispatch(setMcpWizardStep(MCP_WIZARD_STEP.CREATE_CONNECTION));
  }, [dispatch]);

  const handleConnectionCreated = useCallback(
    (connection: Connection) => {
      setLocalConnectionId(connection.id);
      dispatch(setMcpWizardConnection(connection.id));
      if (wasOpenedAtCreateConnection || validConnections.length === 0) {
        dispatch(setMcpWizardStep(MCP_WIZARD_STEP.PARAMETERS));
      } else {
        dispatch(setMcpWizardStep(MCP_WIZARD_STEP.CONNECTION));
      }

      refetchConnections();
    },
    [dispatch, refetchConnections, wasOpenedAtCreateConnection, validConnections.length]
  );

  const handleConnectionCancelled = useCallback(() => {
    // If wizard was opened directly at CREATE_CONNECTION step, or there are no valid connections,
    // close the wizard to navigate back to browse
    if (wasOpenedAtCreateConnection || validConnections.length === 0) {
      dispatch(closeMcpToolWizard());
    } else {
      dispatch(setMcpWizardStep(MCP_WIZARD_STEP.CONNECTION));
    }
  }, [dispatch, wasOpenedAtCreateConnection, validConnections.length]);

  // No-op function for updateConnectionInState - we handle this separately
  const updateConnectionInState = useCallback((_payload: CreatedConnectionPayload) => {
    // Connection state is managed by the connection service
  }, []);

  const handleNext = useCallback(async () => {
    if (currentStep === MCP_WIZARD_STEP.CONNECTION) {
      if (localConnectionId) {
        dispatch(setMcpWizardConnection(localConnectionId));
        dispatch(setMcpWizardStep(MCP_WIZARD_STEP.PARAMETERS));
      }
    } else if (currentStep === MCP_WIZARD_STEP.PARAMETERS) {
      if (localConnectionId) {
        const server = wizardState?.operation;
        const serverName = server?.properties?.summary ?? server?.name ?? 'MCP_Client_Tool';

        // Build operation structure - use server properties for managed MCP servers
        const operation: DiscoveryOperation<DiscoveryResultTypes> = isManagedMcpServer
          ? {
              ...server!,
              type: 'McpClientTool',
            }
          : {
              id: 'nativemcpclient',
              name: 'nativemcpclient',
              type: 'McpClientTool',
              properties: {
                api: {
                  id: MCP_CLIENT_CONNECTOR_ID,
                  name: 'mcpclient',
                  displayName: serverName,
                  iconUri: server?.properties?.api?.iconUri ?? (server?.properties as any)?.iconUri ?? '',
                  brandColor: '#000000',
                },
                summary: serverName,
                description: server?.properties?.description ?? '',
                operationType: 'McpClientTool',
                operationKind: 'Builtin',
              } as any,
            };

        // Build preset parameter values
        // Only add allowedTools when NOT all tools are selected and mode is 'selected'
        // If 'all' mode (automatically allow new tools) is selected, don't pass allowedTools
        const presetParameterValues: Record<string, any> = {};
        const totalToolsCount = toolsData?.length ?? 0;
        const allToolsSelected = localAllowedTools.length === totalToolsCount;
        const effectiveMode = allToolsSelected ? toolSelectionMode : 'selected';

        if (effectiveMode === 'selected') {
          presetParameterValues['allowedTools'] = localAllowedTools;
        }
        if (Object.keys(localHeaders).length > 0) {
          presetParameterValues['headers'] = localHeaders;
        }

        // Add MCP server using addOperation with connectionId - connection setup happens inside initializeOperationDetails
        await dispatch(
          addOperation({
            operation,
            relationshipIds,
            nodeId: serverName.replaceAll(' ', '_'),
            isParallelBranch: false,
            isTrigger: false,
            isAddingMcpServer: true,
            presetParameterValues,
            connectionId: localConnectionId,
          })
        );

        dispatch(closeMcpToolWizard());
      }
    }
  }, [
    dispatch,
    currentStep,
    localConnectionId,
    localAllowedTools,
    localHeaders,
    relationshipIds,
    wizardState?.operation,
    isManagedMcpServer,
    toolSelectionMode,
    toolsData,
  ]);

  const handleConnectionSelect = useCallback(
    (id: string) => {
      setLocalConnectionId(id);
      dispatch(setMcpWizardConnection(id));
      // Reset tool selection when connection changes
      setLocalAllowedTools([]);
      dispatch(setMcpWizardTools([]));
      dispatch(setMcpWizardHeaders({}));
      // Automatically advance to parameters step
      dispatch(setMcpWizardStep(MCP_WIZARD_STEP.PARAMETERS));
    },
    [dispatch]
  );

  const handleToolSelectionChange = useCallback(
    (newKeys: string[]) => {
      setLocalAllowedTools(newKeys);
      dispatch(setMcpWizardTools(newKeys));
    },
    [dispatch]
  );

  const handleHeadersChange = useCallback(
    (newHeaders: Record<string, string> | undefined) => {
      const value = newHeaders ?? {};
      setLocalHeaders(value);
      dispatch(setMcpWizardHeaders(value));
    },
    [dispatch]
  );

  // Intl messages
  const INTL_TEXT = useMemo(
    () => ({
      step1Label: intl.formatMessage({
        defaultMessage: 'Connection',
        id: 'MpULcW',
        description: 'Label for step 1 in wizard indicator',
      }),
      step2Label: intl.formatMessage({
        defaultMessage: 'Parameters',
        id: '10b+jL',
        description: 'Label for step 2 in wizard indicator',
      }),
      step1Title: intl.formatMessage({
        defaultMessage: 'Select a connection',
        id: '7MbFEx',
        description: 'Title for step 1 - connection selection',
      }),
      step2Title: intl.formatMessage({
        defaultMessage: 'Select allowed tools',
        id: 'olgoo5',
        description: 'Title for step 2 - tools selection',
      }),
      step1Description: intl.formatMessage({
        defaultMessage: 'Choose a connection to use for this MCP server',
        id: 'Yzw97z',
        description: 'Description for connection selection step',
      }),
      step2Description: intl.formatMessage({
        defaultMessage: 'Configure the parameters for this MCP tool',
        id: 'kAJqcb',
        description: 'Description for parameters step',
      }),
      toolsManagementDescription: intl.formatMessage({
        defaultMessage: 'Configure how tools are managed and included for this MCP server',
        id: 'zNUWo/',
        description: 'Description for tools management section',
      }),
      noConnections: intl.formatMessage({
        defaultMessage: 'No MCP connections available. Please create a connection first.',
        id: 'h6EWNm',
        description: 'Message when no connections are available',
      }),
      noTools: intl.formatMessage({
        defaultMessage: 'No tools available for this connection.',
        id: 'jw62uq',
        description: 'Message when no tools are available',
      }),
      pleaseSelectTools: intl.formatMessage({
        defaultMessage: 'Search and select tools',
        id: 't5ECPm',
        description: 'Placeholder text when no tools are selected',
      }),
      selectToolPlaceholder: intl.formatMessage({
        defaultMessage: 'Please select tool',
        id: '9lP2zW',
        description: 'Placeholder text for tool selection dropdown',
      }),
      allToolsMode: intl.formatMessage({
        defaultMessage: 'Automatically allow new tools added to this MCP server',
        id: 'fAZWe3',
        description: 'Radio option for allowing all tools',
      }),
      selectedToolsMode: intl.formatMessage({
        defaultMessage: 'Manually allow tools to this MCP server',
        id: 'ZmAy4U',
        description: 'Radio option for allowing only selected tools',
      }),
      toolSelectionModeLabel: intl.formatMessage({
        defaultMessage: 'Tool management',
        id: 'WOEOfm',
        description: 'Label for tool selection mode',
      }),
      loading: intl.formatMessage({
        defaultMessage: 'Loading...',
        id: '2EZWf6',
        description: 'Loading text',
      }),
      backButton: intl.formatMessage({
        defaultMessage: 'Back',
        id: 'WDROA9',
        description: 'Back button text',
      }),
      nextButton: intl.formatMessage({
        defaultMessage: 'Next',
        id: 'vAdBMk',
        description: 'Next button text',
      }),
      addButton: intl.formatMessage({
        defaultMessage: 'Add',
        id: 'vhNDi9',
        description: 'Add button text',
      }),
      cancelButton: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: 'hHNj31',
        description: 'Cancel button text',
      }),
      allowedToolsLabel: intl.formatMessage({
        defaultMessage: 'Tools',
        id: 'OFXJe0',
        description: 'Label for allowed tools dropdown',
      }),
      errorLoadingTools: intl.formatMessage({
        defaultMessage: 'Error loading tools. Please try again.',
        id: 'VUN/Gj',
        description: 'Error message when tools fail to load',
      }),
      atLeastOneToolRequired: intl.formatMessage({
        defaultMessage: 'At least 1 tool must be selected.',
        id: '/88C7X',
        description: 'Error message when no tools are selected in selected tools mode',
      }),
      headersLabel: intl.formatMessage({
        defaultMessage: 'Headers',
        id: 'MX231V',
        description: 'Label for headers input field',
      }),
      headersDescription: intl.formatMessage({
        defaultMessage: 'Add headers for your MCP server.',
        id: '6RT/F9',
        description: 'Description for headers section',
      }),
      learnMoreLink: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: 'izS5yQ',
        description: 'Learn more link text',
      }),
      retryButton: intl.formatMessage({
        defaultMessage: 'Retry',
        id: '8U/Kek',
        description: 'Retry button text',
      }),
      addConnectionLink: intl.formatMessage({
        defaultMessage: 'Create a new connection',
        id: 'YW1rx0',
        description: 'Button text to create a new connection',
      }),
    }),
    [intl]
  );

  // Footer content
  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    const isConnectionStep = currentStep === MCP_WIZARD_STEP.CONNECTION;
    const isParametersStep = currentStep === MCP_WIZARD_STEP.PARAMETERS;
    const isCreateConnectionStep = currentStep === MCP_WIZARD_STEP.CREATE_CONNECTION;

    // Don't show footer buttons on create connection step - it has its own buttons
    if (isCreateConnectionStep) {
      return { buttonContents: [] };
    }

    const buttonContents: TemplatePanelFooterProps['buttonContents'] = [
      {
        type: 'action',
        text: INTL_TEXT.backButton,
        onClick: handleBack,
        appearance: 'subtle',
      },
    ];

    // Disable Done button if in "selected tools" mode with no tools selected
    const isDoneDisabled =
      (isConnectionStep && !localConnectionId) || (isParametersStep && toolSelectionMode === 'selected' && localAllowedTools.length === 0);

    buttonContents.push({
      type: 'action',
      text: isParametersStep ? INTL_TEXT.addButton : INTL_TEXT.nextButton,
      onClick: handleNext,
      appearance: 'primary',
      disabled: isDoneDisabled,
    });

    return { buttonContents };
  }, [
    currentStep,
    INTL_TEXT,
    handleBack,
    handleNext,
    localConnectionId,
    handleAddConnectionClick,
    toolSelectionMode,
    localAllowedTools.length,
  ]);

  const handleConnectionTableSelect = useCallback(
    (connection?: Connection) => {
      if (connection) {
        handleConnectionSelect(connection.id);
      }
    },
    [handleConnectionSelect]
  );

  const renderConnectionStep = () => {
    if (isConnectionsLoading) {
      return (
        <div className={classes.loadingContainer}>
          <Spinner size="medium" label={INTL_TEXT.loading} />
        </div>
      );
    }

    if (validConnections.length === 0) {
      return (
        <div className={classes.emptyState}>
          <Text>{INTL_TEXT.noConnections}</Text>
        </div>
      );
    }

    return (
      <div className={classes.connectionStepContainer}>
        <ConnectionTable
          connections={validConnections}
          currentConnectionId={localConnectionId}
          saveSelectionCallback={handleConnectionTableSelect}
          isXrmConnectionReferenceMode={false}
        />
      </div>
    );
  };

  const renderCreateConnectionStep = () => {
    const operationType = 'McpClientTool';

    // Only pass ConnectionType.Mcp for builtin MCP connections
    // Managed MCP servers use the default Azure connection flow
    const connectionMetadata = isManagedMcpServer ? undefined : { type: ConnectionType.Mcp, required: true };

    return (
      <div className={classes.createConnectionContainer}>
        <CreateConnectionInternal
          connectorId={connectorId}
          operationType={operationType}
          existingReferences={validConnections.map((c) => c.name)}
          hideCancelButton={false}
          showActionBar={false}
          assistedConnectionProps={assistedConnectionProps}
          connectionMetadata={connectionMetadata}
          updateConnectionInState={updateConnectionInState}
          onConnectionCreated={handleConnectionCreated}
          onConnectionCancelled={handleConnectionCancelled}
          description=" "
        />
      </div>
    );
  };

  const renderToolsStep = () => {
    if (isToolsLoading) {
      return (
        <div className={classes.loadingContainer}>
          <Spinner size="medium" label={INTL_TEXT.loading} />
        </div>
      );
    }

    // Convert tools data to dropdown options (empty if error or no tools)
    // ListDynamicValue has { value, displayName, description }
    const toolOptions = (toolsData ?? []).map((tool) => ({
      key: tool.value,
      text: tool.displayName,
    }));

    const handleToolModeChange = (_ev: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
      const newMode = data.value as 'all' | 'selected';
      setToolSelectionMode(newMode);
    };

    // Check if all tools are selected
    const allToolsSelected = localAllowedTools.length === 0 || localAllowedTools.length === toolOptions.length;
    // Derive effective mode: if not all tools selected, force "selected" mode
    const effectiveMode = allToolsSelected ? toolSelectionMode : 'selected';

    // Sync the mode state if needed
    if (effectiveMode !== toolSelectionMode) {
      setToolSelectionMode('selected');
    }

    return (
      <div className={classes.toolsContainer}>
        {/* Tools management section */}
        <div className={classes.toolsSection} style={{ paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
          <Text size={200} style={{ marginBottom: '12px' }}>
            {INTL_TEXT.toolsManagementDescription}
          </Text>

          {/* Tools list - always visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Label required>{INTL_TEXT.allowedToolsLabel}</Label>
            <Text size={200}>
              (
              {localAllowedTools.length === toolOptions.length && toolOptions.length > 0
                ? intl.formatMessage(
                    {
                      defaultMessage: 'all {count} {count, plural, one {tool} other {tools}} selected',
                      id: 'CWx5jT',
                      description: 'Shows when all tools are selected',
                    },
                    { count: localAllowedTools.length }
                  )
                : intl.formatMessage(
                    {
                      defaultMessage: '{count} {count, plural, one {tool} other {tools}} selected',
                      id: 'h8JTcA',
                      description: 'Shows how many tools are selected',
                    },
                    { count: localAllowedTools.length }
                  )}
              )
            </Text>
          </div>
          <SearchableDropdown
            options={toolOptions}
            selectedKeys={localAllowedTools}
            onSelectedKeysChange={handleToolSelectionChange}
            onItemSelectionChanged={() => {}}
            multiselect={true}
            showSelectAll={false}
            placeholder={INTL_TEXT.pleaseSelectTools}
            searchPlaceholderText={INTL_TEXT.pleaseSelectTools}
          />
          {effectiveMode === 'selected' && localAllowedTools.length === 0 && (
            <Text size={200} style={{ color: 'var(--colorPaletteRedForeground1)', marginTop: '4px' }}>
              {INTL_TEXT.atLeastOneToolRequired}
            </Text>
          )}

          {/* Tool selection mode */}
          <div style={{ marginTop: '16px' }}>
            <Label>{INTL_TEXT.toolSelectionModeLabel}</Label>
            <RadioGroup value={effectiveMode} onChange={handleToolModeChange}>
              <Radio value="all" label={INTL_TEXT.allToolsMode} disabled={!allToolsSelected} />
              <Radio value="selected" label={INTL_TEXT.selectedToolsMode} />
            </RadioGroup>
          </div>
        </div>
        <div className={classes.headersSection} style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
          <Label style={{ display: 'block', marginBottom: '4px' }}>{INTL_TEXT.headersLabel}</Label>
          <Text size={200} style={{ display: 'block', marginBottom: '12px', color: 'var(--colorNeutralForeground2)' }}>
            {INTL_TEXT.headersDescription}
          </Text>
          {showHeaders ? (
            <SimpleDictionary value={localHeaders} onChange={handleHeadersChange} />
          ) : (
            <Button icon={<AddRegular />} onClick={() => setShowHeaders(true)} size="small" style={{ width: 'fit-content' }}>
              {INTL_TEXT.addButton}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const isConnectionStep = currentStep === MCP_WIZARD_STEP.CONNECTION;
  const isCreateConnectionStep = currentStep === MCP_WIZARD_STEP.CREATE_CONNECTION;
  const isParametersStep = currentStep === MCP_WIZARD_STEP.PARAMETERS;

  const getStepDescription = () => {
    if (isConnectionStep) {
      return INTL_TEXT.step1Description;
    }
    if (isParametersStep) {
      return INTL_TEXT.step2Description;
    }
    return null;
  };

  const renderCurrentStep = () => {
    if (isConnectionStep) {
      return renderConnectionStep();
    }
    if (isCreateConnectionStep) {
      return renderCreateConnectionStep();
    }
    if (isParametersStep) {
      return renderToolsStep();
    }
    return null;
  };

  // Get current step number for indicator (create connection counts as step 1)
  const currentStepNumber = isParametersStep ? 2 : 1;

  // When connection is locked or wizard was opened at CREATE_CONNECTION, step 1 shows as locked (cannot go back)
  // When step 1 is completed but not locked, show checkmark with brand color
  const isStep1Locked = (isConnectionLocked || wasOpenedAtCreateConnection) && isParametersStep;
  const isStep1Completed = !isConnectionLocked && !wasOpenedAtCreateConnection && isParametersStep;
  const stepDescription = getStepDescription();

  return (
    <div className={classes.container}>
      <div className={classes.content}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: isStep1Locked
                ? 'var(--colorNeutralBackground5)'
                : currentStepNumber >= 1
                  ? 'var(--colorBrandBackground)'
                  : 'var(--colorNeutralBackground3)',
              color: isStep1Locked
                ? 'var(--colorNeutralForeground3)'
                : currentStepNumber >= 1
                  ? 'var(--colorNeutralForegroundOnBrand)'
                  : 'var(--colorNeutralForeground3)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {isStep1Locked ? '🔒' : isStep1Completed ? '✓' : '1'}
          </div>
          <Text
            weight={currentStepNumber === 1 && !isStep1Locked ? 'semibold' : 'regular'}
            style={{
              color: isStep1Locked ? 'var(--colorNeutralForeground3)' : undefined,
            }}
          >
            {INTL_TEXT.step1Label}
          </Text>
          <div
            style={{
              width: '32px',
              height: '2px',
              backgroundColor: currentStepNumber >= 2 ? 'var(--colorBrandBackground)' : 'var(--colorNeutralBackground3)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: currentStepNumber >= 2 ? 'var(--colorBrandBackground)' : 'var(--colorNeutralBackground3)',
              color: currentStepNumber >= 2 ? 'var(--colorNeutralForegroundOnBrand)' : 'var(--colorNeutralForeground3)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            2
          </div>
          <Text weight={currentStepNumber === 2 ? 'semibold' : 'regular'}>{INTL_TEXT.step2Label}</Text>
        </div>
        {stepDescription ? <Text className={classes.stepDescription}>{stepDescription}</Text> : null}
        {isParametersStep && toolsErrorMessage && (
          <div className={classes.warningContainer}>
            <MessageBar intent="warning">
              <MessageBarBody>
                <Text weight="semibold">{INTL_TEXT.errorLoadingTools}</Text>
                <br />
                <Text size={200}>{toolsErrorMessage}</Text>
              </MessageBarBody>
            </MessageBar>
            <Button appearance="secondary" size="small" onClick={() => refetchTools()}>
              {INTL_TEXT.retryButton}
            </Button>
          </div>
        )}
        {renderCurrentStep()}
        {isConnectionStep ? (
          <div className={classes.connectionStepActionContainer}>
            <Button onClick={handleAddConnectionClick} size="small">
              {INTL_TEXT.addConnectionLink}
            </Button>
          </div>
        ) : null}
      </div>
      {(footerContent.buttonContents?.length ?? 0) > 0 && (
        <div className={classes.footer}>
          <TemplatesPanelFooter {...footerContent} />
        </div>
      )}
    </div>
  );
};

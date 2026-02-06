import { Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useMcpPanelStyles, useMcpServerPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type TemplatePanelFooterProps, TemplatesPanelFooter, TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { validateMcpServerDescription, validateMcpServerName } from '../../../../core/mcp/utils/server';
import { useMcpEligibleWorkflows } from '../../../../core/mcp/utils/queries';
import type { McpServer } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const CreateServer = ({
  onUpdate,
  server,
  onClose,
}: { onUpdate: (servers: Partial<McpServer>) => Promise<void>; server?: McpServer; onClose: () => void }) => {
  const styles = { ...useMcpPanelStyles(), ...useMcpServerPanelStyles() };
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const INTL_TEXT = {
    createTitle: intl.formatMessage({
      defaultMessage: 'Create an MCP server',
      id: 's5Cidf',
      description: 'Title for the MCP Server creation panel',
    }),
    updateTitle: intl.formatMessage({
      defaultMessage: 'Update MCP Server',
      id: 'lbQ38S',
      description: 'Title for the MCP Server update panel',
    }),
    subtitle: intl.formatMessage({
      defaultMessage: 'Standard logic app',
      id: 'DIDL6K',
      description: 'Subtitle for the MCP server creation panel',
    }),
    closeAriaLabel: intl.formatMessage({
      defaultMessage: 'Close MCP server creation panel',
      id: 'w2VjJS',
      description: 'Aria label for closing the MCP server creation panel',
    }),
    detailsTitle: intl.formatMessage({
      defaultMessage: 'MCP server details',
      id: 'nmKIZt',
      description: 'Title for the MCP Server details section',
    }),
    detailsDescription: intl.formatMessage({
      defaultMessage: 'Provide the details about your MCP server.',
      id: 'VgIOTh',
      description: 'Description for the MCP Server details section',
    }),
    workflowsTitle: intl.formatMessage({
      defaultMessage: 'Workflows',
      id: 'eWG113',
      description: 'Title for the MCP Server workflows section',
    }),
    workflowsDescription: intl.formatMessage({
      defaultMessage: 'This list shows only workflows with actions and request triggers. Select the workflows you want to use.',
      id: 'mc9MCq',
      description: 'Description for the MCP server workflows section',
    }),
    learnMoreLinkText: intl.formatMessage({
      defaultMessage: 'Learn more',
      id: 'm0e5px',
      description: 'Link text for learn more',
    }),
    createButtonText: intl.formatMessage({
      defaultMessage: 'Create',
      id: 'x+XxdZ',
      description: 'Button text for creating the MCP Server',
    }),
    creatingButtonText: intl.formatMessage({
      defaultMessage: 'Creating...',
      id: '0b1xt5',
      description: 'Button text for creating the MCP Server in progress',
    }),
    updateButtonText: intl.formatMessage({
      defaultMessage: 'Update',
      id: 'KGvXUc',
      description: 'Button text for updating the MCP Server',
    }),
    updatingButtonText: intl.formatMessage({
      defaultMessage: 'Updating...',
      id: 'eJi0UT',
      description: 'Button text for updating the MCP Server in progress',
    }),
    cancelButtonText: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '6JfSVt',
      description: 'Button text for canceling MCP Server creation',
    }),
    nameLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'pZL0u1',
      description: 'Label for the MCP Server name field',
    }),
    namePlaceholder: intl.formatMessage({
      id: 'qKVOwV',
      defaultMessage: 'Enter a name for the MCP server',
      description: 'Placeholder text for the MCP server name field',
    }),
    descriptionLabel: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'W5bj8F',
      description: 'Label for the MCP Server description field',
    }),
    descriptionPlaceholder: intl.formatMessage({
      id: 'SYDKyg',
      defaultMessage: 'Enter a description for the MCP server',
      description: 'Placeholder text for the MCP server description field',
    }),
    workflowsLabel: intl.formatMessage({
      defaultMessage: 'Workflows',
      id: 'KeakaX',
      description: 'Label for the MCP Server workflows field',
    }),
    workflowsPlaceholder: intl.formatMessage({
      id: 'wy+LF2',
      defaultMessage: 'Select workflows to include in the server',
      description: 'Placeholder text for the MCP server workflows field',
    }),
    workflowsErrorMessage: intl.formatMessage({
      id: 'XsCwp/',
      defaultMessage: 'At least one workflow must be selected.',
      description: 'Error message when no workflows are selected for the MCP server',
    }),
    workflowsLoadingMessage: intl.formatMessage({
      id: 'lciYKh',
      defaultMessage: 'Loading workflows...',
      description: 'Loading message for the MCP server workflows field',
    }),
  };

  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const { data: workflows, isLoading } = useMcpEligibleWorkflows(subscriptionId as string, resourceGroup as string, logicAppName as string);
  const workflowOptions = useMemo(() => {
    return (
      workflows?.map((workflowName) => ({
        id: workflowName,
        label: workflowName,
        value: workflowName.toLowerCase(),
      })) || []
    );
  }, [workflows]);

  const [serverName, setServerName] = useState(server?.name ?? '');
  const [serverDescription, setServerDescription] = useState(server?.description ?? '');
  const [serverNameError, setServerNameError] = useState<string | undefined>(undefined);
  const [serverDescriptionError, setServerDescriptionError] = useState<string | undefined>(undefined);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [workflowsError, setWorkflowsError] = useState<string | undefined>(undefined);
  const [isCreatingOrUpdating, setIsCreatingOrUpdating] = useState(false);

  useEffect(() => {
    if (server && (server.tools ?? []).length > 0) {
      setSelectedTools(server.tools.map((tool) => tool.name.toLowerCase()));
    }
  }, [server]);

  const workflowsValue = useMemo(
    () =>
      workflowOptions
        .filter((workflow) => selectedTools.includes(workflow.value))
        .map((workflow) => workflow.label)
        .join(', '),
    [selectedTools, workflowOptions]
  );

  const setMcpServerName = useCallback((value: string) => {
    setServerName(value);
    const errorMessage = validateMcpServerName(value);
    setServerNameError(errorMessage);
  }, []);

  const setMcpServerDescription = useCallback((value: string) => {
    setServerDescription(value);
    const errorMessage = validateMcpServerDescription(value);
    setServerDescriptionError(errorMessage);
  }, []);

  const serverSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: INTL_TEXT.nameLabel,
        value: serverName,
        type: 'textfield',
        placeholder: INTL_TEXT.namePlaceholder,
        required: true,
        onChange: setMcpServerName,
        errorMessage: serverNameError,
      },
      {
        label: INTL_TEXT.descriptionLabel,
        value: serverDescription,
        type: 'textarea',
        placeholder: INTL_TEXT.descriptionPlaceholder,
        required: true,
        onChange: setMcpServerDescription,
        errorMessage: serverDescriptionError,
      },
    ];
  }, [
    INTL_TEXT.nameLabel,
    INTL_TEXT.namePlaceholder,
    INTL_TEXT.descriptionLabel,
    INTL_TEXT.descriptionPlaceholder,
    serverName,
    setMcpServerName,
    serverNameError,
    serverDescription,
    setMcpServerDescription,
    serverDescriptionError,
  ]);

  const workflowSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: INTL_TEXT.workflowsLabel,
        type: 'dropdown',
        placeholder: isLoading ? INTL_TEXT.workflowsLoadingMessage : INTL_TEXT.workflowsPlaceholder,
        disabled: isLoading,
        required: true,
        multiselect: true,
        options: workflowOptions,
        selectedOptions: selectedTools,
        value: workflowsValue,
        errorMessage: workflowsError,
        controlled: true,
        onOptionSelect: (selectedOptions) => {
          const isInvalid = selectedOptions.length === 0;
          if (isInvalid && !workflowsError) {
            setWorkflowsError(INTL_TEXT.workflowsErrorMessage);
          } else if (workflowsError) {
            setWorkflowsError(undefined);
          }

          setSelectedTools(selectedOptions);
        },
      },
    ];
  }, [
    INTL_TEXT.workflowsErrorMessage,
    INTL_TEXT.workflowsLabel,
    INTL_TEXT.workflowsLoadingMessage,
    INTL_TEXT.workflowsPlaceholder,
    isLoading,
    selectedTools,
    workflowOptions,
    workflowsError,
    workflowsValue,
  ]);

  const handleCreateOrUpdate = useCallback(async () => {
    setIsCreatingOrUpdating(true);
    try {
      await onUpdate({
        name: serverName,
        description: serverDescription,
        tools: selectedTools.map((toolName) => ({ name: workflowOptions.find((option) => option.value === toolName)?.label ?? toolName })),
      });
    } catch {
      // Need to log the error properly here.
    } finally {
      setIsCreatingOrUpdating(false);
    }
    dispatch(closePanel());
  }, [dispatch, onUpdate, serverName, serverDescription, selectedTools, workflowOptions]);

  const createOrUpdateButtonText = useMemo(() => {
    if (isCreatingOrUpdating) {
      return server ? INTL_TEXT.updatingButtonText : INTL_TEXT.creatingButtonText;
    }
    return server ? INTL_TEXT.updateButtonText : INTL_TEXT.createButtonText;
  }, [
    isCreatingOrUpdating,
    server,
    INTL_TEXT.updatingButtonText,
    INTL_TEXT.creatingButtonText,
    INTL_TEXT.updateButtonText,
    INTL_TEXT.createButtonText,
  ]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: createOrUpdateButtonText,
          appearance: 'primary',
          onClick: handleCreateOrUpdate,
          disabled:
            !serverName ||
            !!serverNameError ||
            !serverDescription ||
            !!serverDescriptionError ||
            selectedTools.length === 0 ||
            !!workflowsError ||
            isCreatingOrUpdating,
          isLoading,
        },
        {
          type: 'action',
          text: INTL_TEXT.cancelButtonText,
          onClick: onClose,
        },
      ],
    };
  }, [
    createOrUpdateButtonText,
    handleCreateOrUpdate,
    serverName,
    serverNameError,
    serverDescription,
    serverDescriptionError,
    selectedTools.length,
    workflowsError,
    isCreatingOrUpdating,
    isLoading,
    INTL_TEXT.cancelButtonText,
    onClose,
  ]);

  return (
    <Drawer className={styles.drawer} open={true} onOpenChange={(_, { open }) => !open && onClose()} position="end" size="large">
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {server ? INTL_TEXT.updateTitle : INTL_TEXT.createTitle}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={onClose} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
        <Text size={200} className={styles.headerSubtitle}>
          {INTL_TEXT.subtitle}
        </Text>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <TemplatesSection
          cssOverrides={{ sectionItems: styles.workflowSection }}
          title={INTL_TEXT.detailsTitle}
          description={INTL_TEXT.detailsDescription}
          descriptionLink={{
            text: INTL_TEXT.learnMoreLinkText,
            href: 'https://go.microsoft.com/fwlink/?linkid=2350302',
          }}
          items={serverSectionItems}
        />
        <TemplatesSection
          cssOverrides={{ sectionItems: styles.workflowSection }}
          title={INTL_TEXT.workflowsTitle}
          description={INTL_TEXT.workflowsDescription}
          descriptionLink={{
            text: INTL_TEXT.learnMoreLinkText,
            href: 'https://go.microsoft.com/fwlink/?linkid=2350400',
          }}
          items={workflowSectionItems}
        />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};

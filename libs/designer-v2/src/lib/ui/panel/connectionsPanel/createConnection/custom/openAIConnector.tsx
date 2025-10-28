import { CognitiveServiceService, equals, isUndefinedOrEmptyString, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAllCognitiveServiceAccounts, useAllCognitiveServiceProjects } from './useCognitiveService';
import { useStyles } from './styles';
import {
  Link,
  Spinner as SpinnerFUI9,
  Field,
  Button,
  OptionGroup,
  Option,
  Combobox,
  Spinner,
  type OptionOnSelectData,
  Text,
  Radio,
  RadioGroup,
} from '@fluentui/react-components';
import { NavigateIcon } from '@microsoft/designer-ui';
import { ArrowClockwise16Filled, ArrowClockwise16Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';
import { SubscriptionDropdown } from './components/SubscriptionDropdown';
import { useHasRoleAssignmentsWritePermissionQuery, useHasRoleDefinitionsByNameQuery } from '../../../../../core/queries/role';

const RefreshIcon = bundleIcon(ArrowClockwise16Regular, ArrowClockwise16Filled);

export const CustomOpenAIConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, setKeyValue, setValue, parameter, operationParameterValues } = props;
  const intl = useIntl();
  const styles = useStyles();
  const [parameterValue, setParameterValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const [cognitiveServiceAccountId, setCognitiveServiceAccountId] = useState<string>('');
  const [selectedCognitiveServiceProject, setSelectedCognitiveServiceProject] = useState<string>('');
  const [entryMode, setEntryMode] = useState<'select' | 'manual'>('select');
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();

  const isAgentServiceConnection = useMemo(
    () => equals(operationParameterValues?.['agentModelType'] ?? '', 'FoundryAgentService', true),
    [operationParameterValues]
  );

  const {
    isFetching: isFetchingAccount,
    data: allCognitiveServiceAccounts,
    refetch: refetchServiceAccounts,
  } = useAllCognitiveServiceAccounts(selectedSubscriptionId, !isAgentServiceConnection);

  const {
    isFetching: isFetchingCognitiveServiceProjects,
    data: cognitiveServiceProjects,
    refetch: refetchServiceProjects,
  } = useAllCognitiveServiceProjects(selectedSubscriptionId, isAgentServiceConnection);

  const getCognitiveServiceAccountFromProjectName = useCallback((projectName?: string) => {
    return (projectName ?? '').split('/')[0];
  }, []);

  const cognitiveServiceProjectsAccountMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    (cognitiveServiceProjects ?? []).forEach((project: any) => {
      const accountName = getCognitiveServiceAccountFromProjectName(project?.name);
      if (accountName) {
        if (!map[accountName]) {
          map[accountName] = [];
        }
        map[accountName].push(project);
      }
    });
    return map;
  }, [cognitiveServiceProjects, getCognitiveServiceAccountFromProjectName]);

  const stringResources = useMemo(
    () => ({
      COGNITIVE_SERVICE_OPENAI_RESOURCE: intl.formatMessage({
        defaultMessage: 'Azure OpenAI resource',
        id: 'boD8mP',
        description: 'Azure Cognitive Service Open AI resource label',
      }),
      SELECT_COGNITIVE_SERVICE_OPENAI_RESOURCE: intl.formatMessage({
        defaultMessage: 'Select an Azure OpenAI resource',
        id: '9hKeBq',
        description: 'Select the Azure Cognitive Service Open AI resource to use for this connection',
      }),
      COGNITIVE_SERVICE_AI_RESOURCE: intl.formatMessage({
        defaultMessage: 'Azure AI Resource',
        id: 'LBcc5u',
        description: 'Azure Cognitive Service AI resource label',
      }),
      SELECT_COGNITIVE_SERVICE_AI_RESOURCE: intl.formatMessage({
        defaultMessage: 'Select an Azure AI resource',
        id: 'EPvt2J',
        description: 'Select the Azure Cognitive Service AI resource to use for this connection',
      }),
      LOADING_ACCOUNTS: intl.formatMessage({
        defaultMessage: 'Loading accounts...',
        id: 'qBxNgD',
        description: 'Loading accounts text',
      }),
      FETCHING: intl.formatMessage({
        defaultMessage: 'Fetching...',
        id: 'WBDuOo',
        description: 'Fetching data text',
      }),
      SELECT_SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Select the subscription for your OpenAI resource',
        id: 'jyyxZo',
        description: 'Message for selecting subscription',
      }),
      CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Create new',
        id: '+ebtNl',
        description: 'Label to create a new connection',
      }),
      LEARN_MORE_CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Learn more about creating a new Azure OpenAI resource',
        id: 'WkqAOm',
        description: 'info text for create',
      }),
      PROJECT: intl.formatMessage({
        defaultMessage: 'AI Foundry Project',
        id: '1ZrOYn',
        description: 'AI Foundry Project',
      }),
      LOADING_PROJECT: intl.formatMessage({
        defaultMessage: 'Loading AI Foundry projects...',
        id: 'gD+Onr',
        description: 'Loading projects...',
      }),
      SELECT_COGNITIVE_SERVICE_PROJECT: intl.formatMessage({
        defaultMessage: 'Select a project',
        id: 'QwAEWd',
        description: 'Select the project to use for this connection',
      }),
      MISSING_ROLE_WRITE_PERMISSIONS: intl.formatMessage({
        defaultMessage: 'Missing role write permissions',
        id: 'p/Pfr/',
        description: 'Message indicating that the user does not have write permissions for the role',
      }),
      FETCHING_RESOURCE_DETAILS: intl.formatMessage({
        defaultMessage: 'Fetching resource details...',
        id: 'EXxdfo',
        description: 'Message displayed while fetching resource details',
      }),
      ENTRY_MODE_LABEL: intl.formatMessage({
        defaultMessage: 'Connection setup mode',
        id: 'pr76XB',
        description: 'Label for entry mode selection',
      }),
      SELECT_EXISTING: intl.formatMessage({
        defaultMessage: 'Select existing',
        id: 'ik2PNG',
        description: 'Option to select existing resources from subscription',
      }),
      ENTER_MANUALLY: intl.formatMessage({
        defaultMessage: 'Enter manually',
        id: '90oyiw',
        description: 'Option to manually enter connection details',
      }),
    }),
    [intl]
  );

  const setAPIEndpoint = useCallback(
    async (accountId: string) => {
      try {
        const accountResponse = await CognitiveServiceService().fetchCognitiveServiceAccountById(accountId);
        setKeyValue?.('openAIEndpoint', accountResponse?.properties?.endpoint);
        setErrorMessage('');
      } catch (e: any) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'agent-connection-account-key',
          message: 'Failed to fetch account key for cognitive service',
          error: e,
        });
        setErrorMessage(e.message ?? 'Failed to fetch account endpoint');
      }
    },
    [setKeyValue]
  );

  const setAPIKey = useCallback(
    async (accountId: string) => {
      try {
        const accountResponse = await CognitiveServiceService().fetchCognitiveServiceAccountKeysById(accountId);
        setKeyValue?.('openAIKey', accountResponse?.key1 ?? '');
        setErrorMessage('');
      } catch (e: any) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'agent-connection-account-key',
          message: 'Failed to fetch account key for cognitive service',
          error: e,
        });
        setErrorMessage(e.message ?? 'Failed to fetch account key');
      }
    },
    [setKeyValue]
  );

  const isOpenAIRefreshDisabled = useMemo(
    () => isFetchingAccount || isFetchingSubscription || !selectedSubscriptionId,
    [isFetchingAccount, isFetchingSubscription, selectedSubscriptionId]
  );

  const openAIComboboxDisabled = useMemo(
    () => isOpenAIRefreshDisabled || (allCognitiveServiceAccounts ?? []).length === 0,
    [allCognitiveServiceAccounts, isOpenAIRefreshDisabled]
  );

  const onRefreshServiceAccounts = useCallback(() => {
    refetchServiceAccounts();
  }, [refetchServiceAccounts]);

  const isServiceProjectsRefreshDisabled = useMemo(
    () => isFetchingCognitiveServiceProjects || isFetchingSubscription || !selectedSubscriptionId,
    [isFetchingCognitiveServiceProjects, isFetchingSubscription, selectedSubscriptionId]
  );

  const serviceProjectsComboBoxDisabled = useMemo(
    () => isFetchingCognitiveServiceProjects || (cognitiveServiceProjects ?? []).length === 0,
    [cognitiveServiceProjects, isFetchingCognitiveServiceProjects]
  );

  const onRefreshServiceProjects = useCallback(() => {
    refetchServiceProjects();
  }, [refetchServiceProjects]);

  const onSetOpenAIValues = useCallback(
    async (newValue: string) => {
      setLoadingAccountDetails(true);
      await Promise.all([setAPIEndpoint(newValue), setAPIKey(newValue)]);
      setLoadingAccountDetails(false);
    },
    [setAPIEndpoint, setAPIKey]
  );

  const roleResourceId = useMemo(() => {
    if (isAgentServiceConnection) {
      return selectedCognitiveServiceProject;
    }
    return cognitiveServiceAccountId;
  }, [cognitiveServiceAccountId, isAgentServiceConnection, selectedCognitiveServiceProject]);

  const requiredRoles = useMemo(() => {
    return parameter.managedIdentitySettings?.requiredRoles ?? [];
  }, [parameter.managedIdentitySettings?.requiredRoles]);
  const requiresRoleAssignments = useMemo(() => requiredRoles.length > 0, [requiredRoles.length]);

  const { data: hasRoleWritePermission, isFetching: isFetchingRoleWritePermission } = useHasRoleAssignmentsWritePermissionQuery(
    roleResourceId,
    requiresRoleAssignments
  );

  const { data: hasRequiredRoles, isFetching: isFetchingRequiredRoles } = useHasRoleDefinitionsByNameQuery(
    roleResourceId,
    requiredRoles,
    requiresRoleAssignments
  );

  const validRoleState = useMemo(() => {
    if (requiredRoles.length === 0) {
      return true; // No required roles, so valid by default
    }
    if (isFetchingRequiredRoles || isFetchingRoleWritePermission) {
      return false; // Still fetching role data, so not valid yet
    }
    if (hasRequiredRoles || hasRoleWritePermission) {
      return true; // Either has required roles or write permission, so valid
    }
    return false; // Does not have required roles or write permission, so not valid
  }, [hasRequiredRoles, hasRoleWritePermission, isFetchingRequiredRoles, isFetchingRoleWritePermission, requiredRoles]);

  // TODO: Once we find a generalized solution for role management, we can remove this logic
  useEffect(() => {
    if (parameterValue && validRoleState) {
      setValue(parameterValue);
    } else {
      setValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameterValue, validRoleState]);

  // Memoize callback handlers
  const onEntryModeChange = useCallback(
    (_e: any, data: any) => {
      const newMode = data.value as 'select' | 'manual';
      setEntryMode(newMode);
      // Reset values when switching modes
      setSelectedSubscriptionId('');
      setCognitiveServiceAccountId('');
      setSelectedCognitiveServiceProject('');
      setParameterValue('');
      // Clear openAI endpoint and key
      setKeyValue?.('openAIEndpoint', '');
      setKeyValue?.('openAIKey', '');
    },
    [setKeyValue]
  );

  const onSubscriptionChange = useCallback((id: string) => {
    setSelectedSubscriptionId(id);
    // Reset account and project selections when subscription changes
    setCognitiveServiceAccountId('');
    setSelectedCognitiveServiceProject('');
    setParameterValue('');
  }, []);

  const onProjectSelect = useCallback(
    async (_e: any, option?: OptionOnSelectData) => {
      if (option?.optionValue) {
        const serviceProjectId = option?.optionValue as string;
        const idSplitValues = serviceProjectId.split('/');
        const splitLength = idSplitValues.length;

        // Id is of the form - /sub/<>/resourceGroups/<>/providers/Microsoft.CognitiveServices/accounts/<>/projects/<>
        const serviceProjectName = idSplitValues[splitLength - 1];
        const cognitiveServiceAccountName = splitLength >= 3 ? idSplitValues[splitLength - 3] : '';
        const openAIEndpoint = `https://${cognitiveServiceAccountName}.services.ai.azure.com/api/projects/${serviceProjectName}`;

        // Set all the relevant values
        setSelectedCognitiveServiceProject(serviceProjectId);
        setParameterValue(serviceProjectId);
        setKeyValue?.('openAIEndpoint', openAIEndpoint);
      }
    },
    [setKeyValue]
  );

  const onAccountSelect = useCallback(
    async (_e: any, option?: OptionOnSelectData) => {
      if (option?.optionValue) {
        const cognitiveServiceKey = option?.optionValue as string;
        setCognitiveServiceAccountId(cognitiveServiceKey);
        setSelectedCognitiveServiceProject(''); // Reset project selection when account changes
        setParameterValue(cognitiveServiceKey);
        if (!isAgentServiceConnection) {
          onSetOpenAIValues(cognitiveServiceKey);
        }
      }
    },
    [isAgentServiceConnection, onSetOpenAIValues]
  );

  // Memoize inline styles (declare before components that use them)
  const spinnerStyle = useMemo(() => ({ position: 'absolute' as const, bottom: '6px', left: '8px' }), []);
  const refreshButtonStyle = useMemo(() => ({ margin: '0 4px', height: '100%' }), []);
  const navigateIconStyle = useMemo(() => ({ position: 'relative' as const, top: '2px', left: '2px' }), []);
  const roleMessageContainerStyle = useMemo(() => ({ flexGrow: 1 }), []);

  // Memoize component instances
  const CreateNewButton = useMemo(
    () =>
      // eslint-disable-next-line react/display-name
      ({ href }: { href: string }) => (
        <Link className={styles.createNewButton} target="_blank" href={href}>
          {stringResources.CREATE_NEW}
          <NavigateIcon style={navigateIconStyle} />
        </Link>
      ),
    [stringResources.CREATE_NEW, styles.createNewButton, navigateIconStyle]
  );

  const RoleMessages = useMemo(
    () => (
      // eslint-disable-next-line react/display-name
      <div style={roleMessageContainerStyle}>
        {isFetchingRoleWritePermission || isFetchingRequiredRoles ? (
          <Field
            validationState="warning"
            validationMessageIcon={<SpinnerFUI9 size="extra-tiny" />}
            validationMessage={stringResources.FETCHING_RESOURCE_DETAILS}
          />
        ) : hasRequiredRoles || hasRoleWritePermission ? null : (
          <Field validationState="warning" validationMessage={stringResources.MISSING_ROLE_WRITE_PERMISSIONS} />
        )}
      </div>
    ),
    [
      hasRequiredRoles,
      hasRoleWritePermission,
      isFetchingRequiredRoles,
      isFetchingRoleWritePermission,
      stringResources.FETCHING_RESOURCE_DETAILS,
      stringResources.MISSING_ROLE_WRITE_PERMISSIONS,
      roleMessageContainerStyle,
    ]
  );

  // Memoize combobox placeholder text
  const projectComboboxPlaceholder = useMemo(
    () => (isFetchingCognitiveServiceProjects ? stringResources.LOADING_PROJECT : stringResources.SELECT_COGNITIVE_SERVICE_PROJECT),
    [isFetchingCognitiveServiceProjects, stringResources.LOADING_PROJECT, stringResources.SELECT_COGNITIVE_SERVICE_PROJECT]
  );

  const accountComboboxPlaceholder = useMemo(
    () =>
      isFetchingAccount
        ? stringResources.LOADING_ACCOUNTS
        : isAgentServiceConnection
          ? stringResources.SELECT_COGNITIVE_SERVICE_AI_RESOURCE
          : stringResources.SELECT_COGNITIVE_SERVICE_OPENAI_RESOURCE,
    [
      isFetchingAccount,
      isAgentServiceConnection,
      stringResources.LOADING_ACCOUNTS,
      stringResources.SELECT_COGNITIVE_SERVICE_AI_RESOURCE,
      stringResources.SELECT_COGNITIVE_SERVICE_OPENAI_RESOURCE,
    ]
  );

  // Memoize combobox values
  const projectComboboxValue = useMemo(
    () => (isUndefinedOrEmptyString(selectedCognitiveServiceProject) ? undefined : selectedCognitiveServiceProject.split('/').pop()),
    [selectedCognitiveServiceProject]
  );

  const accountComboboxValue = useMemo(
    () => (isUndefinedOrEmptyString(cognitiveServiceAccountId) ? undefined : cognitiveServiceAccountId.split('/').pop()),
    [cognitiveServiceAccountId]
  );

  // Memoize tooltip component
  const accountTooltip = useMemo(
    () => (
      <Link href="https://go.microsoft.com/fwlink/?linkid=2189193" target="_blank">
        {stringResources.LEARN_MORE_CREATE_NEW}
      </Link>
    ),
    [stringResources.LEARN_MORE_CREATE_NEW]
  );

  // Memoize UniversalConnectionParameter props
  const universalParameterProps = useMemo(
    () => ({
      ...props,
      isLoading: entryMode === 'select',
      parameter: {
        ...parameter,
        uiDefinition: {
          ...(parameter.uiDefinition ?? {}),
          description:
            entryMode === 'select' ? (loadingAccountDetails ? stringResources.FETCHING : parameter.uiDefinition?.description) : '',
        },
      },
    }),
    [props, entryMode, parameter, loadingAccountDetails, stringResources.FETCHING]
  );

  if (parameterKey === 'cognitiveServiceAccountId') {
    return (
      <>
        <ConnectionParameterRow parameterKey="entry-mode" displayName={stringResources.ENTRY_MODE_LABEL} required={true}>
          <RadioGroup value={entryMode} onChange={onEntryModeChange} layout="horizontal">
            <Radio value="select" label={stringResources.SELECT_EXISTING} />
            <Radio value="manual" label={stringResources.ENTER_MANUALLY} />
          </RadioGroup>
        </ConnectionParameterRow>

        {entryMode === 'select' && (
          <>
            <SubscriptionDropdown
              subscriptions={subscriptions}
              isFetchingSubscriptions={isFetchingSubscription}
              setSelectedSubscriptionId={onSubscriptionChange}
              selectedSubscriptionId={selectedSubscriptionId}
              title={stringResources.SELECT_SUBSCRIPTION}
            />

            {isAgentServiceConnection ? (
              <ConnectionParameterRow parameterKey={'cognitive-service-project-name'} displayName={stringResources.PROJECT} required={true}>
                <div className={styles.openAIContainer}>
                  <div className={styles.comboxbox}>
                    <Combobox
                      data-automation-id="openai-project-combobox"
                      required={true}
                      disabled={serviceProjectsComboBoxDisabled}
                      placeholder={projectComboboxPlaceholder}
                      value={projectComboboxValue}
                      className={styles.openAICombobox}
                      onOptionSelect={onProjectSelect}
                    >
                      {isFetchingCognitiveServiceProjects ? (
                        <Spinner style={spinnerStyle} labelPosition="after" label={stringResources.LOADING_PROJECT} />
                      ) : (
                        Object.keys(cognitiveServiceProjectsAccountMap).map((accountKey) => {
                          return (
                            <OptionGroup key={`${accountKey}-optiongroup`} label={accountKey}>
                              {cognitiveServiceProjectsAccountMap[accountKey].map((project: any) => {
                                const projectName = project.name?.split?.('/').pop() ?? project.name;
                                return <Option key={project.id} value={project.id}>{`${projectName} (/${project.resourceGroup})`}</Option>;
                              })}
                            </OptionGroup>
                          );
                        })
                      )}
                    </Combobox>
                    <div className={styles.comboboxFooter}>
                      {requiresRoleAssignments && selectedCognitiveServiceProject ? <RoleMessages /> : null}
                      <CreateNewButton href="https://aka.ms/openFoundryProjectCreate" />
                    </div>
                  </div>
                  <Button
                    icon={<RefreshIcon />}
                    size="small"
                    appearance="transparent"
                    style={refreshButtonStyle}
                    disabled={isServiceProjectsRefreshDisabled}
                    onClick={onRefreshServiceProjects}
                  />
                </div>
              </ConnectionParameterRow>
            ) : (
              <ConnectionParameterRow
                parameterKey={'cognitive-service-resource-id'}
                displayName={
                  isAgentServiceConnection
                    ? stringResources.COGNITIVE_SERVICE_AI_RESOURCE
                    : stringResources.COGNITIVE_SERVICE_OPENAI_RESOURCE
                }
                required={true}
                tooltip={accountTooltip}
              >
                <div className={styles.openAIContainer}>
                  <div className={styles.comboxbox}>
                    <Combobox
                      data-automation-id="openai-combobox"
                      required={true}
                      disabled={openAIComboboxDisabled}
                      placeholder={accountComboboxPlaceholder}
                      value={accountComboboxValue}
                      className={styles.openAICombobox}
                      onOptionSelect={onAccountSelect}
                    >
                      {isFetchingAccount ? (
                        <Spinner style={spinnerStyle} labelPosition="after" label={stringResources.LOADING_ACCOUNTS} />
                      ) : (
                        (allCognitiveServiceAccounts ?? []).map((account: any) => {
                          return <Option key={account.id} value={account.id}>{`${account.name} (/${account.resourceGroup})`}</Option>;
                        })
                      )}
                    </Combobox>
                    <div className={styles.comboboxFooter}>
                      {requiresRoleAssignments && !isAgentServiceConnection && !!cognitiveServiceAccountId ? <RoleMessages /> : null}
                      <CreateNewButton href="https://aka.ms/openAICreate" />
                    </div>
                  </div>
                  <Button
                    icon={<RefreshIcon />}
                    size="small"
                    style={refreshButtonStyle}
                    appearance="transparent"
                    disabled={isOpenAIRefreshDisabled}
                    onClick={onRefreshServiceAccounts}
                  />
                </div>
              </ConnectionParameterRow>
            )}
            {errorMessage && <Text>{errorMessage}</Text>}
          </>
        )}
      </>
    );
  }

  return <UniversalConnectionParameter {...universalParameterProps} />;
};

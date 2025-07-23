import { CognitiveServiceService, equals, isUndefinedOrEmptyString, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ComboBox, type IComboBoxOption, Spinner } from '@fluentui/react';
import { useAllCognitiveServiceAccounts, useAllCognitiveServiceProjects } from './useCognitiveService';
import { useStyles } from './styles';
import { Link, Spinner as SpinnerFUI9, Field, Button } from '@fluentui/react-components';
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
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();

  const {
    isFetching: isFetchingAccount,
    data: allCognitiveServiceAccounts,
    refetch: refetchServiceAccounts,
  } = useAllCognitiveServiceAccounts(selectedSubscriptionId);

  const {
    isFetching: isFetchingCognitiveServiceProjects,
    data: cognitiveServiceProjects,
    refetch: refetchServiceProjects,
  } = useAllCognitiveServiceProjects(cognitiveServiceAccountId);

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
        defaultMessage: 'Project',
        id: 'PvTQYL',
        description: 'Project',
      }),
      LOADING_PROJECT: intl.formatMessage({
        defaultMessage: 'Loading projects...',
        id: 'tl0aop',
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
    () => openAIComboboxDisabled || isFetchingCognitiveServiceProjects,
    [isFetchingCognitiveServiceProjects, openAIComboboxDisabled]
  );

  const serviceProjectsComboBoxDisabled = useMemo(
    () => isServiceProjectsRefreshDisabled || (cognitiveServiceProjects ?? []).length === 0,
    [cognitiveServiceProjects, isServiceProjectsRefreshDisabled]
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

  const isAgentServiceConnection = useMemo(
    () => equals(operationParameterValues?.['agentModelType'] ?? '', 'FoundryAgentService', true),
    [operationParameterValues]
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

  const CreateNewButton = (props: { href: string }) => (
    <Link className={styles.createNewButton} target="_blank" href={props.href}>
      {stringResources.CREATE_NEW}
      <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
    </Link>
  );

  const RoleMessages = () => (
    <div style={{ flexGrow: 1 }}>
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
  );

  if (parameterKey === 'cognitiveServiceAccountId') {
    return (
      <>
        <SubscriptionDropdown
          subscriptions={subscriptions}
          isFetchingSubscriptions={isFetchingSubscription}
          setSelectedSubscriptionId={(id) => {
            setSelectedSubscriptionId(id);
            // Reset account and project selections when subscription changes
            setCognitiveServiceAccountId('');
            setSelectedCognitiveServiceProject('');
            setParameterValue('');
          }}
          selectedSubscriptionId={selectedSubscriptionId}
          title={stringResources.SELECT_SUBSCRIPTION}
        />
        <ConnectionParameterRow
          parameterKey={'cognitive-service-resource-id'}
          displayName={
            isAgentServiceConnection ? stringResources.COGNITIVE_SERVICE_AI_RESOURCE : stringResources.COGNITIVE_SERVICE_OPENAI_RESOURCE
          }
          required={true}
          tooltip={
            <Link href="https://go.microsoft.com/fwlink/?linkid=2189193" target="_blank">
              {stringResources.LEARN_MORE_CREATE_NEW}
            </Link>
          }
        >
          <div className={styles.openAIContainer}>
            <div className={styles.comboxbox}>
              <ComboBox
                data-automation-id="openai-combobox"
                required={true}
                disabled={openAIComboboxDisabled}
                placeholder={
                  isFetchingAccount
                    ? stringResources.LOADING_ACCOUNTS
                    : isAgentServiceConnection
                      ? stringResources.SELECT_COGNITIVE_SERVICE_AI_RESOURCE
                      : stringResources.SELECT_COGNITIVE_SERVICE_OPENAI_RESOURCE
                }
                selectedKey={isUndefinedOrEmptyString(cognitiveServiceAccountId) ? null : cognitiveServiceAccountId}
                className={styles.openAICombobox}
                options={(allCognitiveServiceAccounts ?? []).map((account: any) => {
                  return {
                    key: account.id,
                    text: `${account.name} (/${account.resourceGroup})`,
                  };
                })}
                onChange={async (_e, option?: IComboBoxOption) => {
                  if (option?.key) {
                    const cognitiveServiceKey = option?.key as string;
                    setCognitiveServiceAccountId(cognitiveServiceKey);
                    setSelectedCognitiveServiceProject(''); // Reset project selection when account changes
                    setParameterValue(cognitiveServiceKey);
                    if (!isAgentServiceConnection) {
                      onSetOpenAIValues(cognitiveServiceKey);
                    }
                  }
                }}
                errorMessage={errorMessage}
              >
                {isFetchingAccount ? (
                  <Spinner
                    style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                    labelPosition="right"
                    label={stringResources.LOADING_ACCOUNTS}
                  />
                ) : null}
              </ComboBox>
              <div className={styles.comboboxFooter}>
                {requiresRoleAssignments && !isAgentServiceConnection && !!cognitiveServiceAccountId ? <RoleMessages /> : null}
                <CreateNewButton href="https://aka.ms/openAICreate" />
              </div>
            </div>
            <Button
              icon={<RefreshIcon />}
              size="small"
              style={{
                margin: '0 4px',
                height: '100%',
              }}
              appearance="transparent"
              disabled={isOpenAIRefreshDisabled}
              onClick={onRefreshServiceAccounts}
            />
          </div>
        </ConnectionParameterRow>

        {isAgentServiceConnection ? (
          <ConnectionParameterRow parameterKey={'cognitive-service-project-name'} displayName={stringResources.PROJECT} required={true}>
            <div className={styles.openAIContainer}>
              <div className={styles.comboxbox}>
                <ComboBox
                  data-automation-id="openai-project-combobox"
                  required={true}
                  disabled={serviceProjectsComboBoxDisabled}
                  placeholder={
                    isFetchingCognitiveServiceProjects ? stringResources.LOADING_PROJECT : stringResources.SELECT_COGNITIVE_SERVICE_PROJECT
                  }
                  selectedKey={isUndefinedOrEmptyString(selectedCognitiveServiceProject) ? null : selectedCognitiveServiceProject}
                  className={styles.openAICombobox}
                  options={(cognitiveServiceProjects ?? []).map((project: any) => {
                    const projectName = project.name?.split?.('/')[1] ?? project.name;
                    return {
                      key: project.id,
                      data: projectName,
                      text: `${projectName}`,
                    };
                  })}
                  onChange={async (_e, option?: IComboBoxOption) => {
                    if (option?.key) {
                      const serviceProjectId = option?.key as string;
                      const serviceProjectName = option?.data as string;
                      const cognitiveServiceAccountName = cognitiveServiceAccountId.split('/').pop();
                      const openAIEndpoint = `https://${cognitiveServiceAccountName}.services.ai.azure.com/api/projects/${serviceProjectName}`;
                      setSelectedCognitiveServiceProject(serviceProjectId);
                      setParameterValue(serviceProjectId);
                      setKeyValue?.('openAIEndpoint', openAIEndpoint);
                    }
                  }}
                  errorMessage={errorMessage}
                >
                  {isFetchingCognitiveServiceProjects ? (
                    <Spinner
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '8px',
                      }}
                      labelPosition="right"
                      label={stringResources.LOADING_PROJECT}
                    />
                  ) : null}
                </ComboBox>
                <div className={styles.comboboxFooter}>
                  {requiresRoleAssignments && selectedCognitiveServiceProject ? <RoleMessages /> : null}
                  <CreateNewButton href="https://aka.ms/openFoundryProjectCreate" />
                </div>
              </div>
              <Button
                icon={<RefreshIcon />}
                size="small"
                appearance="transparent"
                style={{
                  margin: '0 4px',
                  height: '100%',
                }}
                disabled={isServiceProjectsRefreshDisabled}
                onClick={onRefreshServiceProjects}
              />
            </div>
          </ConnectionParameterRow>
        ) : null}
      </>
    );
  }

  return (
    <UniversalConnectionParameter
      {...props}
      isLoading={true}
      parameter={{
        ...parameter,
        uiDefinition: {
          ...(parameter.uiDefinition ?? {}),
          description: loadingAccountDetails ? stringResources.FETCHING : parameter.uiDefinition?.description,
        },
      }}
    />
  );
};

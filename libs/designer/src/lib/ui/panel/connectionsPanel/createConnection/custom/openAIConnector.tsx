import { CognitiveServiceService, isUndefinedOrEmptyString, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useState } from 'react';
import { ComboBox, type IComboBoxOption, Spinner } from '@fluentui/react';
import { useAllCognitiveServiceAccounts, useAllCognitiveServiceProjects } from './useCognitiveService';
import { useStyles } from './styles';
import { Link, tokens } from '@fluentui/react-components';
import { NavigateIcon } from '@microsoft/designer-ui';
import { ArrowClockwise16Filled, ArrowClockwise16Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';
import { SubscriptionDropdown } from './components/SubscriptionDropdown';

const RefreshIcon = bundleIcon(ArrowClockwise16Regular, ArrowClockwise16Filled);

export const CustomOpenAIConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, setKeyValue, setValue, parameter, isAgentServiceConnection } = props;
  const intl = useIntl();
  const styles = useStyles();
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
      COGNITIVE_SERVICE_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Azure OpenAI resource',
        id: 'u5LIuT',
        description: 'Select the Azure Cognitive Service Account to use for this connection',
      }),
      SELECT_COGNITIVE_SERVICE_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Select an Azure OpenAI resource',
        id: 'BR/bBa',
        description: 'Select the Azure Cognitive Service Account to use for this connection',
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

  const openAIComboboxDisabled = useMemo(
    () => isFetchingAccount || isFetchingSubscription || !selectedSubscriptionId || (allCognitiveServiceAccounts ?? []).length === 0,
    [allCognitiveServiceAccounts, isFetchingAccount, isFetchingSubscription, selectedSubscriptionId]
  );
  const onRefreshServiceAccounts = useCallback(() => {
    if (!openAIComboboxDisabled) {
      refetchServiceAccounts();
    }
  }, [openAIComboboxDisabled, refetchServiceAccounts]);

  const serviceProjectsComboBoxDisabled = useMemo(
    () => openAIComboboxDisabled || isFetchingCognitiveServiceProjects || (cognitiveServiceProjects ?? []).length === 0,
    [cognitiveServiceProjects, isFetchingCognitiveServiceProjects, openAIComboboxDisabled]
  );

  const onRefreshServiceProjects = useCallback(() => {
    if (!serviceProjectsComboBoxDisabled) {
      refetchServiceProjects();
    }
  }, [serviceProjectsComboBoxDisabled, refetchServiceProjects]);

  const onSetOpenAIValues = useCallback(
    async (newValue: string) => {
      setLoadingAccountDetails(true);
      await Promise.all([setAPIEndpoint(newValue), setAPIKey(newValue)]);
      setLoadingAccountDetails(false);
    },
    [setAPIEndpoint, setAPIKey]
  );

  if (parameterKey === 'cognitiveServiceAccountId') {
    return (
      <>
        <SubscriptionDropdown
          subscriptions={subscriptions}
          isFetchingSubscriptions={isFetchingSubscription}
          setSelectedSubscriptionId={setSelectedSubscriptionId}
          selectedSubscriptionId={selectedSubscriptionId}
          title={stringResources.SELECT_SUBSCRIPTION}
        />
        <ConnectionParameterRow
          parameterKey={'cognitive-service-resource-id'}
          displayName={stringResources.COGNITIVE_SERVICE_ACCOUNT}
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
                required={true}
                disabled={openAIComboboxDisabled}
                placeholder={isFetchingAccount ? stringResources.LOADING_ACCOUNTS : stringResources.SELECT_COGNITIVE_SERVICE_ACCOUNT}
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
                    setValue(cognitiveServiceKey);
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
              <Link className={styles.createNewButton} target="_blank" href="https://aka.ms/openAICreate">
                {stringResources.CREATE_NEW}
                <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
              </Link>
            </div>
            <RefreshIcon
              style={{
                marginTop: '4px',
                marginLeft: '4px',
                color: openAIComboboxDisabled ? tokens.colorBrandBackground2Pressed : tokens.colorBrandBackground,
              }}
              onClick={onRefreshServiceAccounts}
            />
          </div>
        </ConnectionParameterRow>

        {isAgentServiceConnection ? (
          <ConnectionParameterRow parameterKey={'cognitive-service-project-name'} displayName={stringResources.PROJECT} required={true}>
            <div className={styles.openAIContainer}>
              <div className={styles.comboxbox}>
                <ComboBox
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
                      setValue(serviceProjectId);
                      setKeyValue?.('openAIEndpoint', openAIEndpoint);
                    }
                  }}
                  errorMessage={errorMessage}
                >
                  {isFetchingCognitiveServiceProjects ? (
                    <Spinner
                      style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                      labelPosition="right"
                      label={stringResources.LOADING_PROJECT}
                    />
                  ) : null}
                </ComboBox>
                <Link className={styles.createNewButton} target="_blank" href="https://aka.ms/openFoundryProjectCreate">
                  {stringResources.CREATE_NEW}
                  <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
                </Link>
              </div>
              <RefreshIcon
                style={{
                  marginTop: '4px',
                  marginLeft: '4px',
                  color: serviceProjectsComboBoxDisabled ? tokens.colorBrandBackground2Pressed : tokens.colorBrandBackground,
                }}
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

import { CognitiveServiceService, equals, isUndefinedOrEmptyString, LogEntryLevel, LoggerService, ResourceService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../../../../../../../../designer-v2/src/lib/ui/panel/connectionsPanel/createConnection/formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../../../../../../../../designer-v2/src/lib/ui/panel/connectionsPanel/createConnection/connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAllAPIMServiceAccounts,
  useAllAPIMServiceAccountsApis,
  useAllCognitiveServiceAccounts,
  useAllCognitiveServiceProjects,
} from '../../../../../../../../designer-v2/src/lib/ui/panel/connectionsPanel/createConnection/custom/useCognitiveService';
import { useStyles } from '../../../../../../../../designer-v2/src/lib/ui/panel/connectionsPanel/createConnection/custom/styles';
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
} from '@fluentui/react-components';
import { NavigateIcon } from '@microsoft/designer-ui';
import { ArrowClockwise16Filled, ArrowClockwise16Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../../../../designer-v2/src/lib/core/state/connection/connectionSelector';
import { SubscriptionDropdown } from '../../../../../../../../designer-v2/src/lib/ui/panel/connectionsPanel/createConnection/custom/components/SubscriptionDropdown';
import { useHasRoleAssignmentsWritePermissionQuery, useHasRoleDefinitionsByNameQuery } from '../../../../../../../../designer-v2/src/lib/core/queries/role';
import constants from '../../../../../../../../designer-v2/src/lib/common/constants';
import { useAllCosmosDbServiceAccounts } from './useCognitiveService';

const RefreshIcon = bundleIcon(ArrowClockwise16Regular, ArrowClockwise16Filled);

export const CustomCosmosDBConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, setKeyValue, setValue, parameter, operationParameterValues, parameterValues, value } = props;
  const intl = useIntl();
  const styles = useStyles();
  const [parameterValue, setParameterValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const [cosmosDBAccountId, setCosmosDBAccountId] = useState<string>('');
  const [selectedCosmosDBProject, setSelectedCosmosDBProject] = useState<string>('');
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();

  const {
    isFetching,
    data: allDBAccounts,
    refetch,
  } = useAllCosmosDbServiceAccounts(selectedSubscriptionId);

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
      RESOURCE: intl.formatMessage({
        defaultMessage: 'Database',
        id: '6hj4yW',
        description: 'Azure Cosmos DB resource label',
      }),
      SELECT_COSMOS_DB_RESOURCE: intl.formatMessage({
        defaultMessage: 'Select a Azure Cosmos DB resource',
        id: 'uhtJkb',
        description: 'Select the Azure Cosmos DB resource to use for this connection',
      }),
      LOADING_DATABASES: intl.formatMessage({
        defaultMessage: 'Loading databases...',
        id: 'WwhIX1',
        description: 'Loading databases text',
      }),
      FETCHING: intl.formatMessage({
        defaultMessage: 'Fetching...',
        id: 'WBDuOo',
        description: 'Fetching data text',
      }),
      SELECT_SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Select the subscription for your Cosmos DB resource',
        id: 'ySi0Rt',
        description: 'Message for selecting subscription',
      }),
      FETCHING_RESOURCE_DETAILS: intl.formatMessage({
        defaultMessage: 'Fetching resource details...',
        id: 'EXxdfo',
        description: 'Message displayed while fetching resource details',
      }),
    }),
    [intl]
  );

  const setEndpoint = useCallback(
    async (accountId: string) => {
      try {
        const accountResponse = await getCosmosDbEndpoint(accountId);
        setKeyValue?.('openAIEndpoint', accountResponse);
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

  const setKey = useCallback(
    async (accountId: string) => {
      try {
        const accountResponse = await ResourceService().executeResourceAction(`${accountId}/listKeys`, 'POST', { 'api-version': '2025-11-01' });
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

  const isRefreshDisabled = useMemo(
    () => isFetching || isFetchingSubscription || !selectedSubscriptionId,
    [isFetching, isFetchingSubscription, selectedSubscriptionId]
  );

  const disabled = useMemo(
    () => isRefreshDisabled || (allDBAccounts ?? []).length === 0,
    [allDBAccounts, isRefreshDisabled]
  );

  const onRefreshServiceAccounts = useCallback(() => {
    refetchServiceAccounts();
  }, [refetchServiceAccounts]);

  const onSetValues = useCallback(
    async (newValue: string) => {
      setLoadingAccountDetails(true);
      await Promise.all([setEndpoint(newValue), setKey(newValue)]);
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
          setSelectedSubscriptionId={(id) => {
            setSelectedSubscriptionId(id);
            // Reset account and project selections when subscription changes
            setSelectedCosmosDBProject('');
          }}
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
                  placeholder={
                    isFetchingCognitiveServiceProjects ? stringResources.LOADING_PROJECT : stringResources.SELECT_COGNITIVE_SERVICE_PROJECT
                  }
                  value={
                    isUndefinedOrEmptyString(selectedCognitiveServiceProject) ? undefined : selectedCognitiveServiceProject.split('/').pop()
                  }
                  className={styles.openAICombobox}
                  onOptionSelect={async (_e, option?: OptionOnSelectData) => {
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
                  }}
                >
                  {isFetchingCognitiveServiceProjects ? (
                    <Spinner
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '8px',
                      }}
                      labelPosition="after"
                      label={stringResources.LOADING_PROJECT}
                    />
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
                style={{
                  margin: '0 4px',
                  height: '100%',
                }}
                disabled={isServiceProjectsRefreshDisabled}
                onClick={onRefreshServiceProjects}
              />
            </div>
          </ConnectionParameterRow>
        ) : isAPIMGenAIGateway ? (
          <>
            <ConnectionParameterRow
              parameterKey={'apiManagementService'}
              displayName={stringResources.API_MANAGEMENT_SERVICE}
              required={true}
            >
              <div className={styles.openAIContainer}>
                <div className={styles.comboxbox}>
                  <Combobox
                    data-automation-id="apim-account-combobox"
                    required={true}
                    disabled={isAPIMAccountsComboboxDisabled}
                    placeholder={isFetchingAPIManagementAccounts ? stringResources.LOADING_APIM : stringResources.SELECT_APIM_ACCOUNT}
                    value={isUndefinedOrEmptyString(apimAccount) ? undefined : apimAccount.split('/').pop()}
                    className={styles.openAICombobox}
                    onOptionSelect={async (_e, option?: OptionOnSelectData) => {
                      if (option?.optionValue) {
                        const resourceId = option?.optionValue as string;
                        setApimAccount(resourceId);
                      }
                    }}
                  >
                    {isFetchingAPIManagementAccounts ? (
                      <Spinner
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                        }}
                        labelPosition="after"
                        label={stringResources.LOADING_APIM}
                      />
                    ) : (
                      (allAPIMServiceAccounts ?? []).map((account: any) => {
                        return (
                          <Option
                            key={account.id}
                            value={account.id}
                          >{`${account.name} ${account.location ? `(${account.location})` : ''}`}</Option>
                        );
                      })
                    )}
                  </Combobox>
                  <div className={styles.comboboxFooter}>
                    <Link className={styles.createNewButton} target="_blank" href={constants.LINKS.APIM_LEARN_MORE}>
                      {stringResources.LEARN_MORE}
                      <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
                    </Link>
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
                  disabled={isAPIMAccountsComboboxDisabled}
                  onClick={onRefreshAPIManagementAccounts}
                />
              </div>
            </ConnectionParameterRow>
            <ConnectionParameterRow
              parameterKey={'apiManagementServiceApis'}
              displayName={stringResources.API_MANAGEMENT_SERVICE_APIS}
              required={true}
            >
              <div className={styles.openAIContainer}>
                <div className={styles.comboxbox}>
                  <Combobox
                    data-automation-id="apim-account-apis-combobox"
                    required={true}
                    disabled={!apimAccount}
                    placeholder={
                      isFetchingAPIManagementAccountApis ? stringResources.LOADING_APIM_APIS : stringResources.SELECT_APIM_ACCOUNT_APIS
                    }
                    value={isUndefinedOrEmptyString(value) ? undefined : value.split('/').pop()}
                    className={styles.openAICombobox}
                    onOptionSelect={async (_e, option?: OptionOnSelectData) => {
                      if (option?.optionValue) {
                        const resourceId = option?.optionValue as string;
                        setValue(resourceId);
                      }
                    }}
                  >
                    {isFetchingAPIManagementAccountApis ? (
                      <Spinner
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                        }}
                        labelPosition="after"
                        label={stringResources.LOADING_APIM_APIS}
                      />
                    ) : (
                      (allAPIMServiceAccountsApis ?? []).map((apis: any) => {
                        return (
                          <Option key={apis.id} value={apis.id}>
                            {apis.name}
                          </Option>
                        );
                      })
                    )}
                  </Combobox>
                </div>
                <Button
                  icon={<RefreshIcon />}
                  size="small"
                  appearance="transparent"
                  style={{
                    margin: '0 4px',
                    height: '100%',
                  }}
                  disabled={isAPIMAccountsComboboxDisabled || !apimAccount}
                  onClick={() => {
                    refetchAPIManagementAccountApis();
                  }}
                />
              </div>
            </ConnectionParameterRow>
          </>
        ) : (
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
                <Combobox
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
                  value={isUndefinedOrEmptyString(cognitiveServiceAccountId) ? undefined : cognitiveServiceAccountId.split('/').pop()}
                  className={styles.openAICombobox}
                  onOptionSelect={async (_e: any, option?: OptionOnSelectData) => {
                    if (option?.optionValue) {
                      const cognitiveServiceKey = option?.optionValue as string;
                      setCognitiveServiceAccountId(cognitiveServiceKey);
                      setSelectedCognitiveServiceProject(''); // Reset project selection when account changes
                      setParameterValue(cognitiveServiceKey);
                      if (!isAgentServiceConnection) {
                        onSetOpenAIValues(cognitiveServiceKey);
                      }
                    }
                  }}
                >
                  {isFetchingAccount ? (
                    <Spinner
                      style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                      labelPosition="after"
                      label={stringResources.LOADING_ACCOUNTS}
                    />
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
        )}
        {errorMessage && <Text>{errorMessage}</Text>}
      </>
    );
  }

  // Render other parameters (openAIEndpoint, openAIKey, clientCertificate*, etc.)
  const shouldDisableField = (() => {
    if (isAPIMGenAIGateway) {
      // For APIM, disable until account is selected
      return !parameterValues?.['cognitiveServiceAccountId'];
    }
    if (isV1ChatCompletionsService) {
      // For V1ChatCompletions (BYO), always enable for user input
      return false;
    }
    // For Azure OpenAI, disable (auto-filled from Azure resource)
    return true;
  })();

  const fieldDescription = (() => {
    if (loadingAccountDetails) {
      return stringResources.FETCHING;
    }
    if (isAPIMGenAIGateway || isV1ChatCompletionsService) {
      return stringResources.DEFAULT_PLACEHOLDER;
    }
    return parameter.uiDefinition?.description;
  })();

  return (
    <UniversalConnectionParameter
      {...props}
      isLoading={shouldDisableField}
      parameter={{
        ...parameter,
        uiDefinition: {
          ...(parameter.uiDefinition ?? {}),
          description: fieldDescription,
        },
      }}
    />
  );
};

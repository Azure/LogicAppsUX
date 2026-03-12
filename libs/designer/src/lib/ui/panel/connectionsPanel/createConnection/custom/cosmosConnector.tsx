import { ResourceService, LogEntryLevel, LoggerService, equals, isArmResourceId } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStyles } from './styles';
import { Link, tokens, Combobox, Option, Field } from '@fluentui/react-components';
import { ArrowClockwise20Filled, ArrowClockwise20Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';
import { SubscriptionDropdown } from './components/SubscriptionDropdown';
import { useAllCosmosDbServiceAccounts, type CosmosDbAccount } from './useCognitiveService';

const RefreshIcon = bundleIcon(ArrowClockwise20Regular, ArrowClockwise20Filled);

export const CosmosDbConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, value, setValue, parameter, setKeyValue, cssOverrides, styleOverrides, operationParameterValues } = props;
  const intl = useIntl();
  const styles = useStyles();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(getSubscriptionFromResource(value));
  const {
    isFetching: isFetchingAccount,
    data: allCosmosDbServiceAccounts,
    refetch,
  } = useAllCosmosDbServiceAccounts(selectedSubscriptionId);
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();

  const [selectedAccountText, setSelectedAccountText] = useState<string>('');
  const isKeyAuth = useMemo(() => equals(operationParameterValues?.['authType'], 'key'), [operationParameterValues]);
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
      NO_RESOURCES: intl.formatMessage({
        defaultMessage: 'No Cosmos DB resources found',
        id: 'UdYwGT',
        description: 'Message displayed when no Cosmos DB resources are found',
      }),
      NO_RESULTS: intl.formatMessage({
        defaultMessage: 'No results found',
        id: 'nEWQ/Q',
        description: 'Message displayed when search returns no results',
      }),
    }),
    [intl]
  );

  const setEndpoint = useCallback(
    (endpoint: string) => {
      if (endpoint) {
        setKeyValue?.('cosmosDBEndpoint', endpoint);
        setErrorMessage('');
      }
    },
    [setKeyValue]
  );

  const setKey = useCallback(
    async (accountId: string) => {
      try {
        const accountResponse = await ResourceService().executeResourceAction(`${accountId}/listKeys`, 'POST', {
          'api-version': '2025-11-01',
        });
        setKeyValue?.('cosmosDBAuthenticationKey', accountResponse?.key1 ?? '');
        setErrorMessage('');
      } catch (e: any) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'agent-connection-account-key',
          message: 'Failed to fetch account key for Cosmos DB',
          error: e,
        });
        setErrorMessage(e.message ?? 'Failed to fetch account key');
      }
    },
    [setKeyValue]
  );

  const setAccountValues = useCallback(
    async (account: CosmosDbAccount) => {
      setLoadingAccountDetails(true);
      setEndpoint(account.endpoint);
      if (isKeyAuth) {
        await setKey(account.id);
      }
      setLoadingAccountDetails(false);

      setValue(account.id);
    },
    [setEndpoint, setKey, setValue, isKeyAuth]
  );

  const setSubscriptionValue = useCallback(
    (subscriptionId: string) => {
      setSelectedSubscriptionId(subscriptionId);
      setValue('');
      setSelectedAccountText('');
    },
    [setValue]
  );

  useEffect(() => {
    if (value && allCosmosDbServiceAccounts && !isFetchingAccount) {
      const selectedAccount = allCosmosDbServiceAccounts.find((account) => equals(account.id, value));
      if (selectedAccount) {
        setSelectedAccountText(`${selectedAccount.name} (/${selectedAccount.resourceGroup})`);
      }
    }
  }, [value, allCosmosDbServiceAccounts, isFetchingAccount]);

  const accountComboboxDisabled = useMemo(() => isFetchingAccount || isFetchingSubscription, [isFetchingAccount, isFetchingSubscription]);

  const onRefreshClick = useCallback(() => {
    if (!accountComboboxDisabled) {
      refetch();
    }
  }, [accountComboboxDisabled, refetch]);

  const accountOptions = useMemo(() => {
    return (allCosmosDbServiceAccounts ?? []).map((account: CosmosDbAccount) => ({
      key: account.id,
      text: `${account.name} (/${account.resourceGroup})`,
      data: account,
    }));
  }, [allCosmosDbServiceAccounts]);

  const [accountSearchTerm, setSearchTerm] = useState<string | undefined>();

  if (parameterKey === 'cosmosDbServiceAccountId') {
    return (
      <>
        <SubscriptionDropdown
          subscriptions={subscriptions}
          isFetchingSubscriptions={isFetchingSubscription}
          setSelectedSubscriptionId={setSubscriptionValue}
          selectedSubscriptionId={selectedSubscriptionId}
          title={stringResources.SELECT_SUBSCRIPTION}
          cssOverrides={cssOverrides}
          styleOverrides={styleOverrides}
        />
        <ConnectionParameterRow
          parameterKey={'cosmos-db-resource-id'}
          displayName={stringResources.RESOURCE}
          required={true}
          tooltip={
            <Link href="https://learn.microsoft.com/azure/cosmos-db/introduction" target="_blank">
              {'Learn More'}
            </Link>
          }
          cssOverrides={cssOverrides}
        >
          <div className={styles.openAIContainer}>
            <Field className={styles.cosmosField} validationState={errorMessage ? 'error' : 'none'} validationMessage={errorMessage}>
              <Combobox
                className={styles.cosmosCombobox}
                disabled={isFetchingAccount}
                value={accountSearchTerm !== undefined ? accountSearchTerm : selectedAccountText}
                selectedOptions={value ? [value] : []}
                placeholder={isFetchingAccount ? stringResources.LOADING_DATABASES : stringResources.SELECT_COSMOS_DB_RESOURCE}
                onOptionSelect={async (_, data) => {
                  if (data.optionValue && data.optionValue !== 'no-items' && !equals(data.optionValue, value)) {
                    const resource = accountOptions.find((r) => equals(r.data.id, data.optionValue))?.data ?? undefined;
                    if (resource) {
                      await setAccountValues(resource);
                      setSearchTerm(undefined);
                    }
                  }
                }}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              >
                {!isFetchingAccount && !accountOptions.length ? (
                  <Option key={'no-items'} value={'no-items'} disabled>
                    {accountSearchTerm?.trim() ? `${stringResources.NO_RESULTS} "${accountSearchTerm}"` : stringResources.NO_RESOURCES}
                  </Option>
                ) : (
                  accountOptions.map((resource) => (
                    <Option key={resource.data.id} value={resource.data.id}>
                      {resource.data.name}
                    </Option>
                  ))
                )}
              </Combobox>
            </Field>
            <RefreshIcon
              style={{
                margin: '6px 0 0 6px',
                color: accountComboboxDisabled ? tokens.colorBrandBackground2Pressed : tokens.colorBrandBackground,
              }}
              onClick={onRefreshClick}
            />
          </div>
        </ConnectionParameterRow>
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

export const getSubscriptionFromResource = (resourceId: string): string => {
  if (!resourceId || !isArmResourceId(resourceId)) {
    return '';
  }

  return resourceId.split('/subscriptions/')[1].split('/')[0];
};

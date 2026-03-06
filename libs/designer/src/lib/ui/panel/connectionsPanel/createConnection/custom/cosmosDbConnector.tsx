import { ResourceService, isUndefinedOrEmptyString, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';
import { ComboBox, Spinner } from '@fluentui/react';
import { useStyles } from './styles';
import { Link, tokens } from '@fluentui/react-components';
import { ArrowClockwise16Filled, ArrowClockwise16Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';
import { SubscriptionDropdown } from './components/SubscriptionDropdown';
import { useAllCosmosDbServiceAccounts, getCosmosDbEndpoint } from './useCognitiveService';

const RefreshIcon = bundleIcon(ArrowClockwise16Regular, ArrowClockwise16Filled);

export const CosmosDbConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, value, setValue, parameter, setKeyValue } = props;
  const intl = useIntl();
  const styles = useStyles();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const {
    isFetching: isFetchingAccount,
    data: allCosmosDbServiceAccounts,
    refetch,
  } = useAllCosmosDbServiceAccounts(selectedSubscriptionId);
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();

  const comboRef = useRef<IComboBox>(null);
  const [selectedAccountText, setSelectedAccountText] = useState<string>('');

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
        setKeyValue?.('cosmosDbEndpoint', accountResponse);
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
        const accountResponse = await ResourceService().executeResourceAction(`${accountId}/listKeys`, 'POST', {
          'api-version': '2025-11-01',
        });
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

  const setAccountValues = useCallback(
    async (accountId: string) => {
      setLoadingAccountDetails(true);
      await Promise.all([setEndpoint(accountId), setKey(accountId)]);
      setLoadingAccountDetails(false);

      setValue(accountId);
    },
    [setEndpoint, setKey, setValue]
  );

  const setSubscriptionValue = useCallback(
    (subscriptionId: string) => {
      setSelectedSubscriptionId(subscriptionId);
      setValue('');
      setSelectedAccountText('');
    },
    [setValue]
  );

  const accountComboboxDisabled = useMemo(() => isFetchingAccount || isFetchingSubscription, [isFetchingAccount, isFetchingSubscription]);

  const onRefreshClick = useCallback(() => {
    if (!accountComboboxDisabled) {
      refetch();
    }
  }, [accountComboboxDisabled, refetch]);

  const accountOptions: IComboBoxOption[] = useMemo(() => {
    return (allCosmosDbServiceAccounts ?? []).map((account: any) => ({
      key: account.id,
      text: `${account.name} (/${account.resourceGroup})`,
    }));
  }, [allCosmosDbServiceAccounts]);

  if (parameterKey === 'cosmosDbServiceAccountId') {
    return (
      <>
        <SubscriptionDropdown
          subscriptions={subscriptions}
          isFetchingSubscriptions={isFetchingSubscription}
          setSelectedSubscriptionId={setSubscriptionValue}
          selectedSubscriptionId={selectedSubscriptionId}
          title={stringResources.SELECT_SUBSCRIPTION}
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
        >
          <div className={styles.openAIContainer}>
            <div className={styles.comboxbox}>
              <ComboBox
                autoFocus={false}
                componentRef={comboRef}
                allowFreeform
                autoComplete="on"
                required={true}
                disabled={isFetchingAccount}
                placeholder={isFetchingAccount ? stringResources.LOADING_DATABASES : stringResources.SELECT_COSMOS_DB_RESOURCE}
                selectedKey={isUndefinedOrEmptyString(value) ? null : value}
                className={styles.openAICombobox}
                options={accountOptions}
                text={selectedAccountText}
                errorMessage={errorMessage}
                onClick={() => {
                  if (!isFetchingAccount) {
                    comboRef.current?.focus(true);
                  }
                }}
                onChange={async (_e, option?: IComboBoxOption) => {
                  if (option?.key) {
                    const selectedId = option.key as string;
                    await setAccountValues(selectedId);
                    setSelectedAccountText(option.text);
                  }
                }}
                onPendingValueChanged={(_option, _index, text) => setSelectedAccountText(text ?? '')}
              >
                {isFetchingAccount ? (
                  <Spinner
                    style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                    labelPosition="right"
                    label={stringResources.LOADING_DATABASES}
                  />
                ) : null}
              </ComboBox>
            </div>
            <RefreshIcon
              style={{
                marginTop: '4px',
                marginLeft: '4px',
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

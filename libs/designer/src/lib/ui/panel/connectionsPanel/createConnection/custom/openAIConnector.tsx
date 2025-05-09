import {
  CognitiveServiceService,
  isUndefinedOrEmptyString,
  LogEntryLevel,
  LoggerService,
  type Resource,
} from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useState } from 'react';
import { ComboBox, type IComboBoxOption, Spinner } from '@fluentui/react';
import { useAllCognitiveServiceAccounts } from './useCognitiveService';
import { useStyles } from './styles';
import { Link, tokens } from '@fluentui/react-components';
import { NavigateIcon } from '@microsoft/designer-ui';
import { ArrowClockwise16Filled, ArrowClockwise16Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';

const RefreshIcon = bundleIcon(ArrowClockwise16Regular, ArrowClockwise16Filled);

export const CustomOpenAIConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, value, setKeyValue, setValue, parameter } = props;
  const intl = useIntl();
  const styles = useStyles();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const {
    isFetching: isFetchingAccount,
    data: allCognitiveServiceAccounts,
    refetch,
  } = useAllCognitiveServiceAccounts(selectedSubscriptionId);
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();

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
        id: 'DchXwC',
        description: 'Loading accounts...',
      }),
      FETCHING: intl.formatMessage({
        defaultMessage: 'Fetching...',
        id: 'T0X+Iw',
        description: 'Fetching...',
      }),
      SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Subscription',
        id: 'jAaD5P',
        description: 'Subscription',
      }),
      LOADING_SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Loading all subscriptions...',
        id: '45mB92',
        description: 'Subscription',
      }),
      SELECT_SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Select the subscription for your OpenAI resource',
        id: 'MFCzRk',
        description: 'Subscription',
      }),
      CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Create new',
        id: 'W1WsMz',
        description: 'Create new',
      }),
      LEARN_MORE_CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Learn more about creating a new Azure OpenAI resource',
        id: 'D/CS5p',
        description: 'learn more for create new',
      }),
    }),
    [intl]
  );

  const fetchAccount = useCallback(
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

  const fetchKey = useCallback(
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

  const onRefreshClick = useCallback(() => {
    if (!openAIComboboxDisabled) {
      refetch();
    }
  }, [openAIComboboxDisabled, refetch]);

  if (parameterKey === 'cognitiveServiceAccountId') {
    return (
      <>
        <ConnectionParameterRow parameterKey={'subscription-id'} displayName={stringResources.SUBSCRIPTION} required={true}>
          <ComboBox
            required={true}
            disabled={isFetchingSubscription}
            placeholder={isFetchingSubscription ? stringResources.LOADING_SUBSCRIPTION : stringResources.SELECT_SUBSCRIPTION}
            selectedKey={isUndefinedOrEmptyString(selectedSubscriptionId) ? null : selectedSubscriptionId}
            className={styles.subscriptionCombobox}
            options={(subscriptions ?? [])
              .sort((a, b) => a.displayName.localeCompare(b.displayName))
              .map((subscription: Resource) => {
                const id = subscription.id.split('/subscriptions/')[1];
                return {
                  key: id,
                  text: `${subscription.displayName} (${id})`,
                };
              })}
            onChange={async (_e, option?: IComboBoxOption) => {
              if (option?.key) {
                setSelectedSubscriptionId(option?.key as string);
              }
            }}
          >
            {isFetchingSubscription ? (
              <Spinner
                style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                labelPosition="right"
                label={stringResources.LOADING_SUBSCRIPTION}
              />
            ) : null}
          </ComboBox>
        </ConnectionParameterRow>
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
                selectedKey={isUndefinedOrEmptyString(value) ? null : value}
                className={styles.openAICombobox}
                options={(allCognitiveServiceAccounts ?? []).map((account: any) => {
                  return {
                    key: account.id,
                    text: `${account.name} (/${account.resourceGroup})`,
                  };
                })}
                onChange={async (_e, option?: IComboBoxOption) => {
                  if (option?.key) {
                    const value = option?.key as string;
                    setValue(value);
                    setLoadingAccountDetails(true);
                    await Promise.all([fetchAccount(value), fetchKey(value)]);
                    setLoadingAccountDetails(false);
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

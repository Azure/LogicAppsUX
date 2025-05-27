import { CognitiveServiceService, isUndefinedOrEmptyString, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { IComboBox, IComboBoxOption } from '@fluentui/react';
import { ComboBox, Spinner } from '@fluentui/react';
import { useStyles } from './styles';
import { Link, tokens } from '@fluentui/react-components';
import { NavigateIcon } from '@microsoft/designer-ui';
import { ArrowClockwise16Filled, ArrowClockwise16Regular, bundleIcon } from '@fluentui/react-icons';
import { useSubscriptions } from '../../../../../core/state/connection/connectionSelector';
import { SubscriptionDropdown } from './components/SubscriptionDropdown';
import { useAllBuiltInRoleDefinitions, useAllSessionPoolAccounts } from './useCognitiveService';

const RefreshIcon = bundleIcon(ArrowClockwise16Regular, ArrowClockwise16Filled);

export const ACASessionConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, value, setValue, parameter } = props;
  const intl = useIntl();
  const styles = useStyles();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const { isFetching: isFetchingAccount, data: allSessionPoolAccounts, refetch } = useAllSessionPoolAccounts(selectedSubscriptionId);
  const { isFetching: isFetchingSubscription, data: subscriptions } = useSubscriptions();
  const {
    isFetching: isFetchingBuiltInRoleDefinitions,
    data: { value: builltInRoleDefinitions },
  } = useAllBuiltInRoleDefinitions();

  const sessionExecutorRole = useMemo(() => {
    if (isFetchingBuiltInRoleDefinitions || !Array.isArray(builltInRoleDefinitions)) {
      return undefined;
    }
    return builltInRoleDefinitions?.find((role: any) => role?.properties?.roleName === 'Azure ContainerApps Session Executor')?.name;
  }, [builltInRoleDefinitions, isFetchingBuiltInRoleDefinitions]);

  const comboRef = useRef<IComboBox>(null);
  const [poolInputText, setPoolInputText] = useState<string>('');

  const stringResources = useMemo(
    () => ({
      ACA_SESSION_POOL: intl.formatMessage({
        defaultMessage: 'ACA Session Pool',
        id: 'eUGUbj',
        description: 'Label for the ACA Session Pool',
      }),
      SELECT_ACA_SESSION_POOL_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Select an ACA Session Pool',
        id: 'lbwcLk',
        description: 'Select the ACA session pool to use for this connection',
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
      CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Create new',
        id: '+ebtNl',
        description: 'Label to create a new connection',
      }),
      LEARN_MORE_CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Learn more about creating a new Azure Container App code interpreter session pool',
        id: 'ZsDnVT',
        description: 'info text for create',
      }),
      SELECT_SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Select the subscription for your ACA session pool',
        id: 'nJI9m3',
        description: 'Message for selecting subscription',
      }),
    }),
    [intl]
  );

  const fetchAccount = useCallback(async (accountId: string) => {
    try {
      const accountResponse = await CognitiveServiceService().(accountId, sessionExecutorRole);
      setErrorMessage('');
    } catch (e: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'aca-session-connection-account-endpoint',
        message: 'Failed to determine if ACA session has appropriate role permissions',
        error: e,
      });
      setErrorMessage(e.message ?? 'Failed to fetch account endpoint');
    }
  }, []);

  const accountComboboxDisabled = useMemo(
    () => isFetchingAccount || isFetchingSubscription || !selectedSubscriptionId || (allSessionPoolAccounts ?? []).length === 0,
    [allSessionPoolAccounts, isFetchingAccount, isFetchingSubscription, selectedSubscriptionId]
  );

  const onRefreshClick = useCallback(() => {
    if (!accountComboboxDisabled) {
      refetch();
    }
  }, [accountComboboxDisabled, refetch]);

  const accountOptions: IComboBoxOption[] = useMemo(() => {
    return (allSessionPoolAccounts ?? []).map((account: any) => ({
      key: account.id,
      text: `${account.name} (/${account.resourceGroup})`,
    }));
  }, [allSessionPoolAccounts]);

  if (parameterKey === 'poolManagementEndpoint') {
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
          displayName={stringResources.ACA_SESSION_POOL}
          required={true}
          tooltip={
            <Link
              href="https://learn.microsoft.com/azure/container-apps/sessions-tutorial-nodejs#create-a-code-interpreter-session-pool"
              target="_blank"
            >
              {stringResources.LEARN_MORE_CREATE_NEW}
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
                placeholder={isFetchingAccount ? stringResources.LOADING_ACCOUNTS : stringResources.SELECT_ACA_SESSION_POOL_ACCOUNT}
                selectedKey={isUndefinedOrEmptyString(value) ? null : value}
                className={styles.openAICombobox}
                options={accountOptions}
                text={poolInputText}
                errorMessage={errorMessage}
                onClick={() => {
                  if (!isFetchingAccount) {
                    comboRef.current?.focus(true);
                  }
                }}
                onChange={async (_e, option?: IComboBoxOption) => {
                  if (option?.key) {
                    const selectedId = option.key as string;
                    setValue(selectedId);
                    setPoolInputText(option.text);
                    setLoadingAccountDetails(true);
                    await fetchAccount(selectedId);
                    setLoadingAccountDetails(false);
                  }
                }}
                onPendingValueChanged={(_option, _index, text) => setPoolInputText(text ?? '')}
              >
                {isFetchingAccount ? (
                  <Spinner
                    style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                    labelPosition="right"
                    label={stringResources.LOADING_ACCOUNTS}
                  />
                ) : null}
              </ComboBox>
              <Link className={styles.createNewButton} target="_blank" href="https://aka.ms/sessionPoolCreate">
                {stringResources.CREATE_NEW}
                <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
              </Link>
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

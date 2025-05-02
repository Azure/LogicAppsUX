import { CognitiveServiceService, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useState } from 'react';
import { ComboBox, type IComboBoxOption, Spinner } from '@fluentui/react';
import { useAllCognitiveServiceAccounts } from './useCognitiveService';
import { useStyles } from './styles';

export const CustomOpenAIConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, value, setKeyValue, setValue, parameter } = props;
  const intl = useIntl();
  const { isFetching, data: allCognitiveServiceAccounts } = useAllCognitiveServiceAccounts();
  const styles = useStyles();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState<boolean>(false);

  const stringResources = useMemo(
    () => ({
      COGNITIVE_SERVICE_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Azure Cognitive Service Account',
        id: 'tC4yyC',
        description: 'Select the Azure Cognitive Service Account to use for this connection',
      }),
      SELECT_COGNITIVE_SERVICE_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Select an Azure Cognitive Service Account',
        id: '6GgvQU',
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

  if (parameterKey === 'cognitiveServiceAccountId') {
    return (
      <ConnectionParameterRow
        parameterKey={'cognitive-service-resource-id'}
        displayName={stringResources.COGNITIVE_SERVICE_ACCOUNT}
        required={true}
      >
        <ComboBox
          required={true}
          defaultValue={'openAIEndpoint'}
          disabled={isFetching}
          placeholder={isFetching ? stringResources.LOADING_ACCOUNTS : stringResources.SELECT_COGNITIVE_SERVICE_ACCOUNT}
          selectedKey={value}
          className={styles.dropdown}
          options={(allCognitiveServiceAccounts ?? []).map((account: any) => {
            return {
              key: account.id,
              text: `${account.name} (/${account.subscriptionId}/${account.resourceGroup})`,
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
          {isFetching ? (
            <Spinner
              style={{ position: 'absolute', bottom: '6px', left: '8px' }}
              labelPosition="right"
              label={stringResources.LOADING_ACCOUNTS}
            />
          ) : null}
        </ComboBox>
      </ConnectionParameterRow>
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

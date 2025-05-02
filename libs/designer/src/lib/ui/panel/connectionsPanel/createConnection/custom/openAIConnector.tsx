import { CognitiveServiceService, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type ConnectionParameterProps, UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useEffect, useMemo } from 'react';
import { Dropdown, Spinner } from '@fluentui/react';
import { useAllCognitiveServiceAccounts } from './useCognitiveService';
import { useStyles } from './styles';

export const CustomOpenAIConnector = (props: ConnectionParameterProps) => {
  const { parameterKey, value, setKeyValue } = props;
  const intl = useIntl();
  const { isFetching, data: allCognitiveServiceAccounts } = useAllCognitiveServiceAccounts();
  const styles = useStyles();

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
    }),
    [intl]
  );

  useEffect(() => {
    async function fetchAccount() {
      try {
        const accountResponse = await CognitiveServiceService().fetchCognitiveServiceAccountById(value);
        setKeyValue?.('openAIEndpoint', accountResponse?.properties?.endpoint ?? '');
      } catch (e: any) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'agent-connection-account',
          message: 'Failed to fetch account details for cognitive service',
          error: e,
        });
      }
    }

    async function fetchKey() {
      try {
        const accountResponse = await CognitiveServiceService().fetchCognitiveServiceAccountKeysById(value);
        setKeyValue?.('openAIEndpoint', accountResponse?.key1 ?? '');
      } catch (e: any) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'agent-connection-account-key',
          message: 'Failed to fetch account key for cognitive service',
          error: e,
        });
      }
    }

    if (parameterKey === 'openAIEndpoint') {
      fetchAccount();
      fetchKey();
    }
  }, [parameterKey, setKeyValue, value]);

  if (parameterKey === 'openAIEndpoint') {
    return (
      <>
        <ConnectionParameterRow parameterKey={'cognitive-service-resource-id'} displayName={stringResources.COGNITIVE_SERVICE_ACCOUNT}>
          <Dropdown
            required={true}
            defaultValue={'openAIEndpoint'}
            disabled={isFetching}
            placeholder={isFetching ? stringResources.LOADING_ACCOUNTS : stringResources.SELECT_COGNITIVE_SERVICE_ACCOUNT}
            className={styles.dropdown}
            options={(allCognitiveServiceAccounts ?? []).map((account: any) => {
              return {
                key: account.id,
                text: `${account.name} (/${account.subscriptionId}/${account.resourceGroup})`,
              };
            })}
          >
            {isFetching && (
              <Spinner
                style={{ position: 'absolute', bottom: '6px', left: '8px' }}
                labelPosition="right"
                label={stringResources.LOADING_ACCOUNTS}
              />
            )}
          </Dropdown>
        </ConnectionParameterRow>
        <UniversalConnectionParameter {...props} isLoading={true} />
      </>
    );
  }

  if (parameterKey === 'openAIKey') {
    return <UniversalConnectionParameter {...props} isLoading={true} />;
  }
  return null;
};

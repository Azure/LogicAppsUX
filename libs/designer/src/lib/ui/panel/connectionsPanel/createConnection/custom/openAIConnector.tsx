import type { IConnectionParameterEditorProps } from '@microsoft/logic-apps-shared';
import { UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useMemo } from 'react';
import { Dropdown, Spinner } from '@fluentui/react';
import { useAllCognitiveServiceAccounts } from './useCognitiveService';
import { useStyles } from './styles';

export const CustomOpenAIConnector = (props: IConnectionParameterEditorProps) => {
  const { parameterKey } = props;
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

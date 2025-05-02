import type { IConnectionParameterEditorProps } from '@microsoft/logic-apps-shared';
import { UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import { ConnectionParameterRow } from '../connectionParameterRow';
import { useIntl } from 'react-intl';
import { useMemo } from 'react';
import { Dropdown } from '@fluentui/react';
import { useAllCognitiveServiceAccounts } from './useCognitiveService';

export const CustomOpenAIConnector = (props: IConnectionParameterEditorProps) => {
  const { parameterKey } = props;
  const intl = useIntl();
  const { isFetching, data: allCognitiveServiceAccounts } = useAllCognitiveServiceAccounts();

  const stringResources = useMemo(
    () => ({
      COGNITIVE_SERVICE_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Azure Cognitive Service Account',
        id: 'tC4yyC',
        description: 'Select the Azure Cognitive Service Account to use for this connection',
      }),
      FETCHING_COGNITIVE_SERVICE_ACCOUNTS: intl.formatMessage({
        defaultMessage: 'Fetching your accounts...',
        id: 'gvGkGF',
        description: 'Fetching Azure Cognitive Service Accounts... This may take a few minutes.',
      }),
      SELECT_COGNITIVE_SERVICE_ACCOUNT: intl.formatMessage({
        defaultMessage: 'Select an Azure Cognitive Service Account',
        id: '6GgvQU',
        description: 'Select the Azure Cognitive Service Account to use for this connection',
      }),
    }),
    [intl]
  );

  if (parameterKey === 'openAIEndpoint') {
    return (
      <>
        <ConnectionParameterRow parameterKey={'cognitive-service-resource-id'} displayName={stringResources.COGNITIVE_SERVICE_ACCOUNT}>
          <Dropdown
            defaultValue={'openAIEndpoint'}
            placeholder={
              isFetching ? stringResources.FETCHING_COGNITIVE_SERVICE_ACCOUNTS : stringResources.SELECT_COGNITIVE_SERVICE_ACCOUNT
            }
            options={(allCognitiveServiceAccounts ?? []).map((account: any) => {
              return {
                key: account.id,
                text: `${account.name} (/${account.subscriptionId}/${account.resourceGroup})`,
              };
            })}
          />
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

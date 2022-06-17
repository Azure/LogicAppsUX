import { ApiService } from '../../../run-service/export/index';
import { useOutlet } from '../export';
import { DetailsList, Text } from '@fluentui/react';
import { useMemo } from 'react';
import { useQuery } from 'react-query';

export const Home: React.FC = () => {
  const { baseUrl, accessToken } = useOutlet();

  const apiService = useMemo(
    () =>
      new ApiService({
        baseUrl,
        accessToken,
      }),
    [accessToken, baseUrl]
  );
  const { data: subscriptions } = useQuery('subscriptions', apiService.getSubscriptions);
  console.log('subscriptions', subscriptions);

  return (
    <>
      <Text variant="xLarge" nowrap block>
        Select Apps to Export
      </Text>
      <Text variant="large" nowrap block>
        Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App schemas
      </Text>
      <DetailsList
        items={[]}
        columns={[]}
        setKey="set"
        selectionPreservedOnEmptyClick={true}
        ariaLabelForSelectionColumn="Toggle selection"
        ariaLabelForSelectAllCheckbox="Toggle selection for all items"
        checkButtonAriaLabel="select row"
      />
    </>
  );
};

import { ApiService } from '../../../run-service/export/index';
import { useOutlet } from '../export';
import { getListColumns, parseWorflowData } from './helper';
import { DetailsList, Text } from '@fluentui/react';
import { useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';

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

  const loadWorkflows = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return apiService.getMoreWorkflows(pageParam);
    }
    return apiService.getWorkflows();
  };

  const { data } = useInfiniteQuery<any>('worflowsData', loadWorkflows, {
    getNextPageParam: (lastPage) => lastPage.nextLink,
    refetchInterval: 5000, // 5 seconds refresh interval
    refetchIntervalInBackground: false, // It will automatically refetch when window is focused
  });

  console.log('data', data);

  const worflowItems = useMemo(() => {
    return parseWorflowData(data?.pages);
  }, [data?.pages]);

  return (
    <>
      <Text variant="xLarge" nowrap block>
        Select Apps to Export
      </Text>
      <Text variant="large" nowrap block>
        Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App schemas
      </Text>
      <DetailsList
        items={worflowItems ?? []}
        columns={getListColumns()}
        ariaLabelForSelectionColumn="Toggle selection"
        ariaLabelForSelectAllCheckbox="Toggle selection for all items"
        checkButtonAriaLabel="select row"
      />
    </>
  );
};

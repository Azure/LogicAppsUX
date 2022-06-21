import { ApiService } from '../../../run-service/export/index';
import { useOutlet } from '../export';
import { getListColumns, parseWorkflowData } from './helper';
import { Separator, ShimmeredDetailsList, Text } from '@fluentui/react';
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

  const { data } = useInfiniteQuery<any>('workflowsData', loadWorkflows, {
    getNextPageParam: (lastPage) => lastPage.nextLink,
  });

  const workflowItems = useMemo(() => {
    return parseWorkflowData(data?.pages);
  }, [data?.pages]);

  return (
    <div className="msla-export-overview-panel">
      <div className="msla-export-overview-panel-list">
        <Text variant="xLarge" nowrap block>
          Select Apps to Export
        </Text>
        <Text variant="large" nowrap block>
          Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App
          schemas
        </Text>
        <div className="msla-export-overview-panel-list-workflows">
          <ShimmeredDetailsList
            items={workflowItems ?? []}
            columns={getListColumns()}
            enableShimmer={!workflowItems}
            ariaLabelForSelectionColumn="Toggle selection"
            ariaLabelForSelectAllCheckbox="Toggle selection for all items"
            checkButtonAriaLabel="select row"
            selectionPreservedOnEmptyClick={true}
            selectionMode={2}
          />
        </div>
      </div>
      <Separator vertical className="msla-export-overview-panel-divider" />
    </div>
  );
};

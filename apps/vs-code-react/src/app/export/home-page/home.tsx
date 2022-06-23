import { ApiService } from '../../../run-service/export/index';
import { QueryKeys } from '../../../run-service/types';
import { useOutlet } from '../export';
import { getListColumns, parseWorkflowData } from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { useInfiniteQuery } from 'react-query';

export const Home: React.FC = () => {
  const { baseUrl, accessToken } = useOutlet();
  const [selectedWorkflows, setSelectedWorkflows] = useState<any>([]);

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

  const loadWorkflows = ({ pageParam }: { pageParam?: string }) => {
    if (pageParam) {
      return apiService.getMoreWorkflows(pageParam);
    }
    return apiService.getWorkflows();
  };

  const { data } = useInfiniteQuery<any>(QueryKeys.workflowsData, loadWorkflows, {
    getNextPageParam: (lastPage) => lastPage.nextLink,
    refetchOnWindowFocus: false,
  });

  const workflowItems = useMemo(() => {
    return parseWorkflowData(data?.pages);
  }, [data?.pages]);

  const selection = new Selection({
    onSelectionChanged: () => {
      setSelectedWorkflows(selection.getSelection());
    },
  });

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
            selectionMode={SelectionMode.multiple}
            selection={selection}
          />
        </div>
      </div>
      <Separator vertical className="msla-export-overview-panel-divider" />
      <SelectedList selectedWorkflows={selectedWorkflows} />
    </div>
  );
};

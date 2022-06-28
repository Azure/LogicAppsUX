import { ApiService } from '../../../run-service/export/index';
import { QueryKeys } from '../../../run-service/types';
import type { AppDispatch } from '../../../state/store';
import { updateSelectedWorkFlows } from '../../../state/vscodeSlice';
import { useOutlet } from '../export';
import { getListColumns, parseWorkflowData } from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useInfiniteQuery } from 'react-query';
import { useDispatch } from 'react-redux';

export const Home: React.FC = () => {
  const { baseUrl, accessToken, selectedWorkflows } = useOutlet();
  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select Apps to Export',
      description: 'Select apps to export title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage:
        'Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App schemas',
      description: 'Select apps to export description',
    }),
    TOGGLE_SELECTION: intl.formatMessage({
      defaultMessage: 'Toggle selection',
      description: 'Select apps to export description',
    }),
    TOGGLE_SELECTION_ALL: intl.formatMessage({
      defaultMessage: 'Toggle selection for all items',
      description: 'Select apps to export description',
    }),
    SELECT_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Select workflow',
      description: 'Select apps to export description',
    }),
  };

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
      dispatch(
        updateSelectedWorkFlows({
          selectedWorkflows: selection.getSelection(),
        })
      );
    },
  });

  return (
    <div className="msla-export-overview-panel">
      <div className="msla-export-overview-panel-list">
        <Text variant="xLarge" nowrap block>
          {intlText.SELECT_TITLE}
        </Text>
        <Text variant="large" nowrap block>
          {intlText.SELECT_DESCRIPTION}
        </Text>
        <div className="msla-export-overview-panel-list-workflows">
          <ShimmeredDetailsList
            items={workflowItems ?? []}
            columns={getListColumns()}
            enableShimmer={!workflowItems}
            ariaLabelForSelectionColumn={intlText.TOGGLE_SELECTION}
            ariaLabelForSelectAllCheckbox={intlText.TOGGLE_SELECTION_ALL}
            checkButtonAriaLabel={intlText.SELECT_WORKFLOW}
            selectionPreservedOnEmptyClick={true}
            selectionMode={SelectionMode.multiple}
            selection={selection}
          />
        </div>
      </div>
      <Separator vertical className="msla-export-overview-panel-divider" />
      <SelectedList selectedItems={selectedWorkflows} />
    </div>
  );
};

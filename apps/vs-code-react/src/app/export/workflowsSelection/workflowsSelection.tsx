import { ApiService } from '../../../run-service/export/index';
import { QueryKeys } from '../../../run-service/types';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedWorkFlows } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { getListColumns, parseWorkflowData } from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const WorkflowsSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, selectedIse } = exportData;

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

  const loadWorkflows = () => {
    return apiService.getWorkflows(selectedSubscription, selectedIse);
  };

  const { data: workflowsData, isLoading: isWorkflowsLoading } = useQuery<any>(
    [QueryKeys.workflowsData, { iseId: selectedIse }],
    loadWorkflows,
    {
      refetchOnWindowFocus: false,
    }
  );

  const workflowItems: any = isWorkflowsLoading || !workflowsData ? [] : parseWorkflowData(workflowsData);

  const selection = new Selection({
    onSelectionChanged: () => {
      const currentSelection = selection.getSelection();
      dispatch(
        updateSelectedWorkFlows({
          selectedWorkflows: currentSelection,
        })
      );
    },
    items: workflowItems,
  });

  /*const deselectItem = (itemKey: string) => {
    selection.toggleKeySelected(itemKey);
  };*/

  return (
    <div className="msla-export-workflows-panel">
      <div className="msla-export-workflows-panel-list">
        <Text variant="xLarge" nowrap block>
          {intlText.SELECT_TITLE}
        </Text>
        <Text variant="large" nowrap block>
          {intlText.SELECT_DESCRIPTION}
        </Text>
        <div className="msla-export-workflows-panel-list-workflows">
          <ShimmeredDetailsList
            items={workflowItems}
            columns={getListColumns()}
            setKey="set"
            enableShimmer={isWorkflowsLoading}
            ariaLabelForSelectionColumn={intlText.TOGGLE_SELECTION}
            ariaLabelForSelectAllCheckbox={intlText.TOGGLE_SELECTION_ALL}
            checkButtonAriaLabel={intlText.SELECT_WORKFLOW}
            selectionMode={SelectionMode.multiple}
            selection={selection}
          />
        </div>
      </div>
      <Separator vertical className="msla-export-workflows-panel-divider" />
      <SelectedList />
    </div>
  );
};

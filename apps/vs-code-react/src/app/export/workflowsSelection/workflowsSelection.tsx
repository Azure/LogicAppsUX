import { ApiService } from '../../../run-service/export/index';
import { QueryKeys } from '../../../run-service/types';
import type { WorkflowsList } from '../../../run-service/types';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedWorkFlows } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { Filters } from './filters';
import { filterWorkflows, getListColumns, parseResourceGroups, parseWorkflowData } from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const WorkflowsSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, selectedIse } = exportData;

  const [renderWorkflows, setRenderWorkflows] = useState<Array<WorkflowsList>>([]);
  const [allWorkflows, setAllWorkflows] = useState<Array<WorkflowsList>>([]);
  const [resourceGroups, setResourceGroups] = useState<IDropdownOption[]>([]);
  const [searchString, setSearchString] = useState<string>('');

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

  const onWorkflowsSuccess = (workflowsData: any) => {
    const workflowItems: Array<WorkflowsList> = !workflowsData ? [] : parseWorkflowData(workflowsData);
    const resourceGroups: IDropdownOption[] = !workflowsData ? [] : parseResourceGroups(workflowItems);

    setRenderWorkflows(workflowItems);
    setAllWorkflows(workflowItems);
    setResourceGroups(resourceGroups);
  };

  const { isLoading: isWorkflowsLoading } = useQuery<any>([QueryKeys.workflowsData, { iseId: selectedIse }], loadWorkflows, {
    refetchOnWindowFocus: false,
    onSuccess: onWorkflowsSuccess,
  });

  const onChangeDropdown = (_event: React.FormEvent<HTMLDivElement>, _selectedOption: IDropdownOption, index: number) => {
    const updatedResourceGroups = [...resourceGroups];
    updatedResourceGroups[index].selected = !updatedResourceGroups[index].selected;

    setRenderWorkflows(filterWorkflows(allWorkflows, updatedResourceGroups, searchString));
    setResourceGroups(updatedResourceGroups);
  };

  const onChangeSearch = (_event: React.FormEvent<HTMLDivElement>, newSearchString: string) => {
    setRenderWorkflows(filterWorkflows(allWorkflows, resourceGroups, newSearchString));
    setSearchString(newSearchString);
  };

  const selection = new Selection({
    onSelectionChanged: () => {
      const currentSelection = selection.getSelection();
      dispatch(
        updateSelectedWorkFlows({
          selectedWorkflows: currentSelection,
        })
      );
    },
    items: renderWorkflows as any,
  });

  /*const deselectItem = (itemKey: string) => {
    selection.toggleKeySelected(itemKey);
  };*/

  const workflowsList = useMemo(() => {
    return (
      <div className="msla-export-workflows-panel-list-workflows">
        <ShimmeredDetailsList
          items={renderWorkflows}
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
    );
  }, [renderWorkflows, isWorkflowsLoading, selection, intlText.TOGGLE_SELECTION, intlText.TOGGLE_SELECTION_ALL, intlText.SELECT_WORKFLOW]);

  const filters = useMemo(() => {
    return (
      <Filters
        dropdownOptions={resourceGroups}
        onChangeDropdown={onChangeDropdown}
        onChangeSearch={onChangeSearch}
        isDataLoaded={isWorkflowsLoading}
      />
    );
  }, [resourceGroups, isWorkflowsLoading, onChangeDropdown, onChangeSearch]);

  return (
    <div className="msla-export-workflows-panel">
      <div className="msla-export-workflows-panel-list">
        <Text variant="xLarge" nowrap block>
          {intlText.SELECT_TITLE}
        </Text>
        <Text variant="large" nowrap block>
          {intlText.SELECT_DESCRIPTION}
        </Text>
        {filters}
        {workflowsList}
      </div>
      <Separator vertical className="msla-export-workflows-panel-divider" />
      <SelectedList />
    </div>
  );
};

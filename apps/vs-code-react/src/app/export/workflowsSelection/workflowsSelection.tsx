import WarningIcon from '../../../resources/Caution.svg';
import { ApiService } from '../../../run-service/export/index';
import { QueryKeys } from '../../../run-service/types';
import type { WorkflowsList } from '../../../run-service/types';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedWorkFlows } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { Filters } from './filters';
import { filterWorkflows, getListColumns, parseResourceGroups, parseWorkflowData } from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection, MessageBar, MessageBarType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const WorkflowsSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, selectedIse, selectedWorkflows } = exportData;

  const [renderWorkflows, setRenderWorkflows] = useState<Array<WorkflowsList> | null>(null);
  const [allWorkflows, setAllWorkflows] = useState<Array<WorkflowsList>>([]);
  const [resourceGroups, setResourceGroups] = useState<IDropdownOption[]>([]);
  const [searchString, setSearchString] = useState<string>('');

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic apps to export',
      description: 'Select apps to export title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      description: 'Select logic apps to export description',
    }),
    SELECTION: intl.formatMessage({
      defaultMessage: 'Select',
      description: 'Select apps to export description',
    }),
    SELECTION_ALL: intl.formatMessage({
      defaultMessage: 'Select all',
      description: 'Select apps to export description',
    }),
    SELECT_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Select logic app',
      description: 'Select logic app to export description',
    }),
    LIMIT_INFO: intl.formatMessage({
      defaultMessage: 'Selecting more than 15 logic apps affects the export experience performance.',
      description: 'Limit on selected logic apps warning text',
    }),
    NO_WORKFLOWS: intl.formatMessage({
      defaultMessage: 'No workflows',
      description: 'No workflows text',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Resource name',
      description: 'Resource name title',
    }),
    RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Resource group',
      description: 'Resource group title',
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

  const selection = useMemo(() => {
    return new Selection({
      onSelectionChanged: () => {
        const currentSelection = selection.getSelection() as Array<WorkflowsList>;
        dispatch(
          updateSelectedWorkFlows({
            selectedWorkflows: currentSelection,
          })
        );
      },
      items: renderWorkflows as any,
    });
  }, [renderWorkflows, dispatch]);

  const workflowsList = useMemo(() => {
    const emptyText = (
      <Text variant="large" block className="msla-export-workflows-panel-list-workflows-empty">
        {intlText.NO_WORKFLOWS}
      </Text>
    );

    const noWorkflows = renderWorkflows !== null && !renderWorkflows.length && !isWorkflowsLoading ? emptyText : null;

    const enableShimmer = isWorkflowsLoading || renderWorkflows === null;

    return (
      <div className={`msla-export-workflows-panel-list-workflows ${enableShimmer ? 'loading' : ''}`}>
        <ShimmeredDetailsList
          items={renderWorkflows || []}
          columns={getListColumns(intlText.NAME, intlText.RESOURCE_GROUP)}
          setKey="set"
          enableShimmer={enableShimmer}
          ariaLabelForSelectionColumn={intlText.SELECTION}
          ariaLabelForSelectAllCheckbox={intlText.SELECTION_ALL}
          checkButtonAriaLabel={intlText.SELECT_WORKFLOW}
          selectionMode={SelectionMode.multiple}
          selection={selection}
          compact={true}
        />
        {noWorkflows}
      </div>
    );
  }, [
    renderWorkflows,
    isWorkflowsLoading,
    selection,
    intlText.SELECTION,
    intlText.SELECTION_ALL,
    intlText.SELECT_WORKFLOW,
    intlText.NO_WORKFLOWS,
    intlText.NAME,
    intlText.RESOURCE_GROUP,
  ]);

  const limitInfo = useMemo(() => {
    return selectedWorkflows.length >= 15 ? (
      <MessageBar
        className="msla-export-workflows-panel-limit-selection"
        messageBarType={MessageBarType.info}
        isMultiline={true}
        messageBarIconProps={{
          imageProps: {
            src: WarningIcon,
            width: 15,
            height: 15,
          },
        }}
      >
        {intlText.LIMIT_INFO}
      </MessageBar>
    ) : null;
  }, [intlText.LIMIT_INFO, selectedWorkflows]);

  const filters = useMemo(() => {
    const onChangeSearch = (_event: React.FormEvent<HTMLDivElement>, newSearchString: string) => {
      setRenderWorkflows(filterWorkflows(allWorkflows, resourceGroups, newSearchString));
      setSearchString(newSearchString);
    };

    const onChangeResourceGroup = (_event: React.FormEvent<HTMLDivElement>, _selectedOption: IDropdownOption, index: number) => {
      const updatedResourceGroups = [...resourceGroups];
      updatedResourceGroups[index].selected = !updatedResourceGroups[index].selected;

      setRenderWorkflows(filterWorkflows(allWorkflows, updatedResourceGroups, searchString));
      setResourceGroups(updatedResourceGroups);
    };

    return (
      <Filters
        dropdownOptions={resourceGroups}
        onChangeResourceGroup={onChangeResourceGroup}
        onChangeSearch={onChangeSearch}
        isDataLoading={isWorkflowsLoading}
      />
    );
  }, [resourceGroups, isWorkflowsLoading, allWorkflows, searchString]);

  return (
    <div className="msla-export-workflows-panel">
      <div className="msla-export-workflows-panel-list">
        <Text variant="xLarge" block>
          {intlText.SELECT_TITLE}
        </Text>
        <Text variant="large" block>
          {intlText.SELECT_DESCRIPTION}
        </Text>
        {limitInfo}
        {filters}
        {workflowsList}
      </div>
      <Separator vertical className="msla-export-workflows-panel-divider" />
      <SelectedList />
    </div>
  );
};

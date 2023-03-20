import WarningIcon from '../../../resources/Caution.svg';
import { QueryKeys } from '../../../run-service';
import type { WorkflowsList, SelectedWorkflowsList } from '../../../run-service';
import { ApiService } from '../../../run-service/export/index';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateSelectedWorkFlows } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { AdvancedOptions } from './advancedOptions';
import { Filters } from './filters';
import { filterWorkflows, getListColumns, getSelectedItems, parseResourceGroups, updateSelectedItems } from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection, MessageBar, MessageBarType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const WorkflowsSelection: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, selectedIse, selectedWorkflows, location } = exportData;

  const [renderWorkflows, setRenderWorkflows] = useState<Array<WorkflowsList> | null>(null);
  const [resourceGroups, setResourceGroups] = useState<IDropdownOption[]>([]);
  const [searchString, setSearchString] = useState<string>('');
  const allWorkflows = useRef<Array<WorkflowsList>>([]);
  const allItemsSelected = useRef<SelectedWorkflowsList[]>([]);

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
      description: 'Select logic apps to export description',
    }),
    SELECTION_ALL: intl.formatMessage({
      defaultMessage: 'Select all',
      description: 'Select all logic apps to export description',
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
    return apiService.getWorkflows(selectedSubscription, selectedIse, location);
  };

  const onWorkflowsSuccess = (workflows: WorkflowsList[]) => {
    const resourceGroups: IDropdownOption[] = !workflows ? [] : parseResourceGroups(workflows);

    setRenderWorkflows(workflows);
    setResourceGroups(resourceGroups);
    allWorkflows.current = workflows;
    allItemsSelected.current = workflows.map((workflow) => {
      return { ...workflow, selected: false, rendered: true };
    });
    selectedWorkflows.forEach((workflow: WorkflowsList) => {
      const selectedIndex = allItemsSelected.current.findIndex((selectedItem: SelectedWorkflowsList) => selectedItem.key === workflow.key);
      if (selectedIndex !== -1) {
        allItemsSelected.current[selectedIndex].selected = true;
      }
    });
  };

  const { isLoading: isWorkflowsLoading } = useQuery<any>([QueryKeys.workflowsData, { location, iseId: selectedIse }], loadWorkflows, {
    refetchOnWindowFocus: false,
    onSuccess: onWorkflowsSuccess,
  });

  useEffect(() => {
    const updatedItems = updateSelectedItems(allItemsSelected.current, renderWorkflows, selectedWorkflows);

    allItemsSelected.current = updatedItems;
  }, [selectedWorkflows, renderWorkflows, allWorkflows]);

  const selection: Selection = useMemo(() => {
    const onItemsChange = () => {
      const selectedItems = [...allItemsSelected.current.filter((item) => item.selected)];
      if (selection && selection.getItems().length > 0) {
        selectedItems.forEach((workflow: WorkflowsList) => {
          selection.setKeySelected(workflow.key, true, false);
        });
      }
    };

    const onSelectionChanged = () => {
      const currentSelection = selection.getSelection() as WorkflowsList[];
      const selectedItems = getSelectedItems(allItemsSelected.current, currentSelection);

      dispatch(
        updateSelectedWorkFlows({
          selectedWorkflows: selectedItems,
        })
      );
    };

    return new Selection({
      onSelectionChanged: onSelectionChanged,
      onItemsChanged: onItemsChange,
    });
  }, [dispatch]);

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
          selectionPreservedOnEmptyClick={true}
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
      const filteredWorkflows = filterWorkflows(allWorkflows.current, resourceGroups, newSearchString);
      allItemsSelected.current = allItemsSelected.current.map((workflow) => {
        const isWorkflowInRender = !!filteredWorkflows.find((item: WorkflowsList) => item.key === workflow.key);
        return { ...workflow, rendered: isWorkflowInRender };
      });
      setRenderWorkflows(filteredWorkflows);
      setSearchString(newSearchString);
    };

    const onChangeResourceGroup = (_event: React.FormEvent<HTMLDivElement>, _selectedOption: IDropdownOption, index: number) => {
      const updatedResourceGroups = [...resourceGroups];
      updatedResourceGroups[index - 2].selected = !updatedResourceGroups[index - 2].selected;
      const filteredWorkflows = filterWorkflows(allWorkflows.current, updatedResourceGroups, searchString);
      allItemsSelected.current = allItemsSelected.current.map((workflow) => {
        const isWorkflowInRender = !!filteredWorkflows.find((item: WorkflowsList) => item.key === workflow.key);
        return { ...workflow, rendered: isWorkflowInRender };
      });

      setRenderWorkflows(filteredWorkflows);
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

  const deselectItemKey = (itemKey: string) => {
    return new Promise<void>((resolve) => {
      const copyAllItems = [...allItemsSelected.current];
      const newSelection = [...selectedWorkflows.filter((item) => item.key !== itemKey)];
      const deselectedItem = copyAllItems.find((workflow) => workflow.key === itemKey);
      if (deselectedItem) {
        deselectedItem.selected = false;
      }
      allItemsSelected.current = copyAllItems;

      dispatch(
        updateSelectedWorkFlows({
          selectedWorkflows: newSelection,
        })
      );

      resolve();
    });
  };

  const updateRenderWorkflows = () => {
    return new Promise<void>((resolve) => {
      const updatedRenderWorkflows = renderWorkflows?.map((workflow, index) => {
        return { ...workflow, key: index.toString() };
      }) as WorkflowsList[];
      setRenderWorkflows(updatedRenderWorkflows);

      resolve();
    });
  };

  const deselectWorkflow = async (itemKey: string) => {
    const copyRenderWorkflows = [...(renderWorkflows ?? [])];
    await deselectItemKey(itemKey);
    selection.setItems(renderWorkflows as WorkflowsList[]);
    await updateRenderWorkflows();
    setRenderWorkflows(copyRenderWorkflows);
  };

  return (
    <div className="msla-export-workflows">
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
        <SelectedList isLoading={isWorkflowsLoading || renderWorkflows === null} deselectWorkflow={deselectWorkflow} />
      </div>
      <AdvancedOptions />
    </div>
  );
};

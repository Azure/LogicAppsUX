import WarningIcon from '../../../resources/Caution.svg';
import { QueryKeys } from '../../../run-service';
import type { WorkflowsList, SelectedWorkflowsList } from '../../../run-service';
import { ApiService } from '../../../run-service/export/index';
import { updateSelectedWorkFlows } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { AdvancedOptions } from './advancedOptions';
import { Filters } from './filters';
import {
  filterWorkflows,
  getListColumns,
  getSelectedItems,
  parsePreviousSelectedWorkflows,
  parseResourceGroups,
  parseSelectedWorkflows,
  updateSelectedItems,
} from './helper';
import { SelectedList } from './selectedList';
import { Separator, ShimmeredDetailsList, SelectionMode, Selection, MessageBar, MessageBarType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { useExportStrings } from '../../../assets/strings';

export const WorkflowsSelection: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedSubscription, selectedIse, selectedWorkflows, location } = exportData;

  const [renderWorkflows, setRenderWorkflows] = useState<WorkflowsList[] | null>(null);
  const [resourceGroups, setResourceGroups] = useState<IDropdownOption[]>([]);
  const [searchString, setSearchString] = useState<string>('');
  const allWorkflows = useRef<WorkflowsList[]>([]);
  const allItemsSelected = useRef<SelectedWorkflowsList[]>(parsePreviousSelectedWorkflows(selectedWorkflows));
  const dispatch: AppDispatch = useDispatch();
  const exportStrings = useExportStrings();

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

  const loadWorkflows = () => {
    return apiService.getWorkflows(selectedSubscription, selectedIse, location);
  };

  const { isLoading: isWorkflowsLoading, data: workflowsData } = useQuery<WorkflowsList[]>(
    [QueryKeys.workflowsData, selectedSubscription, selectedIse, location],
    loadWorkflows,
    {
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (isNullOrUndefined(workflowsData)) {
      setRenderWorkflows([]);
      setResourceGroups([]);
      allWorkflows.current = [];
      allItemsSelected.current = [];
    } else {
      setRenderWorkflows(workflowsData);
      setResourceGroups(parseResourceGroups(workflowsData));
      allWorkflows.current = workflowsData;
      allItemsSelected.current = parseSelectedWorkflows(workflowsData, allItemsSelected.current);
    }
  }, [workflowsData]);

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
      <LargeText
        text={exportStrings.NO_WORKFLOWS}
        style={{ display: 'block' }}
        className="msla-export-workflows-panel-list-workflows-empty"
      />
    );

    const noWorkflows = renderWorkflows !== null && !renderWorkflows.length && !isWorkflowsLoading ? emptyText : null;
    const enableShimmer = isWorkflowsLoading || renderWorkflows === null;

    return (
      <div className={`msla-export-workflows-panel-list-workflows ${enableShimmer ? 'loading' : ''}`}>
        <ShimmeredDetailsList
          items={renderWorkflows || []}
          columns={getListColumns(exportStrings.NAME, exportStrings.RESOURCE_GROUP)}
          setKey="set"
          enableShimmer={enableShimmer}
          ariaLabelForSelectionColumn={exportStrings.SELECTION}
          ariaLabelForSelectAllCheckbox={exportStrings.SELECTION_ALL}
          checkButtonAriaLabel={exportStrings.SELECT_WORKFLOW}
          selectionMode={SelectionMode.multiple}
          selection={selection}
          compact={true}
          selectionPreservedOnEmptyClick={true}
        />
        {noWorkflows}
      </div>
    );
  }, [
    exportStrings.NO_WORKFLOWS,
    exportStrings.NAME,
    exportStrings.RESOURCE_GROUP,
    exportStrings.SELECTION,
    exportStrings.SELECTION_ALL,
    exportStrings.SELECT_WORKFLOW,
    renderWorkflows,
    isWorkflowsLoading,
    selection,
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
        {exportStrings.LIMIT_INFO}
      </MessageBar>
    ) : null;
  }, [exportStrings.LIMIT_INFO, selectedWorkflows.length]);
  const filters = useMemo(() => {
    const onChangeSearch = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newSearchString?: string) => {
      const filteredWorkflows = filterWorkflows(allWorkflows.current, resourceGroups, newSearchString);
      allItemsSelected.current = allItemsSelected.current.map((workflow) => {
        const isWorkflowInRender = !!filteredWorkflows.find((item: WorkflowsList) => item.key === workflow.key);
        return { ...workflow, rendered: isWorkflowInRender };
      });
      setRenderWorkflows(filteredWorkflows);
      setSearchString(newSearchString ?? '');
    };

    const onChangeResourceGroup = (_event: React.FormEvent<HTMLDivElement>, _option?: IDropdownOption<any> | undefined, index?: number) => {
      if (index) {
        const updatedResourceGroups = [...resourceGroups];
        updatedResourceGroups[index - 2].selected = !updatedResourceGroups[index - 2].selected;
        const filteredWorkflows = filterWorkflows(allWorkflows.current, updatedResourceGroups, searchString);
        allItemsSelected.current = allItemsSelected.current.map((workflow) => {
          const isWorkflowInRender = !!filteredWorkflows.find((item: WorkflowsList) => item.key === workflow.key);
          return { ...workflow, rendered: isWorkflowInRender };
        });

        setRenderWorkflows(filteredWorkflows);
        setResourceGroups(updatedResourceGroups);
      }
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
          <XLargeText style={{ display: 'block' }} text={exportStrings.SELECT_TITLE} />
          <LargeText style={{ display: 'block' }} text={exportStrings.SELECT_DESCRIPTION} />
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

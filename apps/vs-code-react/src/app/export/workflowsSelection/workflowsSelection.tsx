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
import { Separator, ShimmeredDetailsList, Text, SelectionMode, Selection, MessageBar, MessageBarType } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

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

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic apps to export',
      id: 'A5rCk8',
      description: 'Select apps to export title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      id: '3rlDsf',
      description: 'Select logic apps to export description',
    }),
    SELECTION: intl.formatMessage({
      defaultMessage: 'Select',
      id: 'jcxLyd',
      description: 'Select logic apps to export description',
    }),
    SELECTION_ALL: intl.formatMessage({
      defaultMessage: 'Select all',
      id: '9dqnHP',
      description: 'Select all logic apps to export description',
    }),
    SELECT_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Select logic app',
      id: 'yLua0Y',
      description: 'Select logic app to export description',
    }),
    LIMIT_INFO: intl.formatMessage({
      defaultMessage: 'Selecting more than 15 logic apps affects the export experience performance.',
      id: 'CB/Oue',
      description: 'Limit on selected logic apps warning text',
    }),
    NO_WORKFLOWS: intl.formatMessage({
      defaultMessage: 'No workflows',
      id: 'MvUPPh',
      description: 'No workflows text',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Resource name',
      id: 'dr26iH',
      description: 'Resource name title',
    }),
    RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Resource group',
      id: 'UKCoay',
      description: 'Resource group title',
    }),
  };

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

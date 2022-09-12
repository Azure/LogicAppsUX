import type { WorkflowsList, SelectedWorkflowsList, Workflow } from '../../../run-service';
import type { IDropdownOption } from '@fluentui/react';

export const parseWorkflowData = (workflows: Workflow[]): Array<WorkflowsList> => {
  return workflows.map((workflow: Workflow) => {
    const { name, id, resourceGroup } = workflow;

    return {
      key: id,
      name,
      resourceGroup,
    };
  });
};

export const parseResourceGroups = (workflowItems: Array<WorkflowsList>): IDropdownOption[] => {
  const resourceGroups: Array<string> = workflowItems.reduce((acc: Array<string>, curr: WorkflowsList): Array<string> => {
    return [...acc, curr?.resourceGroup];
  }, []);

  const dropdownGroups: IDropdownOption[] = [...new Set(resourceGroups)].map((resourceGroup) => {
    return { key: resourceGroup, text: resourceGroup, selected: false };
  });

  return dropdownGroups;
};

export const filterWorkflows = (workflowItems: Array<WorkflowsList>, resourceGroups: IDropdownOption[], newSearchString: string) => {
  const selectedFilters: Array<string | number> = resourceGroups
    .filter((resourceGroup: IDropdownOption) => resourceGroup.selected)
    .map((resourceGroup: IDropdownOption) => resourceGroup.key);

  let renderWorkflows = [...workflowItems];

  if (selectedFilters.length) {
    renderWorkflows = renderWorkflows.filter((workflowItem) => selectedFilters.includes(workflowItem.resourceGroup));
  }

  if (newSearchString.length) {
    renderWorkflows = renderWorkflows.filter((workflowItem) => {
      const lowerCaseName = workflowItem?.name.toLowerCase();
      const lowerCaseSearch = newSearchString.toLowerCase();
      return lowerCaseName.includes(lowerCaseSearch);
    });
  }

  return renderWorkflows;
};

export const getListColumns = (nameTitle: string, resourceGroupTitle: string) => {
  return [
    { key: 'name', name: nameTitle, fieldName: 'name', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'resourceGroup', name: resourceGroupTitle, fieldName: 'resourceGroup', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

export const updateSelectedItems = (
  items: WorkflowsList[] | SelectedWorkflowsList[],
  renderWorkflows: WorkflowsList[] | null,
  selectedWorkflows: WorkflowsList[]
) => {
  const copyItems = JSON.parse(JSON.stringify(items));

  renderWorkflows?.forEach((workflow: WorkflowsList) => {
    const isWorkflowInSelection = !!selectedWorkflows.find((selectedWorkflow: WorkflowsList) => selectedWorkflow.key === workflow.key);
    const foundIndex = copyItems.findIndex((selectedItem: SelectedWorkflowsList | WorkflowsList) => selectedItem.key === workflow.key);

    if (foundIndex !== -1) {
      copyItems[foundIndex].selected = isWorkflowInSelection;
    }
  });

  return copyItems;
};

export const getSelectedItems = (allItemsSelected: SelectedWorkflowsList[], currentSelection: WorkflowsList[]): WorkflowsList[] => {
  const allItems = [...allItemsSelected];
  const renderWorkflows = [...allItems.filter((item) => item.rendered)];
  const updatedItems = allItems.map((workflow: SelectedWorkflowsList) => {
    const updatedWorkflow = { ...workflow };
    const isWorkflowInSelection = !!currentSelection.find((item: WorkflowsList) => item.key === updatedWorkflow.key);
    const isWorkflowInRender = !!renderWorkflows.find((item: WorkflowsList) => item.key === updatedWorkflow.key);

    if (updatedWorkflow.selected) {
      if (isWorkflowInRender && !isWorkflowInSelection) {
        updatedWorkflow.selected = false;
      }
    } else {
      if (isWorkflowInSelection) {
        updatedWorkflow.selected = true;
      }
    }
    return updatedWorkflow;
  });

  return updatedItems.filter((item) => item.selected);
};

import type { WorkflowsList, SelectedWorkflowsList } from '../../../run-service';
import { AdvancedOptionsTypes } from '../../../run-service';
import type { IDropdownOption } from '@fluentui/react';

export const parseResourceGroups = (workflowItems: Array<WorkflowsList>): IDropdownOption[] => {
  const resourceGroups: Array<string> = workflowItems.reduce((acc: Array<string>, curr: WorkflowsList): Array<string> => {
    acc.push(curr.resourceGroup);
    return acc;
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

export const hasInfrastructureTemplates = (selectedAdvanceOptions: AdvancedOptionsTypes[]) => {
  return selectedAdvanceOptions.find((advanceOption) => advanceOption === AdvancedOptionsTypes.generateInfrastructureTemplates);
};

export const getAdvanceOptionsSelection = (
  selectedAdvanceOptions: AdvancedOptionsTypes[],
  selectedOption: IDropdownOption
): AdvancedOptionsTypes[] => {
  const updatedOptions = [...selectedAdvanceOptions];

  if (!!hasInfrastructureTemplates(updatedOptions) && selectedOption.key === AdvancedOptionsTypes.generateInfrastructureTemplates) {
    return updatedOptions.filter(
      (option) => option !== AdvancedOptionsTypes.cloneConnections && option !== AdvancedOptionsTypes.generateInfrastructureTemplates
    );
  }

  const index = updatedOptions.indexOf(selectedOption.key as AdvancedOptionsTypes);
  if (index !== -1) {
    updatedOptions.splice(index, 1);
  } else {
    updatedOptions.push(selectedOption.key as AdvancedOptionsTypes);
  }
  return updatedOptions;
};

export const isCloneConnectionsAvailable = (selectedAdvanceOptions: AdvancedOptionsTypes[]): boolean => {
  return !hasInfrastructureTemplates(selectedAdvanceOptions);
};

/**
 * Parses the selected workflows and returns an array of selected workflows with additional properties.
 * @param selectedWorkflows - The array of workflows to be parsed.
 * @returns An array of selected workflows with additional properties.
 */
export const parsePreviousSelectedWorkflows = (selectedWorkflows: WorkflowsList[]): SelectedWorkflowsList[] => {
  return selectedWorkflows.map((workflow: WorkflowsList) => {
    return { ...workflow, selected: true, rendered: true };
  });
};

/**
 * Parses the selected workflows based on the provided workflows data and the list of all items selected.
 * @param workflowsData - The array of workflows data.
 * @param allItemsSelected - The array of all selected items.
 * @returns An array of workflows with updated selection and rendering status.
 */
export const parseSelectedWorkflows = (workflowsData: WorkflowsList[], allItemsSelected: SelectedWorkflowsList[]) => {
  const currentSelection = [...allItemsSelected];
  return workflowsData.map((workflow: WorkflowsList) => {
    const selectedIndex = currentSelection.findIndex((selectedItem: SelectedWorkflowsList) => selectedItem.key === workflow.key);
    return { ...workflow, selected: selectedIndex !== -1, rendered: true };
  });
};

import type { WorkflowsList, WorkflowProperties } from '../../../run-service/types';
import type { IDropdownOption } from '@fluentui/react';

export const parseWorkflowData = (workflowsData: { workflows: Array<WorkflowProperties> }): Array<WorkflowsList> => {
  const { workflows } = workflowsData;

  return workflows.map((workflow: WorkflowProperties) => {
    const { name, id } = workflow;

    return {
      key: id,
      name,
      resourceGroup: getResourceGroup(id),
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

export const filterByDropdown = (workflowItems: Array<WorkflowsList>, test: any) => {
  const selectedFilters: Array<string> = test
    .filter((resourceGroup: IDropdownOption) => resourceGroup.selected)
    .map((resourceGroup: IDropdownOption) => resourceGroup.key);
  let selectedWorkflows;
  if (selectedFilters.length > 0) {
    selectedWorkflows = workflowItems.filter((workflowItem) => selectedFilters.includes(workflowItem.resourceGroup));
  } else {
    selectedWorkflows = [...workflowItems];
  }

  return selectedWorkflows;
};

export const getResourceGroup = (workflowID: string): string => {
  const separators = workflowID.split('/');
  const resourceGroupLocation = 4;
  return separators[resourceGroupLocation];
};

export const getListColumns = () => {
  return [
    { key: 'column1', name: 'Name', fieldName: 'name', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'column2', name: 'Resource Group', fieldName: 'resourceGroup', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

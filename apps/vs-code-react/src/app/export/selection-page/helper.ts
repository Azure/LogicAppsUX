import type { WorkflowsList, WorkflowProperties } from '../../../run-service/types';

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

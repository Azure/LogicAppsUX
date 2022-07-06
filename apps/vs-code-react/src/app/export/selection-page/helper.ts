import type { WorkflowsList, WorkflowProperties } from '../../../run-service/types';

export const parseWorkflowData = (workflowsData: any) => {
  const { workflows } = workflowsData;

  return workflows.map((workflow: any) => {
    const { name, id } = workflow;

    return {
      key: id,
      name,
      resourceGroup: '',
    };
  });
};

export const mapToWorkflowItem = (workflow: WorkflowProperties): WorkflowsList => {
  const { name, resourceGroup, id } = workflow;
  return {
    key: id,
    name,
    resourceGroup,
  };
};

export const getListColumns = () => {
  return [
    { key: 'column1', name: 'Name', fieldName: 'name', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'column2', name: 'Resource Group', fieldName: 'resourceGroup', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

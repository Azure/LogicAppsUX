import type { WorflowsList, WorkflowProperties } from '../../../run-service/types';

export const parseWorflowData = (workflowPages: any[] | undefined) => {
  return workflowPages?.reduce<any[]>((acc: any, val: { workflows: WorkflowProperties[] }) => {
    return [...acc, ...val.workflows.map(mapToWorkflowItem)];
  }, []);
};

export const mapToWorkflowItem = (workflow: WorkflowProperties): WorflowsList => {
  const { name, resourceGroup, id } = workflow;
  return {
    key: id,
    name,
    resourceGroup,
  };
};

export const getListColumns = () => {
  return [
    { key: 'column1', name: 'Name', fieldName: 'name', minWidth: 100, maxWidth: 200, isResizable: true },
    { key: 'column2', name: 'Resource Group', fieldName: 'resourceGroup', minWidth: 100, maxWidth: 200, isResizable: true },
  ];
};

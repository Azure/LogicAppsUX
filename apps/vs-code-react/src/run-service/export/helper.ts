import type { WorkflowsList } from '../types';

export const getExportUri = (selectedSubscription: string, location: string, isValidation: boolean) => {
  const exportStep = isValidation ? 'Validate' : '';
  return `https://management.azure.com/subscriptions/${selectedSubscription}/providers/Microsoft.Logic/locations/${location}/${exportStep}WorkflowExport?api-version=2022-09-01-preview`;
};

export const getValidationPayload = (selectedWorkflows: Array<WorkflowsList>) => {
  const workflowsIds = selectedWorkflows.map((workflow: WorkflowsList) => {
    return { id: workflow.key };
  });

  return {
    properties: {
      workflows: workflowsIds,
    },
  };
};

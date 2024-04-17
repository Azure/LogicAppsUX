import type { WorkflowsList } from '../types';

export const getExportUri = (selectedSubscription: string, location: string, isValidation: boolean, baseGraphApi: string) => {
  const exportStep = isValidation ? 'Validate' : '';
  return `${baseGraphApi}/subscriptions/${selectedSubscription}/providers/Microsoft.Logic/locations/${location}/${exportStep}WorkflowExport?api-version=2022-09-01-preview`;
};

export const getValidationPayload = (selectedWorkflows: WorkflowsList[], workflowExportOptions: string) => {
  const workflowsIds = selectedWorkflows.map((workflow: WorkflowsList) => {
    return { id: workflow.key };
  });

  return {
    properties: {
      workflows: workflowsIds,
      workflowExportOptions,
    },
  };
};

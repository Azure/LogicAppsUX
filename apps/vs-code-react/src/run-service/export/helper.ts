import type { WorkflowsList } from '../types';

export const getWorkflowsUri = (subscriptionId: string, iseId: string) => {
  return `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Logic/workflows?api-version=2018-07-01-preview&$filter=properties/integrationServiceEnvironmentResourceId  eq '${iseId}'`;
};

export const getValidationUri = (location: string) => {
  return `https://brazilus.management.azure.com/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Logic/locations/${location}/ValidateWorkflowExport?api-version=2022-09-01-preview`;
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

import { TemplateService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { getReactQueryClient } from '../ReactQueryProvider';

export const useExistingWorkflowNames = () => {
  return useQuery(['getExistingWorkflowNames'], async () => {
    return (await TemplateService()?.getExistingWorkflowNames?.()) ?? [];
  });
};

export const getCustomTemplates = async (subscriptionId: string, resourceGroup: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['getCustomTemplates', subscriptionId.toLowerCase(), resourceGroup.toLowerCase()], async () => {
    return (await TemplateService()?.getCustomTemplates?.(subscriptionId, resourceGroup)) ?? [];
  });
};

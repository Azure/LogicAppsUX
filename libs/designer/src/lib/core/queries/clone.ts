import { CloneService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { getReactQueryClient } from '../ReactQueryProvider';

export const getWorkflowResourcesInTemplate = async (subscriptionId: string, resourceGroup: string, logicAppName: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['getExistingWorkflowNames', subscriptionId, resourceGroup, logicAppName], async () => {
    return (await CloneService()?.getExistingWorkflowNames?.({ subscriptionId, resourceGroup, logicAppName })) ?? [];
  });
};

export const useExistingWorkflowNamesOfResource = (subscriptionId: string, resourceGroup: string, logicAppName: string, enabled = true) => {
  return useQuery(
    ['getExistingWorkflowNames', subscriptionId, resourceGroup, logicAppName],
    async () => {
      return (await CloneService()?.getExistingWorkflowNames?.({ subscriptionId, resourceGroup, logicAppName })) ?? [];
    },
    {
      enabled: enabled && Boolean(subscriptionId && resourceGroup && logicAppName),
    }
  );
};

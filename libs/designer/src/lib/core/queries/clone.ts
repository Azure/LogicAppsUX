import { CloneService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';

export const useExistingWorkflowNamesOfResource = (subscriptionId: string, resourceGroup: string, logicAppName: string) => {
  return useQuery(['getExistingWorkflowNames', subscriptionId, resourceGroup, logicAppName], async () => {
    return (await CloneService()?.getExistingWorkflowNames?.({ subscriptionId, resourceGroup, logicAppName })) ?? [];
  });
};

import type { ArmResource, LogicAppResource } from '@microsoft/logic-apps-shared';
import { getTriggerFromDefinition, ResourceService } from '@microsoft/logic-apps-shared';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useAllLogicApps = (
  subscriptionId: string,
  resourceGroup: string,
  enabled: boolean
): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['allLogicApps', subscriptionId?.toLowerCase(), resourceGroup?.toLowerCase()],
    async () => {
      return ResourceService().listAllLogicApps(subscriptionId, resourceGroup);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: enabled && !!subscriptionId && !!resourceGroup,
    }
  );
};

export const useWorkflowsInApp = (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  isConsumption: boolean
): UseQueryResult<LogicAppResource[], unknown> => {
  const queryClient = useQueryClient();
  return useQuery(
    ['workflowsInApp', subscriptionId?.toLowerCase(), resourceGroup?.toLowerCase(), logicAppName?.toLowerCase(), isConsumption],
    async () => {
      if (isConsumption) {
        const workflow = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
        return [{ id: workflow.id, name: workflow.name, triggerType: getTriggerFromDefinition(workflow.properties.definition.triggers) }];
      }

      return ResourceService().listWorkflowsInApp(subscriptionId, resourceGroup, logicAppName, isConsumption);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!subscriptionId && !!resourceGroup && !!logicAppName,
    }
  );
};

export const getConsumptionWorkflow = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  queryClient: QueryClient
): Promise<ArmResource<any>> => {
  const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Logic/workflows/${logicAppName}`;
  const queryParameters = {
    'api-version': '2019-05-01',
    $expand: 'connections.json,parameters.json',
  };
  return queryClient.fetchQuery(['workflow', resourceId.toLowerCase()], async () =>
    ResourceService().getResource(resourceId, queryParameters)
  );
};

export const getStandardWorkflow = async (workflowId: string, queryClient: QueryClient): Promise<ArmResource<any>> => {
  const queryParameters = {
    'api-version': '2018-11-01',
  };
  return queryClient.fetchQuery(['workflow', workflowId.toLowerCase()], async () =>
    ResourceService().getResource(workflowId, queryParameters)
  );
};

export const getConnectionsInWorkflowApp = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  queryClient: QueryClient
): Promise<Record<string, any>> => {
  const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}/workflowsconfiguration/connections`;
  const queryParameters = {
    'api-version': '2018-11-01',
  };
  return queryClient.fetchQuery(['connectionsdata', resourceId.toLowerCase()], async () => {
    try {
      const response = await ResourceService().getResource(resourceId, queryParameters);
      return response.properties.files?.['connections.json'];
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return {};
      }
      throw error;
    }
  });
};

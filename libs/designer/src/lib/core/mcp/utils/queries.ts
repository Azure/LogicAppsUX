import { ResourceService, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAzureConnectorsLazyQuery } from '../../../core/queries/browse';
import { useMemo } from 'react';
import { SearchService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { workflowAppConnectionsKey } from '../../configuretemplate/utils/queries';
import { getStandardLogicAppId } from '../../configuretemplate/utils/helper';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const useAllManagedConnectors = () => {
  const { data: azureData, isFetching: azureFetching, hasNextPage: azureHasNextPage } = useAzureConnectorsLazyQuery();

  const hasNextPage = azureHasNextPage;
  const isLoading = azureFetching; // Only check if currently fetching, not if more pages exist

  const data = useMemo(() => {
    const azure = azureData?.pages.flatMap((page) => page.data) ?? [];
    return azure.filter((connector) => connector !== undefined);
  }, [azureData]);

  return useMemo(() => ({ data, isLoading, hasNextPage }), [data, isLoading, hasNextPage]);
};

export const useOperationsByConnectorQuery = (connectorId: string) =>
  useQuery({
    queryKey: ['mcpOperationsByConnector', connectorId],
    queryFn: async () => {
      if (!connectorId) {
        return [];
      }

      const operations = await SearchService().getOperationsByConnector?.(connectorId, 'actions');

      const filteredOperations =
        operations?.filter((operation) => {
          const props = operation.properties as any;

          const isWebhook = props.isWebhook ?? false;
          const isNotification = props.isNotification ?? false;

          return !isWebhook && !isNotification;
        }) ?? [];

      return filteredOperations;
    },
    enabled: !!connectorId,
    ...queryOpts,
  });

export const useEmptyLogicApps = (subscriptionId: string): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['mcp', 'logicapps', subscriptionId],
    async () => {
      return ResourceService().listLogicApps(
        subscriptionId,
        /* resourceGroup */ undefined,
        ` | join kind=leftouter (appserviceresources | where type contains "/sites/workflows" | extend appName = tostring(split(name, "/")[0]) | distinct appName) on $left.name == $right.appName | where appName == "" | distinct id, location, name, resourceGroup`
      );
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!subscriptionId,
    }
  );
};

export const resetQueriesOnRegisterMcpServer = (subscriptionId: string, resourceGroup: string, logicAppName: string) => {
  const queryClient = getReactQueryClient();

  const resourceId = `${getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName)}/workflowsconfiguration/connections`;
  queryClient.invalidateQueries([workflowAppConnectionsKey, resourceId.toLowerCase()]);
  queryClient.invalidateQueries(['mcp', 'logicapps', subscriptionId]);
};

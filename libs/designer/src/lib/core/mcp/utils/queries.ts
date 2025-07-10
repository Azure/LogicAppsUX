import { ResourceService, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const useEmptyLogicApps = (subscriptionId: string): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['mcpQueries', 'logicapps', subscriptionId],
    async () => {
      return ResourceService().listLogicApps(
        subscriptionId,
        undefined,
        ` | distinct name | join kind=leftouter (appserviceresources | where type contains "/sites/workflows" | extend appName = tostring(split(name, "/")[0]) | distinct appName) on $left.name == $right.appName | where appName == "" | project name`
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

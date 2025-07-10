import { ResourceService, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const useEmptyLogicApps = (subscriptionId: string): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['mcpQueries', 'logicapps', subscriptionId],
    async () => {
      //TODO: Provide optionalQuery to filter out the empty logic apps
      // For now, we are fetching all logic apps without any filters.
      return ResourceService().listLogicApps(subscriptionId);
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

import { useQuery } from '@tanstack/react-query';
import { environment } from '../../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import { fetchAppsByQuery } from '../Utilities/resourceUtilities';

const buildStandardQuery = (subscriptionId?: string) => `
  resources
  | where ${subscriptionId ? `subscriptionId == '${subscriptionId}' and` : ''}
    type == 'microsoft.web/sites' and kind contains 'workflowapp'
  | extend plan = 'Standard'
`;

export const useFetchStandardApps = (subscriptionIds?: string[]) => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'standard', subscriptionIds ?? 'all'],
    async () => {
      if (!environment.armToken) {
        return [];
      }

      const queries = subscriptionIds?.length
        ? subscriptionIds.map((id) => fetchAppsByQuery(buildStandardQuery(id)))
        : [fetchAppsByQuery(buildStandardQuery())];

      const results = await Promise.all(queries);

      return results.flat().map((item: any) => ({
        id: item[0],
        name: item[1],
        location: item[5],
        resourceGroup: item[6],
        subscriptionId: item[7],
        properties: item[11],
      }));
    },
    {
      enabled: !!environment.armToken,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

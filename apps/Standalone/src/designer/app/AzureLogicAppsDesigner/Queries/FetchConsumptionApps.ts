import { useQuery } from '@tanstack/react-query';
import { environment } from '../../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import { fetchAppsByQuery } from '../Utilities/resourceUtilities';

const buildQuery = (subscriptionId?: string) => {
  const baseQuery = `
    resources
    | where ${subscriptionId ? `subscriptionId == '${subscriptionId}' and` : ''}
      (type =~ 'microsoft.logic/workflows' or (type =~ 'microsoft.web/sites' and kind contains 'workflowapp'))
    | extend plan = case(kind contains 'workflowapp', 'Standard', 'Consumption')
    | where plan =~ 'consumption'
  `;
  return baseQuery;
};

export const useFetchConsumptionApps = (subscriptionIds?: string[]) => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'consumption', subscriptionIds ?? 'all'],
    async () => {
      if (!environment.armToken) {
        return [];
      }

      const queries = subscriptionIds?.length
        ? subscriptionIds.map((id) => fetchAppsByQuery(buildQuery(id)))
        : [fetchAppsByQuery(buildQuery())];

      const results = await Promise.all(queries);

      return results.flat().map((item: any) => ({
        id: item[0],
        name: item[1],
        location: item[5],
        resourceGroup: item[6],
        subscriptionId: item[7],
        properties: item[10],
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

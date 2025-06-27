import { useQuery } from '@tanstack/react-query';
import { environment } from '../../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import { fetchAppsByQuery } from '../Utilities/resourceUtilities';

const buildQuery = () => {
  const baseQuery = `
    resources
    | where (type =~ 'microsoft.logic/workflows' or (type =~ 'microsoft.web/sites' and kind contains 'workflowapp'))
    | extend plan = case(kind contains 'workflowapp', 'Standard', 'Consumption')
    | where plan =~ 'consumption'
  `;
  return baseQuery;
};

export const useFetchConsumptionApps = (subscriptionIds?: string[]) => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'consumption', (subscriptionIds ?? ['all']).join(',')],
    async () => {
      if (!environment.armToken) {
        return [];
      }

      const results = await fetchAppsByQuery(buildQuery(), subscriptionIds);

      return results.map((item: any) => ({
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

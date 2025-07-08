import { useQuery } from '@tanstack/react-query';
import { environment } from '../../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import { fetchAppsByQuery } from '../Utilities/resourceUtilities';

const buildStandardQuery = () => `
  resources
  | where type == 'microsoft.web/sites' and kind contains 'workflowapp'
  | extend plan = 'Standard'
`;

export const useFetchStandardApps = (subscriptionIds?: string[]) => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'standard', (subscriptionIds ?? ['all']).join(',')],
    async () => {
      if (!environment.armToken) {
        return [];
      }

      const results = await fetchAppsByQuery(buildStandardQuery(), subscriptionIds);

      return results.map((item: any) => ({
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

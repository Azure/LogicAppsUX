import { environment } from '../../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import { fetchAppsByQuery } from '../Utilities/resourceUtilities';
import { useQuery } from '@tanstack/react-query';

export const useFetchHybridApps = () => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'hybrid'],
    async () => {
      if (!environment.armToken) {
        return [];
      }
      const query = `resources | where type =~ "microsoft.app/containerApps" and kind contains "workflowapp"`;
      const data = await fetchAppsByQuery(query);
      return data.map((item: any) => ({
        id: item[0],
        name: item[1],
        location: item[5],
        resourceGroup: item[6],
        subscriptionId: item[7],
        properties: item[11],
      }));
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

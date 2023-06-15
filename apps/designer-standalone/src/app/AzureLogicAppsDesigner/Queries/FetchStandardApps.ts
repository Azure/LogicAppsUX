import { environment } from '../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import axios from 'axios';
import { useQuery } from 'react-query';

export const useFetchStandardApps = () => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'standard'],
    async () => {
      if (!environment.armToken) return undefined;
      const { data } = await axios.post(
        'https://edge.management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01',
        {
          query: 'resources | where type == "microsoft.web/sites" and kind contains "workflowapp"',
          options: {
            $top: 1000,
            $skip: 0,
            $skipToken: '',
            resultFormat: 'table',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${environment.armToken}`,
          },
        }
      );
      return data.data.rows.map((item: any) => {
        return {
          id: item[0],
          name: item[1],
          location: item[5],
          resourceGroup: item[6],
          subscriptionId: item[7],
          properties: item[11],
        };
      });
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

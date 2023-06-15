import { environment } from '../../../environments/environment';
import type { Data as FetchLogicAppsData } from '../Models/LogicAppAppTypes';
import axios from 'axios';
import { useQuery } from 'react-query';

export const useFetchConsumptionApps = () => {
  return useQuery<FetchLogicAppsData[]>(
    ['listAllLogicApps', 'consumption'],
    async () => {
      if (!environment.armToken) return [];
      const data = await getConsumptionAppsRecursive();
      return data.map((item: any) => ({
        id: item[0],
        name: item[1],
        location: item[5],
        resourceGroup: item[6],
        subscriptionId: item[7],
        properties: item[10],
      }));
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

const getConsumptionAppsRecursive = async (): Promise<any[]> => {
  const requestPage = async (value: any[] = [], pageNum = 0, currentSkipToken = ''): Promise<any> => {
    try {
      const pageSize = 1000;
      const { data } = await axios.post(
        'https://edge.management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01',
        {
          query: `resources | where type =~ 'microsoft.logic/workflows' or (type =~ 'microsoft.web/sites' and kind contains 'workflowapp') | extend plan = case(kind contains 'workflowapp', 'Standard', 'Consumption') | where (plan =~ ('consumption'))`,
          options: {
            $top: pageSize,
            $skip: pageSize * pageNum,
            $skipToken: currentSkipToken,
            resultFormat: 'table',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${environment.armToken}`,
          },
        }
      );

      const $skipToken = data.$skipToken;
      const newValues = data.data.rows;
      value.push(...newValues);
      if ($skipToken && newValues.length !== 0) return await requestPage(value, pageNum + 1, $skipToken);
      return value;
    } catch (error) {
      return value;
    }
  };

  const output = await requestPage();
  console.log('### output', output);
  return output;
};

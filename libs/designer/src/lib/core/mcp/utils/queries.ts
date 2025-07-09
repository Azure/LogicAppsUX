import { useQuery } from '@tanstack/react-query';
import { useAzureConnectorsLazyQuery } from '../../../core/queries/browse';
import { useMemo } from 'react';
import { SearchService } from '@microsoft/logic-apps-shared';

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
    queryKey: ['operationsByConnector', connectorId],
    queryFn: async () => {
      if (!connectorId) {
        return [];
      }
      return await SearchService().getOperationsByConnector?.(connectorId, 'actions');
    },
    enabled: !!connectorId,
    ...queryOpts,
  });

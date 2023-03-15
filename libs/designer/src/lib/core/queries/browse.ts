import { SearchService } from '@microsoft/designer-client-services-logic-apps';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from 'react-query';

//This allows preloading to start at designer load so operations are ready
// or close to ready by the time they are needed. This call is very heavy.
export const usePreloadOperationsQuery = () => {
  const {
    isLoading: opIsLoading,
    fetchNextPage: fetchNextOpPage,
    hasNextPage: hasNextOpPage,
    isFetchingNextPage: isFetchingNextOpPage,
  } = useAllOperationsLazyQuery();

  useEffect(() => {
    if (opIsLoading || isFetchingNextOpPage) return;
    if (!hasNextOpPage) return;
    fetchNextOpPage();
  }, [fetchNextOpPage, hasNextOpPage, isFetchingNextOpPage, opIsLoading]);

  const {
    isLoading: connIsLoading,
    fetchNextPage: fetchNextConnPage,
    hasNextPage: hasNextConnPage,
    isFetchingNextPage: isFetchingNextConnPage,
  } = useAllConnectorsLazyQuery();

  useEffect(() => {
    if (connIsLoading || isFetchingNextConnPage) return;
    if (!hasNextConnPage) return;
    fetchNextConnPage();
  }, [fetchNextConnPage, hasNextConnPage, connIsLoading, isFetchingNextConnPage]);

  return {
    isLoading: opIsLoading || connIsLoading,
  };
};

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const useAllOperationsLazyQuery = () =>
  useInfiniteQuery(
    ['allOperationsLazy'],
    async ({ pageParam = 0 }: any) => {
      const data = await SearchService().getAllOperationsByPage(pageParam);
      return { data, pageParam };
    },
    {
      ...queryOpts,
      getNextPageParam: (lastPage) => (lastPage.data.length > 0 ? lastPage.pageParam + 1 : undefined),
    }
  );

export const useAllOperations = () => {
  const { data, isLoading, hasNextPage } = useAllOperationsLazyQuery();
  return useMemo(
    () => ({
      data: data?.pages.flatMap((page) => page.data) ?? [],
      isLoading: (isLoading || hasNextPage) ?? false,
    }),
    [data, isLoading, hasNextPage]
  );
};

export const useAllConnectorsLazyQuery = () =>
  useInfiniteQuery(
    ['allConnectorsLazy'],
    async ({ pageParam = 0 }: any) => {
      const data = await SearchService().getAllConnectorsByPage(pageParam);
      return { data, pageParam };
    },
    {
      ...queryOpts,
      getNextPageParam: (lastPage) => (lastPage.data.length > 0 ? lastPage.pageParam + 1 : undefined),
    }
  );

export const useAllConnectors = () => {
  const { data, isLoading, hasNextPage } = useAllConnectorsLazyQuery();
  return useMemo(
    () => ({
      data: data?.pages.flatMap((page) => page.data) ?? [],
      isLoading: (isLoading || hasNextPage) ?? false,
    }),
    [data, isLoading, hasNextPage]
  );
};

type TriggerCapabilitiesType = Record<string, { trigger?: boolean; action?: boolean }>;
export const useTriggerCapabilities = (allOperations?: DiscoveryOperation<DiscoveryResultTypes>[]) => {
  return useQuery<TriggerCapabilitiesType>(
    ['triggerCapabilities'],
    () =>
      new Promise((resolve) => {
        const ret: TriggerCapabilitiesType = {};
        for (const operation of allOperations ?? []) {
          const isTrigger = !!operation.properties?.trigger;
          const id = operation.properties.api.id.toLowerCase();
          ret[id] = {
            ...ret[id],
            [isTrigger ? 'trigger' : 'action']: true,
          };
        }
        resolve(ret ?? {});
      }),
    {
      ...queryOpts,
      retry: false,
      enabled: !!allOperations,
    }
  );
};

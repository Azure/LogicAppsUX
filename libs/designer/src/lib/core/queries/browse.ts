import { SearchService } from '@microsoft/designer-client-services-logic-apps';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from 'react-query';

// This allows preloading to start at designer load so operations are ready
//  or close to ready by the time they are needed

export const usePreloadOperationsQuery = (): any => {
  const { isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAllOperationsLazyQuery();

  useEffect(() => {
    if (isLoading || isFetchingNextPage) return;
    if (!hasNextPage) return;
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  return { isLoading };
};

export const usePreloadConnectorsQuery = (): any => {
  const {
    isLoading: azureIsLoading,
    fetchNextPage: fetchNextAzurePage,
    hasNextPage: hasNextAzurePage,
    isFetchingNextPage: isFetchingNextAzurePage,
  } = useAzureConnectorsLazyQuery();

  useEffect(() => {
    if (azureIsLoading || isFetchingNextAzurePage) return;
    if (!hasNextAzurePage) return;
    fetchNextAzurePage();
  }, [azureIsLoading, fetchNextAzurePage, hasNextAzurePage, isFetchingNextAzurePage]);

  const {
    isLoading: customIsLoading,
    fetchNextPage: fetchNextCustomPage,
    hasNextPage: hasNextCustomPage,
    isFetchingNextPage: isFetchingNextCustomPage,
  } = useCustomConnectorsLazyQuery();

  useEffect(() => {
    if (customIsLoading || isFetchingNextCustomPage) return;
    if (!hasNextCustomPage) return;
    fetchNextCustomPage();
  }, [customIsLoading, fetchNextCustomPage, hasNextCustomPage, isFetchingNextCustomPage]);

  const { isLoading: builtinIsLoading } = useBuiltInConnectorsQuery();

  return {
    isLoading: azureIsLoading || customIsLoading || builtinIsLoading,
  };
};

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

const useAllOperationsLazyQuery = () =>
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

const useAzureConnectorsLazyQuery = () =>
  useInfiniteQuery(
    ['allConnectorsLazy', 'azure'],
    async ({ pageParam = 0 }: any) => {
      const data = await SearchService().getAzureConnectorsByPage(pageParam);
      return { data, pageParam };
    },
    {
      ...queryOpts,
      getNextPageParam: (lastPage) => (lastPage.data.length > 0 ? lastPage.pageParam + 1 : undefined),
    }
  );

const useCustomConnectorsLazyQuery = () =>
  useInfiniteQuery(
    ['allConnectorsLazy', 'custom'],
    async ({ pageParam }: any) => {
      const { nextlink, value } = await SearchService().getCustomConnectorsByNextlink(pageParam);
      return { data: value, pageParam: nextlink };
    },
    {
      ...queryOpts,
      getNextPageParam: (lastPage) => lastPage.pageParam,
    }
  );

const useBuiltInConnectorsQuery = () =>
  useQuery(
    ['allConnectorsLazy', 'builtin'],
    async () => {
      const data = await SearchService().getBuiltInConnectors();
      return data;
    },
    queryOpts
  );

export const useAllConnectors = () => {
  const { data: azureData, isLoading: azureLoading, hasNextPage: azureHasNextPage } = useAzureConnectorsLazyQuery();
  const { data: customData, isLoading: customLoading, hasNextPage: customHasNextPage } = useCustomConnectorsLazyQuery();
  const { data: builtinData, isLoading: builtinLoading } = useBuiltInConnectorsQuery();

  const hasNextPage = useMemo(() => azureHasNextPage || customHasNextPage, [azureHasNextPage, customHasNextPage]);
  const isLoading = useMemo(
    () => hasNextPage || azureLoading || customLoading || builtinLoading,
    [hasNextPage, azureLoading, customLoading, builtinLoading]
  );

  const data = useMemo(() => {
    const azure = azureData?.pages.flatMap((page) => page.data) ?? [];
    const custom = customData?.pages.flatMap((page) => page.data) ?? [];
    const builtin = builtinData ?? [];
    return [...azure, ...custom, ...builtin];
  }, [azureData, customData, builtinData]);

  return useMemo(() => ({ data, isLoading }), [data, isLoading]);
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

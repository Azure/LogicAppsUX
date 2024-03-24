import { SearchService } from '@microsoft/logic-apps-shared';
import { cleanConnectorId } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from 'react-query';

/*
  Riley - The general idea here is that each lazy query will fetch one 'page' at a time,
    and the exported hooks will combine all the queries be updated as each page is fetched.
    This makes it so that if one of the peices is slow or breaks, it doesn't affect the other queries.
    Operartions and Connectors are completely separate as well, but they have pretty much the same structure.
*/

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

const pagedOpts = {
  getNextPageParam: (lastPage: any) => (lastPage.data.length > 0 ? lastPage.pageParam + 1 : undefined),
};

/// Operations ///

export const useAllOperations = () => {
  const { data: azureOperations, isLoading: azureLoading, hasNextPage: azureHasNextPage } = useAzureOperationsLazyQuery();

  const { data: customOperations, isLoading: customLoading, hasNextPage: customHasNextPage } = useCustomOperationsLazyQuery();

  const { data: builtinOperations, isLoading: builtinLoading } = useBuiltInOperationsQuery();

  const data = useMemo(() => {
    const azure = azureOperations?.pages.flatMap((page) => page.data) ?? [];
    const custom = customOperations?.pages.flatMap((page) => page.data) ?? [];
    const builtin = builtinOperations?.data ?? [];
    return [...azure, ...custom, ...builtin].filter((op) => op !== undefined);
  }, [azureOperations, customOperations, builtinOperations]);

  const isLoading = useMemo(
    () => (azureLoading || customLoading || builtinLoading || azureHasNextPage || customHasNextPage) ?? false,
    [azureLoading, customLoading, builtinLoading, azureHasNextPage, customHasNextPage]
  );

  return useMemo(() => ({ data, isLoading }), [data, isLoading]);
};

// Query to return an array of fetched triggers
export const useAllTriggers = () => {
  const allOperations = useAllOperations();
  return useMemo(
    () => ({
      ...allOperations,
      data: allOperations.data.filter((operation) => !!operation.properties?.trigger),
    }),
    [allOperations]
  );
};

// Query to return an array of api ids that have fetched triggers
export const useAllApiIdsWithTriggers = () => {
  const allTriggers = useAllTriggers();
  return useMemo(
    () => ({
      ...allTriggers,
      data: allTriggers.data.map((trigger) => cleanConnectorId(trigger?.properties.api.id)),
    }),
    [allTriggers]
  );
};

// Query to return an array of fetched actions
export const useAllActions = () => {
  const allOperations = useAllOperations();
  return useMemo(
    () => ({
      ...allOperations,
      data: allOperations.data.filter((operation) => !operation.properties?.trigger),
    }),
    [allOperations]
  );
};

// Query to return an array of api ids that have fetched actions
export const useAllApiIdsWithActions = () => {
  const allActions = useAllActions();
  return useMemo(
    () => ({
      ...allActions,
      data: allActions.data.map((action) => cleanConnectorId(action?.properties.api.id)),
    }),
    [allActions]
  );
};

// Intended to be used in some root component, will handle the fetching
export const usePreloadOperationsQuery = (): any => {
  const {
    isLoading: azureIsLoading,
    fetchNextPage: fetchNextAzurePage,
    hasNextPage: hasNextAzurePage,
    isFetchingNextPage: isFetchingNextAzurePage,
  } = useAzureOperationsLazyQuery();

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
  } = useCustomOperationsLazyQuery();

  useEffect(() => {
    if (customIsLoading || isFetchingNextCustomPage) return;
    if (!hasNextCustomPage) return;
    fetchNextCustomPage();
  }, [customIsLoading, fetchNextCustomPage, hasNextCustomPage, isFetchingNextCustomPage]);

  const { isLoading: builtinIsLoading } = useBuiltInOperationsQuery();

  const isLoading = useMemo(
    () => azureIsLoading || customIsLoading || builtinIsLoading,
    [azureIsLoading, customIsLoading, builtinIsLoading]
  );

  return { isLoading };
};

const useAzureOperationsLazyQuery = () =>
  useInfiniteQuery(
    ['allOperationsLazy'],
    async ({ pageParam = 0 }: any) => {
      const data = await SearchService().getAzureOperationsByPage(pageParam);
      return { data, pageParam };
    },
    {
      ...queryOpts,
      ...pagedOpts,
    }
  );

const useCustomOperationsLazyQuery = () =>
  useInfiniteQuery(
    ['allOperationsLazy', 'custom'],
    async ({ pageParam = 0 }: any) => {
      const data = await SearchService().getCustomOperationsByPage(pageParam);
      return { data, pageParam };
    },
    {
      ...queryOpts,
      ...pagedOpts,
    }
  );

const useBuiltInOperationsQuery = () =>
  useQuery(
    ['allOperations', 'builtin'],
    async () => {
      const data = await SearchService().getBuiltInOperations();
      return { data };
    },
    queryOpts
  );

/// Connectors ///

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
    return [...azure, ...custom, ...builtin].filter((connector) => connector !== undefined);
  }, [azureData, customData, builtinData]);

  return useMemo(() => ({ data, isLoading }), [data, isLoading]);
};

// Intended to be used in some root component, will handle the fetching
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

  const isLoading = useMemo(
    () => azureIsLoading || customIsLoading || builtinIsLoading,
    [azureIsLoading, customIsLoading, builtinIsLoading]
  );

  return { isLoading };
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
      ...pagedOpts,
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

import type { Connector, DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import { SearchService, cleanConnectorId } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ActionPanelFavoriteItem } from '../state/panel/panelTypes';

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

const favoriteActionQueryPageSize = 10;

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
    if (azureIsLoading || isFetchingNextAzurePage) {
      return;
    }
    if (!hasNextAzurePage) {
      return;
    }
    fetchNextAzurePage();
  }, [azureIsLoading, fetchNextAzurePage, hasNextAzurePage, isFetchingNextAzurePage]);

  const {
    isLoading: customIsLoading,
    fetchNextPage: fetchNextCustomPage,
    hasNextPage: hasNextCustomPage,
    isFetchingNextPage: isFetchingNextCustomPage,
  } = useCustomOperationsLazyQuery();

  useEffect(() => {
    if (customIsLoading || isFetchingNextCustomPage) {
      return;
    }
    if (!hasNextCustomPage) {
      return;
    }
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
    if (azureIsLoading || isFetchingNextAzurePage) {
      return;
    }
    if (!hasNextAzurePage) {
      return;
    }
    fetchNextAzurePage();
  }, [azureIsLoading, fetchNextAzurePage, hasNextAzurePage, isFetchingNextAzurePage]);

  const {
    isLoading: customIsLoading,
    fetchNextPage: fetchNextCustomPage,
    hasNextPage: hasNextCustomPage,
    isFetchingNextPage: isFetchingNextCustomPage,
  } = useCustomConnectorsLazyQuery();

  useEffect(() => {
    if (customIsLoading || isFetchingNextCustomPage) {
      return;
    }
    if (!hasNextCustomPage) {
      return;
    }
    fetchNextCustomPage();
  }, [customIsLoading, fetchNextCustomPage, hasNextCustomPage, isFetchingNextCustomPage]);

  const { isLoading: builtinIsLoading } = useBuiltInConnectorsQuery();

  const isLoading = useMemo(
    () => azureIsLoading || customIsLoading || builtinIsLoading,
    [azureIsLoading, customIsLoading, builtinIsLoading]
  );

  return { isLoading };
};

export const useAzureConnectorsLazyQuery = () =>
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

/// Favorites ///

// Returns a map of connectorId to Connector
const useConnectorsMap = () => {
  const { data: connectors, isLoading: connectorsLoading } = useAllConnectors();

  return useMemo(() => {
    const connectorsMap: Record<string, Connector> = {};
    for (const connector of connectors) {
      connectorsMap[connector.id] = connector;
    }
    return { connectorsMap, connectorsLoading };
  }, [connectors, connectorsLoading]);
};

const useFavoriteConnectors = (favoriteItems: ActionPanelFavoriteItem[]) => {
  const { connectorsMap, connectorsLoading } = useConnectorsMap();

  // Favorite item is a connector if it doesn't have an operation id
  const favoriteConnectorIds = useMemo(() => {
    if (!favoriteItems) {
      return [];
    }
    const isConnectorFavorite = (favoriteItem: ActionPanelFavoriteItem) => !favoriteItem.operationId;
    return favoriteItems.filter(isConnectorFavorite);
  }, [favoriteItems]);

  // Return connectors for favorited connector ids
  return useMemo(() => {
    const favoriteConnectorsData = [];
    for (const favoriteConnectorId of favoriteConnectorIds) {
      const id = favoriteConnectorId.connectorId;
      if (connectorsMap[id]) {
        favoriteConnectorsData.push(connectorsMap[id]);
      }
    }
    return { favoriteConnectorsData, connectorsLoading };
  }, [favoriteConnectorIds, connectorsLoading, connectorsMap]);
};

const useFavoriteActionsQuery = (favoriteItems: ActionPanelFavoriteItem[]) => {
  const { data: allActions = [], isLoading } = useAllOperations();

  // Favorite item is a operation/action if it has an operation id specified
  const favoriteActionIds = useMemo(() => {
    if (!favoriteItems) {
      return [];
    }
    const isActionFavorite = (favoriteItem: ActionPanelFavoriteItem) => favoriteItem.operationId;
    return favoriteItems.filter(isActionFavorite);
  }, [favoriteItems]);

  // Return paged operations for favorited operation ids. This query is paged to reduce number of get operations calls at once.
  return useInfiniteQuery(
    ['favoriteActions', favoriteActionIds],
    async ({ pageParam = 0 }) => {
      const favoriteActionIdsForCurrentPage = favoriteActionIds.slice(pageParam, pageParam + favoriteActionQueryPageSize);

      // Fetch all actions for the de-duped connectorIds on the current page
      const uniqueConnectorIdsForCurrentPage = new Set<string>();
      favoriteActionIdsForCurrentPage.forEach((favoriteActionId) => uniqueConnectorIdsForCurrentPage.add(favoriteActionId.connectorId));

      // Get the favorited actions for the current page from fetched operations
      const favoriteActions = filterOperationsFromList(favoriteActionIdsForCurrentPage, allActions);
      return { favoriteActions, pageParam };
    },
    {
      enabled: !isLoading,
      ...queryOpts,
      getNextPageParam: (lastPage) =>
        favoriteActionIds.length > lastPage.pageParam + favoriteActionQueryPageSize
          ? lastPage.pageParam + favoriteActionQueryPageSize
          : undefined,
    }
  );
};

export const useFavoriteOperations = (favoriteItems: ActionPanelFavoriteItem[]) => {
  const { favoriteConnectorsData, connectorsLoading } = useFavoriteConnectors(favoriteItems);
  const {
    data: favoriteActionsPages,
    fetchNextPage: favoriteActionsFetchNextPage,
    hasNextPage: favoriteActionsHasNextPage,
    isFetching: favoriteActionsIsFetching,
    isFetchingNextPage: favoriteActionsIsFetchingNextPage,
  } = useFavoriteActionsQuery(favoriteItems);

  const favoriteActionsData = useMemo(
    () => favoriteActionsPages?.pages.flatMap((page) => page.favoriteActions) ?? [],
    [favoriteActionsPages]
  );

  return useMemo(
    () => ({
      favoriteConnectorsData: favoriteConnectorsData ?? [],
      favoriteActionsData: favoriteActionsData ?? [],
      isLoadingFavoriteConnectors: connectorsLoading,
      favoriteActionsFetchNextPage,
      favoriteActionsHasNextPage,
      favoriteActionsIsFetchingNextPage,
      favoriteActionsIsFetching,
    }),
    [
      favoriteConnectorsData,
      favoriteActionsData,
      connectorsLoading,
      favoriteActionsFetchNextPage,
      favoriteActionsHasNextPage,
      favoriteActionsIsFetchingNextPage,
      favoriteActionsIsFetching,
    ]
  );
};

/// Helpers ///

const filterOperationsFromList = (
  operationsToRetrieve: { connectorId: string; operationId?: string }[],
  allOperations: DiscoveryOpArray
) => {
  const filteredOperations: DiscoveryOpArray = [];
  for (const operationToRetrieve of operationsToRetrieve) {
    const operation = allOperations.find(
      (op) =>
        op.properties.api.id.toLowerCase() === operationToRetrieve.connectorId.toLowerCase() &&
        op.id.toLowerCase() === operationToRetrieve.operationId?.toLowerCase()
    );
    if (operation) {
      filteredOperations.push(operation);
    }
  }
  return filteredOperations;
};

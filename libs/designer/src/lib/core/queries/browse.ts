import { getReactQueryClient } from '../ReactQueryProvider';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';

//This allows preloading to start at designer load so operations are ready
// or close to ready by the time they are needed. This call is very heavy.
export const preloadOperationsQuery = () => {
  const client = getReactQueryClient();
  client.fetchQuery(['allOperations'], () => {
    const searchService = SearchService();
    return searchService.preloadOperations();
  });
  client.fetchQuery(['browseResult'], () => {
    return SearchService().getAllConnectors();
  });
};

export const useAllOperations = () => {
  return useQuery(
    ['allOperations'],
    () => {
      const searchService = SearchService();
      return searchService.preloadOperations();
    },
    {
      retry: false,
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useAllConnectors = () => {
  return useQuery(
    ['browseResult'],
    () => {
      return SearchService().getAllConnectors();
    },
    {
      retry: false,
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

type TriggerCapabilitiesType = Record<string, { trigger?: boolean; action?: boolean }>;
export const useTriggerCapabilities = (allOperations?: DiscoveryOperation<DiscoveryResultTypes>[]) => {
  return useQuery<TriggerCapabilitiesType>(
    ['triggerCapabilities'],
    () => {
      return new Promise((resolve) => {
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
      });
    },
    {
      retry: false,
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!allOperations,
    }
  );
};

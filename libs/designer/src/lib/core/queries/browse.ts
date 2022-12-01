import { getReactQueryClient } from '../ReactQueryProvider';
import { SearchService } from '@@microsoft/logicappsux/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { useQuery } from 'react-query';

//This allows preloading to start at designer load so operations are ready
// or close to ready by the time they are needed. This call is very heavy.
export const preloadOperationsQuery = () => {
  const client = getReactQueryClient();
  client.fetchQuery(['allOperations'], () => SearchService().preloadOperations());
  client.fetchQuery(['browseResult'], () => SearchService().getAllConnectors());
};

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};
export const useAllOperations = () => useQuery(['allOperations'], () => SearchService().preloadOperations(), queryOpts);
export const useAllConnectors = () => useQuery(['browseResult'], () => SearchService().getAllConnectors(), queryOpts);

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

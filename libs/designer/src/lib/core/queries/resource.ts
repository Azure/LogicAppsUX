import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { LogicAppResource, Resource } from '@microsoft/logic-apps-shared';
import { ResourceService } from '@microsoft/logic-apps-shared';

export const useSubscriptions = (): UseQueryResult<Resource[], unknown> => {
  return useQuery(
    ['listSubscriptions'],
    async () => {
      return ResourceService().listSubscriptions();
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useResourceGroups = (subscriptionId: string): UseQueryResult<Resource[], unknown> => {
  return useQuery(
    ['listResourcegroups', subscriptionId],
    async () => {
      return ResourceService().listResourceGroups(subscriptionId);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!subscriptionId,
    }
  );
};

export const useLocations = (subscriptionId: string): UseQueryResult<Resource[], unknown> => {
  return useQuery(
    ['listLocations', subscriptionId],
    async () => {
      return ResourceService().listLocations(subscriptionId);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!subscriptionId,
    }
  );
};

export const useLogicApps = (
  subscriptionId: string,
  resourceGroup: string,
  enabled: boolean
): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['listLogicapps', subscriptionId, resourceGroup],
    async () => {
      return ResourceService().listLogicApps(subscriptionId, resourceGroup);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: enabled && !!subscriptionId && !!resourceGroup,
    }
  );
};

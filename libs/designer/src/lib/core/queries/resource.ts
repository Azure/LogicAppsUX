import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { LogicAppResource, Resource } from '@microsoft/logic-apps-shared';
import { equals, ResourceService } from '@microsoft/logic-apps-shared';

export const useSubscription = (subscriptionId: string): UseQueryResult<Resource | undefined, unknown> => {
  return useQuery(
    ['getSubscription', subscriptionId?.toLowerCase()],
    async () => {
      return ResourceService().getResource(`/subscriptions/${subscriptionId}`, { 'api-version': '2020-06-01' });
    },
    {
      enabled: !!subscriptionId,
    }
  );
};

export const useLocation = (subscriptionId: string, location: string): UseQueryResult<Resource | undefined, unknown> => {
  return useQuery(
    ['getLocation', subscriptionId?.toLowerCase(), location?.toLowerCase()],
    async () => {
      const result = await ResourceService().listLocations(subscriptionId);
      return result.find((loc) => equals(loc.name, location));
    },
    {
      enabled: !!subscriptionId && !!location,
    }
  );
};

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

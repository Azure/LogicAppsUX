import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getConnector, getOperation } from '../../queries/operation';
import type { LogicAppResource, Resource } from '@microsoft/logic-apps-shared';
import { ResourceService } from '@microsoft/logic-apps-shared';

export interface ConnectorInfo {
  id: string;
  displayName: string;
  iconUrl?: string;
}

export const useConnectorInfo = (
  connectorId: string | undefined,
  operationId: string | undefined,
  useCachedData = false,
  enabled = true
): UseQueryResult<ConnectorInfo | undefined, unknown> => {
  return useQuery(
    ['apiInfo', { connectorId }],
    async () => {
      if (!connectorId) {
        return null;
      }
      if (operationId) {
        try {
          const { properties } = await getOperation({ connectorId, operationId }, useCachedData);
          return {
            id: connectorId,
            displayName: properties?.connector?.properties?.displayName,
            iconUrl: properties?.iconUri,
          };
        } catch {
          /* empty */
        }
      }

      const { properties } = await getConnector(connectorId, useCachedData);
      return {
        id: connectorId,
        displayName: properties?.displayName,
        iconUrl: properties?.iconUrl ?? properties?.iconUri,
      };
    },
    {
      enabled: !!connectorId && enabled,
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useSubscriptions = (): UseQueryResult<Resource[], unknown> => {
  return useQuery(
    ['subscriptions'],
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
    ['resourcegroups', subscriptionId],
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
    ['locations', subscriptionId],
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
  location: string,
  isConsumption: boolean
): UseQueryResult<LogicAppResource[], unknown> => {
  return useQuery(
    ['logicapps', subscriptionId, resourceGroup, location],
    async () => {
      return ResourceService().listLogicApps(subscriptionId, resourceGroup, location);
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !isConsumption && !!subscriptionId && !!resourceGroup && !!location,
    }
  );
};

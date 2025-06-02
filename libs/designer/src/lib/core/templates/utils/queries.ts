import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getConnector, getOperation } from '../../queries/operation';
import type { LogicAppResource, Resource } from '@microsoft/logic-apps-shared';
import { ResourceService, TemplateService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../ReactQueryProvider';

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
    ['templateQueries', 'apiInfo', { connectorId }],
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
    ['templateQueries', 'subscriptions'],
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
    ['templateQueries', 'resourcegroups', subscriptionId],
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
    ['templateQueries', 'locations', subscriptionId],
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
    ['templateQueries', 'logicapps', subscriptionId, resourceGroup],
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

export const getCustomTemplates = async (subscriptionId: string, resourceGroup: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(
    ['templateQueries', 'customtemplates', subscriptionId.toLowerCase(), resourceGroup.toLowerCase()],
    async () => {
      return (await TemplateService()?.getCustomTemplates?.(subscriptionId, resourceGroup)) ?? [];
    }
  );
};

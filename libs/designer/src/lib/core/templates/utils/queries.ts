import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getConnector, getOperation } from '../../queries/operation';

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

import { ConnectionService, OperationManifestService } from '@microsoft/logic-apps-shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

export interface ConnectorInfo {
  id: string;
  displayName: string;
  iconUrl?: string;
}

export const useConnectorInfo = (
  connectorId: string | undefined,
  operationId: string | undefined,
  enabled = true
): UseQueryResult<ConnectorInfo | undefined, unknown> => {
  return useQuery(
    ['apiInfo', { connectorId }],
    async () => {
      if (!connectorId) {
        return null;
      }
      if (operationId) {
        const { properties } = await OperationManifestService().getOperationManifest(connectorId, operationId);
        return {
          id: connectorId,
          displayName: properties?.connector?.properties?.displayName,
          iconUrl: properties?.iconUri,
        };
      }

      const { properties } = await ConnectionService().getConnector(connectorId);
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

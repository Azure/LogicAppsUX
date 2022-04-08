import type { RootState } from '../../store';
import type { OperationIds } from '../operationMetadataSlice';
import type { OperationManifestProperties } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const useActionMetadata = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return state.workflow.actions[actionId];
  });
};

export const useNodeMetadata = (nodeId?: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }
    return state.workflow.nodesMetadata[nodeId];
  });
};

export const useConnector = (connectorId: string) => {
  const connectionService = ConnectionService();
  return useQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId), {
    enabled: !!connectorId,
  });
};

export const useOperationManifest = (connectorId: string, operationId: string) => {
  const operationManifestService = OperationManifestService();
  connectorId = connectorId.toLowerCase();
  operationId = operationId.toLowerCase();
  const manifestQuery = useQuery(
    ['manifest', { connectorId }, { operationId }],
    () => operationManifestService.getOperationManifest(connectorId, operationId),
    {
      enabled: !!connectorId && !!operationId,
    }
  );

  return manifestQuery;
};

const useNodeAttribute = (nodeId: string, attributeName: keyof OperationManifestProperties): string => {
  const { data: operationIds } = useOperationIds(nodeId);

  const { connectorId, operationId } = operationIds ? operationIds : { connectorId: '', operationId: '' };

  const { data: manifest } = useOperationManifest(connectorId, operationId);

  const { data: connector } = useConnector(connectorId);

  if (connector) {
    return connector.properties[attributeName];
  }

  if (manifest) {
    return manifest.properties[attributeName];
  }

  return '';
};

export const useBrandColor = (nodeId: string) => {
  return useNodeAttribute(nodeId, 'brandColor');
};

export const useIconUri = (nodeId: string) => {
  return useNodeAttribute(nodeId, 'iconUri');
};

export const useOperationIds = (nodeId: string) => {
  const operationManifestService = OperationManifestService();

  const operationInfo = useQuery<OperationIds>(['operationIds', { nodeId }], () => operationManifestService.getOperationInfo(null), {
    enabled: !!nodeId,
  });
  return operationInfo;
};

// export const fetchOperationInfo = async (connectorId: string, operationId: string) => {
//   const queryClient = getReactQueryClient();
//   const operationManifestService = OperationManifestService();

//   const operationInfo = await queryClient.fetchQuery<OperationInfo>('deserialized', () =>
//     operationManifestService.getOperationInfo(operation)
//   );
//   if (!connectorId || !operationId) {
//     return undefined;
//   }
//   const manifestQuery = queryClient.fetchQuery(['manifest', { connectorId }, { operationId }], () => // Danielle .tolowercase?
//       operationManifestService.getOperationManifest(connectorId, operationId )
//     )

//   return manifestQuery;
// };

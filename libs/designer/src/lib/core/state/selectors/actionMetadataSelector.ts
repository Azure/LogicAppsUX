import type { RootState } from '../../store';
import type { OperationInfo } from '../operationMetadataSlice';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationManifestProperties } from '@microsoft-logic-apps/utils';
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

export const useNodeDescription = (nodeId: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }
    return state.workflow.actions[nodeId]?.description;
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

  const operationInfo = useQuery<OperationInfo>(['operationIds', { nodeId }], () => operationManifestService.getOperationInfo(null), {
    enabled: !!nodeId,
  });
  return operationInfo;
};

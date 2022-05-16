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

export const useNodeDescription = (nodeId: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }
    return state.workflow.actions[nodeId]?.description;
  });
};

export const useOperationInfo = (nodeId: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }
    return state.operations.operationInfo[nodeId];
  });
};

export const useConnector = (connectorId: string) => {
  const connectionService = ConnectionService();
  return useQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId), {
    enabled: !!connectorId,
  });
};

export const useOperationManifest = (operationInfo: OperationInfo) => {
  const operationManifestService = OperationManifestService();
  const connectorId = operationInfo.connectorId.toLowerCase();
  const operationId = operationInfo.operationId.toLowerCase();
  const manifestQuery = useQuery(
    ['manifest', { connectorId }, { operationId }],
    () => operationManifestService.getOperationManifest(connectorId, operationId),
    {
      enabled: !!connectorId && !!operationId,
    }
  );

  return manifestQuery;
};

const useNodeAttribute = (operationInfo: OperationInfo | undefined, attributeName: keyof OperationManifestProperties): string => {
  if (operationInfo) {
    const { data: manifest } = useOperationManifest(operationInfo);

    if (manifest) {
      return manifest.properties[attributeName];
    }

    const { data: connector } = useConnector(operationInfo.connectorId);
    if (connector) {
      return connector.properties[attributeName];
    }
  }

  return '';
};

export const useBrandColor = (operationInfo: OperationInfo | undefined) => {
  return useNodeAttribute(operationInfo, 'brandColor');
};

export const useIconUri = (operationInfo: OperationInfo | undefined) => {
  return useNodeAttribute(operationInfo, 'iconUri');
};

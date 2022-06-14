import { useConnectionByName } from '../../queries/connections';
import type { RootState } from '../../store';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationInfo, OperationManifestProperties } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const useActionMetadata = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return state.workflow.operations[actionId];
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

export const useNodeConnectionName = (nodeId: string) => {
  const connectionId = useSelector((state: RootState) => {
    // danielle test this live
    return nodeId ? state.connections.connectionsMapping[nodeId] : '';
  });
  const connection = useConnectionByName(connectionId);
  return connection?.properties.displayName ?? '';
};

export const useNodeDescription = (nodeId: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }
    return state.workflow.operations[nodeId]?.description;
  });
};

export const useOperationInfo = (nodeId: string) => {
  return useSelector((state: RootState) => {
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
  const connectorId = operationInfo?.connectorId?.toLowerCase();
  const operationId = operationInfo?.operationId?.toLowerCase();
  const manifestQuery = useQuery(
    ['manifest', { connectorId }, { operationId }],
    () => operationManifestService.getOperationManifest(connectorId, operationId),
    {
      enabled: !!connectorId && !!operationId,
    }
  );

  return manifestQuery;
};

const useNodeAttribute = (operationInfo: OperationInfo, attributeName: keyof OperationManifestProperties): string => {
  const { data: manifest } = useOperationManifest(operationInfo);
  const { data: connector } = useConnector(operationInfo?.connectorId);

  if (manifest) {
    return manifest.properties[attributeName];
  }

  if (connector) {
    return connector.properties[attributeName];
  }

  return '';
};

export const useBrandColor = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, 'brandColor');
};

export const useIconUri = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, 'iconUri');
};

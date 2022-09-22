import { isConnectionRequiredForOperation } from '../../actions/bjsworkflow/connections';
import { useConnectionById } from '../../queries/connections';
import type { RootState } from '../../store';
import { getConnectionId } from '../../utils/connectors/connections';
import { useConnector } from '../connection/connectionSelector';
import type { NodeOperation } from '../operation/operationMetadataSlice';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { getObjectPropertyValue } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

interface QueryResult {
  isLoading?: boolean;
  result: any;
}

export const useIsConnectionRequired = (operationInfo: NodeOperation) => {
  const result = useOperationManifest(operationInfo);
  const manifest = result.data;
  return manifest ? isConnectionRequiredForOperation(manifest) : true;
  // else case needs to be implemented: work item 14936435
};

export const useNodeConnectionId = (nodeId: string): string =>
  useSelector((state: RootState) => getConnectionId(state.connections, nodeId));

export const useNodeConnectionName = (nodeId: string): QueryResult => {
  const { connectionId, connectorId } = useSelector((state: RootState) => {
    return nodeId
      ? { connectionId: getConnectionId(state.connections, nodeId), connectorId: state.operations.operationInfo[nodeId]?.connectorId }
      : { connectionId: '', connectorId: '' };
  });

  // 14955807 task to investigate adding connection type to state to avoid checking in multiple places, or another strategy to avoid below way to find connection
  const { result: connection, isLoading } = useConnectionById(connectionId, connectorId);

  return {
    isLoading,
    result: !isLoading && connectionId ? connection?.properties.displayName ?? connectionId.split('/').at(-1) : '',
  };
};

export const useOperationInfo = (nodeId: string) => {
  return useSelector((state: RootState) => {
    return state.operations.operationInfo[nodeId];
  });
};

export const useAllOperations = () => {
  return useSelector((state: RootState) => {
    return state.operations.operationInfo;
  });
};

export const useOperationManifest = (operationInfo: NodeOperation) => {
  const operationManifestService = OperationManifestService();
  const connectorId = operationInfo?.connectorId?.toLowerCase();
  const operationId = operationInfo?.operationId?.toLowerCase();
  return useQuery(
    ['manifest', { connectorId }, { operationId }],
    () =>
      operationManifestService.isSupported(operationInfo.type, operationInfo.kind)
        ? operationManifestService.getOperationManifest(connectorId, operationId)
        : undefined,
    {
      enabled: !!connectorId && !!operationId,
    }
  );
};

const useNodeAttribute = (operationInfo: NodeOperation, propertyInManifest: string[], propertyInConnector: string[]): QueryResult => {
  const { data: manifest, isLoading } = useOperationManifest(operationInfo);
  const { data: connector } = useConnector(operationInfo?.connectorId);

  if (manifest) {
    return {
      isLoading,
      result: getObjectPropertyValue(manifest.properties, propertyInManifest),
    };
  }

  if (connector) {
    return {
      isLoading,
      result: getObjectPropertyValue(connector.properties, propertyInConnector),
    };
  }

  return {
    isLoading,
    result: '',
  };
};

export const useBrandColor = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['brandColor'], ['metadata', 'brandColor']);
};

export const useIconUri = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['iconUri'], ['iconUrl']);
};

export const useConnectorName = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'displayName'], ['displayName']);
};

export const useConnectorDescription = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'description'], ['description']);
};

export const useConnectorDocumentation = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['externalDocs'], ['description']);
};

export const useConnectorEnvironmentBadge = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['environmentBadge'], ['environmentBadge']);
};

export const useConnectorStatusBadge = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['statusBadge'], ['environmentBadge']);
};

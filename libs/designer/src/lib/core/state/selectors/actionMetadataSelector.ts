import { isConnectionRequiredForOperation } from '../../actions/bjsworkflow/connections';
import { useConnectionById } from '../../queries/connections';
import type { RootState } from '../../store';
import { getConnectionId } from '../../utils/connectors/connections';
import { useConnector } from '../connection/connectionSelector';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

interface QueryResult {
  isLoading?: boolean;
  result: any;
}

export const useIsConnectionRequired = (operationInfo: OperationInfo) => {
  const result = useOperationManifest(operationInfo);
  const manifest = result.data;
  if (manifest) {
    return isConnectionRequiredForOperation(result.data);
  }
  // else case needs to be implemented: work item 14936435
  return true;
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

export const useOperationManifest = (operationInfo: OperationInfo) => {
  const operationManifestService = OperationManifestService();
  const connectorId = operationInfo?.connectorId?.toLowerCase();
  const operationId = operationInfo?.operationId?.toLowerCase();
  return useQuery(
    ['manifest', { connectorId }, { operationId }],
    () => operationManifestService.getOperationManifest(connectorId, operationId),
    {
      enabled: !!connectorId && !!operationId,
    }
  );
};

const useNodeAttribute = (operationInfo: OperationInfo, propertyInManifest: string[], propertyInConnector: string[]): QueryResult => {
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

export const useBrandColor = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['brandColor'], ['metadata', 'brandColor']);
};

export const useIconUri = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['iconUri'], ['iconUrl']);
};

export const useConnectorName = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'displayName'], ['displayName']);
};

export const useConnectorDescription = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'description'], ['description']);
};

export const useConnectorDocumentation = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['externalDocs'], ['description']);
};

export const useConnectorEnvironmentBadge = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['environmentBadge'], ['environmentBadge']);
};

export const useConnectorStatusBadge = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['statusBadge'], ['environmentBadge']);
};

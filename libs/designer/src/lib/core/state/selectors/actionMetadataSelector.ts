import type { ConnectionReference } from '../../../common/models/workflow';
import { isConnectionRequiredForOperation } from '../../actions/bjsworkflow/connections';
import { useConnectionByName } from '../../queries/connections';
import type { RootState } from '../../store';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

interface QueryResult {
  isLoading?: boolean;
  result: any;
}

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

export const useIsConnectionRequired = (operationInfo: OperationInfo) => {
  const result = useOperationManifest(operationInfo);
  const manifest = result.data;
  if (manifest) {
    return isConnectionRequiredForOperation(result.data);
  }
  // else case needs to be implemented: work item 14936435
  return true;
};

export const useNodeConnectionName = (nodeId: string) => {
  const connectionId = useSelector((state: RootState) => {
    return nodeId ? state.connections.connectionsMapping[nodeId] : '';
  });
  // 14955807 task to investigate adding connection type to state to avoid checking in multiple places, or another strategy to avoid below way to find connection
  const connection = useConnectionByName(connectionId);
  const displayName = useSelector((state: RootState) => {
    const connectionReferences = state.connections.connectionReferences;
    const connectionReference: ConnectionReference | undefined = connectionReferences[connectionId];
    return connectionReference ? connectionReference.connectionName : '';
  });
  // do all connections have the name in references?
  return connection?.properties.displayName ?? displayName;
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

export const useAllOperations = () => {
  return useSelector((state: RootState) => {
    return state.operations.operationInfo;
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
  return useNodeAttribute(operationInfo, ['brandColor'], ['brandColor']);
};

export const useIconUri = (operationInfo: OperationInfo) => {
  return useNodeAttribute(operationInfo, ['iconUri'], ['iconUri']);
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

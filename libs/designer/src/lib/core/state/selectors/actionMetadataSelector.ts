import { isConnectionRequiredForOperation } from '../../actions/bjsworkflow/connections';
import { useConnectionById } from '../../queries/connections';
import type { RootState } from '../../store';
import { getConnectionId } from '../../utils/connectors/connections';
import { useConnector, useConnectorAndSwagger } from '../connection/connectionSelector';
import type { NodeOperation } from '../operation/operationMetadataSlice';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import { SwaggerParser } from '@microsoft/parsers-logic-apps';
import { getObjectPropertyValue } from '@microsoft/utils-logic-apps';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

interface QueryResult {
  isLoading?: boolean;
  result: any;
}

export const useIsConnectionRequired = (operationInfo: NodeOperation) => {
  const result = useOperationManifest(operationInfo);
  if (result.isLoading || !result.isFetched || result.isPlaceholderData) return false;
  const manifest = result.data;
  return manifest ? isConnectionRequiredForOperation(manifest) : true;
  // else case needs to be implemented: work item 14936435
};

export const useAllowUserToChangeConnection = (op: NodeOperation) => {
  return useIsConnectionRequired(op);
};

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

export const useOperationManifest = (operationInfo: NodeOperation, enabled = true) => {
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
      enabled: !!connectorId && !!operationId && enabled,
      placeholderData: undefined,
      cacheTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useOperationQuery = (nodeId: string) => {
  const operationInfo = useOperationInfo(nodeId);

  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const manifestQuery = useOperationManifest(operationInfo, useManifest);

  const connectorQuery = useConnector(operationInfo?.connectorId, !useManifest);

  return useManifest ? manifestQuery : connectorQuery;
};

const useNodeAttribute = (operationInfo: NodeOperation, propertyInManifest: string[], propertyInConnector: string[]): QueryResult => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const { data: manifest, isLoading } = useOperationManifest(operationInfo, useManifest);
  const { data: connector } = useConnector(operationInfo?.connectorId, !useManifest);
  return {
    isLoading,
    result: manifest
      ? getObjectPropertyValue(manifest.properties, propertyInManifest)
      : connector
      ? getObjectPropertyValue(connector.properties, propertyInConnector)
      : undefined,
  };
};

export const useBrandColor = (nodeId: string) => {
  return useSelector((state: RootState) => {
    return state.operations.operationMetadata[nodeId]?.brandColor ?? '';
  });
};

export const useIconUri = (nodeId: string) => {
  return useSelector((state: RootState) => {
    return state.operations.operationMetadata[nodeId]?.iconUri ?? '';
  });
};

export const useConnectorName = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'displayName'], ['displayName']);
};

export const useOperationDescription = (operationInfo: NodeOperation) => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const { data: connectorData } = useConnectorAndSwagger(operationInfo.connectorId, !useManifest);

  const { result, isLoading } = useNodeAttribute(operationInfo, ['description'], ['description']);

  const { swagger } = connectorData ?? {};
  if (swagger) {
    const swaggerParsed = new SwaggerParser(swagger);
    return { isLoading, result: swaggerParsed.getOperationByOperationId(operationInfo.operationId).description };
  }

  return { result, isLoading };
};

export const useOperationDocumentation = (operationInfo: NodeOperation) => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const { data: connectorData } = useConnectorAndSwagger(operationInfo.connectorId, !useManifest);
  const { result, isLoading } = useNodeAttribute(operationInfo, ['connector', 'properties', 'externalDocs'], ['externalDocs']);
  const { swagger } = connectorData ?? {};
  if (swagger) {
    const swaggerparsed = new SwaggerParser(swagger);
    return { isLoading, result: swaggerparsed.getOperationByOperationId(operationInfo.operationId).externalDocs };
  }
  return { result, isLoading };
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

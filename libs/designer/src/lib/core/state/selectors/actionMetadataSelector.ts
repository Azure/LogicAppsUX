import { isConnectionRequiredForOperation } from '../../actions/bjsworkflow/connections';
import { useConnectionResource } from '../../queries/connections';
import type { RootState } from '../../store';
import { useConnector, useConnectorAndSwagger, useNodeConnectionId } from '../connection/connectionSelector';
import type { NodeOperation } from '../operation/operationMetadataSlice';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import { SwaggerParser } from '@microsoft/parsers-logic-apps';
import { getObjectPropertyValue } from '@microsoft/utils-logic-apps';
import { createSelector } from '@reduxjs/toolkit';
import { useMemo } from 'react';
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
};

export const useAllowUserToChangeConnection = (op: NodeOperation) => {
  return useIsConnectionRequired(op);
};

export const useNodeConnectionName = (nodeId: string): QueryResult => {
  const connectionId = useNodeConnectionId(nodeId);
  const { data: connection, isLoading } = useConnectionResource(connectionId);
  return useMemo(
    () =>
      nodeId && connectionId
        ? {
            isLoading,
            result: !isLoading ? connection?.properties?.displayName ?? connectionId.split('/').at(-1) : '',
          }
        : {
            isLoading: false,
            result: undefined,
          },
    [nodeId, connection?.properties?.displayName, connectionId, isLoading]
  );
};

export const useOperationInfo = (nodeId: string) => {
  const selector = createSelector(
    [(state: RootState) => state.operations.operationInfo, (_, nodeId: string) => nodeId],
    (operationInfo, id) => operationInfo[id]
  );
  return useSelector((state: RootState) => selector(state, nodeId));
};

export const useAllOperations = () => useSelector((state: RootState) => state.operations.operationInfo);

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
      refetchInterval: false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
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

export const useConnectorName = (operationInfo: NodeOperation) => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'displayName'], ['displayName']);
};

export const useOperationDescription = (operationInfo: NodeOperation) => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const { data: connectorData } = useConnectorAndSwagger(operationInfo?.connectorId, !useManifest);

  const { result, isLoading } = useNodeAttribute(operationInfo, ['description'], ['description']);

  const { swagger } = connectorData ?? {};
  if (swagger) {
    const swaggerParsed = new SwaggerParser(swagger);
    const swaggerResult = swaggerParsed.getOperationByOperationId(operationInfo.operationId)?.description;
    if (swaggerResult) {
      return { isLoading, result: swaggerResult };
    }
  }

  return { result, isLoading };
};

export const useOperationDocumentation = (operationInfo: NodeOperation) => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const { data: connectorData } = useConnectorAndSwagger(operationInfo?.connectorId, !useManifest);
  const { result, isLoading } = useNodeAttribute(operationInfo, ['connector', 'properties', 'externalDocs'], ['externalDocs']);
  const { swagger } = connectorData ?? {};
  if (swagger) {
    const swaggerParsed = new SwaggerParser(swagger);
    const swaggerResult = swaggerParsed.getOperationByOperationId(operationInfo.operationId)?.externalDocs;
    if (swaggerResult) {
      return { isLoading, result: swaggerResult };
    }
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

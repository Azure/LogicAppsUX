import { titleCase } from '../../../common/utilities/Utils';
import { isConnectionRequiredForOperation } from '../../actions/bjsworkflow/connections';
import { useConnectionResource } from '../../queries/connections';
import type { RootState } from '../../store';
import { useConnector, useNodeConnectionId, useSwagger } from '../connection/connectionSelector';
import type { NodeOperation, OperationMetadataState } from '../operation/operationMetadataSlice';
import {
  OperationManifestService,
  SUBGRAPH_TYPES,
  SwaggerParser,
  TryGetOperationManifestService,
  getObjectPropertyValue,
  getRecordEntry,
} from '@microsoft/logic-apps-shared';
import type { LAOperation, OperationManifest } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getOperationManifest } from '../../queries/operation';
import Constants from '../../../common/constants';

interface QueryResult {
  isLoading?: boolean;
  result: any;
}

export const getOperationsState = (state: RootState): OperationMetadataState => state.operations;

export const useIsConnectionRequired = (operationInfo: NodeOperation) => {
  const result = useOperationManifest(operationInfo);
  if (operationInfo.type === Constants.NODE.TYPE.CONNECTOR) {
    return false;
  }
  if (result.isLoading || !result.isFetched || result.isPlaceholderData) {
    return false;
  }
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
            result: isLoading ? '' : (connection?.properties?.displayName ?? connectionId.split('/').at(-1)),
          }
        : {
            isLoading: false,
            result: undefined,
          },
    [nodeId, connection?.properties?.displayName, connectionId, isLoading]
  );
};

export const useAllOperations = () => useSelector((state: RootState) => state.operations.operationInfo);
export const useOperationInfo = (nodeId: string) => {
  return useSelector((state: RootState) => getRecordEntry(state.operations.operationInfo, nodeId) ?? ({ type: '' } as NodeOperation));
};

export const useAllOutputParameters = () => useSelector((state: RootState) => state.operations.outputParameters);
export const useOutputParameters = (nodeId: string) => {
  return useSelector((state: RootState) => getRecordEntry(state.operations.outputParameters, nodeId));
};

export const useOperationManifest = (
  operationInfo?: NodeOperation,
  enabled = true
): UseQueryResult<OperationManifest | undefined, unknown> => {
  const connectorId = operationInfo?.connectorId?.toLowerCase();
  const operationId = operationInfo?.operationId?.toLowerCase();
  return useQuery(
    ['manifest', { connectorId }, { operationId }],
    () => {
      const operationManifestService = OperationManifestService();
      if (!operationInfo || !connectorId || !operationId) {
        return null;
      }
      return operationManifestService.isSupported(operationInfo.type, operationInfo.kind)
        ? getOperationManifest({ connectorId, operationId })
        : null;
    },
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

// Check if a node is a simple agent tool (no operation data, just UI node)
const useIsMcpClient = (nodeId: string): boolean => {
  return useSelector((state: RootState) => {
    const nodeMetadata = getRecordEntry(state.workflow.nodesMetadata, nodeId);
    return nodeMetadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT;
  });
};

export const useOperationQuery = (nodeId: string) => {
  const operationInfo = useOperationInfo(nodeId);
  const isMcpClient = useIsMcpClient(nodeId);

  const operationManifestService = OperationManifestService();
  const isConnectorNode = operationInfo?.type === Constants.NODE.TYPE.CONNECTOR;
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '') || isConnectorNode;

  const manifestQuery = useOperationManifest(operationInfo, useManifest && !isMcpClient);

  const connectorQuery = useConnector(operationInfo?.connectorId, !useManifest && !isConnectorNode && !isMcpClient);

  // For simple agent tools, return a successful empty result to prevent loading spinner
  if (isMcpClient) {
    return {
      data: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    };
  }

  return useManifest ? manifestQuery : connectorQuery;
};

const useNodeAttribute = (operationInfo: NodeOperation, propertyInManifest: string[], propertyInConnector: string[]): QueryResult => {
  const operationManifestService = TryGetOperationManifestService();
  const isConnectorNode = operationInfo?.type === Constants.NODE.TYPE.CONNECTOR;
  const useManifest = operationManifestService
    ? operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '') || isConnectorNode
    : false;

  const { data: manifest, isLoading } = useOperationManifest(operationInfo, useManifest);

  const { data: connector } = useConnector(operationInfo?.connectorId, !useManifest && !isConnectorNode);

  return {
    isLoading,
    result: manifest
      ? getObjectPropertyValue(manifest.properties, propertyInManifest)
      : connector
        ? getObjectPropertyValue(connector.properties, propertyInConnector)
        : undefined,
  };
};

export const useConnectorName = (operationInfo: NodeOperation): QueryResult => {
  return useNodeAttribute(operationInfo, ['connector', 'properties', 'displayName'], ['displayName']);
};

export const useOperationDescription = (operationInfo: NodeOperation): QueryResult => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  return useNodeAttributeOrSwagger(operationInfo, ['description'], ['description'], 'description', { useManifest });
};

export const useOperationDocumentation = (operationInfo: NodeOperation): QueryResult => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  return useNodeAttributeOrSwagger(operationInfo, ['connector', 'properties', 'externalDocs'], ['externalDocs'], 'externalDocs', {
    useManifest,
  });
};

export const useOperationSummary = (operationInfo: NodeOperation): QueryResult => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const result = useNodeAttributeOrSwagger(operationInfo, ['summary'], ['summary'], 'summary', { useManifest });
  if (result.result === undefined && operationInfo?.operationId) {
    result.result = titleCase(operationInfo.operationId);
  }

  return result;
};

export const useOperationUploadChunkMetadata = (operationInfo: NodeOperation): QueryResult => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const result = useNodeAttributeOrSwagger(operationInfo, ['settings', 'chunking'], ['uploadChunkMetadata'], 'uploadChunkMetadata', {
    useManifest,
  });

  if (!result.isLoading) {
    if (useManifest && result?.result) {
      return { result: result.result.options, isLoading: false };
    }
  }

  return result;
};

export const useOperationDownloadChunkMetadata = (operationInfo: NodeOperation): QueryResult => {
  const operationManifestService = OperationManifestService();
  const useManifest = operationManifestService.isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');

  const result = useNodeAttributeOrSwagger(
    operationInfo,
    ['settings', 'downloadChunking'],
    ['downloadChunkMetadata'],
    'downloadChunkMetadata',
    {
      useManifest,
    }
  );

  if (!result.isLoading) {
    if (useManifest && result.result) {
      return { result: result.result.options, isLoading: false };
    }
  }

  return result;
};

const useNodeAttributeOrSwagger = (
  operationInfo: NodeOperation,
  propertyInManifest: string[],
  propertyInConnector: string[],
  propertyInSwagger: keyof LAOperation,
  options: { useManifest: boolean }
): QueryResult => {
  const { data: swagger } = useSwagger(operationInfo?.connectorId, !options.useManifest);
  const { result, isLoading } = useNodeAttribute(operationInfo, propertyInManifest, propertyInConnector);
  if (swagger) {
    const swaggerParsed = new SwaggerParser(swagger);
    const swaggerResult = swaggerParsed.getOperationByOperationId(operationInfo.operationId)?.[propertyInSwagger];
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

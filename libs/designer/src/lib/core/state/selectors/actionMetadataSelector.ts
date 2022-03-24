import type { RootState } from '../../store';
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
  return useSelector((state: RootState) => getConnector(state, connectorId));
};

export const useOperationManifest = (connectorId: string, operationId: string) => {
  return useSelector((state: RootState) => getOperationManifest(state, connectorId, operationId));
};

export const useSwagger = (connectorId: string): any => {
  return useSelector((state: RootState) => {
    if (!connectorId) {
      return undefined;
    }

    return state.connectors.swaggers[connectorId.toUpperCase()];
  });
};

export const useBrandColor = (nodeId: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }

    const operationInfo = state.operations.operationInfo[nodeId];
    if (!operationInfo) {
      return undefined;
    }

    const { connectorId, operationId } = operationInfo;
    const manifest = getOperationManifest(state, connectorId, operationId);
    if (manifest) {
      return manifest.properties.brandColor;
    }

    const connector = getConnector(state, connectorId);
    if (connector) {
      return connector.properties.brandColor;
    }

    return undefined;
  });
};

export const useIconUri = (nodeId: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }

    const operationInfo = state.operations.operationInfo[nodeId];
    if (!operationInfo) {
      return undefined;
    }

    const { connectorId, operationId } = operationInfo;
    const manifest = getOperationManifest(state, connectorId, operationId);
    if (manifest) {
      return manifest.properties.iconUri;
    }

    const connector = getConnector(state, connectorId);
    if (connector) {
      return connector.properties.iconUri;
    }

    return undefined;
  });
};

export const getConnector = (state: RootState, connectorId: string) => {
  if (!connectorId) {
    return undefined;
  }

  return state.connectors.connectors[connectorId.toUpperCase()];
};

export const getOperationManifest = (state: RootState, connectorId: string, operationId: string) => {
  if (!connectorId || !operationId) {
    return undefined;
  }

  return state.connectors.manifests[getOperationManifestKey(connectorId, operationId)];
};

const getOperationManifestKey = (connectorId: string, operationId: string): string => {
  return `${connectorId.toLowerCase()}-${operationId.toLowerCase()}`;
};
